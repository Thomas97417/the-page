import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { validateContent } from "@my-better-t-app/backend/convex/lib/content";
import { ArrowUpRight, Check, Loader2, Pencil } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "./ui/sheet";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { WordDescriptionField } from "./word-description-field";
import { euros, errorMessage } from "@/lib/page";
import { Link } from "@tanstack/react-router";
import { DEFAULT_PAGE_ID, getPage } from "@my-better-t-app/backend/convex/lib/pages";

type Purchase = FunctionReturnType<typeof api.purchases.mine>[number];
const statusLabels = {
  creating: "Préparation",
  pending: "Paiement en cours",
  published: "Terminé",
  expired: "Expiré",
  failed: "Échoué",
  refund_pending: "Remboursement en cours",
  refunded: "Remboursé",
};

function OwnedWord({ purchase, onClose }: { purchase: Purchase; onClose: () => void }) {
  const [editing, setEditing] = useState(false);
  const [word, setWord] = useState(purchase.word ?? "");
  const [url, setUrl] = useState(purchase.url ?? "");
  const [description, setDescription] = useState(purchase.description ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const update = useMutation(api.slots.updateContent);
  async function save(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const content = validateContent(word, url, description);
      setBusy(true);
      await update({
        slotId: purchase.slotId,
        purchaseId: purchase.id,
        ...content,
      });
      setEditing(false);
    } catch (cause) {
      setError(
        cause instanceof Error && !("data" in cause)
          ? cause.message
          : errorMessage(cause),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="border-b py-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] text-muted-foreground">
            <Link
              to={purchase.pageId === DEFAULT_PAGE_ID ? "/" : "/$page"}
              params={purchase.pageId === DEFAULT_PAGE_ID ? {} : { page: getPage(purchase.pageId).slug }}
              search={{}}
              hash={`word-${purchase.position}`}
              onClick={onClose}
              className="underline-offset-4 hover:underline"
            >
              {getPage(purchase.pageId).label} · PLACE {String(purchase.position).padStart(2, "0")}
            </Link>
            {purchase.hidden ? " · MASQUÉ" : ""}
          </p>
          <p className="mt-2 break-all font-serif text-3xl">{purchase.word}</p>
        </div>
        {!purchase.hidden && (
          <Button
            size="icon"
            variant="ghost"
            aria-label={`Modifier ${purchase.word}`}
            onClick={() => {
              setWord(purchase.word ?? "");
              setUrl(purchase.url ?? "");
              setDescription(purchase.description ?? "");
              setEditing(!editing);
            }}
          >
            <Pencil className="size-4" />
          </Button>
        )}
      </div>
      {!editing && purchase.description && (
        <p className="mt-3 whitespace-pre-line break-words text-sm leading-relaxed text-muted-foreground">
          {purchase.description}
        </p>
      )}
      {editing && (
        <form onSubmit={save} className="mt-5 space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`word-${purchase.id}`}>Mot</Label>
            <Input
              id={`word-${purchase.id}`}
              value={word}
              onChange={(e) => setWord(e.target.value)}
              required
            />
          </div>
          <WordDescriptionField
            id={`description-${purchase.id}`}
            value={description}
            onChange={setDescription}
          />
          <div className="space-y-2">
            <Label htmlFor={`url-${purchase.id}`}>Lien</Label>
            <Input
              id={`url-${purchase.id}`}
              type="url"
              placeholder="https://"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              Enregistrer
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditing(false)}
            >
              Annuler
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

export function MyWords({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"current" | "history">("current");
  const purchases = useQuery(api.purchases.mine);
  const current = purchases?.filter((p) => p.current) ?? [];
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent>
        <SheetTitle className="mt-14 font-serif text-5xl tracking-tight">
          Mes mots.
        </SheetTitle>
        <SheetDescription className="sr-only">
          Vos emplacements actuels et l’historique de vos achats sur toutes les pages.
        </SheetDescription>
        <div className="mt-9 flex gap-6 border-b text-sm">
          <button
            className={`border-b-2 pb-4 ${tab === "current" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}
            aria-pressed={tab === "current"}
            onClick={() => setTab("current")}
          >
            En ligne{" "}
            {current.length > 0 && (
              <span className="ml-1 text-primary">{current.length}</span>
            )}
          </button>
          <button
            className={`border-b-2 pb-4 ${tab === "history" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}
            aria-pressed={tab === "history"}
            onClick={() => setTab("history")}
          >
            Historique
          </button>
        </div>
        {!purchases ? (
          <Loader2 className="mx-auto mt-16 size-5 animate-spin text-muted-foreground" />
        ) : tab === "current" ? (
          current.length ? (
            current.map((purchase) => (
              <OwnedWord key={purchase.id} purchase={purchase} onClose={onClose} />
            ))
          ) : (
            <div className="py-16">
              <p className="font-serif text-2xl">Votre place vous attend.</p>
              <Button variant="link" className="mt-4 px-0" onClick={onClose}>
                Choisir un emplacement <ArrowUpRight />
              </Button>
            </div>
          )
        ) : purchases.length ? (
          <div className="divide-y">
            {purchases.map((purchase) => (
              <div key={purchase.id} className="py-5">
                <div className="flex justify-between gap-4">
                  <p className="break-all font-serif text-xl">
                    {purchase.word}
                  </p>
                  <span className="shrink-0 text-sm">
                    {euros(purchase.amount)}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    {getPage(purchase.pageId).label} · Place {purchase.position} ·{" "}
                    {new Date(purchase.createdAt).toLocaleDateString("fr-FR")}
                  </span>
                  <span>
                    {purchase.current
                      ? purchase.hidden
                        ? "Masqué"
                        : "En ligne"
                      : statusLabels[purchase.status]}
                  </span>
                </div>
                {purchase.checkoutUrl && (
                  <a
                    className="mt-3 inline-flex items-center gap-1 text-sm text-primary underline underline-offset-4"
                    href={purchase.checkoutUrl}
                  >
                    Reprendre le paiement
                    <ArrowUpRight className="size-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="py-12 text-sm text-muted-foreground">
            Aucun achat pour le moment.
          </p>
        )}
      </SheetContent>
    </Sheet>
  );
}
