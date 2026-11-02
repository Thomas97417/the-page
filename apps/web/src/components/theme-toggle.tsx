import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";

const THEME_OPTIONS = [
  { value: "light", label: "Jour", icon: Sun },
  { value: "dark", label: "Nuit", icon: Moon },
  { value: "system", label: "Système", icon: Monitor },
] as const;

export default function ThemeToggle() {
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
      aria-label={active ? `Thème ${active.label.toLowerCase()}. Passer au thème ${next.label.toLowerCase()}` : "Changer le thème"}
      title={active ? `${active.label} → ${next.label}` : "Changer le thème"}
      className="flex size-9 shrink-0 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <Icon aria-hidden="true" className="size-4" strokeWidth={1.5} />
    </button>
  );
}
