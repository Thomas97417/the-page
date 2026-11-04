import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { I18nextProvider, useTranslation } from "react-i18next";
import { ConvexError } from "convex/values";
import { languageFromCookie } from "@my-better-t-app/backend/convex/lib/language";
import { validateContent } from "@my-better-t-app/backend/convex/lib/content";
import { PAGES } from "@my-better-t-app/backend/convex/lib/pages";
import { createI18n } from "./i18n";
import { errorMessage } from "./errors";
import { euros, pageHead } from "./page";
import fr from "../locales/fr.json";
import en from "../locales/en.json";

function messages(value: object, prefix = ""): Record<string, string> {
  return Object.fromEntries(Object.entries(value).flatMap(([key, entry]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof entry === "string"
      ? [[path, entry]]
      : Object.entries(messages(entry, path));
  }));
}

function Greeting() {
  const { t, i18n } = useTranslation();
  return <main lang={i18n.resolvedLanguage}>{t("auth.signInTitle")}</main>;
}

describe("application languages", () => {
  it.each([
    [undefined, "fr"],
    ["", "fr"],
    ["theme=dark; the-page-language=en; other=value", "en"],
    ["the-page-language=fr", "fr"],
    ["the-page-language=es", "fr"],
    ["the-page-language=en-GB", "fr"],
    ["another-the-page-language=en", "fr"],
    ["the-page-language=en%3Badmin=true", "fr"],
  ] as const)("resolves the saved preference in %s", (cookie, expected) => {
    expect(languageFromCookie(cookie)).toBe(expected);
  });

  it("renders independent server requests in their own language", async () => {
    const french = createI18n("fr");
    const english = createI18n("en");
    const render = (i18n: typeof french) => renderToString(
      <I18nextProvider i18n={i18n}><Greeting /></I18nextProvider>,
    );
    expect(render(french)).toContain('<main lang="fr">De retour.</main>');
    expect(render(english)).toContain('<main lang="en">Welcome back.</main>');
    await english.changeLanguage("fr");
    await french.changeLanguage("en");
    expect(render(english)).toContain('lang="fr"');
    expect(render(french)).toContain('lang="en"');
  });

  it("has an English translation and the same parameters for every French message", () => {
    expect(Object.keys(fr.pages).sort()).toEqual(PAGES.map((page) => page.id).sort());
    const french = messages(fr);
    const english = messages(en);
    expect(Object.keys(english).sort()).toEqual(Object.keys(french).sort());
    for (const [key, value] of Object.entries(french)) {
      expect(english[key]?.trim(), key).toBeTruthy();
      const parameters = (text: string) => text.match(/\{\{[^}]+\}\}/g)?.sort() ?? [];
      expect(parameters(english[key]!), key).toEqual(parameters(value));
    }
  });

  it("localizes country names, metadata and euro amounts without changing the currency", () => {
    const french = createI18n("fr");
    const english = createI18n("en");
    expect(pageHead("royaume-uni", english.t, "https://example.com").meta[0]?.title).toContain("United Kingdom");
    expect(pageHead("royaume-uni", french.t, "https://example.com").meta[0]?.title).toContain("Royaume-Uni");
    expect(euros(1234, "en")).toBe("€12.34");
    expect(euros(1234, "fr")).toContain("12,34");
  });

  it("translates server and validation errors, with a generic fallback for unknown errors", () => {
    const { t } = createI18n("en");
    expect(errorMessage(new ConvexError("Le prix a changé. Vérifiez le nouveau montant."), t))
      .toBe("The price has changed. Check the new amount.");
    expect(errorMessage({ code: "EMAIL_NOT_VERIFIED" }, t))
      .toBe("Verify your email before signing in.");
    try {
      validateContent("two words");
      throw new Error("Validation should reject spaces");
    } catch (error) {
      expect(errorMessage(error, t)).toBe("Choose a word with 1 to 24 characters and no spaces.");
    }
    for (const error of [new Error("Internal server details"), "toString", null]) {
      expect(errorMessage(error, t)).toBe("Something went wrong. Please try again.");
    }
  });

  it.each(["fr", "en"] as const)("translates structured rate limit errors in %s", (language) => {
    const { t } = createI18n(language);
    const error = new ConvexError({ kind: "RateLimited", name: "checkoutStart", retryAfter: 6_000 });
    expect(errorMessage(error, t)).toBe(t("errors.rateLimit"));
    expect(errorMessage({ status: 429, message: "Too many requests. Please try again later." }, t)).toBe(t("errors.rateLimit"));
    expect(errorMessage(new ConvexError({ kind: "Unknown", name: "checkoutStart" }), t)).toBe(t("errors.generic"));
  });
});
