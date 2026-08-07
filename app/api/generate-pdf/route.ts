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

    const allTemplateIds = (
      await db
        .select({ id: cvTemplates.id })
        .from(cvTemplates)
        .where(eq(cvTemplates.analysisId, analysisId))
    ).map((t) => t.id);

    const existingUnlock =
      dbUser && allTemplateIds.length > 0
        ? await db.query.userTemplateUnlocks.findFirst({
          where: and(
            eq(userTemplateUnlocks.userId, dbUser.id),
            inArray(userTemplateUnlocks.templateId, allTemplateIds)
          ),
        })
        : null;

    const hasCredits = !!(dbUser && (dbUser.credits ?? 0) > 0);

    if (plan === "free" && !hasCredits && !existingUnlock && !template.isPaid) {
      return NextResponse.json(
        { error: "Téléchargement bloqué. Passez au plan payant.", action: "upgrade" },
        { status: 403 }
      );
    }

    const hasAccess = plan === "pro" || hasCredits || !!existingUnlock || template.isPaid;

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Débloquez cette analyse pour télécharger le PDF.", action: "unlock" },
        { status: 403 }
      );
    }

    if (dbUser && dbUser.id && plan !== "pro" && !template.isPaid && !existingUnlock) {
      if ((dbUser.credits ?? 0) > 0) {
        await db.transaction(async (tx) => {
          await tx
            .update(users)
            .set({ credits: sql`${users.credits} - 1` })
            .where(eq(users.id, dbUser.id));

          const allTemplates = await tx
            .select()
            .from(cvTemplates)
            .where(eq(cvTemplates.analysisId, analysisId));
          if (allTemplates.length > 0) {
            await tx
              .insert(userTemplateUnlocks)
              .values(allTemplates.map((t) => ({ userId: dbUser.id, templateId: t.id })))
              .onConflictDoNothing();
          }
        });

        revalidatePath("/[locale]/templates/[analysisId]", "page");
      } else {
        return NextResponse.json({ error: "Crédits insuffisants.", action: "upgrade" }, { status: 403 });
      }
    }

    // Rate Limiting
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
    const trackingSalt = process.env.TRACKING_SALT || "default_salt";
    const hashedIp = crypto.createHash("sha256").update(ip + trackingSalt).digest("hex");

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
          { status: 429 }
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
          { status: 429 }
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
          { status: 429 }
        );
      }
    }

    // Prepare display data
    let displayData = { ...(templateData || (analysis as any).optimizedData || template.templateData || {}) };

    if (displayData && typeof displayData === "object") {
      if ((displayData as any)._originalCvText) delete (displayData as any)._originalCvText;
      (displayData as any).contact = (displayData as any).contact || { email: "", phone: "", location: "" };
    }

    // Persist live edits to database so print page reads latest state
    try {
      await db
        .update(cvTemplates)
        .set({ templateData: displayData })
        .where(eq(cvTemplates.id, templateId));
    } catch (err) {
      console.error("Failed to sync live edits before PDF render:", err);
    }

    // Launch Browser & Page
    browser = await withRenderSlot(() => getSharedBrowser());
    page = await browser.newPage();

    await page.setViewport({ width: 794, height: 2000, deviceScaleFactor: 1 });

    // Always use internal loopback so Puppeteer never has to leave the
    // container to hit its own public Railway domain. Railway's edge does
    // not route a container back to itself via the public hostname, which
    // is what caused net::ERR_FAILED. Locale routing is path-based, so
    // loopback works fine — no host branching needed.
    const port = process.env.PORT || 3000;
    const locale = body.locale || "fr";

    // Pass only the authorization secret (Removed invalid 'host' header to fix net::ERR_INVALID_ARGUMENT)
    await page.setExtraHTTPHeaders({
      "x-pdf-gen-secret": process.env.PDF_GEN_SECRET || "internal-bypass",
    });

    // Build the printUrl WITHOUT scale initially
    const initialPrintUrl = `http://127.0.0.1:${port}/${locale}/print/${analysisId}/${templateId}`;

    // Navigate to print page
    await page.goto(initialPrintUrl, { waitUntil: "networkidle0", timeout: 30000 });
    await page.waitForSelector("#cv-ready", { timeout: 10000 });

    await Promise.race([
      page.evaluateHandle("document.fonts.ready"),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);

    // Scroll-triggered reveal animations (Framer Motion whileInView, AOS,
    // or any IntersectionObserver-based "fade in on scroll" effect) only
    // fire once their section actually enters the viewport. A headless
    // page that goes straight to page.goto() and never scrolls will never
    // trigger them — those sections (like Projets) stay hidden/collapsed
    // forever, which is why they were missing from the PDF with no error
    // and no overflow: they simply never rendered into the DOM.
    await page.evaluate(async () => {
      const distance = 300;
      const delay = 120;
      const scrollHeight = document.body.scrollHeight;
      for (let y = 0; y < scrollHeight; y += distance) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, delay));
      }
      window.scrollTo(0, 0);
    });

    // Give any triggered animations a moment to finish settling before
    // we measure height and capture the PDF.
    await new Promise((r) => setTimeout(r, 500));

    // Measure the CV's true, unmodified height once.
    const contentHeight = await page.evaluate(() => {
      const container = document.getElementById("cv-ready");
      return container ? container.scrollHeight : 1122;
    });

    const A4_HEIGHT_PX = 1123;
    const scale = Math.min(1, A4_HEIGHT_PX / contentHeight);

    // NOW reload with scale parameter
    const printUrlWithScale = `http://127.0.0.1:${port}/${locale}/print/${analysisId}/${templateId}?scale=${scale}`;
    await page.goto(printUrlWithScale, { waitUntil: "networkidle0", timeout: 30000 });
    await page.waitForSelector("#cv-ready", { timeout: 10000 });

    // Generate PDF - use preferCSSPageSize: true with NO scale parameter
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0px", right: "0px", bottom: "0px", left: "0px" },
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
        await db
          .update(users)
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