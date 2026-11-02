import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import {
  LANGUAGE_COOKIE,
  type Language,
} from "@my-better-t-app/backend/convex/lib/language";
import fr from "../locales/fr.json";
import en from "../locales/en.json";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: { translation: typeof fr };
  }
}

// A router (and therefore each SSR request) owns its own instance.
export function createI18n(language: Language = "fr") {
  const instance = createInstance();
  void instance.use(initReactI18next).init({
    resources: { fr: { translation: fr }, en: { translation: en } },
    lng: language,
    fallbackLng: "fr",
    supportedLngs: ["fr", "en"],
    initAsync: false,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
  return instance;
}

export function saveLanguage(language: Language) {
  document.cookie = `${LANGUAGE_COOKIE}=${language}; Path=/; Max-Age=31536000; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
}

