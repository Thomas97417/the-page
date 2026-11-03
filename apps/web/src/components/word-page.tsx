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
import { type PageId } from "@my-better-t-app/backend/convex/lib/pages";
import { Footer } from "@/components/footer";

export function WordPage({ pageId, purchase, reclaim }: { pageId: PageId; purchase?: string; reclaim?: string }) {
  const { t } = useTranslation();
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
        <h1 className="sr-only">the page — {t(`pages.${pageId}`)}</h1>
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
          {slots && slots.length > 0 && !available && (
            <p role="status" className="text-center text-xs leading-relaxed text-muted-foreground">
              {t("page.allReserved")}
            </p>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
