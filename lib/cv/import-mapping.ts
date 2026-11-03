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
  "experience", "professional experience", "work experience", "work history",
  "employment history", "career history", "education", "academic background",
  "training", "skills", "competencies", "core competencies", "technical skills",
  "expertise", "languages", "projects", "interests", "hobbies", "contact",
  "certifications", "certificates", "awards", "publications", "volunteering",
  "references", "professional development",
]);

export function mapImportedCvData(
  input: unknown,
  originalText = "",
): CvRecord {
  const source = asRecord(input);
  const data: CvRecord = { ...source };
  const sourceKeys = Object.keys(source);

  for (const key of sourceKeys) {
    const canonical = SECTION_ALIASES[normalizeKey(key)];
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
    .filter((key) => SECTION_ALIASES[normalizeKey(key)] === "experience")
    .map((key) => normalizeExperience(source[key]));
  data.experience = mergeUnique(
    normalizeExperience(source.experience),
    ...experienceAliases,
  );
  data.education = mergeUnique(
    normalizeRecords(source.education, "education"),
    ...sourceKeys
      .filter((key) => SECTION_ALIASES[normalizeKey(key)] === "education")
      .map((key) => normalizeRecords(source[key], "education")),
  );
  data.skills = skillEntries(source.skills);
  for (const key of sourceKeys.filter((item) => SECTION_ALIASES[normalizeKey(item)] === "skills")) {
    data.skills = mergeUnique(data.skills as string[], skillEntries(source[key]));
  }
  data.languages = mergeUnique(
    normalizeRecords(source.languages, "languages"),
    ...sourceKeys
      .filter((key) => SECTION_ALIASES[normalizeKey(key)] === "languages")
      .map((key) => normalizeRecords(source[key], "languages")),
  );
  data.projects = mergeUnique(
    normalizeRecords(source.projects, "projects"),
    ...sourceKeys
      .filter((key) => SECTION_ALIASES[normalizeKey(key)] === "projects")
      .map((key) => normalizeRecords(source[key], "projects")),
  );
  data.interests = mergeUnique(
    sectionEntries(source.interests),
    ...sourceKeys
      .filter((key) => SECTION_ALIASES[normalizeKey(key)] === "interests")
      .map((key) => sectionEntries(source[key]))
  );

  const headers: CvRecord = {
    summary: "Profil",
    experience: "Expérience",
    education: "Formation",
    projects: "Projets",
    skills: "Compétences",
    languages: "Langues",
    contact: "Contact",
    ...asRecord(source.headers),
  };
  const sectionOrder = Array.isArray(source.sectionOrder)
    ? source.sectionOrder.filter((key): key is string => typeof key === "string")
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
    if (knownFields.has(normalized) || !key.trim() || key.startsWith("_")) continue;
    const lines = sectionEntries(source[key]);
    if (!lines.length) continue;
    headers[key] = textValue(headers[key]) || key.replace(/[_-]+/g, " ");
    if (!sectionOrder.includes(key)) sectionOrder.push(key);
    data[key] = lines;
  }

  const additionalLines = sectionEntries(source.additionalSections);
  const representedText = normalizeText(
    JSON.stringify({
      userName: data.userName,
      jobTitle: data.jobTitle,
      summary: data.summary,
      contact: data.contact,
      experience: data.experience,
      education: data.education,
      skills: data.skills,
      languages: data.languages,
      projects: data.projects,
      interests: data.interests,
      custom: sourceKeys
        .filter((key) => !knownFields.has(normalizeKey(key)))
        .map((key) => data[key]),
    }),
  );
  const residualLines = originalText
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s•●▪◦\-–—*]+/, "").trim())
    .filter((line) => {
      if (line.length < 3) return false;
      const normalized = normalizeText(line);
      const sourceKey = normalizeKey(line);
      const canonical = SECTION_ALIASES[sourceKey] || sourceKey;
      const isHeading = SOURCE_SECTION_HEADINGS.has(normalized);
      const headingAlreadyMapped = isHeading && (
        (canonical in data && hasSectionContent(data[canonical])) ||
        (canonical === "contact" && hasSectionContent(data.contact)) ||
        sourceKeys.some((key) => normalizeKey(key) === sourceKey && hasSectionContent(data[key]))
      );
      return normalized.length > 2 &&
        !headingAlreadyMapped &&
        !representedText.includes(normalized);
    });
  const preservedAdditional = mergeUnique(additionalLines, residualLines);
  if (preservedAdditional.length) {
    data.additionalSections = preservedAdditional;
    headers.additionalSections = textValue(headers.additionalSections) || "Autres informations";
    if (!sectionOrder.includes("additionalSections")) sectionOrder.push("additionalSections");
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
