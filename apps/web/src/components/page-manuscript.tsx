import { Fragment } from "react";
import { Popover } from "@base-ui/react/popover";
import type { FunctionReturnType } from "convex/server";
import type { api } from "@my-better-t-app/backend/convex/_generated/api";
import { ArrowUpRight, X } from "lucide-react";
import { usePage } from "./page-provider";
import { buttonVariants } from "./ui/button";
import { euros } from "@/lib/page";
import { cn } from "@/lib/utils";

type Slot = FunctionReturnType<typeof api.slots.list>[number];

const PLACEHOLDER_WORDS = (
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor " +
  "incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis " +
  "nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. " +
  "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat."
).split(" ");

function linkLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Visiter le lien";
  }
}

function WordDetails({ slot }: { slot: Slot }) {
  const { buy } = usePage();

  return (
    <>
      <div className="flex items-center gap-3 pr-6 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        <span>Place {String(slot.position).padStart(2, "0")}</span>
        <span aria-hidden="true">·</span>
        <span>{slot.reserved ? "Réservée" : slot.word ? "Publiée" : "Libre"}</span>
      </div>
      <Popover.Close
        aria-label="Fermer les informations du mot"
        className="absolute right-3 top-3 flex size-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
      >
        <X className="size-3.5" />
      </Popover.Close>
      <Popover.Title className="mt-5 break-words font-serif text-3xl leading-tight tracking-tight">
        {slot.word || "Votre mot ici."}
      </Popover.Title>
      <Popover.Description className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {slot.reserved
          ? "Un paiement est en cours sur cette place."
          : slot.word
            ? "Ce mot fait partie de la page. Un nouvel achat le remplacera par le vôtre."
            : "Ce texte de remplissage attend votre mot. Choisissez cette place pour l’écrire."}
      </Popover.Description>
      {slot.url && (
        <a
          href={slot.url}
          target="_blank"
          rel="sponsored ugc nofollow noopener noreferrer"
          className="mt-4 flex min-h-8 items-center justify-between gap-3 text-sm underline decoration-border underline-offset-4 hover:decoration-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          <span className="truncate">{linkLabel(slot.url)}</span>
          <ArrowUpRight aria-hidden="true" className="size-3.5 shrink-0" />
          <span className="sr-only"> (nouvel onglet)</span>
        </a>
      )}
      <dl className="mt-5 flex items-baseline justify-between gap-3 border-t pt-4">
        <dt className="text-xs text-muted-foreground">Prochain achat</dt>
        <dd className="font-serif text-2xl tabular-nums">{euros(slot.price)}</dd>
      </dl>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {slot.acquisitions} achat{slot.acquisitions > 1 ? "s" : ""} · +1 € à chaque achat
      </p>
      <Popover.Close
        disabled={slot.reserved}
        onClick={() =>
          buy({
            slotId: slot.id,
            position: slot.position,
            acquisition: slot.acquisitions,
            word: "",
            url: "",
          })
        }
        className={cn(buttonVariants(), "mt-5 h-11 w-full justify-between px-4 text-xs")}
      >
        {slot.reserved ? "Place réservée" : slot.word ? "Prendre cette place" : "Écrire ici"}
        <ArrowUpRight aria-hidden="true" className="size-4" />
      </Popover.Close>
    </>
  );
}

export function PageManuscript({ slots }: { slots: Slot[] | undefined }) {
  return (
    <article
      id="mots"
      aria-label="La page, 50 places à écrire"
      aria-busy={!slots}
      className="mx-auto w-full max-w-184 scroll-mt-8"
    >
      <div className="min-h-64 py-9 sm:min-h-80 sm:py-12">
        {slots ? (
          slots.length > 0 ? (
            <Popover.Root<Slot>>
              {({ payload: slot }) => (
                <>
                  <p className="manuscript font-serif">
                    {slots.map((word, index) => (
                      <Fragment key={word.id}>
                        {index > 0 && " "}
                        <Popover.Trigger
                          id={`word-${word.position}`}
                          payload={word}
                          openOnHover
                          delay={150}
                          closeDelay={150}
                          data-empty={!word.word ? "" : undefined}
                          aria-label={
                            word.word
                              ? `${word.word}, place ${word.position} : voir les informations`
                              : `Place ${word.position}, ${word.reserved ? "réservée" : "libre, texte de remplissage"} : voir les informations`
                          }
                          className="manuscript-word"
                        >
                          {word.word || (
                            <span aria-hidden="true">
                              {PLACEHOLDER_WORDS[(word.position - 1) % PLACEHOLDER_WORDS.length]}
                            </span>
                          )}
                        </Popover.Trigger>
                      </Fragment>
                    ))}
                  </p>
                  <Popover.Portal>
                    <Popover.Positioner
                      side="top"
                      sideOffset={12}
                      collisionPadding={16}
                      className="z-40"
                    >
                      <Popover.Popup className="relative w-72 max-w-[calc(100vw-2rem)] origin-(--transform-origin) border bg-popover p-5 text-popover-foreground shadow-[0_8px_40px_-12px_rgb(0_0_0/0.18)] outline-none transition-[opacity,transform] duration-150 data-ending-style:translate-y-1 data-ending-style:opacity-0 data-starting-style:translate-y-1 data-starting-style:opacity-0 motion-reduce:transition-none">
                        {slot && <WordDetails slot={slot} />}
                      </Popover.Popup>
                    </Popover.Positioner>
                  </Popover.Portal>
                </>
              )}
            </Popover.Root>
          ) : (
            <p className="py-12 text-center font-serif text-xl text-muted-foreground">
              La page se prépare. Revenez dans un instant.
            </p>
          )
        ) : (
          <div role="status" className="space-y-7 py-3">
            <span className="sr-only">Chargement des mots de la page…</span>
            {["w-full", "w-11/12", "w-4/5"].map((width) => (
              <div
                key={width}
                className={cn("h-5 animate-pulse bg-muted motion-reduce:animate-none", width)}
              />
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
