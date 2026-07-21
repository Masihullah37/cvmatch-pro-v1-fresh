import { STOP_WORDS } from "@/lib/utils/scraper";

const NON_TECH_TERMS = [
  "compréhension", "relations", "complexes", "dossier", "collaborer",
  "entreprise", "innovante", "passionné", "création", "motiver", "motivé",
  "professionnel", "compétences", "duty", "meetings", "stage", "semestre",
  "niveau", "langue", "maternelle", "courant", "anglais", "français",
  "progression", "continue", "recherche", "travail", "autonomie", "rigueur",
  "développeur", "developpeur", "conception", "développement", "concepteur",
  "intégrer", "rejoindre", "cadre", "poste", "missions", "mission", "tâches",
  "responsabilités", "description", "profil", "candidat", "curriculum",
  "lettre", "motivation", "offre", "emploi", "contrat", "alternance",
  "expérience", "formation", "études", "connaissances", "technologies",
  "langages", "frameworks", "bibliothèques", "données",
];

/** Tokens too generic alone or often false positives when a longer skill exists */
const WEAK_STANDALONE = new Set([
  "rest", "api", "web", "app", "sql", "css", "html", "js", "ts", "ui", "ux",
  "git", "cd", "ci", "os", "db", "ia", "ai", "ml", "it",
]);

const TECH_PATTERNS =
  /^(react|vue|angular|node|next|nuxt|php|laravel|symfony|python|django|flask|java|spring|kotlin|swift|docker|kubernetes|k8s|aws|azure|gcp|terraform|ansible|jenkins|gitlab|github|typescript|javascript|postgresql|postgres|mysql|mongodb|redis|graphql|tailwind|bootstrap|figma|jwt|oauth|stripe|agile|scrum|jira|trello|vscode|postman|selenium|cypress|jest|vitest|webpack|vite|eslint|prettier|bcrypt|csrf|xss|html5|css3|es6|ci\/cd|restful|rest api|api rest)/i;

export function cleanKeyword(raw: string): string {
  return raw
    .trim()
    .replace(/^[•\-*\s]+/, "")
    .replace(/[.,;:\s\-]+$/, "")
    .replace(/\s+/g, " ");
}

