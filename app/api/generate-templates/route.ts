// import { NextResponse } from 'next/server';
// import { db } from '@/lib/db';
// import { cvAnalyses, cvTemplates } from '@/lib/db/schema';
// import { eq } from 'drizzle-orm';
// import { generateOptimizedCV } from '@/lib/ai/ats-analyzer';
// import { validateOptimizedCV } from '@/lib/ai/resume-validator';

// export async function POST(req: Request) {
//   try {
//     const { analysisId } = await req.json();

//     if (!analysisId) {
//       return NextResponse.json(
//         { error: 'analysisId is required' },
//         { status: 400 }
//       );
//     }

//     const analysis = await db.query.cvAnalyses.findFirst({
//       where: eq(cvAnalyses.id, analysisId)
//     });

//     if (!analysis) {
//       return NextResponse.json(
//         { error: 'Analysis not found' },
//         { status: 404 }
//       );
//     }

//     // // ── Extract original CV text ──────────────────────
//     // const originalText =
//     //   (analysis.optimizedData as any)?._originalCvText ||
//     //   (analysis.optimizedData as any)?._originalcvtext ||
//     //   (analysis.optimizedData as any)?._originalCvContext ||
//     //   // "";


//     // ── Extract original CV text with multiple fallbacks ──
//     const optimizedData = analysis.optimizedData as any;

//     console.log(
//       "[DEBUG] optimizedData keys:",
//       Object.keys(optimizedData || {})
//     );

//     console.log(
//       "[DEBUG] optimizedData:",
//       JSON.stringify(optimizedData, null, 2)
//     );

//     const originalText =
//       optimizedData?._originalCvText ||
//       optimizedData?._originalcvtext ||
//       optimizedData?._originalCvContext ||
//       optimizedData?._originalcv ||
//       "";

//     // ── Build structured CV context from existing DB data ─
//     // If originalText is empty or too short, reconstruct
//     // the CV context from the already-parsed structured data
//     // This prevents the AI from generating a blank CV
//     const existingStructuredCV = {
//       userName: optimizedData?.userName || "",
//       jobTitle: optimizedData?.jobTitle || "",
//       summary: optimizedData?.summary || "",
//       contact: optimizedData?.contact || {},
//       experience: Array.isArray(optimizedData?.experience)
//         ? optimizedData.experience
//         : [],
//       education: Array.isArray(optimizedData?.education)
//         ? optimizedData.education
//         : [],
//       skills: Array.isArray(optimizedData?.skills)
//         ? optimizedData.skills
//         : [],
//       languages: Array.isArray(optimizedData?.languages)
//         ? optimizedData.languages
//         : [],
//       projects: Array.isArray(optimizedData?.projects)
//         ? optimizedData.projects
//         : [],
//     };

//     const hasStructuredData =
//       existingStructuredCV.userName ||
//       existingStructuredCV.experience.length > 0 ||
//       existingStructuredCV.education.length > 0;

//     console.log("[generate-templates] CV data check:", {
//       originalTextLength: originalText.length,
//       hasStructuredData,
//       existingUserName: existingStructuredCV.userName,
//       existingExperienceCount: existingStructuredCV.experience.length,
//     });

//     // ── Build complete analysis result ────────────────
//     const analysisResult = {
//       atsScore: analysis.atsScore || 0,
//       keywordsMissing: Array.isArray(analysis.keywordsMissing)
//         ? analysis.keywordsMissing as string[]
//         : [],
//       keywordsFound: Array.isArray(analysis.keywordsFound)
//         ? analysis.keywordsFound as string[]
//         : [],
//       suggestions: Array.isArray(analysis.suggestions)
//         ? analysis.suggestions as string[]
//         : [],
//       flaws: Array.isArray(analysis.flaws)
//         ? analysis.flaws as string[]
//         : [],
//     };

//     console.log("[generate-templates] Starting AI optimization", {
//       analysisId,
//       atsScore: analysisResult.atsScore,
//       keywordsMissing: analysisResult.keywordsMissing,
//       suggestionsCount: analysisResult.suggestions.length,
//       originalTextLength: originalText.length,
//     });

//     // ── Step 1: Try AI optimization with full fallback ─
//     // CRITICAL: Wrapped in its own try/catch so JSON
//     // truncation errors NEVER crash the entire route.
//     // If AI fails for any reason, we fall back to the
//     // existing optimizedData already in the database.
//     let optimizedContent: any = null;
//     let aiSucceeded = false;

