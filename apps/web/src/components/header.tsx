import { Link } from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";
import { ArrowUpRight } from "lucide-react";
import UserMenu from "./user-menu";
import ThemeToggle from "./theme-toggle";

export default function Header() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  return (
    <header className="mx-auto flex h-21 w-full max-w-296 shrink-0 items-center justify-between px-5 sm:px-10 lg:px-14">
      <Link
        to="/"
        aria-label="the page, accueil"
        className="flex items-center py-2 font-serif text-[26px] tracking-[-0.055em]"
      >
        <span>the page.</span>
      </Link>
      <nav
        aria-label="Navigation principale"
        className="flex items-center gap-1.5 text-xs sm:gap-6"
      >
        {isAuthenticated ? (
          <UserMenu />
        ) : (
          <Link
            to="/sign-in"
            aria-disabled={isLoading || undefined}
            tabIndex={isLoading ? -1 : undefined}
            className={`group inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-4 text-xs font-medium transition-colors hover:border-foreground/25 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${isLoading ? "pointer-events-none opacity-40" : ""}`}
          >
            <span>Connexion</span>
            <ArrowUpRight
              aria-hidden="true"
              className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none"
              strokeWidth={1.5}
            />
          </Link>
        )}
        <ThemeToggle />
      </nav>
    </header>
  );
}
