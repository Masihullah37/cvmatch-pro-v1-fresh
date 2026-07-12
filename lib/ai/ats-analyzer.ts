import { generateLLMResponse } from "./llm-gateway";
import { type StructuredJobDetails } from "@/lib/utils/scraper";
import { applyCoherentAtsScoring } from "@/lib/ai/keyword-normalizer";

// ─────────────────────────────────────────────────────────────
// 🔒 ROBUST JSON EXTRACTOR


function extractJSON(text: string): string {
  // Step 1: Strip reasoning blocks (double safety after llm-gateway)
  // openai/gpt-oss-120b sometimes embeds partial JSON inside
  // <think> blocks — stripping here prevents false matches
  let cleaned = text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<thinking>[\s\S]*?<\/antml:thinking>/gi, "")
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "")
    .trim();

  // Step 2: Remove markdown code fences
  cleaned = cleaned
    .replace(/^```(?:json)?\s*/im, "")
    .replace(/\s*```$/im, "")
    .trim();

  // Step 3: Find the LAST complete JSON object by brace balancing
  // WHY LAST: reasoning models output real JSON at the END
  // A naive "first { to last }" approach grabs wrong content
  // when <think> block contained { } characters
  const lastBraceClose = cleaned.lastIndexOf("}");
  if (lastBraceClose === -1) {
    console.error("❌ No closing } found. Raw:", text.substring(0, 300));
    throw new Error("No closing brace found in AI response");
  }

  // Walk backwards from last } to find its matching {
  let depth = 0;
  let startIndex = -1;
  for (let i = lastBraceClose; i >= 0; i--) {
    if (cleaned[i] === "}") depth++;
    if (cleaned[i] === "{") depth--;
    if (depth === 0) {
      startIndex = i;
      break;
    }
  }

  if (startIndex !== -1) {
    cleaned = cleaned.substring(startIndex, lastBraceClose + 1);
  } else {
    // Fallback: cut everything before first {
    const firstBrace = cleaned.indexOf("{");
    if (firstBrace === -1) {
      console.error("❌ No JSON found. Raw:", text.substring(0, 300));
      throw new Error("No JSON object found in AI response");
    }
    cleaned = cleaned.substring(firstBrace);
  }

  // Step 4: Validate boundaries
  if (!cleaned.startsWith("{") || !cleaned.endsWith("}")) {
    console.error("❌ Invalid JSON boundaries:", cleaned.substring(0, 200));
    throw new Error("Extracted content is not a valid JSON object");
  }

  return cleaned;
}

// ─────────────────────────────────────────────────────────────
// 🔒 SAFE PARSER
// ─────────────────────────────────────────────────────────────

// function safeParse(text: string): any {
//   try {
//     const jsonString = extractJSON(text);

//     try {
//       return JSON.parse(jsonString);

//     } catch {

//       console.warn("⚠ Attempting JSON repair...");

//       const { jsonrepair } = require("jsonrepair");

//       return JSON.parse(
//         jsonrepair(jsonString)
//       );
//     }

//   } catch (err: any) {

//     console.error("❌ JSON PARSE FAILED");

//     console.error(
//       "RAW RESPONSE (first 1500 chars):",
//       text.substring(0, 1500)
//     );

//     throw new Error(
//       `Invalid JSON returned by AI: ${err.message}`
//     );
//   }
// }


