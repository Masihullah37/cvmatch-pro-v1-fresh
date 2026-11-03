export function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      const text = typeof item === "string"
        ? item
        : String((item as { name?: string; skill?: string })?.name ?? (item as { skill?: string })?.skill ?? item ?? "");
      return text.split(/[,;|\n]/).map((skill) => skill.trim()).filter(Boolean);
    });
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return asStringArray(parsed);
      } catch {
        /* use comma split */
      }
    }
    return trimmed.split(/[,;|\n]/).map((s) => s.trim()).filter(Boolean);
  }
  if (value != null && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap((v) => asStringArray(v));
  }
  return [];
}

export function asEditableStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return asStringArray(value);
  return value.flatMap((item) =>
    typeof item === "string" ? [item] : asStringArray([item]),
  );
}

export function asRecordArray(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value as Record<string, unknown>[];
  if (value != null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return [];
    const firstVal = entries[0][1];
    if (firstVal != null && typeof firstVal === "object" && !Array.isArray(firstVal)) {
      return Object.values(value as Record<string, unknown>) as Record<string, unknown>[];
    }
    return entries.map(([language, level]) => ({
      language,
      level: typeof level === "string" ? level : String(level ?? ""),
    }));
  }
  return [];
}
