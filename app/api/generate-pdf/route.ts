// import { NextResponse } from "next/server";
// import { db } from "@/lib/db";
// import { auth } from "@clerk/nextjs/server";
// import { users, cvTemplates, cvGenerations, cvAnalyses, userTemplateUnlocks } from "@/lib/db/schema";
// import { eq, and, sql, inArray } from "drizzle-orm";
// import { revalidatePath } from "next/cache";
// import { pdfHourlyUserLimit, pdfDailyUserLimit, pdfIpLimit } from "@/lib/rate-limit/upstash";
// import { getUserPlan } from "@/lib/billing/get-user-plan";
// import crypto from "crypto";
// import { getSharedBrowser, withRenderSlot } from "@/lib/pdf/browser-pool";

// export const dynamic = "force-dynamic";
// export const runtime = "nodejs";

// export async function POST(req: Request) {
//   let browser: any;
//   let page: any;

//   try {
//     const { userId } = await auth();
//     const body = await req.json();
//     const { templateId, analysisId, templateData } = body;

//     if (!templateId || !analysisId) {
//       return NextResponse.json({ error: "Missing IDs" }, { status: 400 });
//     }

//     // ─── Database queries ──────────────────────────────────────────
//     const template = await db.query.cvTemplates.findFirst({
//       where: eq(cvTemplates.id, templateId),
//     });

//     const analysis = await db.query.cvAnalyses.findFirst({
//       where: eq(cvAnalyses.id, analysisId),
//     });

//     if (!template || !analysis) {
//       return NextResponse.json({ error: "Data not found" }, { status: 404 });
//     }

//     // ─── User verification and access control ────────────────────
//     const dbUser = userId ? await db.query.users.findFirst({ where: eq(users.clerkId, userId) }) : null;
//     const plan = getUserPlan(dbUser);

//     const allTemplateIds = (
//       await db
//         .select({ id: cvTemplates.id })
//         .from(cvTemplates)
//         .where(eq(cvTemplates.analysisId, analysisId))
//     ).map((t) => t.id);

//     const existingUnlock =
//       dbUser && allTemplateIds.length > 0
//         ? await db.query.userTemplateUnlocks.findFirst({
//           where: and(
//             eq(userTemplateUnlocks.userId, dbUser.id),
//             inArray(userTemplateUnlocks.templateId, allTemplateIds)
//           ),
//         })
//         : null;

//     const hasCredits = !!(dbUser && (dbUser.credits ?? 0) > 0);

//     if (plan === "free" && !hasCredits && !existingUnlock && !template.isPaid) {
//       return NextResponse.json(
//         { error: "Téléchargement bloqué. Passez au plan payant.", action: "upgrade" },
//         { status: 403 }
//       );
//     }

//     const hasAccess = plan === "pro" || hasCredits || !!existingUnlock || template.isPaid;

//     if (!hasAccess) {
//       return NextResponse.json(
//         { error: "Débloquez cette analyse pour télécharger le PDF.", action: "unlock" },
//         { status: 403 }
//       );
//     }

//     // ─── Consume credits if needed ──────────────────────────────
//     if (dbUser && dbUser.id && plan !== "pro" && !template.isPaid && !existingUnlock) {
//       if ((dbUser.credits ?? 0) > 0) {
//         await db.transaction(async (tx) => {
//           await tx
//             .update(users)
//             .set({ credits: sql`${users.credits} - 1` })
//             .where(eq(users.id, dbUser.id));

//           const allTemplates = await tx
//             .select()
//             .from(cvTemplates)
//             .where(eq(cvTemplates.analysisId, analysisId));

//           if (allTemplates.length > 0) {
//             await tx
//               .insert(userTemplateUnlocks)
//               .values(allTemplates.map((t) => ({ userId: dbUser.id, templateId: t.id })))
//               .onConflictDoNothing();
//           }
//         });

//         revalidatePath("/[locale]/templates/[analysisId]", "page");
//       } else {
//         return NextResponse.json({ error: "Crédits insuffisants.", action: "upgrade" }, { status: 403 });
//       }
//     }

//     // ─── Rate Limiting ────────────────────────────────────────────
//     const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
//     const trackingSalt = process.env.TRACKING_SALT || "default_salt";
//     const hashedIp = crypto.createHash("sha256").update(ip + trackingSalt).digest("hex");

//     if (userId) {
//       const hourly = await pdfHourlyUserLimit.limit(userId);
//       if (!hourly.success) {
//         const formattedTime = new Date(hourly.reset).toLocaleTimeString("fr-FR", {
//           hour: "2-digit",
//           minute: "2-digit",
//           timeZone: "Europe/Paris",
//         });
//         return NextResponse.json(
//           { error: `Limite de téléchargement atteinte. Réessayez à ${formattedTime}.` },
//           { status: 429 }
//         );
//       }

