import { Link } from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";
import { usePage } from "./page-provider";
import UserMenu from "./user-menu";

export default function Header() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { showRules, showWords } = usePage();
  return (
    <header className="mx-auto flex h-21 w-full max-w-350 items-center justify-between border-b px-5 sm:px-10 lg:px-14">
      <Link
        to="/"
        aria-label="the page, accueil"
        className="flex items-center gap-3 text-xl font-semibold tracking-[-0.07em]"
      >
        <svg
          viewBox="0 0 24 28"
          fill="none"
          className="h-7 w-6 text-primary"
          aria-hidden="true"
        >
          <path
            d="M3 1h12l6 6v20H3V1Z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M15 1v7h6M7 14h10M7 19h6"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
        <span>
          the page<span className="text-primary">.</span>
        </span>
      </Link>
      <nav
        aria-label="Navigation principale"
        className="flex items-center gap-5 text-sm sm:gap-8"
      >
        <button
          onClick={showRules}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <span className="hidden sm:inline">Comment ça marche</span>
          <span className="sm:hidden">Règles</span>
        </button>
        {isAuthenticated ? (
          <>
            <button
              onClick={showWords}
              className="transition-colors hover:text-primary"
            >
              Mes mots
            </button>
            <UserMenu />
          </>
        ) : (
          <Link
            to="/sign-in"
            className={`transition-colors hover:text-primary ${isLoading ? "pointer-events-none opacity-40" : ""}`}
          >
            Connexion{" "}
            <span aria-hidden="true" className="ml-1">
              ↗
            </span>
          </Link>
        )}
      </nav>
    </header>
  );
}
