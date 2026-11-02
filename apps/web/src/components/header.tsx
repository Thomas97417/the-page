import { useTranslation } from "react-i18next";
import { Link, useLocation } from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";
import { ArrowUpRight } from "lucide-react";
import UserMenu from "./user-menu";
import ThemeToggle from "./theme-toggle";
import LanguageToggle from "./language-toggle";
import { DEFAULT_PAGE_ID, pageIdFromPath } from "@my-better-t-app/backend/convex/lib/pages";
import { rememberReturnPath, validatePageSearch } from "@/lib/page";
import { PageNavigation } from "./page-navigation";

export default function Header() {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { pathname, search } = useLocation();
  const pageId = pageIdFromPath(pathname) ?? DEFAULT_PAGE_ID;
  return (
    <header className="mx-auto flex h-21 w-full max-w-296 shrink-0 items-center justify-between gap-2 px-5 sm:px-10 lg:px-14">
      <div className="flex shrink-0 items-baseline">
        <Link
          to={pageId === DEFAULT_PAGE_ID ? "/" : "/$page"}
          params={pageId === DEFAULT_PAGE_ID ? {} : { page: pageId }}
          search={{}}
          aria-label={t("header.home", { page: t(`pages.${pageId}`) })}
          className="py-2 font-serif text-[26px] leading-none tracking-[-0.055em]"
        >
          the page
        </Link>
        <PageNavigation pageId={pageId} />
      </div>
      <nav
        aria-label={t("header.navigation")}
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
            className={`group inline-flex size-9 shrink-0 items-center justify-center gap-2 rounded-none border text-xs font-medium transition-colors hover:border-foreground/25 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring min-[380px]:w-auto min-[380px]:px-3 sm:px-4 ${isLoading ? "pointer-events-none opacity-40" : ""}`}
          >
            <span className="sr-only min-[380px]:not-sr-only">{t("header.signIn")}</span>
            <ArrowUpRight
              aria-hidden="true"
              className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none min-[380px]:hidden sm:block"
              strokeWidth={1.5}
            />
          </Link>
        )}
        <LanguageToggle />
        <ThemeToggle />
      </nav>
    </header>
  );
}