//       const daily = await pdfDailyUserLimit.limit(userId);
//       if (!daily.success) {
//         const formattedTime = new Date(daily.reset).toLocaleTimeString("fr-FR", {
//           hour: "2-digit",
//           minute: "2-digit",
//           timeZone: "Europe/Paris",
//         });
//         return NextResponse.json(
//           { error: `Limite de téléchargement atteinte. Réessayez à ${formattedTime}.` },
//           { status: 429 }
//         );
//       }
//     } else {
//       const ipLimit = await pdfIpLimit.limit(hashedIp);
//       if (!ipLimit.success) {
//         const formattedTime = new Date(ipLimit.reset).toLocaleTimeString("fr-FR", {
//           hour: "2-digit",
//           minute: "2-digit",
//           timeZone: "Europe/Paris",
//         });
//         return NextResponse.json(
//           { error: `Limite de téléchargement atteinte pour cette IP. Réessayez à ${formattedTime}.` },
//           { status: 429 }
//         );
//       }
//     }

//     // ─── Prepare display data ────────────────────────────────────
//     let displayData = { ...(templateData || (analysis as any).optimizedData || template.templateData || {}) };

//     if (displayData && typeof displayData === "object") {
//       if ((displayData as any)._originalCvText) delete (displayData as any)._originalCvText;
//       (displayData as any).contact = (displayData as any).contact || { email: "", phone: "", location: "" };
//     }

//     // ─── Persist live edits ──────────────────────────────────────
//     try {
//       await db
//         .update(cvTemplates)
//         .set({ templateData: displayData })
//         .where(eq(cvTemplates.id, templateId));
//     } catch (err) {
//       console.error("Failed to sync live edits before PDF render:", err);
//     }

//     // ─── Launch Browser ──────────────────────────────────────────
//     browser = await withRenderSlot(() => getSharedBrowser());
//     page = await browser.newPage();

//     // Set viewport to A4 proportions with enough height
//     await page.setViewport({
//       width: 794,
//       height: 2000,
//       deviceScaleFactor: 1,
//     });

//     // ─── Build the URL ───────────────────────────────────────────
//     const port = process.env.PORT || 3000;
//     const locale = body.locale || "fr";
//     const printUrl = `http://127.0.0.1:${port}/${locale}/print/${analysisId}/${templateId}`;

//     // Pass authorization secret
//     await page.setExtraHTTPHeaders({
//       "x-pdf-gen-secret": process.env.PDF_GEN_SECRET || "internal-bypass",
//     });

//     // ─── Navigate to print page ──────────────────────────────────
//     try {
//       const probe = await fetch(printUrl, {
//         headers: { "x-pdf-gen-secret": process.env.PDF_GEN_SECRET || "internal-bypass" },
//       });
//       console.log("[PDF PROBE]", probe.status, printUrl);
//     } catch (probeErr: any) {
//       console.error("[PDF PROBE FAILED]", printUrl, probeErr?.message || probeErr);
//     }

//     await page.goto(printUrl, { waitUntil: "networkidle0", timeout: 30000 });
//     await page.waitForSelector("#cv-ready", { timeout: 10000 });

//     // ─── Wait for fonts ──────────────────────────────────────────
//     await Promise.race([
//       page.evaluateHandle("document.fonts.ready"),
//       new Promise((resolve) => setTimeout(resolve, 3000)),
//     ]);

//     // ─── Scroll to reveal all content ────────────────────────────
//     await page.evaluate(async () => {
//       const distance = 300;
//       const delay = 120;
//       const scrollHeight = document.body.scrollHeight;
//       for (let y = 0; y < scrollHeight; y += distance) {
//         window.scrollTo(0, y);
//         await new Promise((r) => setTimeout(r, delay));
//       }
//       window.scrollTo(0, 0);
//     });

//     // Wait for animations to settle
//     await new Promise((r) => setTimeout(r, 500));

//     // ─── Remove all margins from page ────────────────────────────
//     await page.evaluate(() => {
//       document.documentElement.style.margin = "0";
//       document.documentElement.style.padding = "0";
//       document.body.style.margin = "0";
//       document.body.style.padding = "0";
//       document.body.style.overflow = "hidden";
//       const ready = document.getElementById("cv-ready");
//       if (ready) {
//         ready.style.width = "100%";
//         ready.style.height = "100%";
//         ready.style.margin = "0";
//         ready.style.padding = "0";
//       }
//     });

//     // ─── Measure the FULL content size (scroll dimensions) ──────
//     const { contentWidth, contentHeight } = await page.evaluate(() => {
//       const cv = document.querySelector(".cv-printable") as HTMLElement;
//       if (cv) {
//         return {
//           contentWidth: cv.scrollWidth,
//           contentHeight: cv.scrollHeight,
//         };
//       }
//       return { contentWidth: 794, contentHeight: 1123 };
//     });

