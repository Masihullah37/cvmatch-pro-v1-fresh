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

    // Original CV text extracted during ATS analysis
    const originalText =
      (analysis.optimizedData as any)?._originalCvText || "";

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