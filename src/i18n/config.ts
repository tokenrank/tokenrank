export const locales = ["en", "zh"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";
export const localeCookieName = "tokenrank_locale";

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "en" || value === "zh";
}

export function htmlLang(locale: Locale): string {
  return locale === "zh" ? "zh-CN" : "en-US";
}