//     const A4_WIDTH_PX = 794;
//     const A4_HEIGHT_PX = 1123;
//     const MIN_SCALE = 0.65;

//     // Compute uniform scale to fit both dimensions without distortion
//     const widthScale = A4_WIDTH_PX / contentWidth;
//     const heightScale = A4_HEIGHT_PX / contentHeight;
//     let scale = Math.min(widthScale, heightScale, 1); // Never scale up
//     scale = Math.max(MIN_SCALE, scale);

//     console.log(`[PDF SCALE] content: ${contentWidth}x${contentHeight}, scale: ${scale}`);

//     // ─── Generate PDF with Puppeteer's built-in scale ────────────
//     // This preserves aspect ratio and fits content exactly in A4
//     const pdfBuffer = await page.pdf({
//       format: "A4",
//       printBackground: true,
//       // We control scaling with `scale`
//       margin: { top: 0, right: 0, bottom: 0, left: 0 },
//       pageRanges: "1", // Force single page
//     });

//     console.log("[PDF SIZE]", pdfBuffer.length, "bytes");

//     await page.close();

//     // ─── Log generation ──────────────────────────────────────────
//     try {
//       if (dbUser?.id) {
//         await db.insert(cvGenerations).values({
//           userId: dbUser.id,
//           analysisId,
//           templateId,
//           templateStyle: template.templateStyle,
//           templateData: displayData,
//         });
//       }
//     } catch (err) {
//       console.error("Failed to log generation in cv_generations:", err);
//     }

//     // ─── Update monthly usage ────────────────────────────────────
//     try {
//       if (dbUser?.id && userId) {
//         await db
//           .update(users)
//           .set({
//             cvTemplatesUsedThisMonth: sql`${users.cvTemplatesUsedThisMonth} + 1`,
//           })
//           .where(eq(users.id, dbUser.id));
//       }
//     } catch (err) {
//       console.error("Failed to increment monthly template usage:", err);
//     }

