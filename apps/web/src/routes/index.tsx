import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import { ArrowUpRight } from "lucide-react";
import { usePage } from "@/components/page-provider";
import { PageManuscript } from "@/components/page-manuscript";
import { Button } from "@/components/ui/button";
import { euros } from "@/lib/page";
import { PurchaseResult } from "@/components/purchase-result";

export const Route = createFileRoute("/")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(convexQuery(api.slots.list, {})),
  validateSearch: (search: Record<string, unknown>): { purchase?: string } => ({
    purchase:
      typeof search.purchase === "string" && search.purchase.length < 128
        ? search.purchase
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "the page — Un mot. Une place." },
      {
        name: "description",
        content:
          "Une page écrite à plusieurs. 50 places, un mot par place. Ajoutez le vôtre à l’histoire.",
      },
    ],
  }),
  component: ThePage,
});

function ThePage() {
  const { data: slots } = useQuery(convexQuery(api.slots.list, {}));
  const { buy, showRules } = usePage();
  const { purchase } = Route.useSearch();
  const available = slots
    ?.filter((slot) => !slot.reserved)
    .sort((a, b) => a.price - b.price || a.position - b.position)[0];

  return (
    <main className="mx-auto w-full max-w-296 px-5 sm:px-10 lg:px-14">
      {purchase && <PurchaseResult purchaseId={purchase} />}
      <section aria-labelledby="page-title" className="pb-10 pt-10 text-center sm:pb-14 sm:pt-14">
        <p className="mb-5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Cinquante places. Une seule page.
        </p>
        <h1 id="page-title" className="font-serif text-[clamp(2.75rem,6vw,4.75rem)] leading-[1.1] tracking-[-0.055em]">
          Un mot. <span className="italic">Une place.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-72 text-sm leading-relaxed text-muted-foreground sm:max-w-none">
          Une histoire écrite à plusieurs. Ajoutez-y votre mot.
        </p>
      </section>

      <PageManuscript slots={slots} />

      <section aria-label="Participer à la page" className="flex flex-col items-center gap-4 pb-14 pt-8 sm:pb-18 sm:pt-10">
        <Button
          className="h-12 gap-8 px-6 text-sm"
          disabled={!available}
          onClick={() => {
            if (available)
              buy({
                slotId: available.id,
                position: available.position,
                acquisition: available.acquisitions,
                word: "",
                url: "",
              });
          }}
        >
          Écrire un mot
          <ArrowUpRight aria-hidden="true" className="size-4" />
        </Button>
        <p aria-live="polite" className="text-center text-xs leading-relaxed text-muted-foreground">
          {available
            ? `À partir de ${euros(available.price)} · +1 € à chaque achat`
            : slots && slots.length > 0
              ? "Toutes les places sont réservées pour le moment."
              : "50 places, un mot par place."}
        </p>
      </section>

      <footer className="flex items-center justify-between gap-5 border-t py-5 text-[11px] text-muted-foreground">
        <span>Une page, à plusieurs mains.</span>
        <button
          className="flex min-h-10 items-center gap-1.5 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          onClick={showRules}
        >
          Les règles
          <ArrowUpRight aria-hidden="true" className="size-3" />
        </button>
      </footer>
    </main>
  );
}
