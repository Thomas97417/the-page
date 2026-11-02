import { Link, useLocation } from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";
import { ArrowUpRight } from "lucide-react";
import UserMenu from "./user-menu";
import ThemeToggle from "./theme-toggle";
import { DEFAULT_PAGE_ID, getPage, pageIdFromPath } from "@my-better-t-app/backend/convex/lib/pages";
import { rememberReturnPath, validatePageSearch } from "@/lib/page";
import { PageNavigation } from "./page-navigation";

export default function Header() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { pathname, search } = useLocation();
  const pageId = pageIdFromPath(pathname) ?? DEFAULT_PAGE_ID;
  return (
    <header className="mx-auto flex h-21 w-full max-w-296 shrink-0 items-center justify-between gap-2 px-5 sm:px-10 lg:px-14">
      <div className="flex shrink-0 items-baseline">
        <Link
          to={pageId === DEFAULT_PAGE_ID ? "/" : "/$page"}
          params={pageId === DEFAULT_PAGE_ID ? {} : { page: getPage(pageId).slug }}
          search={{}}
          aria-label={`the page, accueil ${getPage(pageId).label}`}
          className="py-2 font-serif text-[26px] leading-none tracking-[-0.055em]"
        >
          the page
        </Link>
        <PageNavigation pageId={pageId} />
      </div>
      <nav
        aria-label="Navigation principale"
        className="flex items-center gap-1.5 text-xs sm:gap-6"
      >
        {isAuthenticated ? (
          <UserMenu />
        ) : (
          <Link
            to="/sign-in"
            onClick={() => {
              const pageId = pageIdFromPath(pathname);
              if (pageId) rememberReturnPath(pageId, validatePageSearch(search).purchase);
            }}
            aria-disabled={isLoading || undefined}
            tabIndex={isLoading ? -1 : undefined}
            className={`group inline-flex h-9 shrink-0 items-center gap-2 rounded-none border px-3 text-xs font-medium transition-colors hover:border-foreground/25 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:px-4 ${isLoading ? "pointer-events-none opacity-40" : ""}`}
          >
            <span>Connexion</span>
            <ArrowUpRight
              aria-hidden="true"
              className="hidden size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none sm:block"
              strokeWidth={1.5}
            />
          </Link>
        )}
        <ThemeToggle />
      </nav>
    </header>
  );
}
