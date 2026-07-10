import { generateLLMResponse } from "./llm-gateway";
import { type StructuredJobDetails } from "@/lib/utils/scraper";
import { applyCoherentAtsScoring } from "@/lib/ai/keyword-normalizer";

// ─────────────────────────────────────────────────────────────
// 🔒 ROBUST JSON EXTRACTOR
// Handles ALL model types:
//   - Clean JSON models (llama-3.3-70b-versatile) ✅
//   - Models that add preamble ("Here is the JSON:") ✅
//   - Reasoning models with <think> blocks ✅
//   - Models that wrap JSON in ```json ``` fences ✅
// ─────────────────────────────────────────────────────────────
function extractJSON(text: string): string {
  // Step 1: Remove reasoning blocks from thinking models
  // Handles <think>...</think>, <reasoning>...</reasoning> etc.
  let cleaned = text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "")
    .replace(/<thinking>[\s\S]*?<\/antml:thinking>/gi, "")
    .trim();

  // Step 2: Remove markdown code fences ```json ... ``` or ``` ... ```
  cleaned = cleaned
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // Step 3: Remove any text before the first { character
  // (handles "Here is the JSON:" preamble)
  const firstBrace = cleaned.indexOf("{");
  if (firstBrace > 0) {
    cleaned = cleaned.substring(firstBrace);
  }

  // Step 4: Remove any text after the last } character
  // (handles trailing explanations after JSON)
  const lastBrace = cleaned.lastIndexOf("}");
  if (lastBrace !== -1 && lastBrace < cleaned.length - 1) {
    cleaned = cleaned.substring(0, lastBrace + 1);
  }

  // Step 5: Validate we have something JSON-like
  if (!cleaned.startsWith("{") || !cleaned.endsWith("}")) {
    console.error("❌ RAW AI RESPONSE (no JSON found):", text.substring(0, 500));
    throw new Error("No valid JSON object found in AI response");
  }

  return cleaned;
}

// ─────────────────────────────────────────────────────────────
// 🔒 SAFE PARSER
// ─────────────────────────────────────────────────────────────
function safeParse(text: string): any {
  try {
    const jsonString = extractJSON(text);
    return JSON.parse(jsonString);
  } catch (err: any) {
    console.error("❌ JSON PARSE FAILED");
    console.error("RAW RESPONSE (first 1000 chars):", text.substring(0, 1000));
    throw new Error(`Invalid JSON returned by AI: ${err.message}`);
  }
}

// ─────────────────────────────────────────────────────────────
// 📊 ANALYZE CV (ATS SCORING)
// ─────────────────────────────────────────────────────────────
export async function analyzeCV(
  cvText: string,
  jobDescription: string,
  structuredJobDetails?: StructuredJobDetails,
  locale?: string
) {
  const safeCvText = cvText.substring(0, 6000);
  const safeJobDescription = jobDescription.substring(0, 3000);
  const isGeneral = jobDescription.includes("Optimisation standard");
  const targetLanguage = locale === "fr" ? "French (fr)" : "English (en)";

  const structuredContext = structuredJobDetails
    ? `
Structured Job Data:
- Title: ${structuredJobDetails.title}
- Skills: ${structuredJobDetails.skills.join(", ") || "N/A"}
- Requirements: ${structuredJobDetails.requirements.join(" | ") || "N/A"}
- Responsibilities: ${structuredJobDetails.responsibilities.join(" | ") || "N/A"}
- Keyword seeds: ${structuredJobDetails.keywords.join(", ") || "N/A"}
`
    : "";

  const prompt = `You MUST respond with ONLY a valid JSON object.
No explanations, no markdown, no text before or after the JSON.
Start your response with { and end with }.

Task: Analyze this CV ${isGeneral ? "for general professional standards" : "against the Job Description for ATS compatibility"}.

LANGUAGE REQUIREMENT:
- Write ALL "flaws" and "suggestions" in ${targetLanguage}.
- Keywords must be in their original language as they appear in the CV/JD.

KEYWORD RULES (Critical — read carefully):
1. Keywords = ONLY hard technical skills, tools, frameworks, coding languages, methodologies (React, Docker, Agile, PHP, Git, Python, etc.)
2. Maximum 3 words per keyword, maximum 30 characters.
3. NEVER include: full sentences, job titles, soft skills, generic words (motivé, expérience, application).
4. keywordsMissing = hard skills in JD but NOT in CV (max 15 items).
5. keywordsFound = hard skills present in BOTH CV and JD (max 15 items).
6. NEVER put the same skill in both lists.
7. If a full skill (e.g. "RESTful API") is in CV, do NOT list substrings (e.g. "REST", "API") as missing.

FLAW & SUGGESTION RULES:
1. Each flaw/suggestion must be a complete, professional, actionable sentence in ${targetLanguage}.
2. NOT single words or fragments — full sentences only.
3. Maximum 5 flaws, maximum 5 suggestions.
4. Example good flaw: "Vos expériences ne contiennent pas d'indicateurs chiffrés (%, €, délais) pour démontrer votre impact."
5. Example bad flaw: "chiffres" or "impact manquant".

SCORING RULES (must sum to atsScore):
- keywordMatch: max 30pts. Formula: (keywordsFound.length / (keywordsFound.length + keywordsMissing.length)) * 30. If both empty: 15.
- format: max 20pts. Deduct 5pts per structural flaw (missing contact, bad layout). Min 5.
- experience: max 20pts. Perfect match=20, partial=10-15, no match=0-9.
- education: max 10pts. Required degree=10, different field=5, missing=0.
- skills: max 15pts. Strong technical list=15, weak/missing=5-10.
- readability: max 5pts. Clear hierarchy=5, verbose/wall of text=1-4.
- atsScore MUST equal the exact sum of all 6 sub-scores.

Return this EXACT JSON structure:
{
  "atsScore": 0,
  "scoreBreakdown": {
    "keywordMatch": { "score": 0, "max": 30 },
    "format": { "score": 0, "max": 20 },
    "experience": { "score": 0, "max": 20 },
    "education": { "score": 0, "max": 10 },
    "skills": { "score": 0, "max": 15 },
    "readability": { "score": 0, "max": 5 }
  },
  "flaws": ["sentence 1", "sentence 2"],
  "suggestions": ["actionable sentence 1", "actionable sentence 2"],
  "keywordsMissing": ["TechnicalSkill1", "TechnicalSkill2"],
  "keywordsFound": ["FoundSkill1", "FoundSkill2"]
}

CV:
${safeCvText}

${isGeneral ? "" : `Job Description:\n${safeJobDescription}`}
${structuredContext}`;

  try {
    const text = await generateLLMResponse({
      prompt,
      temperature: 0.1,
      maxTokens: 3000,
    });

    const parsed = safeParse(text);

    // Validate and enforce atsScore = sum of sub-scores
    if (parsed.scoreBreakdown) {
      const calculatedTotal = Object.values(parsed.scoreBreakdown as Record<string, { score: number }>)
        .reduce((sum, val) => sum + (val.score || 0), 0);
      if (Math.abs(calculatedTotal - parsed.atsScore) > 2) {
        parsed.atsScore = calculatedTotal;
      }
    }

    return applyCoherentAtsScoring(parsed);
  } catch (error: any) {
    console.error("analyzeCV Error:", error?.message || error);
    throw new Error(`Failed to analyze CV: ${error?.message || "Unknown error"}`);
  }
}