//     { // Changed from 'try {' to simple '{' to establish type-safe block-level scope and fix unclosed block syntax
//       // Pass both the raw CV text AND the structured data
//       // so the AI has maximum context to work with
//       const cvContext = originalText.length > 200
//         ? originalText
//         : JSON.stringify(existingStructuredCV, null, 2);

//       console.log("[generate-templates] Using CV context:", {
//         type: originalText.length > 200 ? "rawText" : "structuredJSON",
//         length: cvContext.length,
//       });


//       const analysisResult = {
//         atsScore: analysis.atsScore || 0,
//         keywordsMissing: Array.isArray(analysis.keywordsMissing)
//           ? analysis.keywordsMissing as string[] : [],
//         keywordsFound: Array.isArray(analysis.keywordsFound)
//           ? analysis.keywordsFound as string[] : [],
//         suggestions: Array.isArray(analysis.suggestions)
//           ? analysis.suggestions as string[] : [],
//         flaws: Array.isArray(analysis.flaws)
//           ? analysis.flaws as string[] : [],
//       };

//       console.log("[generate-templates] ATS data:", {
//         atsScore: analysisResult.atsScore,
//         keywordsMissing: analysisResult.keywordsMissing,
//         suggestionsCount: analysisResult.suggestions.length,
//         flawsCount: analysisResult.flaws.length,
//       });

//       // Wrapped in isolated try/catch — JSON truncation errors
//       // NEVER crash the entire route
//       let optimizedContent: any = null;
//       let aiSucceeded = false;

//       try {
//         optimizedContent = await generateOptimizedCV(
//           cvContext,
//           analysis.jobDescription || "",
//           analysisResult,
//           undefined,
//           existingStructuredCV
//         );

//         if (optimizedContent) {
//           aiSucceeded = true;
//           console.log("[generate-templates] AI optimization succeeded");
//         }
//       } catch (aiError: any) {
//         console.error(
//           "[generate-templates] AI optimization failed, using existing data:",
//           aiError.message
//         );
//       }

//       // If AI failed, fall back to existing DB data
//       if (!optimizedContent) {
//         console.log("[generate-templates] Using existing optimizedData from DB");
//         optimizedContent = analysis.optimizedData;
//       }

//       if (!optimizedContent) {
//         return NextResponse.json(
//           { error: "No CV data available. Please re-upload your CV." },
//           { status: 422 }
//         );
//       }

//       // ── Step 4: Validate and patch keywords (only if AI succeeded) ─
//       if (aiSucceeded && analysisResult.keywordsMissing.length > 0) {
//         try {
//           console.log("[generate-templates] Running keyword validator...");
//           optimizedContent = await validateOptimizedCV(
//             optimizedContent,
//             analysisResult
//           );
//         } catch (validatorError: any) {
//           // Validator failure is non-fatal — keep the AI-generated content
//           console.warn(
//             "[generate-templates] Keyword validator failed, keeping AI output:",
//             validatorError.message
//           );
//         }
//       }

//       // ── Step 5: Ensure contact object is always complete ─
//       const safeContact = {
//         email: optimizedContent?.contact?.email || "",
//         phone: optimizedContent?.contact?.phone || "",
//         location: optimizedContent?.contact?.location || "",
//         linkedin: optimizedContent?.contact?.linkedin || "",
//         github: optimizedContent?.contact?.github || "",
//         portfolio: optimizedContent?.contact?.portfolio || "",
//       };

//       const finalContent = {
//         ...optimizedContent,
//         contact: safeContact,
//       };

//       // ── Step 6: Update analysis record ───────────────
//       // Only update if AI actually improved the content
//       if (aiSucceeded) {
//         await db.update(cvAnalyses)
//           .set({ optimizedData: finalContent })
//           .where(eq(cvAnalyses.id, analysisId));
//         console.log("[generate-templates] Analysis record updated with AI content");
//       }

//       // ── Step 7: Update all template records ──────────
//       const existingTemplates = await db.query.cvTemplates.findMany({
//         where: eq(cvTemplates.analysisId, analysisId)
//       });

