import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { users, cvTemplates, cvGenerations, cvAnalyses, userTemplateUnlocks } from "@/lib/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import puppeteer from "puppeteer";
import React from "react";
import { revalidatePath } from "next/cache";
import { CVRenderer } from "@/components/templates/CVRenderer";
import { pdfHourlyUserLimit, pdfDailyUserLimit, pdfIpLimit } from "@/lib/rate-limit/upstash";
import { getUserPlan } from "@/lib/billing/get-user-plan";
import crypto from "crypto";
import { getSharedBrowser, withRenderSlot } from "@/lib/pdf/browser-pool";

// CACHE BUSTER: 2026-05-05-V3
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * PDF GENERATION ROUTE
 */
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

    // 1. Permission & Plan check
    const dbUser = userId ? await db.query.users.findFirst({ where: eq(users.clerkId, userId) }) : null;
    const plan = getUserPlan(dbUser);

    // ✅ Ownership Check: Check if user has already unlocked ANY template for this analysis
    const allTemplateIds = (await db.select({ id: cvTemplates.id }).from(cvTemplates).where(eq(cvTemplates.analysisId, analysisId))).map(t => t.id);

    const existingUnlock = dbUser && allTemplateIds.length > 0 ? await db.query.userTemplateUnlocks.findFirst({
      where: and(
        eq(userTemplateUnlocks.userId, dbUser.id),
        inArray(userTemplateUnlocks.templateId, allTemplateIds)
      ),
    }) : null;

    // Verify if user has credits from a one-time payment pack
    const hasCredits = !!(dbUser && (dbUser.credits ?? 0) > 0);

    // If on free plan, block only if they have no credits AND haven't already unlocked it
    if (plan === "free" && !hasCredits && !existingUnlock && !template.isPaid) {
      return NextResponse.json(
        { error: "Téléchargement bloqué. Passez au plan payant.", action: "upgrade" },
        { status: 403 },
      );
    }

    // ✅ Access Logic: Allow if user is Pro, has credits, or already owns/unlocked the template
    const hasAccess = plan === "pro" || hasCredits || !!existingUnlock || template.isPaid;

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Débloquez cette analyse pour télécharger le PDF.", action: "unlock" },
        { status: 403 },
      );
    }

    // ✅ 2. Early Credit Deduction & Ownership Logic
    // This prevents the "payment plan loop" by granting ownership BEFORE the long Puppeteer process starts.
    // If the generation takes 10s and the user refreshes, they will already be marked as an owner.
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

        // Refresh the server-side cache immediately
        revalidatePath('/[locale]/templates/[analysisId]', 'page');
      } else {
        return NextResponse.json({ error: "Crédits insuffisants.", action: "upgrade" }, { status: 403 });
      }
    }

    // ✅ Rate limiting
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
    const trackingSalt = process.env.TRACKING_SALT || "default_salt";
    const hashedIp = crypto.createHash('sha256').update(ip + trackingSalt).digest('hex');
    if (userId) {
      // ✅ Check hourly limit first
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

      // ✅ Only check daily limit if hourly check passed.
      // This prevents flickering reset times and "token leaking" from the daily bucket.
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

    // 2. Browser Launch
    // if (process.env.NODE_ENV === 'production') {
    //   const chromium = (await import("@sparticuz/chromium")).default as any;
    //   const puppeteerCore = (await import("puppeteer-core")) as any;
    //   browser = await puppeteerCore.launch({
    //     args: chromium.args,
    //     defaultViewport: chromium.defaultViewport,
    //     executablePath: await chromium.executablePath(),
    //     headless: chromium.headless,
    //   });
    // } else {
    //   // Dev mode: use local Puppeteer with Chromium
    //   try {
    //     const executablePath = puppeteer.executablePath();
    //     console.log("[PDF] Puppeteer executable path:", executablePath);

    //     browser = await puppeteer.launch({
    //       headless: true,
    //       args: ["--no-sandbox", "--disable-setuid-sandbox"],
    //       timeout: 60000, // Increase timeout to 60s for slower systems
    //     });
    //   } catch (err: any) {
    //     console.error("[PDF] Puppeteer launch error:", err.message);
    //     throw new Error(`Chromium not available. Run: npm run install-browsers`);
    //   }
    // }

    // 2. Get shared browser instance (reused across requests, not relaunched)
    browser = await withRenderSlot(() => getSharedBrowser());

    page = await browser.newPage();

    // ✅ Block external trackers to speed up load
    await page.setRequestInterception(true);
    page.on("request", (request: any) => {
      const url = request.url();
      if (url.includes("google-analytics") || url.includes("clerk")) {
        request.abort();
      } else {
        request.continue();
      }
    });

    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });

    // ✅ Render CV to HTML string
    // Priority: Body data (current editor state) > Analysis saved data > Template default
    // Use type assertion to resolve ts(2339) property error for analysis.templateData
    let displayData = { ...(templateData || (analysis as any).optimizedData || template.templateData || {}) };

    // Safety: Ensure data is an object before rendering to prevent crash
    if (typeof displayData === "string") {
      try {
        displayData = JSON.parse(displayData);
      } catch (e) { /* fallback to original */ }
    }

    // Sanitize data to match Page logic and prevent CVRenderer crashes
    if (displayData && typeof displayData === "object") {
      if ((displayData as any)._originalCvText) delete (displayData as any)._originalCvText;
      (displayData as any).contact = (displayData as any).contact || { email: "", phone: "", location: "" };
    }

    // Bypassing Turbopack static analysis using eval('require')
    const { renderToStaticMarkup } = eval('require')('react-dom/server');
    const cvHtml = renderToStaticMarkup(
      React.createElement(CVRenderer, {
        template: { ...template, templateData: displayData, hideWatermark: true },
        analysisData: analysis,
        isPaid: true,
        isPreview: false,
      })
    );
    const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
                    @page {
                        size: A4;
                        margin: 0;
                    }
                    html, body {
                        margin: 0;
                        padding: 0;
                        width: 100%;
                        height: 100%;
                        overflow: hidden;
                        background-color: white;
                    }
                    body {
                        font-family: 'Inter', sans-serif;
                        -webkit-print-color-adjust: exact;
                    }
                    #cv-ready {
                        width: 100%;
                        position: relative;
                    }
                    /* Force the CV component to fill the page regardless of its internal settings */
                    .cv-printable {
                        width: 100% !important;
                        min-height: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        box-shadow: none !important;
                    }
                </style>
            </head>
            <body>
                <div id="cv-ready">${cvHtml}</div>
            </body>
            </html>
        `;

    // ✅ Set content and wait for load
    await page.setContent(htmlContent, { waitUntil: "load", timeout: 30000 });

    // ✅ Wait for fonts to be fully loaded, with a safety timeout
    // to prevent slow CDN responses from stalling PDF generation
    await Promise.race([
      page.evaluateHandle('document.fonts.ready'),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);

    await page.evaluate(() => {
      const container = document.getElementById("cv-ready");
      if (!container) return;

      const A4_HEIGHT_PX = 1122; // A4 height at 96dpi
      const contentHeight = container.offsetHeight || container.scrollHeight;

      // Always scale to exactly fill one A4 page — whether the CV's natural
      // content is taller (shrink it down) or shorter (stretch it up) than a
      // full page, so the final PDF always looks evenly filled, never with
      // leftover blank space at the bottom.
      const rawScale = (A4_HEIGHT_PX - 1) / contentHeight;

      // Cap how much a very short CV gets stretched — filling the page
      // completely is fine for a slightly-short CV, but blowing up a very
      // sparse one to 2-3x its natural size would look distorted rather
      // than professional. 1.15 = at most 15% larger than natural size.
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

    // console.log(
    //   "[PDF SIZE]",
    //   pdfBuffer.length,
    //   "bytes",
    //   (pdfBuffer.length / 1024 / 1024).toFixed(2),
    //   "MB"
    // );

    // await browser.close();

    console.log(
      "[PDF SIZE]",
      pdfBuffer.length,
      "bytes",
      (pdfBuffer.length / 1024 / 1024).toFixed(2),
      "MB"
    );

    await page.close();

    // ✅ Log the generation to cv_generations table
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

    // ✅ Increment monthly usage counter
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
    // } catch (error: any) {
    //   if (browser) await browser.close();
    //   console.error("PDF Error:", error);
    //   return NextResponse.json({ error: error.message }, { status: 500 });
    // }

  } catch (error: any) {
    if (typeof page !== "undefined" && page) await page.close();
    console.error("PDF Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
