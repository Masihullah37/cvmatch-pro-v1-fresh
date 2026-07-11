// import { NextResponse } from "next/server";
// import { db } from "@/lib/db";
// import { cvAnalyses, cvTemplates } from "@/lib/db/schema";
// import { eq } from "drizzle-orm";
// import { generateOptimizedCV } from "@/lib/ai/ats-analyzer";
// import { validateOptimizedCV } from "@/lib/ai/resume-validator";

// export async function POST(req: Request) {
//   try {
//     const { analysisId } = await req.json();

//     const analysis = await db.query.cvAnalyses.findFirst({
//       where: eq(cvAnalyses.id, analysisId),
//     });

//     if (!analysis) {
//       return NextResponse.json(
//         { error: "Analysis not found" },
//         { status: 404 }
//       );
//     }

//     // // Original CV text extracted during ATS analysis
//     // const originalText =
//     //   (analysis.optimizedData as any)?._originalCvText || "";

//     // 1. Try to extract raw string data from the jsonb payloads directly
//     const optimizedJson = (analysis.optimizedData as any) || {};
//     let originalText =
//       optimizedJson._originalCvText ||
//       optimizedJson.originalText ||
//       optimizedJson.cvText ||
//       "";

//     // 2. STITCHING FALLBACK: If string fields are blank, compile the baseline structure 
//     // from the available columns so the LLM receives the user's career context.
//     if (!originalText || originalText.trim().length < 10) {
//       const parts = [];
//       if (analysis.userName) parts.push(`Candidate Name: ${analysis.userName}`);
//       if (analysis.jobTitle) parts.push(`Target Professional Domain / Current Title: ${analysis.jobTitle}`);

//       // Inject keywords already matched to solidify domain detection (e.g. React for developer)
//       if (analysis.keywordsFound && Array.isArray(analysis.keywordsFound) && analysis.keywordsFound.length > 0) {
//         parts.push(`Demonstrated Skills/Tools: ${analysis.keywordsFound.join(", ")}`);
//       }

//       // Deconstruct objects nested within the optimizedData schema
//       if (typeof optimizedJson === "object" && optimizedJson !== null) {
//         if (optimizedJson.summary) parts.push(`Summary: ${optimizedJson.summary}`);
//         if (optimizedJson.skills && Array.isArray(optimizedJson.skills)) parts.push(`Skills Inventory: ${optimizedJson.skills.join(", ")}`);
//         if (optimizedJson.experience) parts.push(`Work Experience History: ${JSON.stringify(optimizedJson.experience)}`);
//         if (optimizedJson.education) parts.push(`Education Details: ${JSON.stringify(optimizedJson.education)}`);
//         if (optimizedJson.projects) parts.push(`Projects Log: ${JSON.stringify(optimizedJson.projects)}`);
//       }

//       originalText = parts.join("\n\n");
//     }

//     // 3. Prevent execution if context cannot be reliably inferred
//     if (!originalText || originalText.trim().length < 10) {
//       return NextResponse.json(
//         { error: "Cannot optimize CV: Baseline resume information could not be resolved." },
//         { status: 400 }
//       );
//     }



//     /**
//      * Normalize database JSON fields.
//      * Drizzle returns JSON columns as unknown, so convert them
//      * into the expected types before passing to AI functions.
//      */
//     const analysisData = {
//       atsScore:
//         typeof analysis.atsScore === "number"
//           ? analysis.atsScore
//           : undefined,

//       scoreBreakdown:
//         (analysis.scoreBreakdown as Record<
//           string,
//           { score: number; max: number }
//         >) ?? undefined,

//       flaws: Array.isArray(analysis.flaws)
//         ? (analysis.flaws as string[])
//         : [],

//       suggestions: Array.isArray(analysis.suggestions)
//         ? (analysis.suggestions as string[])
//         : [],

//       keywordsMissing: Array.isArray(analysis.keywordsMissing)
//         ? (analysis.keywordsMissing as string[])
//         : [],

