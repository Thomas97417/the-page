import { useState, type FormEvent } from "react";
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
import { euros, errorMessage } from "@/lib/page";

export function BuySheet({
  draft,
  onClose,
}: {
  draft: WordDraft;
  onClose: () => void;
}) {
  const [word, setWord] = useState(draft.word);
  const [url, setUrl] = useState(draft.url);
  const [description, setDescription] = useState(draft.description ?? "");
  const [accepted, setAccepted] = useState(draft.acquisition);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { showWords } = usePage();
  const purchases = useQuery(api.purchases.mine, isAuthenticated ? {} : "skip");
  const owned = purchases?.find(
    (purchase) => purchase.current && purchase.slotId === draft.slotId,
  );
  const slots = useQuery(api.slots.list);
  const availability = useQuery(api.payments.availability);
  const start = useAction(api.payments.start);
  const slot = slots?.find((s) => s.id === draft.slotId);
  const changed = !!slot && accepted !== slot.acquisitions;
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const content = validateContent(word, url, description);
      if (!slot) {
        setError("Cet emplacement n’est plus disponible.");
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
      });
      try {
        sessionStorage.removeItem("the-page:draft");
      } catch {
        /* optional storage */
      }
      window.location.assign(result.url);
    } catch (cause) {
      setError(
        cause instanceof Error &&
          !("data" in cause) &&
          !cause.message.includes("Request")
          ? cause.message
          : errorMessage(cause),
      );
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
            Cette place est à vous.
          </SheetTitle>
          <SheetDescription className="mt-5 text-sm leading-relaxed text-muted-foreground">
            {owned.hidden
              ? "Ce mot est masqué par la modération."
              : "Vous pouvez modifier votre mot, sa description et son lien gratuitement."}
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
            Mes mots <ArrowUpRight className="size-4" />
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
          EMPLACEMENT {String(draft.position).padStart(2, "0")}
        </div>
        <SheetTitle className="mt-5 font-serif text-5xl tracking-tight">
          À vous d’écrire.
        </SheetTitle>
        <SheetDescription className="sr-only">
          Choisissez votre mot, puis payez l’emplacement sélectionné. La
          description et le lien sont facultatifs.
        </SheetDescription>
        <form onSubmit={submit} className="mt-10 flex flex-1 flex-col gap-7">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="purchase-word">Votre mot</Label>
              <span className="font-mono text-xs text-muted-foreground">
                {Array.from(word.normalize("NFC")).length}/24
              </span>
            </div>
            <Input
              autoFocus
              id="purchase-word"
              placeholder="Inoubliable"
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
              Un lien{" "}
              <span className="font-normal text-muted-foreground">
                (facultatif)
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
              <span className="text-sm text-muted-foreground">Votre place</span>
              <span className="font-serif text-4xl">
                {euros(slot?.price ?? (draft.acquisition + 1) * 100)}
              </span>
            </div>
            {changed && (
              <p className="text-sm text-primary" role="status">
                Le prix a changé. Confirmez le nouveau montant.
              </p>
            )}
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            {availability?.configured === false && (
              <p className="text-sm text-muted-foreground">
                Le paiement de test est momentanément indisponible.
              </p>
            )}
            {slot?.reserved && (
              <p role="status" className="text-sm text-muted-foreground">
                Un paiement est en cours sur cette place.
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
                  <span>Ouverture du paiement</span>
                  <Loader2 className="size-4 animate-spin" />
                </>
              ) : (
                <>
                  <span>
                    {changed
                      ? `Accepter ${euros(slot?.price ?? 0)}`
                      : isAuthenticated
                        ? `Payer ${euros(slot?.price ?? 0)}`
                        : "Se connecter pour acheter"}
                  </span>
                  <ArrowUpRight className="size-5" />
                </>
              )}
            </Button>
            <p className="text-center text-xs leading-relaxed text-muted-foreground">
              Votre mot peut être remplacé dès son achat.
              <br />
              <span className="text-[11px]">
                Paiement de test · Taxes incluses
              </span>
            </p>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
