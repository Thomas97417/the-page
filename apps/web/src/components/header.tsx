import { Link } from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";
import { usePage } from "./page-provider";
import UserMenu from "./user-menu";
import ThemeToggle from "./theme-toggle";

export default function Header() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { showWords } = usePage();
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
          <>
            <button
              onClick={showWords}
              className="min-h-11 transition-colors hover:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              Mes mots
            </button>
            <UserMenu />
          </>
        ) : (
          <Link
            to="/sign-in"
            className={`flex min-h-11 items-center transition-colors hover:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring ${isLoading ? "pointer-events-none opacity-40" : ""}`}
          >
            Connexion{" "}
            <span aria-hidden="true" className="ml-1">
              ↗
            </span>
          </Link>
        )}
        <ThemeToggle />
      </nav>
    </header>
  );
}
