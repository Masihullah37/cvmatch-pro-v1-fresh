import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cvAnalyses, cvTemplates } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateOptimizedCV } from '@/lib/ai/ats-analyzer';
import { validateOptimizedCV } from '@/lib/ai/resume-validator';

export async function POST(req: Request) {
  try {
    const { analysisId } = await req.json();

    const analysis = await db.query.cvAnalyses.findFirst({
      where: eq(cvAnalyses.id, analysisId)
    });

    if (!analysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    // Run real AI optimization
     const originalText = (analysis.optimizedData as any)?._originalCvText || "";

     const generatedContent = await generateOptimizedCV(
     originalText,
     analysis.jobDescription || "",
    {
     atsScore: analysis.atsScore,
     scoreBreakdown: analysis.scoreBreakdown,
     flaws: analysis.flaws,
     suggestions: analysis.suggestions,
     keywordsMissing: analysis.keywordsMissing,
     keywordsFound: analysis.keywordsFound,
    }
  );

    const optimizedContent = await generateOptimizedCV(
       originalText,
       analysis.jobDescription || "",
      {
       atsScore: analysis.atsScore,
       scoreBreakdown: analysis.scoreBreakdown,
       flaws: analysis.flaws,
       suggestions: analysis.suggestions,
       keywordsMissing: analysis.keywordsMissing,
       keywordsFound: analysis.keywordsFound,
      }
    );

    if (!optimizedContent) {
      throw new Error("AI Optimization failed");
    }

    // Update Analysis record
    await db.update(cvAnalyses)
      .set({ optimizedData: optimizedContent })
      .where(eq(cvAnalyses.id, analysisId));

    // Update existing templates or create them
    const existingTemplates = await db.query.cvTemplates.findMany({
      where: eq(cvTemplates.analysisId, analysisId)
    });

    if (existingTemplates.length > 0) {
      // Update all existing templates with the new optimized data
      await Promise.all(
        existingTemplates.map(t => 
          db.update(cvTemplates)
            .set({ 
              templateData: {
                ...optimizedContent,
                contact: optimizedContent.contact || (t.templateData as any)?.contact || { email: "", phone: "", location: "" }
              }
            })
            .where(eq(cvTemplates.id, t.id))
        )
      );
    } else {
      // Create them (though ensureTemplatesExist usually does this)
      const { CV_TEMPLATE_STYLES } = await import('@/lib/cv-template-styles');
      const styles = [...CV_TEMPLATE_STYLES];
      const newTemplates = styles.map((style, i) => ({
        analysisId,
        templateNumber: i + 1,
        templateStyle: style,
        templateData: { 
          ...optimizedContent,
          contact: optimizedContent.contact || { email: "", phone: "", location: "" }
        },
        isPaid: true
      }));
      await db.insert(cvTemplates).values(newTemplates);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API /generate-templates error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
