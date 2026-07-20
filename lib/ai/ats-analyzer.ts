import { generateLLMResponse } from "./llm-gateway";
import { type StructuredJobDetails } from "@/lib/utils/scraper";
import { applyCoherentAtsScoring } from "@/lib/ai/keyword-normalizer";

// ─────────────────────────────────────────────────────────────
// 🔒 ROBUST JSON EXTRACTOR
// ─────────────────────────────────────────────────────────────

function extractJSON(text: string): string {
  // Step 1: Strip reasoning blocks (double safety after llm-gateway)
  let cleaned = text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "")
    .trim();

  // Step 2: Remove markdown code fences
  cleaned = cleaned
    .replace(/^```(?:json)?\s*/im, "")
    .replace(/\s*```$/im, "")
    .trim();

  // Step 3: Find the LAST complete JSON object by brace balancing
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
    const firstBrace = cleaned.indexOf("{");
    if (firstBrace === -1) {
      console.error("❌ No JSON found. Raw:", text.substring(0, 300));
      throw new Error("No JSON object found in AI response");
    }
    cleaned = cleaned.substring(firstBrace);
  }

  if (!cleaned.startsWith("{") || !cleaned.endsWith("}")) {
    console.error("❌ Invalid JSON boundaries:", cleaned.substring(0, 200));
    throw new Error("Extracted content is not a valid JSON object");
  }

  return cleaned;
}

// ─────────────────────────────────────────────────────────────
//   SAFE PARSER
// ─────────────────────────────────────────────────────────────

