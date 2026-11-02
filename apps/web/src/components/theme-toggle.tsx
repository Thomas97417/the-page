import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

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
  const active = THEME_OPTIONS.find((option) => option.value === selected);
  const Icon = active?.icon ?? Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={active ? `Choisir le thème, actuellement ${active.label.toLowerCase()}` : "Choisir le thème"}
        title={active ? `Thème : ${active.label}` : "Choisir le thème"}
        className="flex size-9 shrink-0 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-popup-open:bg-muted data-popup-open:text-foreground"
      >
        <Icon aria-hidden="true" className="size-4" strokeWidth={1.5} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-44 p-1">
        <DropdownMenuRadioGroup value={selected ?? ""} onValueChange={setTheme}>
          {THEME_OPTIONS.map(({ value, label, icon: OptionIcon }) => (
            <DropdownMenuRadioItem
              key={value}
              value={value}
              closeOnClick
              className="min-h-10 gap-3 px-3 pr-9 data-highlighted:bg-muted"
            >
              <OptionIcon aria-hidden="true" className="size-4" strokeWidth={1.5} />
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