//       keywordsFound: Array.isArray(analysis.keywordsFound)
//         ? (analysis.keywordsFound as string[])
//         : [],
//     };

//     // // Generate optimized CV
//     // const generatedContent = await generateOptimizedCV(
//     //   originalText,
//     //   analysis.jobDescription || "",
//     //   analysisData
//     // );



//     // Generate optimized CV via the domain-agnostic LLM
//     let generatedContent = await generateOptimizedCV(
//       originalText,
//       analysis.jobDescription || "Optimisation standard",
//       analysisData
//     );

//     // ─────────────────────────────────────────────────────────────
//     // 🔒 DOMAIN-AGNOSTIC DATA RETENTION & HYDRATION LAYER
//     // Ensures existing user data is never lost, regardless of industry.
//     // ─────────────────────────────────────────────────────────────
//     if (generatedContent) {
//       if (!generatedContent.userName || generatedContent.userName.trim() === "") {
//         generatedContent.userName = analysis.userName || optimizedJson.userName || "Votre Nom";
//       }
//       if (!generatedContent.jobTitle || generatedContent.jobTitle.trim() === "") {
//         generatedContent.jobTitle = analysis.jobTitle || optimizedJson.jobTitle || "Professionnel Qualifié";
//       }
//       if (!generatedContent.summary || generatedContent.summary.trim() === "") {
//         generatedContent.summary = optimizedJson.summary || "Professionnel expérimenté et axé sur les résultats.";
//       }

//       // Merge skills: Force-combine user's existing skills with newly suggested ATS keywords without duplicates
//       const baseSkills = Array.isArray(optimizedJson.skills) ? optimizedJson.skills : [];
//       const missingSkills = analysisData.keywordsMissing || [];
//       if (!generatedContent.skills || generatedContent.skills.length === 0) {
//         generatedContent.skills = Array.from(new Set([...baseSkills, ...missingSkills]));
//       }

//       // Fail-safe protection: If the AI output strips section arrays, safely restore user's original data arrays
//       if ((!generatedContent.experience || generatedContent.experience.length === 0) && optimizedJson.experience) {
//         generatedContent.experience = optimizedJson.experience;
//       }
//       if ((!generatedContent.education || generatedContent.education.length === 0) && optimizedJson.education) {
//         generatedContent.education = optimizedJson.education;
//       }
//       if ((!generatedContent.projects || generatedContent.projects.length === 0) && optimizedJson.projects) {
//         generatedContent.projects = optimizedJson.projects;
//       }
//       if ((!generatedContent.languages || generatedContent.languages.length === 0) && optimizedJson.languages) {
//         generatedContent.languages = optimizedJson.languages;
//       }
//     }

//     // Validate and improve optimized CV
//     const optimizedContent = await validateOptimizedCV(
//       generatedContent,
//       analysisData
//     );

//     if (!optimizedContent) {
//       throw new Error("AI Optimization failed");
//     }

//     // Save optimized CV back into analysis
//     await db
//       .update(cvAnalyses)
//       .set({
//         optimizedData: optimizedContent,
//       })
//       .where(eq(cvAnalyses.id, analysisId));

//     // Update templates
//     const existingTemplates = await db.query.cvTemplates.findMany({
//       where: eq(cvTemplates.analysisId, analysisId),
//     });

//     if (existingTemplates.length > 0) {
//       await Promise.all(
//         existingTemplates.map((template) =>
//           db
//             .update(cvTemplates)
//             .set({
//               templateData: {
//                 ...optimizedContent,
//                 contact:
//                   optimizedContent.contact ||
//                   (template.templateData as any)?.contact || {
//                     email: "",
//                     phone: "",
//                     location: "",
//                     linkedin: "",
//                     github: "",
//                     portfolio: "",
//                   },
//               },
//             })
//             .where(eq(cvTemplates.id, template.id))
//         )
//       );
//     } else {
//       const { CV_TEMPLATE_STYLES } = await import(
//         "@/lib/cv-template-styles"
//       );