// ─────────────────────────────────────────────────────────────
// ✍️ EXTRACT RAW CV DATA (no AI optimization)
// ─────────────────────────────────────────────────────────────
export async function extractRawCVData(cvText: string) {
  const safeCvText = cvText.substring(0, 6000);

  const prompt = `You MUST respond with ONLY a valid JSON object.
No explanations, no markdown, no text before or after the JSON.
Start your response with { and end with }.

Task: Extract all information from this CV exactly as written.
DO NOT optimize, rephrase, or improve anything.
Match the original language of the CV exactly.

Return this EXACT JSON structure:
{
  "userName": "full name from CV",
  "jobTitle": "current or most recent job title",
  "summary": "professional summary if present, else empty string",
  "contact": {
    "email": "",
    "phone": "",
    "location": "",
    "linkedin": "",
    "github": "",
    "portfolio": ""
  },
  "experience": [
    { "title": "", "company": "", "period": "", "description": "" }
  ],
  "education": [
    { "degree": "", "school": "", "year": "", "details": "" }
  ],
  "projects": [
    { "name": "", "description": "", "technologies": [] }
  ],
  "skills": [],
  "languages": [
    { "language": "", "level": "" }
  ],
  "interests": []
}

CV:
${safeCvText}`;

  try {
    const text = await generateLLMResponse({
      prompt,
      temperature: 0,
      maxTokens: 3000,
    });

    return safeParse(text);
  } catch (error: any) {
    console.error("extractRawCVData Error:", error?.message || error);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// ✍️ GENERATE OPTIMIZED CV
// ─────────────────────────────────────────────────────────────
export async function generateOptimizedCV(
  cvText: string,
  jobDescription: string,
  analysisResult?: any,
  structuredJobDetails?: StructuredJobDetails
) {
  const safeCvText = cvText.substring(0, 6000);
  const safeJobDescription = jobDescription.substring(0, 3000);
  const isGeneral = jobDescription.includes("Optimisation standard");

  const missingKeywords = analysisResult?.keywordsMissing?.slice(0, 10).join(", ") || "";
  const foundKeywords = analysisResult?.keywordsFound?.join(", ") || "";

  const suggestions = analysisResult?.suggestions?.join("\n- ") || "";

  const flaws = analysisResult?.flaws?.join("\n- ") || "";

  const structuredContext = structuredJobDetails
    ? `
Structured Job Data:
- Title: ${structuredJobDetails.title}
- Skills: ${structuredJobDetails.skills.join(", ") || "N/A"}
- Requirements: ${structuredJobDetails.requirements.join(" | ") || "N/A"}
- Responsibilities: ${structuredJobDetails.responsibilities.join(" | ") || "N/A"}
`
    : "";

  const prompt = `You MUST respond with ONLY a valid JSON object.
No explanations.
No markdown.
No text before or after the JSON.
Start your response with { and end with }.

You are one of the world's best ATS Resume Writers and Career Coaches.

Your goal is NOT simply to rewrite the CV.

Your goal is to MAXIMIZE the ATS score while remaining 100% truthful.

${isGeneral
? `
Optimize this CV according to modern professional resume best practices.
`
: `
Optimize this CV specifically for the following Job Description.

==============================
ATS ANALYSIS
==============================

Current ATS Score:
${analysisResult?.atsScore ?? "Unknown"}

Missing Keywords:
${missingKeywords || "None"}

Existing Matching Keywords:
${foundKeywords || "None"}

Detected ATS Weaknesses:
${flaws || "None"}

ATS Suggestions:
${suggestions || "None"}

==============================
YOUR OBJECTIVE
==============================

Increase the ATS score as much as possible.

Follow EVERY ATS suggestion whenever possible.

Fix EVERY detected ATS weakness whenever possible.

Every missing keyword that can truthfully fit MUST appear somewhere inside the optimized CV.

Never invent fake experience.

Never invent fake companies.

Never invent fake projects.

Only strengthen existing information.

`
}

==================================================
MANDATORY RULES
==================================================

1. Preserve ALL existing information.

2. Never remove experience.

3. Never remove education.

4. Never remove projects.

5. Never remove existing skills.

6. Rewrite the Professional Summary so it naturally includes the highest priority ATS keywords.

7. Rewrite every Experience description using STAR methodology.

8. Whenever a missing keyword genuinely applies to an experience, insert it naturally.

9. Whenever a missing keyword applies to a project, include it.

10. The Skills array MUST contain:
   - existing skills
   - relevant missing ATS keywords
   - without duplicates

11. Every Project must contain technologies used.

12. If Adobe products, software, frameworks or tools are listed in the missing keywords and they truthfully fit the candidate's experience, include them inside:
   - skills
   - project technologies
   - experience descriptions
   - summary

13. Improve keyword density for ATS while remaining natural.

14. Never keyword stuff.

15. Never fabricate certifications, degrees or technologies the candidate clearly never used.

16. Preserve the original CV language exactly (French stays French, English stays English).

17. Return ONLY valid JSON.

==================================================
OUTPUT FORMAT
==================================================

Return EXACTLY this JSON schema.

{
  "userName": "",
  "jobTitle": "",
  "summary": "",
  "contact": {
    "email": "",
    "phone": "",
    "location": "",
    "linkedin": "",
    "github": "",
    "portfolio": ""
  },
  "experience": [
    {
      "title": "",
      "company": "",
      "period": "",
      "description": ""
    }
  ],
  "education": [
    {
      "degree": "",
      "school": "",
      "year": "",
      "details": ""
    }
  ],
  "projects": [
    {
      "name": "",
      "description": "",
      "technologies": []
    }
  ],
  "skills": [],
  "languages": [
    {
      "language": "",
      "level": ""
    }
  ],
  "interests": []
}

==================================================
CV
==================================================

${safeCvText}

${isGeneral ? "" : `Job Description:\n${safeJobDescription}`}

${structuredContext}
`;

  try {
    const text = await generateLLMResponse({
      prompt,
      temperature: 0.2,
      maxTokens: 3000,
    });

    console.log("=== generateOptimizedCV LLM Response (first 500 chars) ===");
    console.log(text.substring(0, 500));

    const parsed = safeParse(text);
    console.log("Missing keywords:", analysisResult?.keywordsMissing);

    console.log("Generated skills:", parsed.skills);

    console.log("Generated projects:", parsed.projects);

    console.log("Generated summary:", parsed.summary);

    // Fallback: extract name from CV text if AI missed it
    if (!parsed.userName || parsed.userName.includes("full name") || parsed.userName === "") {
      const nameMatch = cvText.match(/^([A-Z][a-zÀ-ÿ]+(?:\s[A-Z][a-zÀ-ÿ]+)+)/m);
      if (nameMatch) parsed.userName = nameMatch[1];
    }

    // Ensure contact object always exists with all fields
    if (!parsed.contact) parsed.contact = {};
    parsed.contact = {
      email: parsed.contact.email || "",
      phone: parsed.contact.phone || "",
      location: parsed.contact.location || "",
      linkedin: parsed.contact.linkedin || "",
      github: parsed.contact.github || "",
      portfolio: parsed.contact.portfolio || "",
    };

    return parsed;
  } catch (error: any) {
    console.error("generateOptimizedCV Error:", error?.message || error);

    // Return structured error object (doesn't crash the UI)
    return {
      userName: "Erreur",
      jobTitle: "Vérifiez les logs",
      summary: `Erreur IA: ${error?.message || "Erreur inconnue"}`,
      contact: { email: "", phone: "", location: "", linkedin: "", github: "", portfolio: "" },
      experience: [],
      education: [],
      projects: [],
      skills: [],
      languages: [],
      interests: [],
    };
  }
}