//       if (existingTemplates.length > 0) {
//         await Promise.all(
//           existingTemplates.map(t =>
//             db.update(cvTemplates)
//               .set({
//                 templateData: {
//                   ...finalContent,
//                   // Preserve custom section order from each template
//                   sectionOrder: (t.templateData as any)?.sectionOrder
//                     || (finalContent as any)?.sectionOrder,
//                 }
//               })
//               .where(eq(cvTemplates.id, t.id))
//           )
//         );
//         console.log(`[generate-templates] Updated ${existingTemplates.length} templates`);
//       } else {
//         const { CV_TEMPLATE_STYLES } = await import('@/lib/cv-template-styles');
//         const styles = [...CV_TEMPLATE_STYLES];
//         const newTemplates = styles.map((style, i) => ({
//           analysisId,
//           templateNumber: i + 1,
//           templateStyle: style,
//           templateData: finalContent,
//           isPaid: true,
//         }));
//         await db.insert(cvTemplates).values(newTemplates);
//         console.log(`[generate-templates] Created ${newTemplates.length} new templates`);
//       }

//       return NextResponse.json({
//         success: true,
//         aiOptimized: aiSucceeded,
//       });

//     } // Closes the isolated block scope cleanly
//   } catch (error: any) {
//     console.error('[generate-templates] Unhandled error:', error);
//     return NextResponse.json(
//       { error: error.message || 'CV generation failed' },
//       { status: 500 }
//     );
//   }
// }



import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cvAnalyses, cvTemplates } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateOptimizedCV } from '@/lib/ai/ats-analyzer';
import { validateOptimizedCV } from '@/lib/ai/resume-validator';

