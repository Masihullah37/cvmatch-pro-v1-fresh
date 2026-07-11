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

    // ─────────────────────────────────────────────────────────────
    // 🛡️ DYNAMIC TEXT RECOVERY
    // Always fall back to the absolute raw input text of the CV
    // ─────────────────────────────────────────────────────────────
    const optimizedJson = (analysis.optimizedData as any) || {};

    let originalText =
      (analysis as any).cvText ||
      (analysis as any).rawText ||
      optimizedJson._originalCvText ||
      optimizedJson.originalText ||
      "";

    // Prepare structured optimization metadata from the first analysis phase
    const analysisData = {
      atsScore: typeof analysis.atsScore === "number" ? analysis.atsScore : undefined,
      scoreBreakdown: (analysis.scoreBreakdown as Record<string, { score: number; max: number }>) ?? undefined,
      flaws: Array.isArray(analysis.flaws) ? (analysis.flaws as string[]) : [],
      suggestions: Array.isArray(analysis.suggestions) ? (analysis.suggestions as string[]) : [],
      keywordsMissing: Array.isArray(analysis.keywordsMissing) ? (analysis.keywordsMissing as string[]) : [],
      keywordsFound: Array.isArray(analysis.keywordsFound) ? (analysis.keywordsFound as string[]) : [],
    };

    // Execute the optimizer using the raw source text stream
    let generatedContent = await generateOptimizedCV(
      originalText,
      analysis.jobDescription || "Optimisation standard",
      analysisData
    );

    // Run the safety verification schema loop
    let optimizedContent = await validateOptimizedCV(
      generatedContent,
      analysisData
    );

    if (!optimizedContent) {
      optimizedContent = generatedContent || {};
    }

    // ─────────────────────────────────────────────────────────────
    // 🔒 FULLY DYNAMIC SELF-HEALING HOOKS (Universal Application)
    // ─────────────────────────────────────────────────────────────
    if (optimizedContent) {
      // Dynamic Name Sanitization: Handle null/blank properties cleanly
      const invalidKeywords = ["website", "management", "cv", "resume", "curriculum", "e-commerce", "project", "projet"];
      const currentNameLower = (optimizedContent.userName || "").toLowerCase();
      const isNameCorrupted = invalidKeywords.some(keyword => currentNameLower.includes(keyword)) || !optimizedContent.userName || optimizedContent.userName.trim() === "";

      if (isNameCorrupted) {
        const dbUserName = analysis.userName; // Safely capture reference to fix null typing

        if (dbUserName && !invalidKeywords.some(keyword => dbUserName.toLowerCase().includes(keyword))) {
          // If the top-level analysis row captured a cleaner profile record, use that
          optimizedContent.userName = dbUserName;
        } else {
          // Regex fallback: Grab the very first capitalized sequence line from the raw document string
          const cleanNameMatch = originalText.match(/^([A-Z][a-zÀ-ÿ]+(?:\s[A-Z][a-zÀ-ÿ]+)+)/m);
          optimizedContent.userName = cleanNameMatch ? cleanNameMatch[1].trim() : "Candidat";
        }
      }

      // Dynamic Title Fallback
      if (!optimizedContent.jobTitle || optimizedContent.jobTitle.trim() === "") {
        optimizedContent.jobTitle = analysis.jobTitle || "Professionnel";
      }

      // Dynamic Contact Hydration Layer
      if (!optimizedContent.contact) optimizedContent.contact = {};
      const databaseContact = optimizedJson.contact || {};
      optimizedContent.contact = {
        email: optimizedContent.contact.email || databaseContact.email || "",
        phone: optimizedContent.contact.phone || databaseContact.phone || "",
        location: optimizedContent.contact.location || databaseContact.location || "",
        linkedin: optimizedContent.contact.linkedin || databaseContact.linkedin || "",
        github: optimizedContent.contact.github || databaseContact.github || "",
        portfolio: optimizedContent.contact.portfolio || databaseContact.portfolio || "",
      };

      // Array Structural Safety Nets: If the AI failed to populate arrays from text constraints,
      // recover the parsed structure from the source row instead of leaving it blank.
      if ((!optimizedContent.experience || optimizedContent.experience.length === 0) && optimizedJson.experience) {
        optimizedContent.experience = optimizedJson.experience;
      }
      if ((!optimizedContent.education || optimizedContent.education.length === 0) && optimizedJson.education) {
        optimizedContent.education = optimizedJson.education;
      }
      if ((!optimizedContent.projects || optimizedContent.projects.length === 0) && optimizedJson.projects) {
        optimizedContent.projects = optimizedJson.projects;
      }
      if ((!optimizedContent.skills || optimizedContent.skills.length === 0) && optimizedJson.skills) {
        optimizedContent.skills = optimizedJson.skills;
      }
      if ((!optimizedContent.languages || optimizedContent.languages.length === 0) && optimizedJson.languages) {
        optimizedContent.languages = optimizedJson.languages;
      }
    }

    // Persist optimized changes back to the operational database analysis table record
    await db
      .update(cvAnalyses)
      .set({
        optimizedData: optimizedContent,
        userName: optimizedContent.userName,
        jobTitle: optimizedContent.jobTitle,
      })
      .where(eq(cvAnalyses.id, analysisId));

    // Distribute data updates down into rendered user templates UI components views
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
                  email: "", phone: "", location: "", linkedin: "", github: "", portfolio: ""
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
            email: "", phone: "", location: "", linkedin: "", github: "", portfolio: ""
          },
        },
        isPaid: true,
      }));

      await db.insert(cvTemplates).values(newTemplates);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("❌ CRITICAL FAILURE DETECTED:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    return NextResponse.json(
      { error: error?.message || "Internal error encountered" },
      { status: 500 }
    );
  }
}