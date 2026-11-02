import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import { ArrowUp, ArrowUpRight } from "lucide-react";
import { usePage } from "@/components/page-provider";
import { PageManuscript } from "@/components/page-manuscript";
import { Button } from "@/components/ui/button";
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
      { title: "the page — Une page à tous. Un mot de vous." },
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
    <>
      <main className="mx-auto w-full max-w-296 flex-1 px-5 sm:px-10 lg:px-14">
        {purchase && <PurchaseResult purchaseId={purchase} />}
        <section aria-labelledby="page-title" className="pb-10 pt-10 text-center sm:pb-14 sm:pt-14">
          <h1 id="page-title" className="font-serif text-[clamp(2.25rem,5.5vw,4.5rem)] leading-[1.08] tracking-[-0.045em]">
            Une page à tous.
            <br />
            <span className="italic">Un mot de vous.</span>
          </h1>
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
          {slots && slots.length > 0 && !available && (
            <p role="status" className="text-center text-xs leading-relaxed text-muted-foreground">
              Toutes les places sont réservées pour le moment.
            </p>
          )}
        </section>
      </main>
      <footer className="w-full shrink-0 pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto w-full max-w-296 px-5 sm:px-10 lg:px-14">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t py-6 sm:py-8">
            <p className="flex shrink-0 items-start gap-2">
              <span className="text-sm font-medium leading-none tracking-[0.22em]">TOMA</span>
              <span className="whitespace-nowrap font-mono text-[10px] leading-none text-muted-foreground">© 2026</span>
            </p>
            <nav aria-label="Navigation de pied de page" className="ml-auto flex shrink-0 items-center gap-3 sm:gap-6">
              <button
                className="group flex min-h-11 items-center gap-2 whitespace-nowrap text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                onClick={showRules}
              >
                <span className="underline-offset-4 group-hover:underline">Comment ça marche</span>
                <ArrowUpRight aria-hidden="true" className="size-3.5" strokeWidth={1.5} />
              </button>
              <div className="border-l pl-3 sm:pl-6">
                <a
                  href="#top"
                  aria-label="Retour en haut de la page"
                  className="group flex size-10 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <ArrowUp
                    aria-hidden="true"
                    className="size-4 transition-transform group-hover:-translate-y-0.5 motion-reduce:transform-none"
                    strokeWidth={1.5}
                  />
                </a>
              </div>
            </nav>
          </div>
        </div>
      </footer>
    </>
  );
}
