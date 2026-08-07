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

    // await page.setRequestInterception(true);
    // page.on("request", (request: any) => {
    //   const url = request.url();
    //   if (url.includes("google-analytics") || url.includes("clerk")) {
    //     request.abort();
    //   } else {
    //     request.continue();
    //   }
    // });

    // TEMP: interception disabled — it collapses real network errors
    // (connection refused, DNS failure, etc.) into a generic net::ERR_FAILED,
    // which is why we can't see what's actually going wrong. Re-enable once
    // the underlying cause is confirmed.
    // await page.setRequestInterception(true);
    // page.on("request", (request: any) => {
    //   const url = request.url();
    //   if (url.includes("google-analytics") || url.includes("clerk")) {
    //     request.abort();
    //   } else {
    //     request.continue();
    //   }
    // });

    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });

    // Always use internal loopback so Puppeteer never has to leave the
    // container to hit its own public Railway domain. Railway's edge does
    // not route a container back to itself via the public hostname, which
    // is what caused net::ERR_FAILED. Locale routing is path-based, so
    // loopback works fine — no host branching needed.
    const port = process.env.PORT || 3000;
    const locale = body.locale || "fr";
    const printUrl = `http://127.0.0.1:${port}/${locale}/print/${analysisId}/${templateId}`;

    // Pass only the authorization secret (Removed invalid 'host' header to fix net::ERR_INVALID_ARGUMENT)
    await page.setExtraHTTPHeaders({
      "x-pdf-gen-secret": process.env.PDF_GEN_SECRET || "internal-bypass",
    });

    // Navigate to print page
    // await page.goto(printUrl, { waitUntil: "networkidle0", timeout: 30000 });
    // TEMP diagnostic: verify Node itself can reach the print URL over
    // loopback, independent of Chrome/Puppeteer.
    try {
      const probe = await fetch(printUrl, {
        headers: { "x-pdf-gen-secret": process.env.PDF_GEN_SECRET || "internal-bypass" },
      });
      console.log("[PDF PROBE]", probe.status, printUrl);
    } catch (probeErr: any) {
      console.error("[PDF PROBE FAILED]", printUrl, probeErr?.message || probeErr);
    }

    // Navigate to print page
    await page.goto(printUrl, { waitUntil: "networkidle0", timeout: 30000 });
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

    // Measure the CV's true, unmodified height once. No CSS transform or
    // zoom is applied on the page itself — those relied on the DOM
    // reflowing and being re-measured in real time, which isn't reliable
    // in a headless print context and caused content to over-shrink or
    // reflow unpredictably (tiny content in a corner, missing sections).
    const contentHeight = await page.evaluate(() => {
      const container = document.getElementById("cv-ready");
      return container ? container.scrollHeight : 1122;
    });

    const A4_HEIGHT_PX = 1122;
    const MIN_SCALE = 0.75; // below this, printed text becomes hard to read
    const rawScale = A4_HEIGHT_PX / contentHeight;
    const scale = Math.max(MIN_SCALE, Math.min(1, rawScale));

    // Let Chrome's own print engine do the scaling natively via
    // page.pdf({ scale }), instead of mutating page CSS. This is computed
    // once as part of PDF generation itself, so there's no reflow-timing
    // race. Also dropped preferCSSPageSize/pageRanges: "1" — those existed
    // to force single-page output around the old unreliable scaling, and
    // pageRanges: "1" was silently discarding overflow content. If a CV is
    // genuinely too long to fit one page even at 75% scale, it will now
    // spill onto a real second page instead of losing content.
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0px", right: "0px", bottom: "0px", left: "0px" },
      scale,
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