function safeParse(text: string): any {
  try {
    const jsonString = extractJSON(text);
    return JSON.parse(jsonString);
  } catch (err: any) {
    console.error("❌ JSON PARSE FAILED:", err.message);
    console.error("RAW RESPONSE (first 500 chars):", text.substring(0, 500));
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// 🌐 DOMAIN DETECTION
// Detects the candidate's professional domain from existing
// skills and experience titles so we only inject keywords
// that are relevant to their field.
// ─────────────────────────────────────────────────────────────

type Domain =
  | "it_dev"
  | "finance"
  | "healthcare"
  | "administrative"
  | "trades"
  | "general";

const DOMAIN_SIGNALS: Record<Domain, string[]> = {
  it_dev: [
    "java", "python", "javascript", "typescript", "react", "vue", "angular",
    "node", "spring", "docker", "kubernetes", "k8s", "aws", "azure", "gcp",
    "sql", "mongodb", "postgresql", "redis", "graphql", "php", "laravel",
    "symfony", "django", "flask", "git", "devops", "ci/cd", "linux",
    "terraform", "ansible", "jenkins", "microservices", "api", "rest",
    "développeur", "developpeur", "informatique", "logiciel", "software",
    "backend", "frontend", "fullstack", "full stack", "full-stack",
  ],
  finance: [
    "comptabilité", "comptable", "finance", "audit", "fiscalité", "bilan",
    "sap", "erp", "sage", "excel", "tableau de bord", "budget", "trésorerie",
    "accountant", "gaap", "ifrs", "cpa", "analyste financier",
  ],
  healthcare: [
    "infirmier", "infirmière", "soins", "médecin", "pharmacien", "kiné",
    "kinésithérapeute", "sage-femme", "aide-soignant", "hôpital", "clinique",
    "patient", "nursing", "doctor", "nurse", "pharmacist", "medical",
    "healthcare", "santé", "urgences",
  ],
  administrative: [
    "secrétaire", "secrétariat", "réceptionniste", "accueil", "administrative",
    "assistant", "assistante", "gestion", "planning", "agenda", "courrier",
    "classement", "bureautique", "word", "outlook", "powerpoint",
  ],
  trades: [
    "électricien", "electrician", "plombier", "plumber", "menuisier",
    "charpentier", "maçon", "peintre", "technicien", "maintenance",
    "installation", "câblage", "réseau électrique", "chauffage",
  ],
  // Catch-all: no signals — detected when no other domain scores ≥ 2
  general: [],
};

function detectDomain(existingCV: any, rawCvText?: string): Domain {
  const profile = [
    ...(Array.isArray(existingCV?.skills) ? existingCV.skills : []),
    ...(Array.isArray(existingCV?.experience)
      ? existingCV.experience.map((e: any) => `${e.title || ""} ${e.company || ""}`)
      : []),
    existingCV?.jobTitle || "",
    existingCV?.summary || "",
    // Fallback: also scan raw CV text when existingCV has no structured data
    rawCvText || "",
  ]
    .join(" ")
    .toLowerCase();

  const scores: Record<Domain, number> = {
    it_dev: 0,
    finance: 0,
    healthcare: 0,
    administrative: 0,
    trades: 0,
    general: 0,
  };

  for (const [domain, signals] of Object.entries(DOMAIN_SIGNALS) as [Domain, string[]][]) {
    for (const signal of signals) {
      if (profile.includes(signal)) {
        scores[domain]++;
      }
    }
  }

  const best = (Object.entries(scores) as [Domain, number][]).reduce(
    (a, b) => (b[1] > a[1] ? b : a),
    ["general", 0] as [Domain, number]
  );

  const detectedDomain = best[1] >= 2 ? best[0] : "general";
  console.log("[Domain detection] scores:", scores, "→ detected:", detectedDomain);
  return detectedDomain;
}

function filterKeywordsByDomain(keywords: string[], domain: Domain): string[] {
  if (domain === "general") return keywords;

  const signals = DOMAIN_SIGNALS[domain];

  return keywords.filter((kw) => {
    const lower = kw.toLowerCase();
    // Keep if the keyword matches any signal of the detected domain
    return signals.some((s) => lower.includes(s) || s.includes(lower));
  });
}

// ─────────────────────────────────────────────────────────────
// 📦 COMPACT CV SUMMARY BUILDER
// Builds a condensed text representation of the CV that fits
// inside the token budget while preserving all key data.
// ─────────────────────────────────────────────────────────────

function buildCompactCVSummary(cv: any): string {
  const lines: string[] = [];

  if (cv?.userName) lines.push(`Name: ${cv.userName}`);
  if (cv?.jobTitle) lines.push(`Title: ${cv.jobTitle}`);

  if (cv?.summary) {
    lines.push(`Summary: ${String(cv.summary).substring(0, 300)}`);
  }

  if (cv?.contact && typeof cv.contact === "object") {
    const c = cv.contact;
    const parts = [c.email, c.phone, c.location, c.linkedin, c.github, c.portfolio]
      .filter(Boolean)
      .join(" | ");
    if (parts) lines.push(`Contact: ${parts}`);
  }

  if (Array.isArray(cv?.experience) && cv.experience.length > 0) {
    lines.push("Experience:");
    for (const exp of cv.experience) {
      const desc = String(exp.description || "").substring(0, 120);
      lines.push(
        `  - ${exp.title || "?"} @ ${exp.company || "?"} (${exp.period || "?"}): ${desc}`
      );
    }
  }

  if (Array.isArray(cv?.education) && cv.education.length > 0) {
    lines.push("Education:");
    for (const edu of cv.education) {
      lines.push(
        `  - ${edu.degree || "?"} | ${edu.school || "?"} (${edu.year || "?"})`
      );
    }
  }

  if (Array.isArray(cv?.skills) && cv.skills.length > 0) {
    lines.push(`Skills: ${cv.skills.join(", ")}`);
  }

  if (Array.isArray(cv?.projects) && cv.projects.length > 0) {
    lines.push("Projects:");
    for (const p of cv.projects) {
      const tech = Array.isArray(p.technologies) ? p.technologies.join(", ") : "";
      lines.push(`  - ${p.name || "?"}: ${tech}`);
    }
  }

  if (Array.isArray(cv?.languages) && cv.languages.length > 0) {
    const langs = cv.languages.map((l: any) => `${l.language} (${l.level})`).join(", ");
    lines.push(`Languages: ${langs}`);
  }

  if (Array.isArray(cv?.interests) && cv.interests.length > 0) {
    lines.push(`Interests: ${cv.interests.join(", ")}`);
  }

  return lines.join("\n");
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
  // Keep inputs tight — analysis only needs keywords, not full paragraphs
  const safeCvText = cvText.substring(0, 2000);
  const safeJobDescription = jobDescription.substring(0, 800);
  const isGeneral = jobDescription.includes("Optimisation standard");
  const targetLanguage = locale === "fr" ? "French (fr)" : "English (en)";

  const structuredContext = structuredJobDetails
    ? `Job Skills: ${structuredJobDetails.skills.slice(0, 10).join(", ") || "N/A"}\nJob Requirements: ${structuredJobDetails.requirements.slice(0, 5).join(" | ") || "N/A"}`
    : "";

  const prompt = `Respond ONLY with a valid JSON object. No markdown, no text outside JSON.

Task: ATS analysis of CV ${isGeneral ? "for general professional standards" : "vs Job Description"}.
Language for flaws/suggestions: ${targetLanguage}.

KEYWORD RULES:
- keywordsMissing: hard technical skills in JD but NOT in CV (max 12, max 3 words each)
- keywordsFound: hard technical skills in BOTH (max 12)
- No soft skills, no full sentences, no duplicates across lists

SCORING (must sum to atsScore):
keywordMatch/30, format/20, experience/20, education/10, skills/15, readability/5

Return EXACTLY:
{"atsScore":0,"scoreBreakdown":{"keywordMatch":{"score":0,"max":30},"format":{"score":0,"max":20},"experience":{"score":0,"max":20},"education":{"score":0,"max":10},"skills":{"score":0,"max":15},"readability":{"score":0,"max":5}},"flaws":["full sentence flaw 1"],"suggestions":["full sentence suggestion 1"],"keywordsMissing":["Skill1"],"keywordsFound":["Skill2"]}

Max 5 flaws, max 5 suggestions. Full professional sentences only.

CV:
${safeCvText}

${isGeneral ? "" : `Job Description:\n${safeJobDescription}`}
${structuredContext}`;

  try {
    const text = await generateLLMResponse({
      prompt,
      temperature: 0.1,
      maxTokens: 1800,
    });

    console.log("========== RAW ANALYSIS RESPONSE ==========");
    console.log(text);
    console.log("===========================================");

    const parsed = safeParse(text);

    console.log("PARSED IS NULL:", parsed === null);

    if (!parsed) {
      throw new Error("The LLM returned invalid JSON.");
    }

    // Enforce atsScore = sum of sub-scores
    if (parsed.scoreBreakdown) {
      const calculatedTotal = Object.values(
        parsed.scoreBreakdown as Record<string, { score: number }>
      ).reduce((sum, val) => sum + (val.score || 0), 0);
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
  const safeCvText = cvText.substring(0, 2000);

  const prompt = `Respond ONLY with a valid JSON object. No markdown, no text outside JSON.

Extract all information from this CV exactly as written. Do NOT optimize or rephrase anything.

Return EXACTLY:
{"userName":"","jobTitle":"","summary":"","contact":{"email":"","phone":"","location":"","linkedin":"","github":"","portfolio":""},"experience":[{"title":"","company":"","period":"","description":""}],"education":[{"degree":"","school":"","year":"","details":""}],"projects":[{"name":"","description":"","technologies":[]}],"skills":[],"languages":[{"language":"","level":""}],"interests":[]}

CV:
${safeCvText}`;

  try {
    const text = await generateLLMResponse({
      prompt,
      temperature: 0,
      // Thinking models (gemini-3.5-flash, gpt-oss-120b) burn ~1900 tokens on
      // internal reasoning before emitting any text. 2000 left only 80 tokens
      // for actual JSON output — not enough for a full CV structure.
      // 4000 gives reasoning models room to finish the JSON completely.
      maxTokens: 4000,
    });

    return safeParse(text);
  } catch (error: any) {
    console.error("extractRawCVData Error:", error?.message || error);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// GENERATE OPTIMIZED CV
// ─────────────────────────────────────────────────────────────

export async function generateOptimizedCV(
  cvText: string,
  jobDescription: string,
  analysisResult?: any,
  structuredJobDetails?: StructuredJobDetails | any,
  existingCV?: any
) {
  const safeJobDescription = jobDescription.substring(0, 600);
  const isGeneral = jobDescription.includes("Optimisation standard");

  // ── Detect candidate domain for keyword filtering ──────────
  // Pass raw cvText as fallback so domain detection works even when
  // extractRawCVData failed and existingCV has no structured fields.
  const domain = detectDomain(existingCV, cvText);

  // Only inject missing keywords that belong to the candidate's domain
  const rawMissing: string[] = analysisResult?.keywordsMissing?.slice(0, 12) || [];
  const domainFilteredMissing =
    domain === "general" ? rawMissing : filterKeywordsByDomain(rawMissing, domain);

  // Always keep found keywords + domain-filtered missing keywords
  const missingKeywords = domainFilteredMissing.join(", ");
  const foundKeywords = (analysisResult?.keywordsFound || []).join(", ");
  const suggestions = (analysisResult?.suggestions || []).slice(0, 4).join("\n- ");
  const flaws = (analysisResult?.flaws || []).slice(0, 3).join("\n- ");

  console.log("[generateOptimizedCV] Domain:", domain);
  console.log("[generateOptimizedCV] Raw missing:", rawMissing);
  console.log("[generateOptimizedCV] Domain-filtered missing:", domainFilteredMissing);

  // ── Build compact CV representation ───────────────────────
  // Prefer the structured compact summary (built from existingCV fields).
  // CRITICAL FALLBACK: when extractRawCVData failed, existingCV has no
  // structured fields so compactCV would be empty. In that case, use the
  // raw CV text stored in the DB (_originalCvText, passed as cvText).
  const compactCV = buildCompactCVSummary(existingCV || {});
  const finalCVContext = compactCV.length > 50
    ? compactCV
    : cvText.substring(0, 2500); // raw _originalCvText from DB

  console.log("[generateOptimizedCV] Compact CV length:", compactCV.length);
  console.log("[generateOptimizedCV] Context source:", compactCV.length > 50 ? "structured" : "raw text");
  console.log("[generateOptimizedCV] Final context length:", finalCVContext.length);

  const atsSection = isGeneral
    ? ""
    : `ATS Score: ${analysisResult?.atsScore ?? "?"}/100
Missing Keywords (add if truthful): ${missingKeywords || "None"}
Found Keywords (keep): ${foundKeywords || "None"}
Key Weaknesses: ${flaws || "None"}
Key Suggestions: ${suggestions || "None"}`;

  const prompt = `Respond ONLY with a valid JSON object. No markdown, no text outside JSON.

You are an expert ATS Resume Optimizer. Your task:
1. Rewrite the candidate's CV to maximize ATS score
2. Preserve ALL existing experience, education, projects, languages
3. Add domain-relevant missing keywords naturally (summary, skills, experience bullets)
4. Use STAR methodology for experience descriptions
5. Never invent employers, degrees, dates or certifications
6. Keep the CV in its original language

${isGeneral ? "Optimize for general professional standards." : atsSection}

Return EXACTLY this JSON structure (complete, valid JSON):
{"userName":"","jobTitle":"","summary":"","contact":{"email":"","phone":"","location":"","linkedin":"","github":"","portfolio":""},"experience":[{"title":"","company":"","period":"","description":""}],"education":[{"degree":"","school":"","year":"","details":""}],"projects":[{"name":"","description":"","technologies":[]}],"skills":[],"languages":[{"language":"","level":""}],"interests":[]}

CANDIDATE CV:
${finalCVContext}

${isGeneral ? "" : `JOB DESCRIPTION:\n${safeJobDescription}`}`;

  try {
    const text = await generateLLMResponse({
      prompt,
      temperature: 0.15,
      maxTokens: 4000,
    });

    const parsed = safeParse(text);

    console.log(
      "[generateOptimizedCV] Parsed keys:",
      parsed ? Object.keys(parsed) : "NULL"
    );

    if (!parsed) {
      console.warn("[generateOptimizedCV] safeParse returned null — JSON likely truncated");
      return null;
    }

    // Deep merge: AI output wins for content, existingCV is the safety net
    const merged = {
      ...existingCV,
      ...parsed,

      contact: {
        ...(existingCV?.contact ?? {}),
        ...(parsed?.contact ?? {}),
      },

      experience:
        Array.isArray(parsed?.experience) &&
          parsed.experience.length > 0 &&
          parsed.experience.some(
            (e: any) =>
              e &&
              (
                (typeof e.title === "string" && e.title.trim()) ||
                (typeof e.company === "string" && e.company.trim()) ||
                (typeof e.description === "string" && e.description.trim())
              )
          )
          ? parsed.experience
          : existingCV?.experience ?? [],

      education:
        Array.isArray(parsed?.education) &&
          parsed.education.length > 0 &&
          parsed.education.some(
            (e: any) =>
              e &&
              (
                (typeof e.degree === "string" && e.degree.trim()) ||
                (typeof e.school === "string" && e.school.trim()) ||
                (typeof e.details === "string" && e.details.trim())
              )
          )
          ? parsed.education
          : existingCV?.education ?? [],

      projects:
        Array.isArray(parsed?.projects) &&
          parsed.projects.length > 0 &&
          parsed.projects.some(
            (p: any) =>
              p &&
              (
                (typeof p.name === "string" && p.name.trim()) ||
                (typeof p.description === "string" && p.description.trim())
              )
          )
          ? parsed.projects
          : existingCV?.projects ?? [],

      languages:
        Array.isArray(parsed?.languages) &&
          parsed.languages.length > 0 &&
          parsed.languages.some(
            (l: any) =>
              l &&
              (
                (typeof l.language === "string" && l.language.trim()) ||
                (typeof l.level === "string" && l.level.trim())
              )
          )
          ? parsed.languages
          : existingCV?.languages ?? [],

      interests:
        Array.isArray(parsed?.interests) &&
          parsed.interests.length > 0 &&
          parsed.interests.some(
            (i: any) =>
              (typeof i === "string" && i.trim().length > 0) ||
              (i && typeof i.name === "string" && i.name.trim().length > 0)
          )
          ? parsed.interests
          : existingCV?.interests ?? [],

      // Merge skills: existing + AI-generated + domain-filtered missing keywords
      skills: Array.from(
        new Set([
          ...(existingCV?.skills ?? []),
          ...(parsed?.skills ?? []),
          ...domainFilteredMissing,
        ])
      ),
    };

    console.log("========== FINAL MERGED CV ==========");
    console.log(merged);
    console.log("=====================================");

    return merged;
  } catch (error: any) {
    console.error("generateOptimizedCV Error:", error?.message || error);
    throw error;
  }
}

export function matchKeywordSafely(text: string, keyword: string): boolean {
  const normalizedText = text.toLowerCase();
  const normalizedKw = keyword.toLowerCase().trim();

  if (!normalizedKw) return false;

  // Escape special regex characters except technical ones (+, #, ., -)
  const escaped = normalizedKw.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");

  // Construct boundary rules:
  // Must be preceded by start of string, or a character that is NOT a word char, nor #, +, ., -
  const prefix = "(?<=^|[^a-zA-Z0-9_#+.-])";
  // Must be followed by end of string, or a character that is NOT a word char, nor #, +, ., -
  const suffix = "(?=$|[^a-zA-Z0-9_#+.-])";

  const regex = new RegExp(prefix + escaped + suffix, "i");
  return regex.test(normalizedText);
}

export function flattenStructuredCV(cv: any): string {
  const parts: string[] = [];
  if (cv.userName) parts.push(cv.userName);
  if (cv.jobTitle) parts.push(cv.jobTitle);
  if (cv.summary) parts.push(cv.summary);

  if (Array.isArray(cv.skills)) {
    parts.push(...cv.skills);
  }

  if (Array.isArray(cv.experience)) {
    for (const exp of cv.experience) {
      if (exp.title) parts.push(exp.title);
      if (exp.company) parts.push(exp.company);
      if (exp.description) parts.push(exp.description);
    }
  }

  if (Array.isArray(cv.education)) {
    for (const edu of cv.education) {
      if (edu.degree) parts.push(edu.degree);
      if (edu.school) parts.push(edu.school);
      if (edu.details) parts.push(edu.details);
    }
  }

  if (Array.isArray(cv.projects)) {
    for (const proj of cv.projects) {
      if (proj.name) parts.push(proj.name);
      if (proj.description) parts.push(proj.description);
      if (Array.isArray(proj.technologies)) {
        parts.push(...proj.technologies);
      }
    }
  }

  if (Array.isArray(cv.languages)) {
    for (const lang of cv.languages) {
      if (lang.language) parts.push(lang.language);
      if (lang.level) parts.push(lang.level);
    }
  }

  if (Array.isArray(cv.interests)) {
    for (const interest of cv.interests) {
      if (typeof interest === "string") {
        parts.push(interest);
      } else if (interest && typeof interest.name === "string") {
        parts.push(interest.name);
      }
    }
  }

  return parts.join("\n");
}

export function recalculateScoreForStructuredCV(
  optimizedCV: any,
  originalAnalysis: {
    atsScore?: number;
    scoreBreakdown?: any;
    keywordsFound?: string[] | null;
    keywordsMissing?: string[] | null;
  }
) {
  const optimizedCvText = flattenStructuredCV(optimizedCV);

  const hasRealBaseline =
    originalAnalysis.scoreBreakdown &&
    Object.keys(originalAnalysis.scoreBreakdown).length > 0;

  if (!hasRealBaseline) {
    return {
      atsScore: originalAnalysis.atsScore ?? 0,
      scoreBreakdown: originalAnalysis.scoreBreakdown ?? null,
      keywordsFound: originalAnalysis.keywordsFound ?? [],
      keywordsMissing: originalAnalysis.keywordsMissing ?? [],
      optimizedCvText,
    };
  }

  // Combine all keywords to check
  const allKeywords = Array.from(
    new Set([
      ...(originalAnalysis.keywordsFound || []),
      ...(originalAnalysis.keywordsMissing || []),
    ])
  );

  const keywordsFound: string[] = [];
  const keywordsMissing: string[] = [];

  for (const kw of allKeywords) {
    if (matchKeywordSafely(optimizedCvText, kw)) {
      keywordsFound.push(kw);
    } else {
      keywordsMissing.push(kw);
    }
  }

  // Recalculate keywordMatch score out of 30
  const totalKwCount = keywordsFound.length + keywordsMissing.length;
  let keywordMatchScore = 15; // default if no keywords
  if (totalKwCount > 0) {
    keywordMatchScore = Math.round((keywordsFound.length / totalKwCount) * 30);
  }

  // Recalculate skills score out of 15
  let skillsScore = 5; // default
  if (totalKwCount > 0) {
    skillsScore = Math.max(5, Math.round((keywordsFound.length / totalKwCount) * 15));
  }

  const baseBreakdown = originalAnalysis.scoreBreakdown || {};
  const scoreBreakdown = {
    keywordMatch: {
      score: Math.min(30, Math.max(0, keywordMatchScore)),
      max: 30,
    },
    format: {
      score: Number(baseBreakdown.format?.score) || 15,
      max: 20,
    },
    experience: {
      score: Number(baseBreakdown.experience?.score) || 15,
      max: 20,
    },
    education: {
      score: Number(baseBreakdown.education?.score) || 8,
      max: 10,
    },
    skills: {
      score: Math.min(15, Math.max(0, skillsScore)),
      max: 15,
    },
    readability: {
      score: Number(baseBreakdown.readability?.score) || 4,
      max: 5,
    },
  };

  // Re-sum total score
  const atsScore = Object.values(scoreBreakdown).reduce(
    (sum, cat) => sum + cat.score,
    0
  );

  return {
    atsScore: Math.min(100, Math.max(0, atsScore)),
    scoreBreakdown,
    keywordsFound,
    keywordsMissing,
    optimizedCvText,
  };
}