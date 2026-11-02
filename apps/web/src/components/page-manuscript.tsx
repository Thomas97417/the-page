import { useTranslation } from "react-i18next";
import { Fragment } from "react";
import { Popover } from "@base-ui/react/popover";
import { useConvexAuth, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import { ArrowUpRight, Loader2, X } from "lucide-react";
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

function linkLabel(url: string, fallback: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return fallback;
  }
}

function WordDetails({ slot }: { slot: Slot }) {
  const { t, i18n } = useTranslation();
  const { buy, showWords } = usePage();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const purchases = useQuery(api.purchases.mine, isAuthenticated ? {} : "skip");
  const checkingOwnership =
    isLoading || (isAuthenticated && purchases === undefined);
  const owned = isAuthenticated
    ? purchases?.find((purchase) => purchase.current && purchase.slotId === slot.id)
    : undefined;

  return (
    <>
      <p className="pr-8 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {t("word.position", { page: t(`pages.${slot.pageId}`), position: String(slot.position).padStart(2, "0") })}
      </p>
      <Popover.Close
        aria-label={t("word.close")}
        className="absolute right-3 top-3 flex size-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
      >
        <X className="size-3.5" />
      </Popover.Close>
      <Popover.Title className="mt-4 break-words font-serif text-3xl leading-tight tracking-tight">
        {slot.word || t("word.placeholder")}
      </Popover.Title>
      {slot.description && (
        <Popover.Description className="mt-3 whitespace-pre-line break-words text-sm leading-relaxed text-muted-foreground">
          {slot.description}
        </Popover.Description>
      )}
      {slot.reserved && (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {t("word.paymentPending")}
        </p>
      )}
      {slot.url && (
        <a
          href={slot.url}
          target="_blank"
          rel="sponsored ugc nofollow noopener noreferrer"
          className="mt-1 flex min-h-8 items-center justify-between gap-3 text-xs text-muted-foreground underline decoration-border underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          <span className="truncate">{linkLabel(slot.url, t("word.visitLink"))}</span>
          <ArrowUpRight aria-hidden="true" className="size-3.5 shrink-0" />
          <span className="sr-only"> {t("common.newTab")}</span>
        </a>
      )}
      {checkingOwnership ? (
        <div
          role="status"
          className="mt-5 flex min-h-14 items-center gap-2 border-t pt-4 text-xs text-muted-foreground"
        >
          <Loader2
            aria-hidden="true"
            className="size-3.5 animate-spin motion-reduce:animate-none"
          />
          {t("word.loadingOwned")}
        </div>
      ) : owned ? (
        <div className="mt-5 border-t pt-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            {owned.hidden
              ? t("word.ownedHidden")
              : t("word.owned")}
          </p>
          <Popover.Close
            onClick={showWords}
            className={cn(
              buttonVariants(),
              "mt-4 h-10 w-full justify-between gap-3 px-3 text-xs",
            )}
          >
            {t("word.viewOwned")}
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </Popover.Close>
        </div>
      ) : (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="font-serif text-3xl leading-none tabular-nums">
            <span className="sr-only">{t("word.price")} </span>
            {euros(slot.price, i18n.resolvedLanguage)}
          </p>
          <Popover.Close
            disabled={slot.reserved}
            onClick={() =>
              buy({
                slotId: slot.id,
                pageId: slot.pageId,
                position: slot.position,
                acquisition: slot.acquisitions,
                word: "",
                url: "",
              })
            }
            className={cn(buttonVariants(), "h-10 gap-3 px-3 text-xs")}
          >
            {slot.reserved ? t("word.reserved") : slot.word ? t("word.take") : t("word.writeHere")}
            {!slot.reserved && <ArrowUpRight aria-hidden="true" className="size-3.5" />}
          </Popover.Close>
        </div>
      )}
    </>
  );
}

export function PageManuscript({ slots }: { slots: Slot[] | undefined }) {
  const { t } = useTranslation();
  return (
    <article
      id="mots"
      aria-label={t("page.manuscript")}
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
                              ? t("page.wordDetails", { word: word.word, position: word.position })
                              : t("page.emptyDetails", { position: word.position, status: word.reserved ? t("page.reserved") : t("page.empty") })
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
              {t("page.preparing")}
            </p>
          )
        ) : (
          <div role="status" className="space-y-7 py-3">
            <span className="sr-only">{t("page.loading")}</span>
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