//       const newTemplates = CV_TEMPLATE_STYLES.map((style, index) => ({
//         analysisId,
//         templateNumber: index + 1,
//         templateStyle: style,
//         templateData: {
//           ...optimizedContent,
//           contact: optimizedContent.contact || {
//             email: "",
//             phone: "",
//             location: "",
//             linkedin: "",
//             github: "",
//             portfolio: "",
//           },
//         },
//         isPaid: true,
//       }));

//       await db.insert(cvTemplates).values(newTemplates);
//     }

//     return NextResponse.json({
//       success: true,
//     });
//   } catch (error: any) {
//     console.error("API /generate-templates error:", error);

//     return NextResponse.json(
//       {
//         error: error?.message || "Unknown error",
//       },
//       {
//         status: 500,
//       }
//     );
//   }
// }




import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cvAnalyses, cvTemplates } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateOptimizedCV } from "@/lib/ai/ats-analyzer";
import { validateOptimizedCV } from "@/lib/ai/resume-validator";

export async function POST(req: Request) {
  try {
    const { analysisId } = await req.json();

    const analysis = await db.query.cvAnalyses.findFirst({
      where: eq(cvAnalyses.id, analysisId),
    });

    if (!analysis) {
      return NextResponse.json(
        { error: "Analysis not found" },
        { status: 404 }
      );
    }

    const optimizedJson = (analysis.optimizedData as any) || {};

    // 1. Recover the raw source text context
    let originalText =
      optimizedJson._originalCvText ||
      optimizedJson.originalText ||
      optimizedJson.cvText ||
      (analysis as any).cvText ||
      "";

    // 2. Build full layout context structure if raw text is lightweight
    if (!originalText || originalText.trim().length < 15) {
      const parts = [];
      if (analysis.userName) parts.push(`Candidate Name: ${analysis.userName}`);
      if (analysis.jobTitle) parts.push(`Target Title: ${analysis.jobTitle}`);

      if (typeof optimizedJson === "object" && optimizedJson !== null) {
        if (optimizedJson.summary) parts.push(`Summary: ${optimizedJson.summary}`);
        if (optimizedJson.skills) parts.push(`Skills: ${Array.isArray(optimizedJson.skills) ? optimizedJson.skills.join(", ") : optimizedJson.skills}`);
        if (optimizedJson.experience) parts.push(`Experience: ${JSON.stringify(optimizedJson.experience)}`);
        if (optimizedJson.education) parts.push(`Education: ${JSON.stringify(optimizedJson.education)}`);
        if (optimizedJson.projects) parts.push(`Projects: ${JSON.stringify(optimizedJson.projects)}`);
      }
      originalText = parts.join("\n\n");
    }

    // 3. Prepare parameters for AI optimization
    const analysisData = {
      atsScore: typeof analysis.atsScore === "number" ? analysis.atsScore : undefined,
      scoreBreakdown: (analysis.scoreBreakdown as Record<string, { score: number; max: number }>) ?? undefined,
      flaws: Array.isArray(analysis.flaws) ? (analysis.flaws as string[]) : [],
      suggestions: Array.isArray(analysis.suggestions) ? (analysis.suggestions as string[]) : [],
      keywordsMissing: Array.isArray(analysis.keywordsMissing) ? (analysis.keywordsMissing as string[]) : [],
      keywordsFound: Array.isArray(analysis.keywordsFound) ? (analysis.keywordsFound as string[]) : [],
    };

    // 4. Run the AI generation loop
    let generatedContent = await generateOptimizedCV(
      originalText,
      analysis.jobDescription || "Optimisation standard",
      analysisData
    );

    // 5. Run validation loop
    let optimizedContent = await validateOptimizedCV(
      generatedContent,
      analysisData
    );

    if (!optimizedContent) {
      optimizedContent = generatedContent || {};
    }

    // ─────────────────────────────────────────────────────────────
    // 🔒 THE ULTIMATE BACKUP GUARDRAIL: USER CONTENT RETENTION
    // ─────────────────────────────────────────────────────────────
    // If the AI optimization output stripped or misnamed the user's data fields,
    // we force-restore the authentic filled data right from the upload record.
    if (optimizedContent) {
      optimizedContent.userName = optimizedContent.userName || analysis.userName || optimizedJson.userName || "Candidat";
      optimizedContent.jobTitle = optimizedContent.jobTitle || analysis.jobTitle || optimizedJson.jobTitle || "Professionnel";
      optimizedContent.summary = optimizedContent.summary || optimizedJson.summary || "";

      // Hydrate Experience array
      if (!optimizedContent.experience || !Array.isArray(optimizedContent.experience) || optimizedContent.experience.length === 0) {
        if (optimizedJson.experience && Array.isArray(optimizedJson.experience) && optimizedJson.experience.length > 0) {
          optimizedContent.experience = optimizedJson.experience;
        } else {
          optimizedContent.experience = [];
        }
      }

      // Hydrate Education array
      if (!optimizedContent.education || !Array.isArray(optimizedContent.education) || optimizedContent.education.length === 0) {
        if (optimizedJson.education && Array.isArray(optimizedJson.education) && optimizedJson.education.length > 0) {
          optimizedContent.education = optimizedJson.education;
        } else {
          optimizedContent.education = [];
        }
      }

      // Hydrate Projects array
      if (!optimizedContent.projects || !Array.isArray(optimizedContent.projects) || optimizedContent.projects.length === 0) {
        if (optimizedJson.projects && Array.isArray(optimizedJson.projects) && optimizedJson.projects.length > 0) {
          optimizedContent.projects = optimizedJson.projects;
        } else {
          optimizedContent.projects = [];
        }
      }

      // Hydrate Skills array and combine with missing keywords
      const baseSkills = Array.isArray(optimizedJson.skills) ? optimizedJson.skills : [];
      const missingSkills = analysisData.keywordsMissing || [];
      if (!optimizedContent.skills || !Array.isArray(optimizedContent.skills) || optimizedContent.skills.length === 0) {
        optimizedContent.skills = Array.from(new Set([...baseSkills, ...missingSkills]));
      }

      // Hydrate Languages array
      if (!optimizedContent.languages || !Array.isArray(optimizedContent.languages)) {
        optimizedContent.languages = Array.isArray(optimizedJson.languages) ? optimizedJson.languages : [];
      }
    }

    // Save completely filled object back to the database
    await db
      .update(cvAnalyses)
      .set({ optimizedData: optimizedContent })
      .where(eq(cvAnalyses.id, analysisId));

    // Push changes down to cvTemplates rows
    const existingTemplates = await db.query.cvTemplates.findMany({
      where: eq(cvTemplates.analysisId, analysisId),
    });

    if (existingTemplates.length > 0) {
      await Promise.all(
        existingTemplates.map((template) =>
          db
            .update(cvTemplates)
            .set({
              templateData: {
                ...optimizedContent,
                contact: optimizedContent.contact || (template.templateData as any)?.contact || {
                  email: "",
                  phone: "",
                  location: "",
                  linkedin: "",
                  github: "",
                  portfolio: "",
                },
              },
            })
            .where(eq(cvTemplates.id, template.id))
        )
      );
    } else {
      const { CV_TEMPLATE_STYLES } = await import("@/lib/cv-template-styles");

      const newTemplates = CV_TEMPLATE_STYLES.map((style, index) => ({
        analysisId,
        templateNumber: index + 1,
        templateStyle: style,
        templateData: {
          ...optimizedContent,
          contact: optimizedContent.contact || {
            email: "",
            phone: "",
            location: "",
            linkedin: "",
            github: "",
            portfolio: "",
          },
        },
        isPaid: true,
      }));

      await db.insert(cvTemplates).values(newTemplates);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("❌ API /generate-templates error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}