//     // ─── Return PDF ──────────────────────────────────────────────
//     return NextResponse.json({
//       pdfBase64: Buffer.from(pdfBuffer).toString("base64"),
//       fileName: `CV_${template.templateStyle}.pdf`,
//     });
//   } catch (error: any) {
//     if (typeof page !== "undefined" && page) {
//       try {
//         await page.close();
//       } catch (e) {
//         /* ignore */
//       }
//     }
//     if (typeof browser !== "undefined" && browser) {
//       try {
//         /* browser pool handles cleanup */
//       } catch (e) {
//         /* ignore */
//       }
//     }
//     console.error("PDF Error:", error);
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }
// }




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

    // ─── Database queries ──────────────────────────────────────────
    const template = await db.query.cvTemplates.findFirst({
      where: eq(cvTemplates.id, templateId),
    });

    const analysis = await db.query.cvAnalyses.findFirst({
      where: eq(cvAnalyses.id, analysisId),
    });

    if (!template || !analysis) {
      return NextResponse.json({ error: "Data not found" }, { status: 404 });
    }

    // ─── User verification and access control ────────────────────
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

    // ─── Consume credits if needed ──────────────────────────────
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

    // ─── Rate Limiting ────────────────────────────────────────────
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

    // ─── Prepare display data ────────────────────────────────────
    let displayData = { ...(templateData || (analysis as any).optimizedData || template.templateData || {}) };

    if (displayData && typeof displayData === "object") {
      if ((displayData as any)._originalCvText) delete (displayData as any)._originalCvText;
      (displayData as any).contact = (displayData as any).contact || { email: "", phone: "", location: "" };
    }

    // ─── Persist live edits ──────────────────────────────────────
    try {
      await db
        .update(cvTemplates)
        .set({ templateData: displayData })
        .where(eq(cvTemplates.id, templateId));
    } catch (err) {
      console.error("Failed to sync live edits before PDF render:", err);
    }

    // ─── Launch Browser ──────────────────────────────────────────
    browser = await withRenderSlot(() => getSharedBrowser());
    page = await browser.newPage();

    // Set viewport to A4 proportions
    await page.setViewport({
      width: 794,
      height: 2000,
      deviceScaleFactor: 1,
    });

    // ─── Build the URL ───────────────────────────────────────────
    const port = process.env.PORT || 3000;
    const locale = body.locale || "fr";
    const printUrl = `http://127.0.0.1:${port}/${locale}/print/${analysisId}/${templateId}`;

    // Pass authorization secret
    await page.setExtraHTTPHeaders({
      "x-pdf-gen-secret": process.env.PDF_GEN_SECRET || "internal-bypass",
    });

    // ─── Navigate to print page ──────────────────────────────────
    try {
      const probe = await fetch(printUrl, {
        headers: { "x-pdf-gen-secret": process.env.PDF_GEN_SECRET || "internal-bypass" },
      });
      console.log("[PDF PROBE]", probe.status, printUrl);
    } catch (probeErr: any) {
      console.error("[PDF PROBE FAILED]", printUrl, probeErr?.message || probeErr);
    }

    await page.goto(printUrl, { waitUntil: "networkidle0", timeout: 30000 });
    await page.waitForSelector("#cv-ready", { timeout: 10000 });

    // ─── Wait for fonts ──────────────────────────────────────────
    await Promise.race([
      page.evaluateHandle("document.fonts.ready"),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);

    // ─── Scroll to reveal all content ────────────────────────────
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

    // Wait for animations to settle
    await new Promise((r) => setTimeout(r, 500));

    // ─── Remove all margins from page ────────────────────────────
    await page.evaluate(() => {
      document.documentElement.style.margin = "0";
      document.documentElement.style.padding = "0";
      document.body.style.margin = "0";
      document.body.style.padding = "0";
      document.body.style.overflow = "hidden";
      const ready = document.getElementById("cv-ready");
      if (ready) {
        ready.style.width = "100%";
        ready.style.height = "100%";
        ready.style.margin = "0";
        ready.style.padding = "0";
      }
    });

    // ─── MEASURE THE CONTENT CORRECTLY ──────────────────────────
    // We need to measure the ACTUAL CV content, not the container
    // The .cv-printable container has height:100% which is wrong
    // We need to measure the inner content that CVRenderer produces
    const { contentWidth, contentHeight } = await page.evaluate(() => {
      // Find the actual CV content - look for the main template container
      // The CVRenderer renders a div with the template style classes
      // We need to find the inner content that contains the actual CV data

      // Try to find the template content - look for common template containers
      const templateSelectors = [
        '[data-testid="cv-content"] .cv-printable > div', // Inner template wrapper
        '[data-testid="cv-content"] .cv-printable > *', // Any direct child
        '.cv-printable > div:not([style*="transform"])', // The template content
      ];

      let target = null;
      for (const selector of templateSelectors) {
        const el = document.querySelector(selector) as HTMLElement;
        if (el && el.scrollHeight > 100) {
          target = el;
          break;
        }
      }

      // If we found a target, measure its scroll dimensions
      if (target) {
        return {
          contentWidth: target.scrollWidth,
          contentHeight: target.scrollHeight,
        };
      }

      // Fallback: try to find any large content
      const allDivs = document.querySelectorAll('.cv-printable div');
      let maxSize = 0;
      let bestMatch = null;

      for (const div of allDivs) {
        const el = div as HTMLElement;
        const size = el.scrollWidth * el.scrollHeight;
        if (size > maxSize && size > 10000) {
          maxSize = size;
          bestMatch = el;
        }
      }

      if (bestMatch) {
        return {
          contentWidth: bestMatch.scrollWidth,
          contentHeight: bestMatch.scrollHeight,
        };
      }

      // Ultimate fallback
      return { contentWidth: 794, contentHeight: 1123 };
    });

    console.log(`[PDF] Measured content: ${contentWidth}x${contentHeight}`);

    const A4_WIDTH_PX = 794;
    const A4_HEIGHT_PX = 1123;
    const MIN_SCALE = 0.65;

    // Compute uniform scale to fit both dimensions
    const widthScale = A4_WIDTH_PX / contentWidth;
    const heightScale = A4_HEIGHT_PX / contentHeight;
    let scale = Math.min(widthScale, heightScale, 1);
    scale = Math.max(MIN_SCALE, scale);

    console.log(`[PDF SCALE] scale: ${scale}`);

    // ─── Generate PDF with Puppeteer's scale ────────────────────
    // IMPORTANT: preferCSSPageSize must be false for scale to work
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: false, // ← MUST be false for scale to work
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      scale: scale, // ← Apply the scale here
      pageRanges: "1",
    });

    console.log("[PDF SIZE]", pdfBuffer.length, "bytes");

    await page.close();

    // ─── Log generation ──────────────────────────────────────────
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

    // ─── Update monthly usage ────────────────────────────────────
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

    // ─── Return PDF ──────────────────────────────────────────────
    return NextResponse.json({
      pdfBase64: Buffer.from(pdfBuffer).toString("base64"),
      fileName: `CV_${template.templateStyle}.pdf`,
    });
  } catch (error: any) {
    if (typeof page !== "undefined" && page) {
      try {
        await page.close();
      } catch (e) {
        /* ignore */
      }
    }
    if (typeof browser !== "undefined" && browser) {
      try {
        /* browser pool handles cleanup */
      } catch (e) {
        /* ignore */
      }
    }
    console.error("PDF Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}