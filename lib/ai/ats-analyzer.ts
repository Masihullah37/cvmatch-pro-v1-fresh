// import { generateLLMResponse } from "./llm-gateway";
// import { type StructuredJobDetails } from "@/lib/utils/scraper";
// import { applyCoherentAtsScoring } from "@/lib/ai/keyword-normalizer";

// //
// // 🔒 SAFE JSON EXTRACTOR (robust)
// //
// function extractJSON(text: string) {
//   const match = text.match(/\{[\s\S]*\}/);

//   if (!match) {
//     console.error("❌ RAW AI RESPONSE:", text);
//     throw new Error("No valid JSON found in response");
//   }

//   return match[0];
// }

// //
// // 🔒 SAFE PARSER (prevents crashes)
// //
// function safeParse(text: string) {
//   try {
//     const jsonString = extractJSON(text);
//     return JSON.parse(jsonString);
//   } catch (err) {
//     console.error("❌ JSON PARSE FAILED");
//     console.error("RAW RESPONSE:", text);
//     throw new Error("Invalid JSON returned by AI");
//   }
// }

// //
// // 📊 ANALYZE CV (ATS SCORING)
// //
// export async function analyzeCV(
//   cvText: string,
//   jobDescription: string,
//   structuredJobDetails?: StructuredJobDetails,
//   locale?: string
// ) {
//   const safeCvText = cvText.substring(0, 6000);
//   const safeJobDescription = jobDescription.substring(0, 3000);

//   const structuredContext = structuredJobDetails
//     ? `
// Structured Job Data:
// - Title: ${structuredJobDetails.title}
// - Skills: ${structuredJobDetails.skills.join(", ") || "N/A"}
// - Requirements: ${structuredJobDetails.requirements.join(" | ") || "N/A"}
// - Responsibilities: ${structuredJobDetails.responsibilities.join(" | ") || "N/A"}
// - Keyword seeds: ${structuredJobDetails.keywords.join(", ") || "N/A"}
// `
//     : "";

//   const targetLanguage = locale === 'fr' ? 'French (fr)' : 'English (en)';
//   const prompt = `
// Analyze this CV ${jobDescription.includes('Optimisation standard') ? 'for general professional standards' : 'against the Job Description for ATS compatibility'}.

// You must output a single JSON object matching the exact structure below.
// Ignore website navigation, cookie banners, legal notices, and any non-job-content noise.

// LANGUAGE REQUIREMENT:
// - You MUST write all "flaws" and "suggestions" in ${targetLanguage}.
// - Keywords ("keywordsMissing" and "keywordsFound") must be extracted in their original casing and language as they appear in the CV and Job Description.

// CRITICAL RULES FOR KEYWORDS:
// 1. Keywords must ONLY include hard technical skills, specific tools, libraries, frameworks, coding languages, methodologies (e.g. Agile, Scrum), or professional tech domains (e.g. React.js, Docker, PHP, Git).
// 2. Keywords must be single technical terms or short technical phrases (maximum 3 words, under 30 characters).
// 3. NEVER include full sentences, descriptions, objectives, non-technical words, or common conversational/CV filler expressions (e.g. "bonnes relations", "motivé", "déployé sur", "compréhension", "application complète").
// 4. Do NOT output job titles (e.g. "Développeur Web") as keywords.
// 5. "keywordsMissing" should list actual hard skills mentioned in the Job Description but missing from the CV (maximum 15 items).
// 6. "keywordsFound" should list actual hard skills mentioned in both (maximum 15 items).
// 7. NEVER put the same skill in both lists. If a skill appears in any form in the CV (e.g. "RESTful API"), do NOT list a substring (e.g. "rest") as missing.
// 8. Do NOT list generic fragments alone (e.g. "rest", "api", "web") when a full skill name is already present.

// CRITICAL RULES FOR FLAWS & SUGGESTIONS:
// 1. Flaws and suggestions must be detailed, professional, and actionable sentences in ${targetLanguage} (e.g., in French: "Ajoutez des indicateurs chiffrés ou des pourcentages dans vos descriptions de projet pour démontrer votre impact" rather than just "chiffres" or "impact").
// 2. Do NOT output single words, bullet lists of skills, or fragments from the CV or Job Description.
// 3. Limit to a maximum of 5 flaws and 5 suggestions.

