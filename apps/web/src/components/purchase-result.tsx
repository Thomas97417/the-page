import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useAction, useConvexAuth, useQuery } from "convex/react";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "./ui/button";
import { errorMessage, rememberReturnPath } from "@/lib/page";
import { DEFAULT_PAGE_ID, getPage, type PageId } from "@my-better-t-app/backend/convex/lib/pages";

export function PurchaseResult({ purchaseId, pageId }: { purchaseId: string; pageId: PageId }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const result = useQuery(
    api.purchases.status,
    isAuthenticated ? { purchaseId } : "skip",
  );
  const refresh = useAction(api.payments.refresh);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  useEffect(() => {
    if (isAuthenticated) void refresh({ purchaseId }).catch(() => {});
  }, [isAuthenticated, purchaseId, refresh]);
  const pending =
    result === undefined ||
    result?.status === "pending" ||
    result?.status === "creating";
  const labels = {
    published: result?.current
      ? `Votre mot est en ligne sur ${getPage(result.pageId).label}, place ${result.position}.`
      : "Votre achat est confirmé. Cette place a depuis été reprise.",
    expired: "La réservation a expiré. Aucun mot n’a été publié.",
    failed: "Le paiement n’a pas abouti.",
    refund_pending:
      "Cette place n’était plus disponible. Votre remboursement est en cours.",
    refunded: "Votre paiement a été remboursé.",
    creating: "Préparation du paiement…",
    pending: "En attente de confirmation du paiement.",
  };
  return (
    <div
      role="status"
      className="mt-6 flex items-center justify-between gap-4 border bg-card p-4 text-sm"
    >
      <div className="flex items-start gap-3">
        {result?.status === "published" ? (
          <Check className="mt-0.5 size-4 shrink-0 text-primary" />
        ) : pending && isAuthenticated ? (
          <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-primary" />
        ) : null}
        <div>
          {isLoading ? (
            "Vérification de votre session…"
          ) : !isAuthenticated ? (
            <Link
              to="/sign-in"
              className="underline underline-offset-4"
              onClick={() => rememberReturnPath(pageId, purchaseId)}
            >
              Connectez-vous pour consulter votre achat.
            </Link>
          ) : result === null ? (
            "Achat introuvable."
          ) : result ? (
            labels[result.status]
          ) : (
            "Vérification du paiement…"
          )}
          {error && <p className="mt-2 text-destructive">{error}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {isAuthenticated && pending && (
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await refresh({ purchaseId });
              } catch (cause) {
                setError(errorMessage(cause));
              } finally {
                setBusy(false);
              }
            }}
          >
            Actualiser
          </Button>
        )}
        <button
          aria-label="Fermer le suivi du paiement"
          onClick={() => navigate({
            to: pageId === DEFAULT_PAGE_ID ? "/" : "/$page",
            params: pageId === DEFAULT_PAGE_ID ? {} : { page: getPage(pageId).slug },
            search: {},
            replace: true,
          })}
          className="flex size-9 items-center justify-center hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
