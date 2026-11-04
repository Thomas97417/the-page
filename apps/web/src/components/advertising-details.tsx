import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SLOT_COUNT } from "@my-better-t-app/backend/convex/lib/content";
import { DEFAULT_PAGE_ID, PAGES } from "@my-better-t-app/backend/convex/lib/pages";
import { euros } from "@/lib/page";

const features = ["visibility", "rarity", "prestige"] as const;
const questions = ["advertising", "price", "duration", "countries"] as const;

export function AdvertisingDetails() {
  const { t, i18n } = useTranslation();

  return (
    <div className="mx-auto w-full max-w-184 pb-14 sm:pb-20">
      <section aria-labelledby="advertising-title" className="border-t py-10 sm:py-14">
        <h2 id="advertising-title" className="font-serif text-3xl tracking-tight sm:text-4xl">
          {t("marketing.principlesTitle")}
        </h2>
        <div className="mt-8 grid gap-8 sm:grid-cols-3 sm:gap-6">
          {features.map((feature, index) => (
            <div key={feature}>
              <span aria-hidden="true" className="font-mono text-[10px] tracking-widest text-muted-foreground">
                0{index + 1}
              </span>
              <h3 className="mt-3 font-serif text-xl leading-snug tracking-tight">
                {t(`marketing.features.${feature}.title`, { count: SLOT_COUNT })}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {t(`marketing.features.${feature}.description`, { count: SLOT_COUNT })}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="advertising-faq" className="border-t py-10 sm:py-14">
        <h2 id="advertising-faq" className="mb-6 font-serif text-3xl tracking-tight sm:text-4xl">
          {t("marketing.faqTitle")}
        </h2>
        {questions.map((question) => (
          <details key={question} className="group border-b">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-5 py-4 text-sm leading-relaxed marker:content-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
              {t(`marketing.faq.${question}.question`)}
              <Plus aria-hidden="true" strokeWidth={1.5} className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-45 motion-reduce:transition-none" />
            </summary>
            <p className="max-w-prose pb-6 pr-6 text-sm leading-relaxed text-muted-foreground">
              {t(`marketing.faq.${question}.answer`, {
                count: SLOT_COUNT,
                countries: PAGES.length - 1,
                price: euros(100, i18n.resolvedLanguage),
              })}
            </p>
          </details>
        ))}
      </section>

      <details className="group border-t">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-5 py-4 font-mono text-[11px] tracking-wide text-muted-foreground marker:content-none transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
          {t("marketing.explore", { count: PAGES.length - 1 })}
          <Plus aria-hidden="true" strokeWidth={1.5} className="size-4 shrink-0 transition-transform group-open:rotate-45 motion-reduce:transition-none" />
        </summary>
        <nav aria-label={t("marketing.directoryLabel")} className="grid grid-cols-2 gap-x-5 pb-3 sm:grid-cols-3">
          {PAGES.map((page) => (
            <Link
              key={page.id}
              to={page.id === DEFAULT_PAGE_ID ? "/" : "/$page"}
              params={page.id === DEFAULT_PAGE_ID ? {} : { page: page.slug }}
              search={{}}
              preload={false}
              className="inline-flex min-h-10 items-center justify-between gap-2 py-2 text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-[current=page]:text-foreground"
            >
              {t(`pages.${page.id}`)}
              <ArrowUpRight aria-hidden="true" className="size-3 shrink-0" strokeWidth={1.5} />
            </Link>
          ))}
        </nav>
      </details>
    </div>
  );
}
