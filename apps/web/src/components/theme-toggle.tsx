import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";

const THEME_OPTIONS = [
  { value: "light", label: "light", icon: Sun },
  { value: "dark", label: "dark", icon: Moon },
  { value: "system", label: "system", icon: Monitor },
] as const;

export default function ThemeToggle() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // The saved preference is only available in the browser after hydration.
  const selected = mounted ? theme : undefined;
  const activeIndex = THEME_OPTIONS.findIndex((option) => option.value === selected);
  const active = THEME_OPTIONS[activeIndex];
  const next = THEME_OPTIONS[(activeIndex + 1) % THEME_OPTIONS.length];
  const Icon = active?.icon ?? Sun;

  return (
    <button
      type="button"
      onClick={() => setTheme(next.value)}
      aria-label={active ? t("theme.toggle", { current: t(`theme.${active.label}`).toLowerCase(), next: t(`theme.${next.label}`).toLowerCase() }) : t("theme.change")}
      title={active ? `${t(`theme.${active.label}`)} → ${t(`theme.${next.label}`)}` : t("theme.change")}
      className="flex size-9 shrink-0 items-center justify-center rounded-none border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <Icon aria-hidden="true" className="size-4" strokeWidth={1.5} />
    </button>
  );
}
