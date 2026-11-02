export const LANGUAGE_COOKIE = "the-page-language";
export type Language = "fr" | "en";

export function normalizeLanguage(value: unknown): Language {
  return value === "en" ? "en" : "fr";
}

export function formatLocale(language: string | undefined) {
  return normalizeLanguage(language) === "en" ? "en-GB" : "fr-FR";
}

export function languageFromCookie(cookie: string | null | undefined): Language {
  const value = cookie
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${LANGUAGE_COOKIE}=`))
    ?.slice(LANGUAGE_COOKIE.length + 1);
  return normalizeLanguage(value);
}