export async function POST(req: Request) {
  try {
    const { analysisId } = await req.json();

    if (!analysisId) {
      return NextResponse.json(
        { error: 'analysisId is required' },
        { status: 400 }
      );
    }

    const analysis = await db.query.cvAnalyses.findFirst({
      where: eq(cvAnalyses.id, analysisId)
    });

    if (!analysis) {
      return NextResponse.json(
        { error: 'Analysis not found' },
        { status: 404 }
      );
    }

    const optimizedData = analysis.optimizedData as any;

    console.log("========== OPTIMIZED DATA ==========");

    console.log(
      "[DEBUG] optimizedData keys:",
      Object.keys(optimizedData || {})
    );

    console.log(
      "[DEBUG] optimizedData:",
      JSON.stringify(optimizedData, null, 2)
    );

    console.log("====================================");

    const originalText =
      optimizedData?._originalCvText ||
      optimizedData?._originalcvtext ||
      optimizedData?._originalCvContext ||
      optimizedData?._originalcv ||
      "";

    const existingStructuredCV = {
      userName: optimizedData?.userName || "",
      jobTitle: optimizedData?.jobTitle || "",
      summary: optimizedData?.summary || "",
      contact: optimizedData?.contact || {},
      experience: Array.isArray(optimizedData?.experience)
        ? optimizedData.experience
        : [],
      education: Array.isArray(optimizedData?.education)
        ? optimizedData.education
        : [],
      skills: Array.isArray(optimizedData?.skills)
        ? optimizedData.skills
        : [],
      languages: Array.isArray(optimizedData?.languages)
        ? optimizedData.languages
        : [],
      projects: Array.isArray(optimizedData?.projects)
        ? optimizedData.projects
        : [],
    };

    console.log("========== EXISTING STRUCTURED CV ==========");

    console.log(JSON.stringify(existingStructuredCV, null, 2));

    console.log("===========================================");

    const hasStructuredData =
      existingStructuredCV.userName ||
      existingStructuredCV.experience.length > 0 ||
      existingStructuredCV.education.length > 0;

    console.log("[generate-templates] CV data check:", {
      originalTextLength: originalText.length,
      hasStructuredData,
      existingUserName: existingStructuredCV.userName,
      existingExperienceCount: existingStructuredCV.experience.length,
    });

    const analysisResult = {
      atsScore: analysis.atsScore || 0,
      keywordsMissing: Array.isArray(analysis.keywordsMissing)
        ? (analysis.keywordsMissing as string[])
        : [],
      keywordsFound: Array.isArray(analysis.keywordsFound)
        ? (analysis.keywordsFound as string[])
        : [],
      suggestions: Array.isArray(analysis.suggestions)
        ? (analysis.suggestions as string[])
        : [],
      flaws: Array.isArray(analysis.flaws)
        ? (analysis.flaws as string[])
        : [],
    };

    console.log("[generate-templates] Starting AI optimization", {
      analysisId,
      atsScore: analysisResult.atsScore,
      keywordsMissing: analysisResult.keywordsMissing,
      suggestionsCount: analysisResult.suggestions.length,
      originalTextLength: originalText.length,
    });

    {
      // EXACT FIX 5: Always use structured JSON instead of raw PDF text context
      const cvContext = JSON.stringify(existingStructuredCV, null, 2);

      console.log("[generate-templates] Using CV context:", {
        type: "structuredJSON",
        length: cvContext.length,
      });

      // Wrapped in isolated try/catch — JSON truncation errors NEVER crash the entire route
      let optimizedContent: any = null;
      let aiSucceeded = false;

      try {
        optimizedContent = await generateOptimizedCV(
          cvContext,
          analysis.jobDescription || "",
          analysisResult,
          undefined,
          existingStructuredCV
        );

        if (optimizedContent) {
          aiSucceeded = true;
          console.log("[generate-templates] AI optimization succeeded");
        }
      } catch (aiError: any) {
        console.error(
          "[generate-templates] AI optimization failed, using existing data:",
          aiError.message
        );
      }

      if (!optimizedContent) {
        console.log("[generate-templates] Using existing optimizedData from DB");
        optimizedContent = analysis.optimizedData;
      }

      if (!optimizedContent) {
        return NextResponse.json(
          { error: "No CV data available. Please re-upload your CV." },
          { status: 422 }
        );
      }

      if (aiSucceeded && analysisResult.keywordsMissing.length > 0) {
        try {
          console.log("[generate-templates] Running keyword validator...");
          optimizedContent = await validateOptimizedCV(
            optimizedContent,
            analysisResult
          );
        } catch (validatorError: any) {
          console.warn(
            "[generate-templates] Keyword validator failed, keeping AI output:",
            validatorError.message
          );
        }
      }

      const safeContact = {
        email: optimizedContent?.contact?.email || "",
        phone: optimizedContent?.contact?.phone || "",
        location: optimizedContent?.contact?.location || "",
        linkedin: optimizedContent?.contact?.linkedin || "",
        github: optimizedContent?.contact?.github || "",
        portfolio: optimizedContent?.contact?.portfolio || "",
      };

      const finalContent = {
        ...optimizedContent,
        contact: safeContact,
      };

      console.log("========== FINAL CONTENT ==========");
      console.log(JSON.stringify(finalContent, null, 2));
      console.log("===================================");

      if (aiSucceeded) {
        await db.update(cvAnalyses)
          .set({ optimizedData: finalContent })
          .where(eq(cvAnalyses.id, analysisId));
        console.log("[generate-templates] Analysis record updated with AI content");
      }

      const existingTemplates = await db.query.cvTemplates.findMany({
        where: eq(cvTemplates.analysisId, analysisId)
      });

      if (existingTemplates.length > 0) {
        await Promise.all(
          existingTemplates.map(t =>
            db.update(cvTemplates)
              .set({
                templateData: {
                  ...finalContent,
                  sectionOrder: (t.templateData as any)?.sectionOrder
                    || (finalContent as any)?.sectionOrder,
                }
              })
              .where(eq(cvTemplates.id, t.id))
          )
        );
        console.log(`[generate-templates] Updated ${existingTemplates.length} templates`);
      } else {
        const { CV_TEMPLATE_STYLES } = await import('@/lib/cv-template-styles');
        const styles = [...CV_TEMPLATE_STYLES];
        const newTemplates = styles.map((style, i) => ({
          analysisId,
          templateNumber: i + 1,
          templateStyle: style,
          templateData: finalContent,
          isPaid: true,
        }));
        await db.insert(cvTemplates).values(newTemplates);
        console.log(`[generate-templates] Created ${newTemplates.length} new templates`);
      }

      return NextResponse.json({
        success: true,
        aiOptimized: aiSucceeded,
      });
    }
  } catch (error: any) {
    console.error('[generate-templates] Unhandled error:', error);
    return NextResponse.json(
      { error: error.message || 'CV generation failed' },
      { status: 500 }
    );
  }
}