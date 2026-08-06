import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { users, cvTemplates, cvGenerations, cvAnalyses, userTemplateUnlocks } from "@/lib/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { pdfHourlyUserLimit, pdfDailyUserLimit, pdfIpLimit } from "@/lib/rate-limit/upstash";
import { getUserPlan } from "@/lib/billing/get-user-plan";
import crypto from "crypto";
import { getSharedBrowser, withRenderSlot } from "@/lib/pdf/browser-pool";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  let browser: any;
  let page: any;
  try {
    const { userId } = await auth();
    const body = await req.json();
    const { templateId, analysisId, templateData } = body;

    if (!templateId || !analysisId) {
      return NextResponse.json({ error: "Missing IDs" }, { status: 400 });
    }

    const template = await db.query.cvTemplates.findFirst({
      where: eq(cvTemplates.id, templateId),
    });

    const analysis = await db.query.cvAnalyses.findFirst({
      where: eq(cvAnalyses.id, analysisId),
    });

    if (!template || !analysis) {
      return NextResponse.json({ error: "Data not found" }, { status: 404 });
    }

    const dbUser = userId ? await db.query.users.findFirst({ where: eq(users.clerkId, userId) }) : null;
    const plan = getUserPlan(dbUser);

    const allTemplateIds = (await db.select({ id: cvTemplates.id }).from(cvTemplates).where(eq(cvTemplates.analysisId, analysisId))).map(t => t.id);

    const existingUnlock = dbUser && allTemplateIds.length > 0 ? await db.query.userTemplateUnlocks.findFirst({
      where: and(
        eq(userTemplateUnlocks.userId, dbUser.id),
        inArray(userTemplateUnlocks.templateId, allTemplateIds)
      ),
    }) : null;

    const hasCredits = !!(dbUser && (dbUser.credits ?? 0) > 0);

    if (plan === "free" && !hasCredits && !existingUnlock && !template.isPaid) {
      return NextResponse.json(
        { error: "Téléchargement bloqué. Passez au plan payant.", action: "upgrade" },
        { status: 403 },
      );
    }

    const hasAccess = plan === "pro" || hasCredits || !!existingUnlock || template.isPaid;

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Débloquez cette analyse pour télécharger le PDF.", action: "unlock" },
        { status: 403 },
      );
    }

    if (dbUser && dbUser.id && plan !== "pro" && !template.isPaid && !existingUnlock) {
      if ((dbUser.credits ?? 0) > 0) {
        await db.transaction(async (tx) => {
          await tx.update(users)
            .set({ credits: sql`${users.credits} - 1` })
            .where(eq(users.id, dbUser.id));

          const allTemplates = await tx.select().from(cvTemplates).where(eq(cvTemplates.analysisId, analysisId));
          if (allTemplates.length > 0) {
            await tx.insert(userTemplateUnlocks).values(
              allTemplates.map(t => ({ userId: dbUser.id, templateId: t.id }))
            ).onConflictDoNothing();
          }
        });

        revalidatePath('/[locale]/templates/[analysisId]', 'page');
      } else {
        return NextResponse.json({ error: "Crédits insuffisants.", action: "upgrade" }, { status: 403 });
      }
    }

    // Rate Limiting
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
    const trackingSalt = process.env.TRACKING_SALT || "default_salt";
    const hashedIp = crypto.createHash('sha256').update(ip + trackingSalt).digest('hex');

    if (userId) {
      const hourly = await pdfHourlyUserLimit.limit(userId);
      if (!hourly.success) {
        const formattedTime = new Date(hourly.reset).toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Europe/Paris",
        });
        return NextResponse.json(
          { error: `Limite de téléchargement atteinte. Réessayez à ${formattedTime}.` },
          { status: 429 },
        );
      }

      const daily = await pdfDailyUserLimit.limit(userId);
      if (!daily.success) {
        const formattedTime = new Date(daily.reset).toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Europe/Paris",
        });
        return NextResponse.json(
          { error: `Limite de téléchargement atteinte. Réessayez à ${formattedTime}.` },
          { status: 429 },
        );
      }
    } else {
      const ipLimit = await pdfIpLimit.limit(hashedIp);
      if (!ipLimit.success) {
        const formattedTime = new Date(ipLimit.reset).toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Europe/Paris",
        });

        return NextResponse.json(
          { error: `Limite de téléchargement atteinte pour cette IP. Réessayez à ${formattedTime}.` },
          { status: 429 },
        );
      }
    }

    // Prepare display data
    let displayData = { ...(templateData || (analysis as any).optimizedData || template.templateData || {}) };
    // if (typeof displayData === "string") {
    //   try {
    //     displayData = JSON.parse(displayData);
    //   } catch (e) { /* fallback */ }
    // }
    // if (displayData && typeof displayData === "object") {
    //   if ((displayData as any)._originalCvText) delete (displayData as any)._originalCvText;
    //   (displayData as any).contact = (displayData as any).contact || { email: "", phone: "", location: "" };
    // }

    // // Render static HTML from CVRenderer component dynamically without crashing Node/Turbopack

    // const cvHtml = renderToStaticMarkup(
    //   React.createElement(CVRenderer as any, {
    //     template: { ...template, templateData: displayData, hideWatermark: true },
    //     analysisData: analysis,
    //     isPaid: true,
    //     isPreview: false,
    //     isInteractive: false,
    //   })
    // );

    // const htmlContent = `
    //   <!DOCTYPE html>
    //   <html>
    //   <head>
    //       <meta charset="utf-8">
    //       <script src="https://cdn.tailwindcss.com"></script>
    //       <style>
    //           @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    //           @page { size: A4; margin: 0; }
    //           html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background-color: white; }
    //           body { font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; }
    //           #cv-ready { width: 100%; position: relative; }
    //           .cv-printable { width: 100% !important; min-height: 100% !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; }
    //       </style>
    //   </head>
    //   <body>
    //       <div id="cv-ready">${cvHtml}</div>
    //   </body>
    //   </html>
    // `;

    // // Launch Shared Browser and render static markup in page memory
    // browser = await withRenderSlot(() => getSharedBrowser());
    // page = await browser.newPage();

    // await page.setRequestInterception(true);
    // page.on("request", (request: any) => {
    //   const url = request.url();
    //   if (url.includes("google-analytics") || url.includes("clerk")) {
    //     request.abort();
    //   } else {
    //     request.continue();
    //   }
    // });

    // await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
    // await page.setContent(htmlContent, { waitUntil: "load", timeout: 30000 });

    // Sanitize data to match Page logic and prevent CVRenderer crashes
    if (displayData && typeof displayData === "object") {
      if ((displayData as any)._originalCvText) delete (displayData as any)._originalCvText;
      (displayData as any).contact = (displayData as any).contact || { email: "", phone: "", location: "" };
    }

    // Persist the current editor state (which may be ahead of what's saved)
    // so the print page — which reads straight from the database — reflects
    // exactly what the user sees, including unsaved live edits.
    try {
      await db.update(cvTemplates)
        .set({ templateData: displayData })
        .where(eq(cvTemplates.id, templateId));
    } catch (err) {
      console.error("Failed to sync live edits before PDF render:", err);
    }

    const proto = req.headers.get("x-forwarded-proto") || "https";
    const host = req.headers.get("host");
    const origin = `${proto}://${host}`;
    const locale = body.locale || "fr";
    const printUrl = `${origin}/${locale}/print/${analysisId}/${templateId}`;

    await page.setExtraHTTPHeaders({
      "x-pdf-gen-secret": process.env.PDF_GEN_SECRET || "internal-bypass",
    });

    // ✅ Navigate to the real print page and wait for it to render
    await page.goto(printUrl, { waitUntil: "networkidle0", timeout: 30000 });
    await page.waitForSelector("#cv-ready", { timeout: 10000 });

    await Promise.race([
      page.evaluateHandle('document.fonts.ready'),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);

    await page.evaluate(() => {
      const container = document.getElementById("cv-ready");
      if (!container) return;

      const A4_HEIGHT_PX = 1122;
      const contentHeight = container.offsetHeight || container.scrollHeight;
      const rawScale = (A4_HEIGHT_PX - 1) / contentHeight;
      const scale = rawScale > 1 ? Math.min(rawScale, 1.15) : rawScale;

      container.style.transform = `scale(${scale})`;
      container.style.transformOrigin = "top left";
      container.style.width = 100 / scale + "%";
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0px", right: "0px", bottom: "0px", left: "0px" },
      preferCSSPageSize: true,
      pageRanges: "1",
    });

    console.log("[PDF SIZE]", pdfBuffer.length, "bytes");

    await page.close();

    try {
      if (dbUser?.id) {
        await db.insert(cvGenerations).values({
          userId: dbUser.id,
          analysisId,
          templateId,
          templateStyle: template.templateStyle,
          templateData: displayData,
        });
      }
    } catch (err) {
      console.error("Failed to log generation in cv_generations:", err);
    }

    try {
      if (dbUser?.id && userId) {
        await db.update(users)
          .set({
            cvTemplatesUsedThisMonth: sql`${users.cvTemplatesUsedThisMonth} + 1`,
          })
          .where(eq(users.id, dbUser.id));
      }
    } catch (err) {
      console.error("Failed to increment monthly template usage:", err);
    }

    return NextResponse.json({
      pdfBase64: Buffer.from(pdfBuffer).toString("base64"),
      fileName: `CV_${template.templateStyle}.pdf`,
    });

  } catch (error: any) {
    if (typeof page !== "undefined" && page) await page.close();
    console.error("PDF Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}