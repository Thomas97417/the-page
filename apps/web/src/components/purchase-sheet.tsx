import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAction, useConvexAuth, useQuery } from "convex/react";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import { validateContent } from "@my-better-t-app/backend/convex/lib/content";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { saveDraft, usePage, type WordDraft } from "./page-provider";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "./ui/sheet";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { WordDescriptionField } from "./word-description-field";
import { euros } from "@/lib/page";
import { errorMessage } from "@/lib/errors";
import { DEFAULT_PAGE_ID } from "@my-better-t-app/backend/convex/lib/pages";
import { useAnalytics } from "@/hooks/use-analytics";

export function BuySheet({
  draft,
  onClose,
}: {
  draft: WordDraft;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const analytics = useAnalytics();
  const formTracked = useRef(false);
  const [word, setWord] = useState(draft.word);
  const [url, setUrl] = useState(draft.url);
  const [description, setDescription] = useState(draft.description ?? "");
  const [accepted, setAccepted] = useState(draft.acquisition);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { showWords } = usePage();
  const purchases = useQuery(api.purchases.mine, isAuthenticated ? {} : "skip");
  const owned = purchases?.find(
    (purchase) => purchase.current && purchase.slotId === draft.slotId,
  );
  const pageId = draft.pageId ?? DEFAULT_PAGE_ID;
  const slots = useQuery(api.slots.list, { pageId });
  const availability = useQuery(api.payments.availability);
  const start = useAction(api.payments.start);
  const slot = slots?.find((s) => s.id === draft.slotId);
  const changed = !!slot && accepted !== slot.acquisitions;

  useEffect(() => {
    if (
      !analytics ||
      formTracked.current ||
      isLoading ||
      owned ||
      (isAuthenticated && purchases === undefined)
    ) return;

    // Also covers drafts restored after login, without counting the owner's edit panel.
    formTracked.current = true;
    analytics.capture("purchase_form_opened", {
      page_id: pageId,
      slot_id: draft.slotId,
      position: draft.position,
      purchase_type: draft.acquisition === 0 ? "initial" : "takeover",
      acquisition_number: draft.acquisition + 1,
    });
  }, [analytics, isLoading, isAuthenticated, purchases, owned, pageId, draft.slotId, draft.position, draft.acquisition]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const content = validateContent(word, url, description);
      if (!slot) {
        setError("SLOT_UNAVAILABLE");
        return;
      }
      if (changed) {
        setAccepted(slot.acquisitions);
        return;
      }
      if (!isAuthenticated) {
        saveDraft({
          ...draft,
          ...content,
          url: content.url ?? "",
          acquisition: slot.acquisitions,
        });
        window.location.assign("/sign-in");
        return;
      }
      setBusy(true);
      const result = await start({
        slotId: slot.id,
        acquisition: accepted,
        ...content,
        language: i18n.resolvedLanguage === "en" ? "en" : "fr",
      });
      try {
        sessionStorage.removeItem("the-page:draft");
      } catch {
        /* optional storage */
      }
      window.location.assign(result.url);
    } catch (cause) {
      setError(cause);
      setBusy(false);
    }
  }
  if (owned)
    return (
      <Sheet
        open
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <SheetContent>
          <SheetTitle className="mt-14 font-serif text-4xl tracking-tight">
            {t("purchase.owned")}
          </SheetTitle>
          <SheetDescription className="mt-5 text-sm leading-relaxed text-muted-foreground">
            {owned.hidden
              ? t("purchase.hidden")
              : t("purchase.editFree")}
          </SheetDescription>
          <p className="my-12 break-all border-y py-12 text-center font-serif text-4xl text-primary">
            {owned.word}
          </p>
          <Button
            className="h-12"
            onClick={() => {
              onClose();
              showWords();
            }}
          >
            {t("user.words")} <ArrowUpRight className="size-4" />
          </Button>
        </SheetContent>
      </Sheet>
    );
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <SheetContent>
        <div className="mt-12 flex items-center gap-3 font-mono text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-primary" />
          {t("purchase.position", { page: t(`pages.${pageId}`), position: String(draft.position).padStart(2, "0") })}
        </div>
        <SheetTitle className="mt-5 font-serif text-5xl tracking-tight">
          {t("purchase.title")}
        </SheetTitle>
        <SheetDescription className="sr-only">
          {t("purchase.description")}
        </SheetDescription>
        <form onSubmit={submit} className="mt-10 flex flex-1 flex-col gap-7">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="purchase-word">{t("purchase.yourWord")}</Label>
              <span className="font-mono text-xs text-muted-foreground">
                {Array.from(word.normalize("NFC")).length}/24
              </span>
            </div>
            <Input
              autoFocus
              id="purchase-word"
              placeholder={t("purchase.placeholder")}
              autoComplete="off"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              required
              className="h-13 text-base"
            />
          </div>
          <WordDescriptionField
            id="purchase-description"
            value={description}
            onChange={setDescription}
          />
          <div className="space-y-2.5">
            <Label htmlFor="purchase-url">
              {t("purchase.link")}{" "}
              <span className="font-normal text-muted-foreground">
                {t("common.optional")}
              </span>
            </Label>
            <Input
              id="purchase-url"
              type="url"
              placeholder="https://"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              maxLength={2048}
              className="h-13 text-base"
            />
          </div>
          <div className="mt-auto space-y-5 pt-5">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">{t("purchase.yourPlace")}</span>
              <span className="font-serif text-4xl">
                {euros(slot?.price ?? (draft.acquisition + 1) * 100, i18n.resolvedLanguage)}
              </span>
            </div>
            {changed && (
              <p className="text-sm text-primary" role="status">
                {t("purchase.priceChanged")}
              </p>
            )}
            {error != null && (
              <p role="alert" className="text-sm text-destructive">
                {errorMessage(error, t)}
              </p>
            )}
            {availability?.configured === false && (
              <p className="text-sm text-muted-foreground">
                {t("purchase.unavailable")}
              </p>
            )}
            {slot?.reserved && (
              <p role="status" className="text-sm text-muted-foreground">
                {t("word.paymentPending")}
              </p>
            )}
            <Button
              type="submit"
              size="lg"
              className="h-13 w-full justify-between px-5 text-sm"
              disabled={
                busy ||
                isLoading ||
                !slot ||
                slot.reserved ||
                (isAuthenticated && !availability?.configured)
              }
            >
              {busy ? (
                <>
                  <span>{t("purchase.opening")}</span>
                  <Loader2 className="size-4 animate-spin" />
                </>
              ) : (
                <>
                  <span>
                    {changed
                      ? t("purchase.accept", { price: euros(slot?.price ?? 0, i18n.resolvedLanguage) })
                      : isAuthenticated
                        ? t("purchase.pay", { price: euros(slot?.price ?? 0, i18n.resolvedLanguage) })
                        : t("purchase.signIn")}
                  </span>
                  <ArrowUpRight className="size-5" />
                </>
              )}
            </Button>
            <p className="text-center text-xs leading-relaxed text-muted-foreground">
              {t("purchase.replacementNotice")}
              <br />
              <span className="text-[11px]">
                {t(availability?.sandbox ? "purchase.testNotice" : "purchase.taxNotice")}
              </span>
            </p>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
