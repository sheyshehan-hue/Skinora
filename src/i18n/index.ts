/**
 * Lightweight i18n. English ships complete; Sinhala and Tamil dictionaries can be
 * filled in later and switched on in LOCALES. Missing keys fall back to English.
 */
import en from "./en";

export type Dict = typeof en;
export type Locale = "en" | "si" | "ta";

export const LOCALES: { code: Locale; label: string; enabled: boolean }[] = [
  { code: "en", label: "English", enabled: true },
  { code: "si", label: "සිංහල", enabled: false },
  { code: "ta", label: "தமிழ்", enabled: false },
];

const dictionaries: Record<Locale, Partial<Dict>> = {
  en,
  si: {}, // add translations in src/i18n/si.ts
  ta: {}, // add translations in src/i18n/ta.ts
};

export function getDict(locale: Locale = "en"): Dict {
  return { ...en, ...dictionaries[locale] } as Dict;
}

/** Product and category records carry optional `translations` JSON: { si: { name, description }, ta: {...} } */
export function localized<T extends Record<string, unknown>>(record: T & { translations?: unknown }, field: keyof T & string, locale: Locale): string {
  const tr = (record.translations as Record<string, Record<string, string>> | null | undefined)?.[locale]?.[field];
  return (tr || record[field]) as string;
}
