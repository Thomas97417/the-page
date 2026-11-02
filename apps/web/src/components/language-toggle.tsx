import { useTranslation } from "react-i18next";
import { useRouter } from "@tanstack/react-router";
import { normalizeLanguage } from "@my-better-t-app/backend/convex/lib/language";
import { saveLanguage } from "@/lib/i18n";

export default function LanguageToggle() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const language = normalizeLanguage(i18n.resolvedLanguage);
  const next = language === "fr" ? "en" : "fr";
  const label = t("language.toggle", {
    current: t(`language.${language}`),
    next: t(`language.${next}`),
  });

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={async () => {
        saveLanguage(next);
        await i18n.changeLanguage(next);
        // Recompute translated route metadata without leaving the current page.
        await router.invalidate();
      }}
      className="flex size-9 shrink-0 items-center justify-center rounded-none border font-mono text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {language.toUpperCase()}
    </button>
  );
}
