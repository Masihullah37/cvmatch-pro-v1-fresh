type CvRecord = Record<string, unknown>;

const SECTION_ALIASES: Record<string, string> = {
  about: "summary",
  profile: "summary",
  professionalprofile: "summary",
  professionalsummary: "summary",
  careerobjective: "summary",
  objective: "summary",
  workexperience: "experience",
  professionalexperience: "experience",
  employmenthistory: "experience",
  employment: "experience",
  workhistory: "experience",
  careerhistory: "experience",
  jobhistory: "experience",
  professionalhistory: "experience",
  relevantexperience: "experience",
  careerexperience: "experience",
  jobs: "experience",
  academicbackground: "education",
  educationalbackground: "education",
  academichistory: "education",
  academicqualifications: "education",
  qualifications: "education",
  studies: "education",
  training: "education",
  formation: "education",
  competencies: "skills",
  corecompetencies: "skills",
  skillsandcompetencies: "skills",
  keycompetencies: "skills",
  coreskills: "skills",
  technicalskills: "skills",
  keyskills: "skills",
  expertise: "skills",
  aptitudes: "skills",
  languageskills: "languages",
  personalprojects: "projects",
  selectedprojects: "projects",
  hobbies: "interests",
  extracurricularactivities: "interests",
  contactinformation: "contact",
  contactdetails: "contact",
  personaldetails: "contact",
};

const RESERVED_KEYS = new Set([
  "username",
  "name",
  "fullname",
  "jobtitle",
  "title",
  "summary",
  "contact",
  "experience",
  "education",
  "skills",
  "languages",
  "projects",
  "interests",
  "headers",
  "sectionorder",
  "displaysettings",
  "photourl",
  "profiledescription",
  "email",
  "phone",
  "telephone",
  "location",
  "address",
  "linkedin",
  "github",
  "portfolio",
  "website",
  "linkedIn",
  "additionalsections",
  "_originalcvtext",
  "_originalcvcontext",
  "_optimizedcvtext",
]);

function normalizeKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function resolveSectionKey(value: string): string | undefined {
  const aliasedSection = SECTION_ALIASES[normalizeKey(value)];
  if (aliasedSection) return aliasedSection;

  const words = normalizeText(
    value.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " "),
  ).split(/\s+/);
  if (!words.length || words.length > 6) return undefined;
  if (words.slice(1).some((word) => /ing$/.test(word) && !["training", "learning"].includes(word))) {
    return undefined;
  }
  const has = (...terms: string[]) => terms.some((term) => words.includes(term));

  if (has("profile", "summary", "objective", "introduction", "about", "biography")) {
    return "summary";
  }
  if (has("language", "languages", "multilingual")) return "languages";
  if (has("education", "academic", "qualification", "qualifications", "study", "studies")) {
    return "education";
  }
  if (has("training", "course", "courses") && words.some((word) =>
    ["academic", "education", "professional", "development", "vocational"].includes(word),
  )) {
    return "education";
  }
  if (
    has("project", "projects") &&
    words.length <= 3 &&
    !has("manager", "management", "coordinator")
  ) {
    return "projects";
  }
  if (
    has("skill", "skills", "competency", "competencies", "expertise", "proficiency", "proficiencies", "strengths", "abilities", "capabilities", "technology", "technologies", "tools") &&
    !has("include", "includes", "including", "use", "using", "used", "develop", "developing", "apply", "applying")
  ) {
    return "skills";
  }
  if (
    has("experience", "employment", "history", "background") ||
    (has("career") && has("highlights", "summary", "history", "path", "profile", "experience")) ||
    (has("role", "roles", "position", "positions") && has("professional", "relevant", "selected", "career", "history"))
  ) {
    return "experience";
  }
  if (has("interest", "interests", "hobbies", "hobby", "extracurricular")) return "interests";
  return undefined;
}

function asRecord(value: unknown): CvRecord {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as CvRecord;
  }
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as CvRecord;
      }
    } catch {
      return {};
    }
  }
  return {};
}

function textValue(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }
  return "";
}

