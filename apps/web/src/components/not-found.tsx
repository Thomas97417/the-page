import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageFallback } from "./page-fallback";
import { buttonVariants } from "./ui/button";
import { NOINDEX } from "@/lib/seo";

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <PageFallback
      marker="404"
      label={t("fallback.notFound")}
      title={
        <>
          {t("fallback.notFoundTitle")}
          <br />
          <span className="italic">{t("fallback.notFoundEmphasis")}</span>
        </>
      }
      description={t("fallback.notFoundDescription")}
      actions={
        <Link
          to="/"
          className={cn(buttonVariants(), "h-12 gap-8 px-6 text-sm")}
        >
          {t("common.backToPage")}
          <ArrowUpRight aria-hidden="true" className="size-4" />
        </Link>
      }
    >
      <title>{`${t("fallback.notFound")} — the page`}</title>
      <meta name="robots" content={NOINDEX} />
    </PageFallback>
  );
}
