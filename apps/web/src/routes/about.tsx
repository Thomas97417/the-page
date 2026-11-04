import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowUpRight } from "lucide-react";
import { SLOT_COUNT } from "@my-better-t-app/backend/convex/lib/content";
import { AdvertisingDetails } from "@/components/advertising-details";
import { Footer } from "@/components/footer";
import { publicPageHead } from "@/lib/seo";

export const Route = createFileRoute("/about")({
  head: ({ match }) => publicPageHead({
    title: match.context.i18n.t("meta.about"),
    description: match.context.i18n.t("marketing.worldIntro", { count: SLOT_COUNT }),
    path: "/about",
    siteUrl: match.context.siteUrl,
    locale: match.context.i18n.t("meta.locale"),
  }),
  component: AboutPage,
});

function AboutPage() {
  const { t } = useTranslation();
  return (
    <>
      <main className="mx-auto w-full max-w-296 flex-1 px-5 sm:px-10 lg:px-14">
        <header className="mx-auto w-full max-w-184 pb-10 pt-10 sm:pb-14 sm:pt-16">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {t("marketing.eyebrow")}
          </p>
          <h1 className="mt-5 text-balance font-serif text-4xl leading-[1.12] tracking-tight sm:text-5xl lg:text-6xl">
            {t("marketing.worldTitle")}
          </h1>
          <p className="mt-5 max-w-xl text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
            {t("marketing.worldIntro", { count: SLOT_COUNT })}
          </p>
          <Link
            to="/"
            hash="top"
            className="mt-7 inline-flex min-h-11 items-center gap-2 text-xs underline decoration-foreground/30 underline-offset-4 transition-colors hover:decoration-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            {t("common.backToPage")}
            <ArrowUpRight aria-hidden="true" className="size-3.5" strokeWidth={1.5} />
          </Link>
        </header>
        <AdvertisingDetails />
      </main>
      <Footer />
    </>
  );
}