function safeParse(text: string): any {
  try {
    const jsonString = extractJSON(text);
    return JSON.parse(jsonString);
  } catch (err: any) {
    console.error("❌ JSON PARSE FAILED:", err.message);
    console.error("RAW RESPONSE (first 500 chars):", text.substring(0, 500));
    // Return null instead of throwing so callers can use fallback
    return null;
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

${isGeneral ? "" : `Job Description:\n${safeJobDescription.slice(0, 2500)}`}
${structuredContext}`;

  try {
    const text = await generateLLMResponse({
      prompt,
      temperature: 0.1,
      maxTokens: 2500,
    });

    console.log("========== RAW ANALYSIS RESPONSE ==========");
    console.log(text);
    console.log("===========================================");

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
// export async function generateOptimizedCV(
//   cvText: string,
//   jobDescription: string,
//   analysisResult?: any,
//   structuredJobDetails?: StructuredJobDetails
// ) {
//   const safeCvText = cvText.substring(0, 6000);
//   const safeJobDescription = jobDescription.substring(0, 3000);
//   const isGeneral = jobDescription.includes("Optimisation standard");

//   const missingKeywords = analysisResult?.keywordsMissing?.slice(0, 10).join(", ") || "";
//   const foundKeywords = analysisResult?.keywordsFound?.join(", ") || "";

//   const suggestions = analysisResult?.suggestions?.join("\n- ") || "";

//   const flaws = analysisResult?.flaws?.join("\n- ") || "";

//   const structuredContext = structuredJobDetails
//     ? `
// Structured Job Data:
// - Title: ${structuredJobDetails.title}
// - Skills: ${structuredJobDetails.skills.join(", ") || "N/A"}
// - Requirements: ${structuredJobDetails.requirements.join(" | ") || "N/A"}
// - Responsibilities: ${structuredJobDetails.responsibilities.join(" | ") || "N/A"}
// `
//     : "";

//   const prompt = `You MUST respond with ONLY a valid JSON object.
// No explanations.
// No markdown.
// No text before or after the JSON.
// Start your response with { and end with }.

// You are one of the world's best ATS Resume Writers and Career Coaches.

// Your goal is NOT simply to rewrite the CV.

// Your goal is to MAXIMIZE the ATS score while remaining 100% truthful.

// ${isGeneral
//       ? `
// Optimize this CV according to modern professional resume best practices.
// `
//       : `
// Optimize this CV specifically for the following Job Description.

// ==============================
// ATS ANALYSIS
// ==============================

// Current ATS Score:
// ${analysisResult?.atsScore ?? "Unknown"}

// Missing Keywords:
// ${missingKeywords || "None"}

// Existing Matching Keywords:
// ${foundKeywords || "None"}

// Detected ATS Weaknesses:
// ${flaws || "None"}

// ATS Suggestions:
// ${suggestions || "None"}

// ==============================
// YOUR OBJECTIVE
// ==============================

// Increase the ATS score as much as possible.

// Follow EVERY ATS suggestion whenever possible.

// Fix EVERY detected ATS weakness whenever possible.

// Integrate as many missing ATS keywords as truthfully possible.

// Prefer placing them in:
// - Professional Summary
// - Skills
// - Experience bullet points
// - Project technologies

// If multiple related keywords belong to the candidate's demonstrated profession, rewrite existing content so they fit naturally.

// Never invent employers, projects, employment dates or certifications.

// Strengthen and expand existing experience instead of creating new experience.

// `
//     }

// ==================================================
// MANDATORY RULES
// ==================================================

// 1. Preserve ALL existing information.

// 2. Never remove experience.

// 3. Never remove education.

// 4. Never remove projects.

// 5. Never remove existing skills.

// 6. Rewrite the Professional Summary so it naturally includes the highest priority ATS keywords.

// 7. Rewrite every Experience description using STAR methodology.

// 8. Whenever a missing keyword genuinely applies to an experience, insert it naturally.

// 9. Whenever a missing keyword applies to a project, include it.

// 10. The Skills array MUST contain:
//    - existing skills
//    - relevant missing ATS keywords
//    - without duplicates

// 11. Every Project must contain technologies used.

// 12. If Adobe products, software, frameworks or tools are listed in the missing keywords and they truthfully fit the candidate's experience, include them inside:
//    - skills
//    - project technologies
//    - experience descriptions
//    - summary

// 13. Improve keyword density naturally without keyword stuffing.

// 14. Never invent employers, job titles, employment dates, projects, certifications or degrees.

// 15. You MAY infer closely related professional skills ONLY when ALL of the following are true:
//    - the missing keyword belongs to the same professional domain,
//    - the candidate already demonstrates closely related experience,
//    - the inferred skill is commonly associated with that role,
//    - the wording remains truthful and does not claim expert-level experience.

// Examples:

// Infer closely related professional skills only when they are clearly
// supported by the candidate's existing experience and related to same domain.
// Do not infer unrelated skills.
// Never invent employers, projects, certifications, degrees or work history.

// 16. If a missing keyword cannot truthfully fit, leave it out rather than forcing it into the resume.

// 17. Preserve the original CV language exactly.

// 18. IMPORTANT FINAL VALIDATION:

// Before returning the answer:
// - Verify JSON syntax is valid.
// - Close every object with }.
// - Close every array with ].
// - Escape all quotes inside strings.
// - Do not stop generation before completing the JSON.
// - If the CV is long, shorten descriptions instead of cutting JSON.

// 19. Return ONLY valid JSON.

// ==================================================
// OUTPUT FORMAT
// ==================================================

// Return EXACTLY this JSON schema.

// {
//   "userName": "",
//   "jobTitle": "",
//   "summary": "",
//   "contact": {
//     "email": "",
//     "phone": "",
//     "location": "",
//     "linkedin": "",
//     "github": "",
//     "portfolio": ""
//   },
//   "experience": [
//     {
//       "title": "",
//       "company": "",
//       "period": "",
//       "description": ""
//     }
//   ],
//   "education": [
//     {
//       "degree": "",
//       "school": "",
//       "year": "",
//       "details": ""
//     }
//   ],
//   "projects": [
//     {
//       "name": "",
//       "description": "",
//       "technologies": []
//     }
//   ],
//   "skills": [],
//   "languages": [
//     {
//       "language": "",
//       "level": ""
//     }
//   ],
//   "interests": []
// }

// ==================================================
// CV
// ==================================================

// ${safeCvText}

// ${isGeneral ? "" : `Job Description:\n${safeJobDescription.slice(0, 2500)}`}

// ${structuredContext}
// `;

//   try {
//     const text = await generateLLMResponse({
//       prompt,
//       temperature: 0.15,
//       maxTokens: 3200,
//     });

//     console.log("=== generateOptimizedCV LLM Response (first 500 chars) ===");
//     console.log(text.substring(0, 500));

//     console.log("========== RAW ANALYSIS RESPONSE ==========");
//     console.log(text);
//     console.log("===========================================");

//     const parsed = safeParse(text);
//     console.log("Missing keywords:", analysisResult?.keywordsMissing);

//     console.log("Generated skills:", parsed.skills);

//     console.log("Generated projects:", parsed.projects);

//     console.log("Generated summary:", parsed.summary);

//     // Fallback: extract name from CV text if AI missed it
//     if (!parsed.userName || parsed.userName.includes("full name") || parsed.userName === "") {
//       const nameMatch = cvText.match(/^([A-Z][a-zÀ-ÿ]+(?:\s[A-Z][a-zÀ-ÿ]+)+)/m);
//       if (nameMatch) parsed.userName = nameMatch[1];
//     }

//     // Ensure contact object always exists with all fields
//     if (!parsed.contact) parsed.contact = {};
//     parsed.contact = {
//       email: parsed.contact.email || "",
//       phone: parsed.contact.phone || "",
//       location: parsed.contact.location || "",
//       linkedin: parsed.contact.linkedin || "",
//       github: parsed.contact.github || "",
//       portfolio: parsed.contact.portfolio || "",
//     };

//     return parsed;
//   }

//   catch (error: any) {
//     console.error("generateOptimizedCV Error:", error?.message || error);
//     throw error;
//   }

// }

// ✍️ GENERATE OPTIMIZED CV
// export async function generateOptimizedCV(
//   cvText: string,
//   jobDescription: string,
//   analysisResult?: any,
//   structuredJobDetails?: StructuredJobDetails
// ) {

export async function generateOptimizedCV(
  cvText: string,
  jobDescription: string,
  analysisResult?: any,
  structuredJobDetails?: StructuredJobDetails | any,
  existingCV?: any  // NEW: existing structured CV as reference
) {
  const safeJobDescription = jobDescription.substring(0, 3000);
  const isGeneral = jobDescription.includes("Optimisation standard");

  const missingKeywords = analysisResult?.keywordsMissing?.slice(0, 10).join(", ") || "";
  const foundKeywords = analysisResult?.keywordsFound?.join(", ") || "";
  const suggestions = analysisResult?.suggestions?.join("\n- ") || "";
  const flaws = analysisResult?.flaws?.join("\n- ") || "";

  // ========================================================
  // 🔒 CORE FIX: SAFE SEED CONTEXT LAYER
  // Ensures safeCvText is NEVER wiped out into an empty string
  // ========================================================
  let safeCvText = cvText && cvText.trim().length > 15 ? cvText : "";

  if (analysisResult && typeof analysisResult === "object") {
    // Look everywhere for structured fallback records if the string was unhydrated
    const backupSource = analysisResult.optimizedData || analysisResult.optimizedJson || null;

    if (backupSource && backupSource.experience && Array.isArray(backupSource.experience) && backupSource.experience.length > 0) {
      console.log("🔄 [Optimizer] Reconstructing execution context from parsed database arrays.");

      const reconstruction: string[] = [];
      if (backupSource.userName) reconstruction.push(`Candidate Name: ${backupSource.userName}`);
      if (backupSource.jobTitle) reconstruction.push(`Current/Target Title: ${backupSource.jobTitle}`);
      if (backupSource.summary) reconstruction.push(`Professional Summary:\n${backupSource.summary}`);

      if (backupSource.skills && Array.isArray(backupSource.skills)) {
        reconstruction.push(`Skills:\n${backupSource.skills.join(", ")}`);
      }

      reconstruction.push(`Experience History:\n${JSON.stringify(backupSource.experience, null, 2)}`);

      if (backupSource.education && Array.isArray(backupSource.education)) {
        reconstruction.push(`Education History:\n${JSON.stringify(backupSource.education, null, 2)}`);
      }
      if (backupSource.projects && Array.isArray(backupSource.projects)) {
        reconstruction.push(`Projects:\n${JSON.stringify(backupSource.projects, null, 2)}`);
      }

      safeCvText = reconstruction.join("\n\n---\n\n");
    }
  }

  // Final absolute fallback protection to ensure the prompt is never blank
  if (!safeCvText || safeCvText.trim().length < 10) {
    safeCvText = cvText || "Contenu du CV indisponible.";
  }

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
      ? `Optimize this CV according to modern professional resume best practices.`
      : `Optimize this CV specifically for the following Job Description.

==============================
ATS ANALYSIS
==============================
Current ATS Score: ${analysisResult?.atsScore ?? "Unknown"}
Missing Keywords: ${missingKeywords || "None"}
Existing Matching Keywords: ${foundKeywords || "None"}
Detected ATS Weaknesses: ${flaws || "None"}
ATS Suggestions: ${suggestions || "None"}

==============================
YOUR OBJECTIVE
==============================
Increase the ATS score as much as possible.
Follow EVERY ATS suggestion whenever possible.
Fix EVERY detected ATS weakness whenever possible.
Integrate as many missing ATS keywords as truthfully possible.

Prefer placing them in:
- Professional Summary
- Skills
- Experience bullet points
- Project technologies

If multiple related keywords belong to the candidate's demonstrated profession, rewrite existing content so they fit naturally.
Never invent employers, projects, employment dates or certifications.
Strengthen and expand existing experience instead of creating new experience.
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
12. If Adobe products, software, frameworks or tools are listed in the missing keywords and they truthfully fit the candidate's experience, include them inside skills, project technologies, experience descriptions, and summary.
13. Improve keyword density naturally without keyword stuffing.
14. Never invent employers, job titles, employment dates, projects, certifications or degrees.
15. You MAY infer closely related professional skills ONLY when the missing keyword belongs to the same professional domain, the candidate already demonstrates closely related experience, and the inferred skill is commonly associated with that role.
16. If a missing keyword cannot truthfully fit, leave it out rather than forcing it into the resume.
17. Preserve the original CV language exactly.
18. IMPORTANT FINAL VALIDATION: Verify JSON syntax is valid. Close every object and array. Escape inner quotes.

==================================================
OUTPUT FORMAT
==================================================
Return EXACTLY this JSON schema structure:
{
  "userName": "",
  "jobTitle": "",
  "summary": "",
  "contact": { "email": "", "phone": "", "location": "", "linkedin": "", "github": "", "portfolio": "" },
  "experience": [ { "title": "", "company": "", "period": "", "description": "" } ],
  "education": [ { "degree": "", "school": "", "year": "", "details": "" } ],
  "projects": [ { "name": "", "description": "", "technologies": [] } ],
  "skills": [],
  "languages": [ { "language": "", "level": "" } ],
  "interests": []
}

==================================================
CV CONTENT TO OPTIMIZE
==================================================
${safeCvText}

${isGeneral ? "" : `Job Description:\n${safeJobDescription.slice(0, 2500)}`}
${structuredContext}
`;

  try {
    const text = await generateLLMResponse({
      prompt,
      temperature: 0.15,
      maxTokens: 3200,
    });

    const parsed = safeParse(text);

    // If JSON was truncated or invalid, return null so
    // generate-templates/route.ts uses existing DB data as fallback
    if (!parsed) {
      console.warn("[generateOptimizedCV] safeParse returned null — JSON likely truncated by token limit");
      return null;
    }

    // Hard fallback: mapping safety array checks
    if (analysisResult?.keywordsMissing && Array.isArray(analysisResult.keywordsMissing)) {
      if (!parsed.skills || parsed.skills.length === 0) {
        const backupSource = analysisResult.optimizedData || analysisResult;
        const oldSkills = Array.isArray(backupSource.skills) ? backupSource.skills : [];
        parsed.skills = Array.from(new Set([...oldSkills, ...analysisResult.keywordsMissing]));
      }
    }

    if (!parsed.userName || parsed.userName.includes("full name") || parsed.userName === "") {
      const backupSource = analysisResult.optimizedData || analysisResult;
      if (backupSource?.userName && !backupSource.userName.includes("Website")) {
        parsed.userName = backupSource.userName;
      } else {
        const nameMatch = cvText.match(/^([A-Z][a-zÀ-ÿ]+(?:\s[A-Z][a-zÀ-ÿ]+)+)/m);
        if (nameMatch) parsed.userName = nameMatch[1];
      }
    }

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
    throw error;
  }
}  //updated//