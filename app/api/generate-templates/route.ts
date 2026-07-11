// import { NextResponse } from 'next/server';
// import { db } from '@/lib/db';
// import { cvAnalyses, cvTemplates } from '@/lib/db/schema';
// import { eq } from 'drizzle-orm';
// import { generateOptimizedCV } from '@/lib/ai/ats-analyzer';
// import { validateOptimizedCV } from '@/lib/ai/resume-validator';

// export async function POST(req: Request) {
//   try {
//     const { analysisId } = await req.json();

//     const analysis = await db.query.cvAnalyses.findFirst({
//       where: eq(cvAnalyses.id, analysisId)
//     });

//     if (!analysis) {
//       return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
//     }

//     // Run real AI optimization
//      const originalText = (analysis.optimizedData as any)?._originalCvText || "";

//      const generatedContent = await generateOptimizedCV(
//      originalText,
//      analysis.jobDescription || "",
//     {
//      atsScore: analysis.atsScore,
//      scoreBreakdown: analysis.scoreBreakdown,
//      flaws: analysis.flaws,
//      suggestions: analysis.suggestions,
//      keywordsMissing: analysis.keywordsMissing,
//      keywordsFound: analysis.keywordsFound,
//     }
//   );

//     const optimizedContent = await validateOptimizedCV(
//     generatedContent,
//    {
//     atsScore: analysis.atsScore,
//     flaws: analysis.flaws,
//     suggestions: analysis.suggestions,
//     keywordsMissing: analysis.keywordsMissing,
//     keywordsFound: analysis.keywordsFound,
//     }
//   );

//     if (!optimizedContent) {
//       throw new Error("AI Optimization failed");
//     }

//     // Update Analysis record
//     await db.update(cvAnalyses)
//       .set({ optimizedData: optimizedContent })
//       .where(eq(cvAnalyses.id, analysisId));

//     // Update existing templates or create them
//     const existingTemplates = await db.query.cvTemplates.findMany({
//       where: eq(cvTemplates.analysisId, analysisId)
//     });

//     if (existingTemplates.length > 0) {
//       // Update all existing templates with the new optimized data
//       await Promise.all(
//         existingTemplates.map(t => 
//           db.update(cvTemplates)
//             .set({ 
//               templateData: {
//                 ...optimizedContent,
//                 contact: optimizedContent.contact || (t.templateData as any)?.contact || { email: "", phone: "", location: "" }
//               }
//             })
//             .where(eq(cvTemplates.id, t.id))
//         )
//       );
//     } else {
//       // Create them (though ensureTemplatesExist usually does this)
//       const { CV_TEMPLATE_STYLES } = await import('@/lib/cv-template-styles');
//       const styles = [...CV_TEMPLATE_STYLES];
//       const newTemplates = styles.map((style, i) => ({
//         analysisId,
//         templateNumber: i + 1,
//         templateStyle: style,
//         templateData: { 
//           ...optimizedContent,
//           contact: optimizedContent.contact || { email: "", phone: "", location: "" }
//         },
//         isPaid: true
//       }));
//       await db.insert(cvTemplates).values(newTemplates);
//     }

//     return NextResponse.json({ success: true });
//   } catch (error: any) {
//     console.error('API /generate-templates error:', error);
//     return NextResponse.json({ error: error.message }, { status: 500 });
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

    // // Original CV text extracted during ATS analysis
    // const originalText =
    //   (analysis.optimizedData as any)?._originalCvText || "";

    // 1. Try to extract raw string data from the jsonb payloads directly
    const optimizedJson = (analysis.optimizedData as any) || {};
    let originalText =
      optimizedJson._originalCvText ||
      optimizedJson.originalText ||
      optimizedJson.cvText ||
      "";

    // 2. STITCHING FALLBACK: If string fields are blank, compile the baseline structure 
    // from the available columns so the LLM receives the user's career context.
    if (!originalText || originalText.trim().length < 10) {
      const parts = [];
      if (analysis.userName) parts.push(`Candidate Name: ${analysis.userName}`);
      if (analysis.jobTitle) parts.push(`Target Professional Domain / Current Title: ${analysis.jobTitle}`);

      // Inject keywords already matched to solidify domain detection (e.g. React for developer)
      if (analysis.keywordsFound && Array.isArray(analysis.keywordsFound) && analysis.keywordsFound.length > 0) {
        parts.push(`Demonstrated Skills/Tools: ${analysis.keywordsFound.join(", ")}`);
      }

      // Deconstruct objects nested within the optimizedData schema
      if (typeof optimizedJson === "object" && optimizedJson !== null) {
        if (optimizedJson.summary) parts.push(`Summary: ${optimizedJson.summary}`);
        if (optimizedJson.skills && Array.isArray(optimizedJson.skills)) parts.push(`Skills Inventory: ${optimizedJson.skills.join(", ")}`);
        if (optimizedJson.experience) parts.push(`Work Experience History: ${JSON.stringify(optimizedJson.experience)}`);
        if (optimizedJson.education) parts.push(`Education Details: ${JSON.stringify(optimizedJson.education)}`);
        if (optimizedJson.projects) parts.push(`Projects Log: ${JSON.stringify(optimizedJson.projects)}`);
      }

      originalText = parts.join("\n\n");
    }

    // 3. Prevent execution if context cannot be reliably inferred
    if (!originalText || originalText.trim().length < 10) {
      return NextResponse.json(
        { error: "Cannot optimize CV: Baseline resume information could not be resolved." },
        { status: 400 }
      );
    }



    /**
     * Normalize database JSON fields.
     * Drizzle returns JSON columns as unknown, so convert them
     * into the expected types before passing to AI functions.
     */
    const analysisData = {
      atsScore:
        typeof analysis.atsScore === "number"
          ? analysis.atsScore
          : undefined,

      scoreBreakdown:
        (analysis.scoreBreakdown as Record<
          string,
          { score: number; max: number }
        >) ?? undefined,

      flaws: Array.isArray(analysis.flaws)
        ? (analysis.flaws as string[])
        : [],

      suggestions: Array.isArray(analysis.suggestions)
        ? (analysis.suggestions as string[])
        : [],

      keywordsMissing: Array.isArray(analysis.keywordsMissing)
        ? (analysis.keywordsMissing as string[])
        : [],

      keywordsFound: Array.isArray(analysis.keywordsFound)
        ? (analysis.keywordsFound as string[])
        : [],
    };

    // Generate optimized CV
    const generatedContent = await generateOptimizedCV(
      originalText,
      analysis.jobDescription || "",
      analysisData
    );

    // Validate and improve optimized CV
    const optimizedContent = await validateOptimizedCV(
      generatedContent,
      analysisData
    );

    if (!optimizedContent) {
      throw new Error("AI Optimization failed");
    }

    // Save optimized CV back into analysis
    await db
      .update(cvAnalyses)
      .set({
        optimizedData: optimizedContent,
      })
      .where(eq(cvAnalyses.id, analysisId));

    // Update templates
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
                contact:
                  optimizedContent.contact ||
                  (template.templateData as any)?.contact || {
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
      const { CV_TEMPLATE_STYLES } = await import(
        "@/lib/cv-template-styles"
      );

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

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error("API /generate-templates error:", error);

    return NextResponse.json(
      {
        error: error?.message || "Unknown error",
      },
      {
        status: 500,
      }
    );
  }
}