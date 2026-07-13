import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { cvAnalyses, cvTemplates } from '@/lib/db/schema';
import { generateOptimizedCV, recalculateScoreForStructuredCV } from '@/lib/ai/ats-analyzer';
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

    // ── Reconstruct existing structured CV from DB ─────────
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
      interests: Array.isArray(optimizedData?.interests)
        ? optimizedData.interests
        : [],
    };

    const hasStructuredData =
      existingStructuredCV.userName ||
      existingStructuredCV.experience.length > 0 ||
      existingStructuredCV.education.length > 0;

    console.log("[generate-templates] CV data check:", {
      hasStructuredData,
      existingUserName: existingStructuredCV.userName,
      existingExperienceCount: existingStructuredCV.experience.length,
      existingSkillsCount: existingStructuredCV.skills.length,
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
      keywordsMissingCount: analysisResult.keywordsMissing.length,
      suggestionsCount: analysisResult.suggestions.length,
    });

    // ── Step 1: AI optimization with fallback ──────────────
    // generateOptimizedCV now uses a compact CV summary prompt
    // to stay within token limits. If AI fails for any reason,
    // we fall back to the existing optimizedData from the DB.
    let optimizedContent: any = null;
    let aiSucceeded = false;

    // Cleanly extract the stored raw CV text from DB BEFORE the function call
    const originalCvText =
      optimizedData?._originalCvText ||
      optimizedData?._originalcvtext ||
      "";

    try {
      // optimizedContent = await generateOptimizedCV(
      //   "",                     // cvText no longer needed (compact summary built internally)
      //   analysis.jobDescription || "",
      //   analysisResult,
      //   undefined,
      //   existingStructuredCV
      // );



      // Execute the optimized AI call with clean, defined arguments
      optimizedContent = await generateOptimizedCV(
        originalCvText,   // ← pass the actual CV text
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

    // ── Step 2: Fallback — use existing DB data ────────────
    if (!optimizedContent) {
      console.log("[generate-templates] Using existing optimizedData from DB as fallback");
      optimizedContent = existingStructuredCV;
    }

    if (!optimizedContent) {
      return NextResponse.json(
        { error: "No CV data available. Please re-upload your CV." },
        { status: 422 }
      );
    }

    // ── Step 3: Keyword validation pass (only if AI succeeded) ─
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

    // ── Step 4: Ensure contact object is always complete ───
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

    console.log("[generate-templates] Final content summary:", {
      userName: finalContent.userName,
      experienceCount: finalContent.experience?.length,
      educationCount: finalContent.education?.length,
      skillsCount: finalContent.skills?.length,
      projectsCount: finalContent.projects?.length,
      aiOptimized: aiSucceeded,
    });

    // ── Step 5: Persist to DB ───────────────────────────────
    // ── Step 5: Recalculate score and persist to DB ─────────
    if (aiSucceeded) {
      const scoreUpdate = recalculateScoreForStructuredCV(finalContent, analysisResult);

      const dbOptimizedData = {
        ...finalContent,
        _originalCvText: originalCvText,
        _optimizedCvText: scoreUpdate.optimizedCvText,
      };

      await db.update(cvAnalyses)
        .set({
          optimizedData: dbOptimizedData,
          atsScore: scoreUpdate.atsScore,
          scoreBreakdown: scoreUpdate.scoreBreakdown,
          keywordsFound: scoreUpdate.keywordsFound,
          keywordsMissing: scoreUpdate.keywordsMissing,
        })
        .where(eq(cvAnalyses.id, analysisId));

      console.log(
        "[generate-templates] Analysis record updated with AI content & recalculated ATS score:",
        scoreUpdate.atsScore
      );

      // ── Step 6: Update or create template records ───────────
      const existingTemplates = await db.query.cvTemplates.findMany({
        where: eq(cvTemplates.analysisId, analysisId)
      });

      if (existingTemplates.length > 0) {
        await Promise.all(
          existingTemplates.map(t =>
            db.update(cvTemplates)
              .set({
                templateData: {
                  ...dbOptimizedData,
                  sectionOrder: (t.templateData as any)?.sectionOrder
                    || (dbOptimizedData as any)?.sectionOrder,
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
          templateData: dbOptimizedData,
          isPaid: true,
        }));
        await db.insert(cvTemplates).values(newTemplates);
        console.log(`[generate-templates] Created ${newTemplates.length} new templates`);
      }
    } else {
      // If AI failed, we still update template records with the existing fallback data
      const existingTemplates = await db.query.cvTemplates.findMany({
        where: eq(cvTemplates.analysisId, analysisId)
      });

      const fallbackOptimizedData = {
        ...existingStructuredCV,
        _originalCvText: originalCvText,
      };

      if (existingTemplates.length > 0) {
        await Promise.all(
          existingTemplates.map(t =>
            db.update(cvTemplates)
              .set({
                templateData: {
                  ...fallbackOptimizedData,
                  sectionOrder: (t.templateData as any)?.sectionOrder
                    || (fallbackOptimizedData as any)?.sectionOrder,
                }
              })
              .where(eq(cvTemplates.id, t.id))
          )
        );
        console.log(`[generate-templates] Updated ${existingTemplates.length} fallback templates`);
      } else {
        const { CV_TEMPLATE_STYLES } = await import('@/lib/cv-template-styles');
        const styles = [...CV_TEMPLATE_STYLES];
        const newTemplates = styles.map((style, i) => ({
          analysisId,
          templateNumber: i + 1,
          templateStyle: style,
          templateData: fallbackOptimizedData,
          isPaid: true,
        }));
        await db.insert(cvTemplates).values(newTemplates);
        console.log(`[generate-templates] Created ${newTemplates.length} new fallback templates`);
      }
    }

    return NextResponse.json({
      success: true,
      aiOptimized: aiSucceeded,
    });

  } catch (error: any) {
    console.error('[generate-templates] Unhandled error:', error);
    return NextResponse.json(
      { error: error.message || 'CV generation failed' },
      { status: 500 }
    );
  }
}