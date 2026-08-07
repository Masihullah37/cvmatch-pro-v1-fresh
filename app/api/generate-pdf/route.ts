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
//       deviceScaleFactor: 1
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

//     // ─── Measure content height ──────────────────────────────────
//     const contentHeight = await page.evaluate(() => {
//       const container = document.getElementById("cv-ready");
//       return container ? container.scrollHeight : 1122;
//     });

//     // ─── Calculate scale to fit ONE page ─────────────────────────
//     const A4_HEIGHT_PX = 1123;
//     const MIN_SCALE = 0.65;

//     let scale = Math.min(1, A4_HEIGHT_PX / contentHeight);
//     scale = Math.max(MIN_SCALE, scale);

//     console.log(`[PDF SCALE] contentHeight: ${contentHeight}px, scale: ${scale}`);

//     // ─── Apply scale via CSS on the page ─────────────────────────
//     // Fixed: Added type annotation for the scale parameter
//     await page.evaluate((scaleValue: number) => {
//       const container = document.getElementById("cv-ready");
//       if (container) {
//         // Reset any existing transforms
//         container.style.transform = `scale(${scaleValue})`;
//         container.style.transformOrigin = "top left";

//         // Expand the container so after scaling it fills the page
//         const rect = container.getBoundingClientRect();
//         container.style.width = `${rect.width / scaleValue}px`;
//         container.style.height = `${rect.height / scaleValue}px`;

//         // The outer wrapper must be exactly A4 size
//         const wrapper = container.parentElement;
//         if (wrapper) {
//           wrapper.style.width = "794px";
//           wrapper.style.height = "1123px";
//           wrapper.style.overflow = "hidden";
//         }
//       }
//     }, scale); // ← Pass scale as the second argument

//     // Wait for the CSS changes to apply
//     await new Promise((r) => setTimeout(r, 200));

//     // ─── Generate PDF ────────────────────────────────────────────
//     const pdfBuffer = await page.pdf({
//       format: "A4",
//       printBackground: true,
//       preferCSSPageSize: true,
//       margin: { top: "0px", right: "0px", bottom: "0px", left: "0px" },
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
//       try { await page.close(); } catch (e) { }
//     }
//     if (typeof browser !== "undefined" && browser) {
//       try { /* browser pool handles cleanup */ } catch (e) { }
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
      deviceScaleFactor: 1
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

    // ─── Measure content dimensions ──────────────────────────────
    const { contentHeight, contentWidth } = await page.evaluate(() => {
      const container = document.getElementById("cv-ready");
      if (container) {
        const rect = container.getBoundingClientRect();
        return {
          contentHeight: rect.height || 1122,
          contentWidth: rect.width || 794,
        };
      }
      return { contentHeight: 1122, contentWidth: 794 };
    });

    // ─── Calculate scale to fit EXACTLY ──────────────────────────
    const A4_HEIGHT_PX = 1123;
    const A4_WIDTH_PX = 794;
    const MIN_SCALE = 0.65;

    // Calculate scale for both dimensions
    const heightScale = A4_HEIGHT_PX / contentHeight;
    const widthScale = A4_WIDTH_PX / contentWidth;

    // Use the smaller scale to ensure everything fits
    let scale = Math.min(heightScale, widthScale, 1); // Never scale up
    scale = Math.max(MIN_SCALE, scale);

    console.log(`[PDF SCALE] content: ${contentWidth}x${contentHeight}, scale: ${scale}`);

    // ─── METHOD 1: CSS Scaling with Full Page Fill ──────────────
    await page.evaluate((scaleValue: number) => {
      const container = document.getElementById("cv-ready");
      if (!container) return;

      // Get the wrapper
      const wrapper = container.parentElement;
      if (!wrapper) return;

      // Set wrapper to exactly A4 size
      wrapper.style.width = "794px";
      wrapper.style.height = "1123px";
      wrapper.style.overflow = "hidden";
      wrapper.style.position = "relative";
      wrapper.style.margin = "0";
      wrapper.style.padding = "0";

      // Get container dimensions
      const rect = container.getBoundingClientRect();
      const originalWidth = rect.width;
      const originalHeight = rect.height;

      // Calculate scaled dimensions
      const scaledWidth = originalWidth * scaleValue;
      const scaledHeight = originalHeight * scaleValue;

      // Calculate offsets to center the content
      const offsetX = (794 - scaledWidth) / 2 / scaleValue;
      const offsetY = (1123 - scaledHeight) / 2 / scaleValue;

      // Apply transform with centering
      container.style.transform = `scale(${scaleValue}) translate(${offsetX}px, ${offsetY}px)`;
      container.style.transformOrigin = "top left";

      // Expand container to fill the page after scaling
      container.style.width = `${794 / scaleValue}px`;
      container.style.height = `${1123 / scaleValue}px`;
      container.style.margin = "0";
      container.style.padding = "0";

      // Remove any extra spacing from body
      document.body.style.margin = "0";
      document.body.style.padding = "0";
      document.body.style.overflow = "hidden";
      document.documentElement.style.margin = "0";
      document.documentElement.style.padding = "0";

    }, scale);

    // Wait for CSS changes to apply
    await new Promise((r) => setTimeout(r, 300));

    // ─── Generate PDF ────────────────────────────────────────────
    // const pdfBuffer = await page.pdf({
    //   format: "A4",
    //   printBackground: true,
    //   preferCSSPageSize: true,
    //   margin: { top: "0", right: "0", bottom: "0", left: "0" },
    //   pageRanges: "1",
    // });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0px", right: "0px", bottom: "0px", left: "0px" },
      scale,
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
      try { await page.close(); } catch (e) { }
    }
    if (typeof browser !== "undefined" && browser) {
      try { /* browser pool handles cleanup */ } catch (e) { }
    }
    console.error("PDF Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}