// CRITICAL RULES FOR SCORING (MAX 100 POINTS TOTAL):
// 1. keywordMatch (Max 30 points):
//    - Calculate realistically based on keywords found vs missing: (Number of keywordsFound / (Number of keywordsFound + Number of keywordsMissing)) * 30.
//    - If keywordsFound is empty, score is 0. If no missing keywords, score is 30.
// 2. format (Max 20 points):
//    - 20 points: Professional layout, clean sections, standard contact info.
//    - Deduct 5 points per structural flaw (e.g. bad spacing, inconsistent sections, missing contact info). Min score 5.
// 3. experience (Max 20 points):
//    - 20 points: Candidate experience matches the job description perfectly (roles, years, responsibilities).
//    - 10-15 points: Partially matching experience or slightly junior.
//    - 0-9 points: No matching experience or completely different field.
// 4. education (Max 10 points):
//    - 10 points: Has the required degree/certifications or higher.
//    - 5 points: Has a degree but in a different field.
//    - 0 points: Missing required education completely.
// 5. skills (Max 15 points):
//    - 15 points: Strong set of technical skills and tools clearly listed.
//    - 5-10 points: Weak list of skills or lacking relevant tools.
// 6. readability (Max 5 points):
//    - 5 points: Clear hierarchy, bullet points, concise description.
//    - 1-4 points: Verbose, wall of text, or hard to read.

// JSON Structure to return:
// {
//   "atsScore": 0,
//   "scoreBreakdown": {
//     "keywordMatch": { "score": 0, "max": 30 },
//     "format": { "score": 0, "max": 20 },
//     "experience": { "score": 0, "max": 20 },
//     "education": { "score": 0, "max": 10 },
//     "skills": { "score": 0, "max": 15 },
//     "readability": { "score": 0, "max": 5 }
//   },
//   "flaws": ["detailed sentence describing flaw 1 (max 5)", "detailed sentence describing flaw 2 (max 5)"],
//   "suggestions": ["detailed actionable suggestion 1 (max 5)", "detailed actionable suggestion 2 (max 5)"],
//   "keywordsMissing": ["missing technical skill 1", "missing technical skill 2 (max 15)"],
//   "keywordsFound": ["found technical skill 1", "found technical skill 2 (max 15)"]
// }

// CV:
// ${safeCvText}

// ${jobDescription.includes('Optimisation standard') ? '' : `JD:\n${safeJobDescription}`}
// ${structuredContext}
// `;

//   try {
//     const text = await generateLLMResponse({
//       prompt,
//       temperature: 0.1,
//       maxTokens: 3000,
//     });

//     const parsed = safeParse(text);
//     return applyCoherentAtsScoring(parsed);
//   } catch (error: any) {
//     console.error("LLM Gateway Analysis Error:", error?.message || error);
//     throw new Error(`Failed to analyze CV: ${error?.message || "Unknown error"}`);
//   }
// }

// //
// // ✍️ EXTRACT RAW CV DATA (No optimization)
// //
// export async function extractRawCVData(cvText: string) {
//   const safeCvText = cvText.substring(0, 6000);

//   const prompt = `
// You are a CV parser. Extract all information from the provided CV into the exact JSON structure below.
// DO NOT optimize, DO NOT rephrase, DO NOT improve. Just extract exactly what is written.
// Match the original language of the CV.

// Return ONLY valid JSON:

// {
//   "userName": "",
//   "jobTitle": "",
//   "summary": "",
//   "contact": { "email": "", "phone": "", "location": "" },
//   "experience": [{ "title": "", "company": "", "period": "", "description": "" }],
//   "education": [{ "degree": "", "school": "", "year": "", "details": "" }],
//   "projects": [{ "name": "", "description": "", "technologies": [] }],
//   "skills": [],
//   "languages": [{ "language": "", "level": "" }],
//   "interests": []
// }

// CV:
// ${safeCvText}
// `;

//   try {
//     const text = await generateLLMResponse({
//       prompt,
//       temperature: 0,
//       maxTokens: 3000,
//     });

//     const parsed = safeParse(text);
//     return parsed;
//   } catch (error: any) {
//     console.error("LLM Gateway Extraction Error:", error?.message || error);
//     return null;
//   }
// }