export function isTechnicalKeyword(kw: string): boolean {
  if (!kw || typeof kw !== "string") return false;

  const cleaned = cleanKeyword(kw);
  if (cleaned.length < 2 || cleaned.length > 32) return false;

  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length > 3) return false;
  if (/[;!?•()|[\]{}]/.test(cleaned)) return false;

  const lower = cleaned.toLowerCase();

  if (STOP_WORDS.has(lower)) return false;
  if (NON_TECH_TERMS.some((term) => lower.includes(term))) return false;
  if (words.some((w) => STOP_WORDS.has(w.toLowerCase()))) return false;

  // Must look technical: known pattern, dotted name, version, slash, or acronym
  const looksTechnical =
    TECH_PATTERNS.test(cleaned) ||
    /[.#/+]/.test(cleaned) ||
    /\d/.test(cleaned) ||
    (cleaned.length >= 2 && cleaned === cleaned.toUpperCase() && /[A-Z]/.test(cleaned)) ||
    /\.(js|ts|tsx|jsx|net|io)$/i.test(cleaned) ||
    (words.length === 1 &&
      cleaned.length >= 4 &&
      /^[A-Za-z][A-Za-z0-9+#.-]*$/.test(cleaned) &&
      /[A-Z]/.test(cleaned));

  if (!looksTechnical && words.length === 1 && cleaned.length < 4) return false;

  return looksTechnical || words.length >= 2;
}

function normalizeForCompare(kw: string): string {
  return cleanKeyword(kw)
    .toLowerCase()
    .replace(/\.(js|ts|tsx|jsx)$/i, "")
    .replace(/[^a-z0-9+#/]/g, "");
}

/** True if `a` and `b` refer to the same skill (substring / alias) */
function keywordsAreRelated(a: string, b: string): boolean {
  const na = normalizeForCompare(a);
  const nb = normalizeForCompare(b);
  if (!na || !nb) return false;
  if (na === nb) return true;

  const shorter = na.length <= nb.length ? na : nb;
  const longer = na.length > nb.length ? na : nb;

  if (shorter.length < 3) return false;
  if (longer.includes(shorter)) return true;

  // react ~ react.js
  if (longer.startsWith(shorter) && longer.length - shorter.length <= 3) return true;

  return false;
}

function dedupeList(list: string[]): string[] {
  const out: string[] = [];
  const rejected: { kw: string; reason: string }[] = [];
  for (const kw of list) {
    const cleaned = cleanKeyword(kw);
    if (!cleaned) {
      rejected.push({ kw, reason: "empty_after_clean" });
      continue;
    }
    if (!isTechnicalKeyword(cleaned)) {
      rejected.push({ kw, reason: "failed_isTechnicalKeyword" });
      continue;
    }
    if (out.some((existing) => keywordsAreRelated(existing, cleaned))) {
      rejected.push({ kw, reason: "duplicate_or_related" });
      continue;
    }
    out.push(cleaned);
  }
  console.log("========== [STAGE 3 & 4] DEDUPE & NORMALIZATION ==========");
  console.log("Input list:", list);
  console.log("Accepted out:", out);
  console.log("Rejected items:", rejected);
  console.log("==========================================================");
  return out;
}

export function reconcileKeywordLists(
  foundRaw: string[] = [],
  missingRaw: string[] = []
): { keywordsFound: string[]; keywordsMissing: string[] } {
  console.log("========== [STAGE 5 START] RECONCILE ==========");
  console.log("foundRaw:", foundRaw);
  console.log("missingRaw:", missingRaw);

  let keywordsFound = dedupeList(foundRaw).slice(0, 15);
  let keywordsMissing = dedupeList(missingRaw).slice(0, 15);

  // Remove exact or semantic duplicates across lists (found wins)
  keywordsMissing = keywordsMissing.filter(
    (missing) => !keywordsFound.some((found) => keywordsAreRelated(found, missing))
  );

  // Drop weak standalone tokens when a longer related skill is already found
  keywordsMissing = keywordsMissing.filter((missing) => {
    const m = missing.toLowerCase();
    if (!WEAK_STANDALONE.has(m)) return true;
    return !keywordsFound.some((found) => keywordsAreRelated(found, missing));
  });

  keywordsFound = keywordsFound.filter((found) => {
    const f = found.toLowerCase();
    if (!WEAK_STANDALONE.has(f)) return true;
    return !keywordsMissing.some((missing) => keywordsAreRelated(found, missing));
  });

  console.log("========== [STAGE 5 FINAL RECONCILED] ==========");
  console.log("Final keywordsFound:", keywordsFound);
  console.log("Final keywordsMissing:", keywordsMissing);
  console.log("================================================");

  return { keywordsFound, keywordsMissing };
}

export function computeKeywordMatchScore(
  keywordsFound: string[],
  keywordsMissing: string[]
): number {
  const total = keywordsFound.length + keywordsMissing.length;
  if (total === 0) return 0;
  if (keywordsMissing.length === 0) return 30;
  const ratio = keywordsFound.length / total;
  return Math.round(Math.min(30, Math.max(0, ratio * 30)));
}

export function applyCoherentAtsScoring(parsed: {
  atsScore?: number;
  scoreBreakdown?: Record<string, { score?: number; max?: number }>;
  keywordsFound?: string[];
  keywordsMissing?: string[];
  flaws?: string[];
  suggestions?: string[];
}): typeof parsed {
  const { keywordsFound, keywordsMissing } = reconcileKeywordLists(
    parsed.keywordsFound || [],
    parsed.keywordsMissing || []
  );
  parsed.keywordsFound = keywordsFound;
  parsed.keywordsMissing = keywordsMissing;

  const categories = [
    "keywordMatch",
    "format",
    "experience",
    "education",
    "skills",
    "readability",
  ] as const;
  const maxByCat: Record<string, number> = {
    keywordMatch: 30,
    format: 20,
    experience: 20,
    education: 10,
    skills: 15,
    readability: 5,
  };

  if (!parsed.scoreBreakdown) parsed.scoreBreakdown = {};

  for (const cat of categories) {
    if (!parsed.scoreBreakdown[cat]) {
      parsed.scoreBreakdown[cat] = { score: 0, max: maxByCat[cat] };
    }
    parsed.scoreBreakdown[cat].max = maxByCat[cat];
  }

  // Keyword score always derived from lists (aligned with UI counts)
  parsed.scoreBreakdown.keywordMatch.score = computeKeywordMatchScore(
    keywordsFound,
    keywordsMissing
  );

  // Skills score should reflect keyword coverage
  const kwTotal = keywordsFound.length + keywordsMissing.length;
  if (kwTotal > 0) {
    const kwRatio = keywordsFound.length / kwTotal;
    const skillsFromKw = Math.round(kwRatio * 15);
    const currentSkills = Number(parsed.scoreBreakdown.skills?.score) || 0;
    parsed.scoreBreakdown.skills.score = Math.max(currentSkills, skillsFromKw);
  }
  parsed.scoreBreakdown.skills.score = Math.min(
    15,
    Math.max(0, Number(parsed.scoreBreakdown.skills.score) || 0)
  );

  // Clamp all category scores to their max
  for (const cat of categories) {
    const max = maxByCat[cat];
    const raw = Number(parsed.scoreBreakdown[cat]?.score) || 0;
    parsed.scoreBreakdown[cat].score = Math.min(max, Math.max(0, raw));
  }

  let total = 0;
  for (const cat of categories) {
    total += Number(parsed.scoreBreakdown[cat].score) || 0;
  }
  parsed.atsScore = Math.min(100, Math.max(0, Math.round(total)));

  return parsed;
}
