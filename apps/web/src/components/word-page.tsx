import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import { ArrowUpRight } from "lucide-react";
import { usePage } from "@/components/page-provider";
import { PageManuscript } from "@/components/page-manuscript";
import { Button } from "@/components/ui/button";
import { PurchaseResult } from "@/components/purchase-result";
import { ReclaimWord } from "@/components/reclaim-word";
import { DEFAULT_PAGE_ID, type PageId } from "@my-better-t-app/backend/convex/lib/pages";
import { SLOT_COUNT } from "@my-better-t-app/backend/convex/lib/content";
import { Footer } from "@/components/footer";
import { AdvertisingDetails } from "@/components/advertising-details";
import { euros } from "@/lib/page";

export function WordPage({ pageId, purchase, reclaim }: { pageId: PageId; purchase?: string; reclaim?: string }) {
  const { t, i18n } = useTranslation();
  const { data: slots } = useQuery(convexQuery(api.slots.list, { pageId }));
  const { buy } = usePage();
  const available = slots
    ?.filter((slot) => !slot.reserved)
    .sort((a, b) => a.price - b.price || a.position - b.position)[0];

  return (
    <>
      <main className="mx-auto flex w-full max-w-296 flex-1 flex-col justify-center px-5 sm:px-10 lg:px-14">
        {purchase && <PurchaseResult key={purchase} purchaseId={purchase} pageId={pageId} />}
        {reclaim && <ReclaimWord key={reclaim} notificationId={reclaim} pageId={pageId} />}
        <section aria-labelledby="page-title" className="mx-auto w-full max-w-184 pb-2 pt-10 sm:pt-16">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {t("marketing.eyebrow")}
          </p>
          <h1 id="page-title" className="mt-5 text-balance font-serif text-4xl leading-[1.12] tracking-tight sm:text-5xl lg:text-6xl">
            {pageId === DEFAULT_PAGE_ID
              ? t("marketing.worldTitle")
              : t("marketing.countryTitle", { page: t(`pages.${pageId}`) })}
          </h1>
          <p className="mt-5 max-w-xl text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
            {t(pageId === DEFAULT_PAGE_ID ? "marketing.worldIntro" : "marketing.countryIntro", {
              page: t(`pages.${pageId}`), count: SLOT_COUNT,
            })}
          </p>
          <p className="mt-7 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {t("marketing.edition", { page: t(`pages.${pageId}`), count: SLOT_COUNT })}
          </p>
        </section>
        <PageManuscript slots={slots} />

        <section aria-label={t("page.participate")} className="flex flex-col items-center gap-4 pb-14 pt-8 sm:pb-18 sm:pt-10">
          <Button
            className="h-12 gap-8 px-6 text-sm"
            disabled={!available}
            onClick={() => {
              if (available)
                buy({
                  slotId: available.id,
                  pageId: available.pageId,
                  position: available.position,
                  acquisition: available.acquisitions,
                  word: "",
                  url: "",
                });
            }}
          >
            {t("page.write")}
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </Button>
          {available && (
            <p className="text-center text-xs leading-relaxed text-muted-foreground">
              {t("marketing.startingPrice", { price: euros(available.price, i18n.resolvedLanguage) })}
            </p>
          )}
          {slots && slots.length > 0 && !available && (
            <p role="status" className="text-center text-xs leading-relaxed text-muted-foreground">
              {t("page.allReserved")}
            </p>
          )}
        </section>
        <AdvertisingDetails pageId={pageId} />
      </main>
      <Footer />
    </>
  );
}