// //
// // ✍️ GENERATE OPTIMIZED CV
// //
// export async function generateOptimizedCV(
//   cvText: string,
//   jobDescription: string,
//   analysisResult?: any,
//   structuredJobDetails?: StructuredJobDetails
// ) {
//   const safeCvText = cvText.substring(0, 6000);
//   const safeJobDescription = jobDescription.substring(0, 3000);

//   const structuredContext = structuredJobDetails
//     ? `
// Structured Job Data:
// - Title: ${structuredJobDetails.title}
// - Skills: ${structuredJobDetails.skills.join(", ") || "N/A"}
// - Requirements: ${structuredJobDetails.requirements.join(" | ") || "N/A"}
// - Responsibilities: ${structuredJobDetails.responsibilities.join(" | ") || "N/A"}
// `
//     : "";

//   const prompt = `
// You are an expert professional CV writer.
// ${jobDescription.includes('Optimisation standard')
//       ? "Perform a high-level professional optimization. Focus on impact, clarity, and modern professional standards."
//       : "Optimize this CV specifically for the Job Description below."}

// STRICT RULES:
// - Match CV language (French or English)
// - Do NOT invent data
// - Extract ALL real info
// - Use STAR method
// - ${jobDescription.includes('Optimisation standard') ? "Maximize professional appeal." : `Integrate keywords: ${analysisResult?.keywordsMissing?.slice(0, 10).join(", ") || ""}`}

// Return ONLY valid JSON:

// {
//   "userName": "",
//   "jobTitle": "",
//   "summary": "",
//   "contact": { "email": "", "phone": "", "location": "" },
//   "experience": [{ "title": "", "company": "", "period": "", "description": "" }],
//   "education": [{ "degree": "", "school": "", "year": "", "details": "" }],
//   "projects": [{ "name": "", "description": "", "technologies": [] }],
//   "skills": [],
//   "languages": [{ "language": "", "level": "" }],
//   "interests": []
// }

// CV:
// ${safeCvText}

// ${jobDescription.includes('Optimisation standard') ? '' : `JD:\n${safeJobDescription}`}
// ${structuredContext}
// `;

//   try {
//     const text = await generateLLMResponse({
//       prompt,
//       temperature: 0.2,
//       maxTokens: 3000,
//     });

//     console.log("=== LLM GATEWAY RESPONSE ===");
//     console.log(text.substring(0, 500) + "...");

//     const parsed = safeParse(text);

//     // 🔧 fallback name extraction
//     if (!parsed.userName || parsed.userName.includes("full name")) {
//       const nameMatch = cvText.match(/^([A-Z][a-z]+(?:\s[A-Z][a-z]+)+)/);
//       if (nameMatch) parsed.userName = nameMatch[1];
//     }

//     return parsed;
//   } catch (error: any) {
//     console.error("LLM Gateway Optimization Error:", error?.message || error);

//     return {
//       userName: "ERROR",
//       jobTitle: "Check logs",
//       summary: error?.message || "AI failed",
//       contact: { email: "", phone: "", location: "" },
//       experience: [],
//       education: [],
//       projects: [],
//       skills: [],
//       languages: [],
//       interests: [],
//     };
//   }
// }



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
No explanations, no markdown, no text before or after the JSON.
Start your response with { and end with }.

Task: You are an expert professional CV writer.
${isGeneral
      ? "Optimize this CV for general professional standards. Improve clarity, impact, and modern best practices."
      : `Optimize this CV specifically for the Job Description below.
Integrate these missing keywords naturally where truthful: ${missingKeywords}
Use the STAR method (Situation, Task, Action, Result) for experience descriptions.`
    }

STRICT RULES:
- Match the CV's original language (French or English) exactly.
- DO NOT invent or fabricate any information.
- Extract and preserve ALL real information from the CV.
- Preserve ALL contact details including linkedin, github, portfolio if present.
- Improve descriptions to be more impactful and quantified where possible.

Return this EXACT JSON structure:
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
${safeCvText}

${isGeneral ? "" : `Job Description:\n${safeJobDescription}`}
${structuredContext}`;

  try {
    const text = await generateLLMResponse({
      prompt,
      temperature: 0.2,
      maxTokens: 3000,
    });

    console.log("=== generateOptimizedCV LLM Response (first 500 chars) ===");
    console.log(text.substring(0, 500));

    const parsed = safeParse(text);

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