function sectionEntries(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => {
      const text = textValue(entry);
      if (text) return [text];
      if (entry && typeof entry === "object") {
        const record = entry as CvRecord;
        const title = textValue(record.title || record.name || record.label);
        const content = textValue(
          record.content || record.description || record.details || record.value,
        );
        const heading = title ? [`${title}${content ? `: ${content}` : ""}`] : [];
        const known = new Set(["title", "name", "label", "content", "description", "details", "value"]);
        const remaining = Object.entries(record)
          .filter(([key]) => !known.has(key))
          .flatMap(([key, item]) => sectionEntries(item).map((text) => `${key}: ${text}`));
        return [...heading, ...remaining];
      }
      return [];
    });
  }
  if (typeof value === "string") {
    return value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }
  if (value && typeof value === "object") {
    const record = value as CvRecord;
    const title = textValue(record.title || record.name || record.label);
    const content = textValue(
      record.content || record.description || record.details || record.value,
    );
    const heading = title ? [`${title}${content ? `: ${content}` : ""}`] : [];
    const known = new Set(["title", "name", "label", "content", "description", "details", "value"]);
    const remaining = Object.entries(record)
      .filter(([key]) => !known.has(key))
      .flatMap(([key, item]) => sectionEntries(item).map((text) => `${key}: ${text}`));
    return [...heading, ...remaining];
  }
  return [];
}

