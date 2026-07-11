import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cvAnalyses, cvTemplates } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateOptimizedCV } from "@/lib/ai/ats-analyzer";

/**
 * Clean and robust JSON parser designed to safely extract objects 
 * from LLM outputs even if they are wrapped in Markdown or contain bad formatting.
 */
function robustJsonParse(input: any): any {
  if (!input) return null;
  if (typeof input === "object") return input;

  let cleanInput = String(input).trim();

  // Stripping code fences if markdown output is sent back
  if (cleanInput.startsWith("```")) {
    cleanInput = cleanInput.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  cleanInput = cleanInput.trim();

  try {
    return JSON.parse(cleanInput);
  } catch (e) {
    console.warn("❌ [PARSE ERROR] Standard JSON parse failed, trying control character cleanup...");
    try {
      // Removing control characters (newlines, tabs inside string scopes) that break native parsing
      const serialized = cleanInput
        .replace(/[\u0000-\u0019]+/g, "")
        .trim();
      return JSON.parse(serialized);
    } catch (err) {
      console.error("❌ [PARSE CRITICAL] Could not parse LLM output safely.");
      return null;
    }
  }
}

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

    // Safeguards retrieval of text, using type-cast to skip strict type checking warnings
    let originalText =
      (analysis as any).cvText ||
      (analysis as any).rawText ||
      optimizedJson._originalCvText ||
      optimizedJson.originalText ||
      "";

    const analysisData = {
      atsScore: typeof analysis.atsScore === "number" ? analysis.atsScore : undefined,
      scoreBreakdown: (analysis.scoreBreakdown as Record<string, { score: number; max: number }>) ?? undefined,
      flaws: Array.isArray(analysis.flaws) ? (analysis.flaws as string[]) : [],
      suggestions: Array.isArray(analysis.suggestions) ? (analysis.suggestions as string[]) : [],
      keywordsMissing: Array.isArray(analysis.keywordsMissing) ? (analysis.keywordsMissing as string[]) : [],
      keywordsFound: Array.isArray(analysis.keywordsFound) ? (analysis.keywordsFound as string[]) : [],
    };

    // Triggering the LLM generator
    let generatedContent = await generateOptimizedCV(
      originalText,
      analysis.jobDescription || "Optimisation standard",
      analysisData
    );

    // Parsing the LLM content cleanly
    let optimizedContent = robustJsonParse(generatedContent);

    if (!optimizedContent || Object.keys(optimizedContent).length === 0) {
      console.warn("⚠️ Empty optimized content generated, using initial base data.");
      optimizedContent = typeof generatedContent === "object" ? generatedContent : {};
    }

    // Fix candidate name if the parsing phase caught metadata keywords instead of the person's name
    const invalidKeywords = ["website", "management", "cv", "resume", "curriculum", "e-commerce", "project", "projet"];
    const currentNameLower = (optimizedContent.userName || "").toLowerCase();
    const isNameCorrupted = invalidKeywords.some(keyword => currentNameLower.includes(keyword)) || !optimizedContent.userName || optimizedContent.userName.trim() === "";

    if (isNameCorrupted) {
      const dbUserName = analysis.userName; // Constant lock for strict null checks
      if (dbUserName && !invalidKeywords.some(keyword => dbUserName.toLowerCase().includes(keyword))) {
        optimizedContent.userName = dbUserName;
      } else {
        const cleanNameMatch = originalText.match(/^([A-Z][a-zÀ-ÿ]+(?:\s[A-Z][a-zÀ-ÿ]+)+)/m);
        optimizedContent.userName = cleanNameMatch ? cleanNameMatch[1].trim() : "Candidat";
      }
    }

    // Dynamic Title Guard
    if (!optimizedContent.jobTitle || optimizedContent.jobTitle.trim() === "") {
      optimizedContent.jobTitle = analysis.jobTitle || "Professionnel";
    }

    // Dynamic Contact Guard
    if (!optimizedContent.contact) optimizedContent.contact = {};
    const databaseContact = (optimizedJson && typeof optimizedJson === 'object') ? (optimizedJson.contact || {}) : {};
    optimizedContent.contact = {
      email: optimizedContent.contact.email || databaseContact.email || "",
      phone: optimizedContent.contact.phone || databaseContact.phone || "",
      location: optimizedContent.contact.location || databaseContact.location || "",
      linkedin: optimizedContent.contact.linkedin || databaseContact.linkedin || "",
      github: optimizedContent.contact.github || databaseContact.github || "",
      portfolio: optimizedContent.contact.portfolio || databaseContact.portfolio || "",
    };

    // Restore historical context from the original parsed uploaded CV if the generator returned empty sections
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

    // Saving the sanitized payload to main analytical table row
    await db
      .update(cvAnalyses)
      .set({
        optimizedData: optimizedContent,
        userName: optimizedContent.userName,
        jobTitle: optimizedContent.jobTitle,
      })
      .where(eq(cvAnalyses.id, analysisId));

    // Sync the template layouts associated with this analysis for direct UI rendering
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
    // Explicitly serializing errors to capture any hidden issues on cloud consoles
    console.error("❌ [CRITICAL LINE ERR] Details:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    return NextResponse.json(
      { error: error?.message || "Internal error encountered" },
      { status: 500 }
    );
  }
}