import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { ArrowDown, ArrowUpRight, Plus } from "lucide-react";
import { usePage } from "@/components/page-provider";
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
          "50 emplacements, un mot par place. Écrivez le vôtre sur the page.",
      },
    ],
  }),
  component: ThePage,
});

type Slot = FunctionReturnType<typeof api.slots.list>[number];
function SlotCell({ slot }: { slot: Slot }) {
  const { buy } = usePage();
  const open = () =>
    buy({
      slotId: slot.id,
      position: slot.position,
      acquisition: slot.acquisitions,
      word: "",
      url: "",
    });
  return (
    <article
      className={`group relative flex min-h-43 min-w-0 flex-col border-b border-r px-4 py-4 transition-colors sm:min-h-48 sm:px-6 sm:py-5 ${slot.word ? "bg-card/60 hover:bg-card" : "hover:bg-secondary/30"}`}
    >
      <span className="font-mono text-[10px] tabular-nums tracking-wider text-muted-foreground/60">
        {String(slot.position).padStart(2, "0")}
      </span>
      <div className="flex flex-1 items-center justify-center py-5 text-center">
        {slot.word ? (
          slot.url ? (
            <a
              href={slot.url}
              target="_blank"
              rel="sponsored ugc nofollow noopener noreferrer"
              className="max-w-full break-all font-serif text-[clamp(1.5rem,2.2vw,2.25rem)] leading-tight tracking-tight underline-offset-4 hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
            >
              {slot.word}
            </a>
          ) : (
            <span className="max-w-full break-all font-serif text-[clamp(1.5rem,2.2vw,2.25rem)] leading-tight tracking-tight">
              {slot.word}
            </span>
          )
        ) : (
          <button
            onClick={open}
            disabled={slot.reserved}
            aria-label={`Écrire sur la place ${slot.position}, ${euros(slot.price)}`}
            className="flex size-12 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground/35 transition-colors group-hover:border-primary/40 group-hover:text-primary disabled:opacity-30"
          >
            <Plus className="size-5" strokeWidth={1} />
          </button>
        )}
      </div>
      <button
        disabled={slot.reserved}
        onClick={open}
        aria-label={`${slot.word ? "Remplacer le mot de" : "Acheter"} la place ${slot.position} pour ${euros(slot.price)}`}
        className="flex min-h-7 w-full items-center justify-between gap-2 text-xs text-muted-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-wait disabled:text-muted-foreground/50"
      >
        <span>
          {slot.reserved
            ? "Réservé"
            : slot.word
              ? "Prendre la place"
              : "Écrire ici"}
        </span>
        <span className="flex shrink-0 items-center gap-1.5 tabular-nums">
          {euros(slot.price)}
          <ArrowUpRight
            aria-hidden="true"
            className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none"
          />
        </span>
      </button>
    </article>
  );
}

function ThePage() {
  const { data: slots } = useQuery(convexQuery(api.slots.list, {}));
  const { buy, showRules } = usePage();
  const { purchase } = Route.useSearch();
  const occupied = slots?.filter((slot) => slot.word).length ?? 0;
  const available = slots
    ?.filter((slot) => !slot.reserved)
    .sort((a, b) => a.price - b.price || a.position - b.position)[0];
  return (
    <main className="mx-auto w-full max-w-350 px-5 sm:px-10 lg:px-14">
      {purchase && <PurchaseResult purchaseId={purchase} />}
      <section className="relative flex flex-col justify-between gap-8 py-12 sm:flex-row sm:items-end sm:py-16 lg:py-19">
        <div>
          <div className="mb-5 flex items-center gap-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <span className="h-px w-6 bg-primary" />
            50 places. Une seule page.
          </div>
          <h1 className="font-serif text-[clamp(3.25rem,6.2vw,6rem)] leading-[0.98] tracking-[-0.055em]">
            Un mot.
            <br />
            <span className="italic text-primary">Une place.</span>
          </h1>
        </div>
        <div className="flex items-end justify-between gap-5 sm:flex-col sm:items-end sm:gap-6">
          <p className="max-w-51 text-sm leading-relaxed text-muted-foreground sm:text-right">
            Chaque rachat augmente le prix de 1 €.
          </p>
          <Button
            className="h-12 gap-5 px-5 text-sm"
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
            <ArrowUpRight className="size-4" />
          </Button>
        </div>
      </section>
      <div className="flex items-center justify-between border-t py-4 font-mono text-[10px] uppercase tracking-[0.09em] text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-primary" />
          La page
        </span>
        <div className="flex items-center gap-5">
          <span>
            {slots ? String(occupied).padStart(2, "0") : "—"}
            <span className="text-muted-foreground/50">
              {" "}
              / 50 places occupées
            </span>
          </span>
          <a
            href="#mots"
            aria-label="Voir les emplacements"
            className="text-foreground"
          >
            <ArrowDown className="size-3.5" />
          </a>
        </div>
      </div>
      <section
        id="mots"
        aria-label="Les 50 emplacements"
        aria-busy={!slots}
        className="grid scroll-mt-4 grid-cols-2 border-l border-t lg:grid-cols-5"
      >
        {slots
          ? slots.map((slot) => <SlotCell slot={slot} key={slot.id} />)
          : Array.from({ length: 50 }, (_, i) => (
              <div
                key={i}
                className="flex min-h-43 flex-col justify-between border-b border-r p-5 sm:min-h-48"
              >
                <span className="h-2 w-4 animate-pulse bg-border motion-reduce:animate-none" />
                <span className="mx-auto h-6 w-16 animate-pulse bg-border/40 motion-reduce:animate-none" />
                <span className="h-2 w-12 animate-pulse bg-border/60 motion-reduce:animate-none" />
              </div>
            ))}
      </section>
      {slots?.length === 0 && (
        <p className="py-12 text-center text-sm text-muted-foreground">
          La page se prépare. Revenez dans un instant.
        </p>
      )}
      <footer className="flex items-center justify-between py-8 text-xs text-muted-foreground">
        <span className="font-medium tracking-tight">the page.</span>
        <button
          className="transition-colors hover:text-foreground"
          onClick={showRules}
        >
          Les règles <span aria-hidden="true">↗</span>
        </button>
      </footer>
    </main>
  );
}
