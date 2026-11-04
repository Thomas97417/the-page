import { Link } from "@tanstack/react-router";
import { ArrowUp, ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePage } from "@/components/page-provider";

const legalLinkClassName =
  "inline-flex min-h-10 items-center text-[11px] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring sm:text-xs";

export function Footer() {
  const { t } = useTranslation();
  const { showRules } = usePage();

  return (
    <footer className="w-full shrink-0 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto w-full max-w-296 px-5 sm:px-10 lg:px-14">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1 border-t py-5 md:grid-cols-[auto_1fr_auto_auto] md:gap-x-6 md:py-6">
          <p className="flex items-baseline gap-3">
            <span className="text-xs font-medium tracking-[0.22em]">TOMA</span>
            <span className="whitespace-nowrap font-mono text-[10px] text-muted-foreground">
              © {new Date().getFullYear()}
            </span>
          </p>

          <button
            type="button"
            onClick={showRules}
            className="group col-span-2 inline-flex min-h-10 items-center justify-self-end gap-1.5 whitespace-nowrap text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring md:col-span-1"
          >
            <span className="underline-offset-4 group-hover:underline">
              {t("page.howItWorks")}
            </span>
            <ArrowUpRight aria-hidden="true" className="size-3" strokeWidth={1.5} />
          </button>

          <nav
            aria-label={t("page.footerNavigation")}
            className="col-span-2 flex flex-wrap items-center gap-x-4 md:col-span-1 md:gap-x-6"
          >
            <Link
              to="/about"
              hash="top"
              hashScrollIntoView={{ behavior: "instant" }}
              className={legalLinkClassName}
              activeProps={{ className: "text-foreground underline", "aria-current": "page" }}
            >
              {t("footer.about")}
            </Link>
            <Link
              to="/privacy"
              hash="top"
              hashScrollIntoView={{ behavior: "instant" }}
              className={legalLinkClassName}
              activeProps={{ className: "text-foreground underline", "aria-current": "page" }}
            >
              {t("footer.legalNotice")}
            </Link>
            <Link
              to="/terms"
              hash="top"
              hashScrollIntoView={{ behavior: "instant" }}
              className={legalLinkClassName}
              activeProps={{ className: "text-foreground underline", "aria-current": "page" }}
            >
              {t("footer.terms")}
            </Link>
          </nav>

          <a
            href="#top"
            aria-label={t("page.backToTop")}
            className="group inline-flex size-9 items-center justify-center justify-self-end border text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            <ArrowUp
              aria-hidden="true"
              className="size-3.5 transition-transform group-hover:-translate-y-0.5 motion-reduce:transform-none"
              strokeWidth={1.5}
            />
          </a>
        </div>
      </div>
    </footer>
  );
}