function mergeUnique<T>(...lists: T[][]): T[] {
  const seen = new Set<string>();
  return lists.flat().filter((item) => {
    const key = normalizeText(
      typeof item === "string" ? item : JSON.stringify(item),
    );
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function skillEntries(value: unknown): string[] {
  const values = Array.isArray(value) ? value : [value];
  return mergeUnique(
    values.flatMap((item) => {
      const record = asRecord(item);
      const text = textValue(item) ||
        textValue(record.name || record.skill || record.title || record.label);
      if (!text) return [];
      return text.split(/[,;|\n]+/).map((skill) => skill.trim()).filter(Boolean);
    }),
  );
}

function hasSectionContent(value: unknown): boolean {
  if (typeof value === "string") return Boolean(value.trim());
  if (Array.isArray(value)) return value.some(hasSectionContent);
  if (value && typeof value === "object") {
    return Object.values(value as CvRecord).some(hasSectionContent);
  }
  return value != null && value !== false;
}

function normalizeExperience(value: unknown): CvRecord[] {
  const record = asRecord(value);
  const looksLikeExperience =
    ["title", "role", "position", "jobTitle", "company", "employer", "organization"]
      .some((key) => key in record);
  return sectionEntries(value).length > 0 && !Array.isArray(value) && !looksLikeExperience
    ? sectionEntries(value).map((description) => ({ title: "", company: "", period: "", description }))
    : (Array.isArray(value) ? value : value ? [value] : []).flatMap((entry) => {
        const record = asRecord(entry);
        if (Object.keys(record).length === 0) {
          const description = textValue(entry);
          return description ? [{ title: "", company: "", period: "", description }] : [];
        }

        const title = textValue(record.title || record.role || record.position || record.jobTitle);
        const company = textValue(record.company || record.employer || record.organization);
        const period = textValue(record.period || record.dates || record.duration || record.date);
        const description = textValue(
          record.description || record.responsibilities || record.details || record.summary,
        );
        const known = new Set([
          "title", "role", "position", "jobTitle", "company", "employer",
          "organization", "period", "dates", "duration", "date", "description",
          "responsibilities", "details", "summary",
        ]);
        const extra = Object.entries(record)
          .filter(([key]) => !known.has(key))
          .flatMap(([, item]) => sectionEntries(item));
        return [{
          ...record,
          title,
          company,
          period,
          description: [description, ...extra].filter(Boolean).join("\n"),
        }];
      });
}

function normalizeRecords(
  value: unknown,
  kind: "education" | "languages" | "projects",
): CvRecord[] {
  const entries = Array.isArray(value) ? value : value == null ? [] : [value];
  const records: CvRecord[] = [];
  entries.forEach((entry) => {
    const record = asRecord(entry);
    if (!Object.keys(record).length) {
      const text = textValue(entry);
      if (!text) return;
      if (kind === "education") records.push({ degree: text, school: "", year: "", details: "" });
      else if (kind === "languages") records.push({ language: text, level: "" });
      else records.push({ name: text, description: "", technologies: [] });
      return;
    }

    if (kind === "education") {
      records.push({
        ...record,
        degree: textValue(record.degree || record.qualification || record.title),
        school: textValue(record.school || record.institution || record.university || record.organization),
        year: textValue(record.year || record.period || record.dates || record.date),
        details: textValue(record.details || record.description || record.field || record.major),
      });
    } else if (kind === "languages") {
      records.push({
        ...record,
        language: textValue(record.language || record.name || record.title),
        level: textValue(record.level || record.proficiency || record.fluency),
      });
    } else {
      records.push({
        ...record,
        name: textValue(record.name || record.title || record.project),
        description: textValue(record.description || record.details || record.summary),
        technologies: Array.isArray(record.technologies)
          ? record.technologies
          : skillEntries(record.technologies || record.tools),
      });
    }
  });
  return records;
}

const SOURCE_SECTION_HEADINGS = new Set([
  "profile", "summary", "professional summary", "about", "objective",
  "career summary", "experience", "professional experience", "work experience",
  "work history", "job history", "employment history", "career history",
  "education", "academic background",
  "training", "skills", "competencies", "core competencies", "technical skills",
  "skills and competencies", "expertise", "technical proficiencies", "languages",
  "projects", "interests", "hobbies", "contact", "certification",
  "certifications", "certificates", "licenses", "achievements",
  "key achievements", "awards", "publications", "volunteer experience",
  "volunteering", "references", "professional development",
  "contact information", "contact details", "personal details",
]);

const SECTION_SYNONYMS: Record<string, string> = {
  built: "developed",
  created: "developed",
  engineered: "developed",
  implemented: "developed",
  managed: "led",
  oversaw: "led",
  supervised: "led",
  directed: "led",
  duties: "responsibilities",
  tasks: "responsibilities",
  responsibilities: "responsibility",
  clients: "customer",
  customers: "customer",
  applications: "software",
  systems: "system",
  improved: "improve",
  increased: "improve",
  boosted: "improve",
  reduced: "reduce",
  decreased: "reduce",
  certificates: "certification",
  certifications: "certification",
  awards: "award",
  honours: "award",
  honors: "award",
  qualifications: "qualification",
  degrees: "qualification",
  employment: "experience",
  career: "experience",
  work: "experience",
};

const SEMANTIC_STOP_WORDS = new Set([
  "a", "an", "and", "at", "by", "for", "from", "in", "into", "of", "on",
  "or", "the", "to", "via", "with", "as", "is", "was", "were", "this",
  "that", "their", "our", "your", "his", "her", "its", "i", "we", "they",
  "he", "she", "it", "you", "me", "my", "be", "been", "being", "have",
  "has", "had", "do", "does", "did", "responsible", "using",
]);

interface SourceSection {
  key: string;
  title: string;
  lines: string[];
}

function semanticTokens(value: string): Set<string> {
  return new Set(
    normalizeText(value)
      .split(/\s+/)
      .filter((token) => token.length > 1 && !SEMANTIC_STOP_WORDS.has(token))
      .map((token) => SECTION_SYNONYMS[token] || token),
  );
}

function isSemanticallyRepresented(candidate: string, values: string[]): boolean {
  const candidateText = normalizeText(candidate);
  if (!candidateText) return true;

  const candidateTokens = semanticTokens(candidate);
  for (const value of values) {
    const representedText = normalizeText(value);
    if (!representedText) continue;
    if (` ${representedText} `.includes(` ${candidateText} `)) {
      return true;
    }

    const representedTokens = semanticTokens(value);
    const smallerSet = candidateTokens.size <= representedTokens.size
      ? candidateTokens
      : representedTokens;
    const largerSet = candidateTokens.size <= representedTokens.size
      ? representedTokens
      : candidateTokens;
    if (smallerSet.size < 2) continue;
    const shared = [...smallerSet].filter((token) => largerSet.has(token)).length;
    if (shared >= 2 && shared / smallerSet.size >= 0.75) return true;
  }
  return false;
}

function collectTextFragments(value: unknown): string[] {
  if (typeof value === "string" || typeof value === "number") {
    const text = String(value).trim();
    return text ? [text] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap(collectTextFragments);
  }
  if (value && typeof value === "object") {
    const record = value as CvRecord;
    const values = Object.values(record).flatMap(collectTextFragments);
    const combined = values.join(" ");
    return combined ? [combined, ...values] : values;
  }
  return [];
}

function cleanSourceLine(line: string): string {
  return line
    .replace(/^[\s•●▪◦\-–—*]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseSourceSections(text: string, source: CvRecord): SourceSection[] {
  const headingMap = new Map<string, { key: string; title: string }>();

  for (const [heading, key] of Object.entries(SECTION_ALIASES)) {
    headingMap.set(normalizeText(heading), { key, title: heading });
  }
  for (const heading of SOURCE_SECTION_HEADINGS) {
    const normalized = normalizeKey(heading);
    const key = resolveSectionKey(heading) || SECTION_ALIASES[normalized] || normalized;
    headingMap.set(normalizeText(heading), { key, title: heading });
  }
  for (const [key, title] of Object.entries(asRecord(source.headers))) {
    if (typeof title === "string") {
      headingMap.set(normalizeText(title), { key: resolveSectionKey(title) || key, title });
    }
  }
  for (const key of Object.keys(source)) {
    if (RESERVED_KEYS.has(normalizeKey(key)) || key.startsWith("_")) continue;
    const sectionKey = resolveSectionKey(key) || key;
    headingMap.set(normalizeText(key.replace(/[_-]+/g, " ")), {
      key: sectionKey,
      title: key.replace(/[_-]+/g, " "),
    });
  }

  const sections: SourceSection[] = [];
  let currentSection: SourceSection = {
    key: "summary",
    title: "Profil",
    lines: [],
  };
  sections.push(currentSection);

  for (const rawLine of text.split(/\r?\n/)) {
    const line = cleanSourceLine(rawLine);
    if (!line) continue;
    const heading = headingMap.get(normalizeText(line)) ||
      (line.length <= 64 &&
      line.split(/\s+/).length <= 5 &&
      !/[.!?;,:]/.test(line)
        ? (() => {
            const key = resolveSectionKey(line);
            return key ? { key, title: line } : undefined;
          })()
        : undefined);
    if (heading) {
      currentSection = { ...heading, lines: [] };
      sections.push(currentSection);
    } else {
      currentSection.lines.push(line);
    }
  }

  return sections.filter((section) => section.lines.length > 0);
}

function appendSectionContent(
  data: CvRecord,
  headers: CvRecord,
  sectionOrder: string[],
  section: SourceSection,
  lines: string[],
): void {
  if (!lines.length) return;
  const uniqueLines = mergeUnique(lines);
  if (!uniqueLines.length) return;

  switch (section.key) {
    case "summary":
      data.summary = [textValue(data.summary), ...uniqueLines].filter(Boolean).join("\n");
      return;
    case "skills":
      data.skills = mergeUnique(skillEntries(data.skills), skillEntries(uniqueLines));
      return;
    case "experience":
      data.experience = [
        ...normalizeExperience(data.experience),
        { title: "", company: "", period: "", description: uniqueLines.join("\n") },
      ];
      return;
    case "education":
      data.education = [
        ...normalizeRecords(data.education, "education"),
        { degree: "", school: "", year: "", details: uniqueLines.join("\n") },
      ];
      return;
    case "languages":
      data.languages = mergeUnique(
        normalizeRecords(data.languages, "languages"),
        normalizeRecords(uniqueLines, "languages"),
      );
      return;
    case "projects":
      data.projects = [
        ...normalizeRecords(data.projects, "projects"),
        { name: "", description: uniqueLines.join("\n"), technologies: [] },
      ];
      return;
    case "interests":
      data.interests = mergeUnique(sectionEntries(data.interests), uniqueLines);
      return;
    default:
      data[section.key] = mergeUnique(sectionEntries(data[section.key]), uniqueLines);
      headers[section.key] = textValue(headers[section.key]) || section.title;
      if (!sectionOrder.includes(section.key)) sectionOrder.push(section.key);
  }
}

function mergeContactLines(data: CvRecord, lines: string[]): string[] {
  const contact = asRecord(data.contact);
  const fieldAliases: Record<string, string> = {
    email: "email",
    mail: "email",
    courriel: "email",
    phone: "phone",
    telephone: "phone",
    mobile: "phone",
    tel: "phone",
    address: "location",
    adresse: "location",
    location: "location",
    localisation: "location",
    city: "location",
    linkedin: "linkedin",
    github: "github",
    portfolio: "portfolio",
    website: "portfolio",
    siteweb: "portfolio",
  };
  const unmatched: string[] = [];

  for (const line of lines) {
    const labeledValue = line.match(/^([^:：]{1,40})\s*[:：]\s*(.+)$/);
    let field = labeledValue ? fieldAliases[normalizeKey(labeledValue[1])] : undefined;
    let value = labeledValue?.[2]?.trim() || "";

    if (!field) {
      const email = line.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/);
      const url = line.match(/https?:\/\/\S+/i);
      if (email) {
        field = "email";
        value = email[0];
      } else if (url) {
        const normalizedUrl = url[0].toLowerCase();
        field = normalizedUrl.includes("linkedin")
          ? "linkedin"
          : normalizedUrl.includes("github")
            ? "github"
            : "portfolio";
        value = url[0];
      }
    }

    if (!field || !value) {
      unmatched.push(line);
      continue;
    }

    const currentValues = textValue(contact[field])
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
    contact[field] = mergeUnique(currentValues, [value]).join("\n");
  }

  data.contact = contact;
  return unmatched;
}

export function mapImportedCvData(
  input: unknown,
  originalText = "",
): CvRecord {
  const source = asRecord(input);
  const data: CvRecord = { ...source };
  const sourceKeys = Object.keys(source);

  for (const key of sourceKeys) {
    const canonical = resolveSectionKey(key);
    if (canonical && source[canonical] == null) {
      data[canonical] = source[key];
    }
  }

  data.userName = textValue(source.userName || source.fullName || source.name);
  data.jobTitle = textValue(source.jobTitle || source.title);
  data.summary = textValue(source.summary || source.professionalSummary || source.profile || source.objective);

  const contact = asRecord(source.contact);
  data.contact = {
    ...contact,
    email: textValue(contact.email || source.email),
    phone: textValue(contact.phone || source.phone || source.telephone),
    location: textValue(contact.location || source.location || source.address),
    linkedin: textValue(contact.linkedin || source.linkedin || source.linkedIn),
    github: textValue(contact.github || source.github),
    portfolio: textValue(contact.portfolio || contact.website || source.portfolio || source.website),
  };

  const experienceAliases = sourceKeys
    .filter((key) => resolveSectionKey(key) === "experience")
    .map((key) => normalizeExperience(source[key]));
  data.experience = mergeUnique(
    normalizeExperience(source.experience),
    ...experienceAliases,
  );
  data.education = mergeUnique(
    normalizeRecords(source.education, "education"),
    ...sourceKeys
      .filter((key) => resolveSectionKey(key) === "education")
      .map((key) => normalizeRecords(source[key], "education")),
  );
  data.skills = skillEntries(source.skills);
  for (const key of sourceKeys.filter((item) => resolveSectionKey(item) === "skills")) {
    data.skills = mergeUnique(data.skills as string[], skillEntries(source[key]));
  }
  data.languages = mergeUnique(
    normalizeRecords(source.languages, "languages"),
    ...sourceKeys
      .filter((key) => resolveSectionKey(key) === "languages")
      .map((key) => normalizeRecords(source[key], "languages")),
  );
  data.projects = mergeUnique(
    normalizeRecords(source.projects, "projects"),
    ...sourceKeys
      .filter((key) => resolveSectionKey(key) === "projects")
      .map((key) => normalizeRecords(source[key], "projects")),
  );
  data.interests = mergeUnique(
    sectionEntries(source.interests),
    ...sourceKeys
      .filter((key) => resolveSectionKey(key) === "interests")
      .map((key) => sectionEntries(source[key]))
  );

  const sourceHeaders = Object.fromEntries(
    Object.entries(asRecord(source.headers)).filter(([key, title]) => {
      const canonical = resolveSectionKey(key) ||
        (typeof title === "string" ? resolveSectionKey(title) : undefined);
      return !canonical || canonical === key;
    }),
  );
  const headers: CvRecord = {
    summary: "Profil",
    experience: "Expérience",
    education: "Formation",
    projects: "Projets",
    skills: "Compétences",
    languages: "Langues",
    contact: "Contact",
    ...sourceHeaders,
  };
  const sectionOrder = Array.isArray(source.sectionOrder)
    ? mergeUnique(
        source.sectionOrder
          .filter((key): key is string => typeof key === "string")
          .map((key) => resolveSectionKey(key) || key),
      )
    : ["summary", "experience", "education", "projects", "skills", "languages", "contact"];
  if (hasSectionContent(data.contact) && !sectionOrder.includes("contact")) {
    sectionOrder.push("contact");
  }
  const knownFields = new Set([
    ...RESERVED_KEYS,
    ...Object.keys(SECTION_ALIASES),
  ]);
  for (const key of sourceKeys) {
    const normalized = normalizeKey(key);
    if (knownFields.has(normalized) || resolveSectionKey(key) || !key.trim() || key.startsWith("_")) continue;
    const lines = sectionEntries(source[key]);
    if (!lines.length) continue;
    headers[key] = textValue(headers[key]) || key.replace(/[_-]+/g, " ");
    if (!sectionOrder.includes(key)) sectionOrder.push(key);
    data[key] = lines;
  }

  const representedContent = (excludeKey?: string) =>
    Object.entries(data)
      .filter(([key]) => !key.startsWith("_") && key !== excludeKey)
      .flatMap(([, value]) => collectTextFragments(value));

  for (const section of parseSourceSections(originalText, source)) {
    const unmatchedLines: string[] = [];
    for (const line of section.lines) {
      if (!isSemanticallyRepresented(line, [...representedContent(), ...unmatchedLines])) {
        unmatchedLines.push(line);
      }
    }
    if (section.key === "contact") {
      const unmatchedContactLines = mergeContactLines(data, unmatchedLines);
      appendSectionContent(
        data,
        headers,
        sectionOrder,
        { key: "additionalSections", title: "Autres informations", lines: [] },
        unmatchedContactLines,
      );
    } else {
      appendSectionContent(data, headers, sectionOrder, section, unmatchedLines);
    }
  }

  const uniqueAdditional: string[] = [];
  const existingContent = representedContent("additionalSections");
  for (const line of sectionEntries(data.additionalSections)) {
    if (!isSemanticallyRepresented(line, [...existingContent, ...uniqueAdditional])) {
      uniqueAdditional.push(line);
    }
  }
  if (uniqueAdditional.length) {
    data.additionalSections = uniqueAdditional;
    headers.additionalSections = textValue(headers.additionalSections) || "Autres informations";
    if (!sectionOrder.includes("additionalSections")) sectionOrder.push("additionalSections");
  } else {
    delete data.additionalSections;
    delete headers.additionalSections;
    const additionalIndex = sectionOrder.indexOf("additionalSections");
    if (additionalIndex !== -1) sectionOrder.splice(additionalIndex, 1);
  }

  data.headers = headers;
  data.sectionOrder = sectionOrder;
  return data;
}

export function preserveImportedCvContent(
  imported: unknown,
  optimized: unknown,
  originalText = "",
): CvRecord {
  const baseline = mapImportedCvData(imported, originalText);
  const generated = mapImportedCvData(optimized, originalText);
  const merged: CvRecord = { ...baseline, ...generated };

  merged.userName = textValue(generated.userName) || baseline.userName;
  merged.jobTitle = textValue(generated.jobTitle) || baseline.jobTitle;

  for (const field of ["experience", "education", "skills", "languages", "projects", "interests"]) {
    merged[field] = mergeUnique(
      Array.isArray(generated[field]) ? generated[field] as unknown[] : [],
      Array.isArray(baseline[field]) ? baseline[field] as unknown[] : [],
    );
  }

  const standardSections = new Set([
    "summary", "experience", "education", "skills", "languages", "projects",
    "interests", "contact", "headers", "sectionorder",
  ]);
  for (const section of Array.isArray(baseline.sectionOrder) ? baseline.sectionOrder : []) {
    if (typeof section !== "string" || standardSections.has(section.toLowerCase())) continue;
    merged[section] = mergeUnique(
      sectionEntries(generated[section]),
      sectionEntries(baseline[section]),
    );
  }
  merged.additionalSections = mergeUnique(
    sectionEntries(generated.additionalSections),
    sectionEntries(baseline.additionalSections),
  );

  const originalSummary = textValue(baseline.summary);
  const optimizedSummary = textValue(generated.summary);
  if (originalSummary && !normalizeText(optimizedSummary).includes(normalizeText(originalSummary))) {
    merged.summary = [optimizedSummary, originalSummary].filter(Boolean).join("\n\n");
  }

  merged.contact = {
    ...Object.fromEntries(
      Object.entries(asRecord(baseline.contact)).map(([key, value]) => [
        key,
        textValue(asRecord(generated.contact)[key]) || value,
      ]),
    ),
    ...Object.fromEntries(
      Object.entries(asRecord(generated.contact)).filter(([, value]) => Boolean(textValue(value))),
    ),
  };
  merged.headers = { ...asRecord(baseline.headers), ...asRecord(generated.headers) };
  merged.sectionOrder = mergeUnique(
    Array.isArray(generated.sectionOrder) ? generated.sectionOrder as string[] : [],
    Array.isArray(baseline.sectionOrder) ? baseline.sectionOrder as string[] : [],
  );
  return mapImportedCvData(merged, originalText);
}
