import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useAction, useConvexAuth, useQuery } from "convex/react";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "./ui/button";
import { rememberReturnPath } from "@/lib/page";
import { errorMessage } from "@/lib/errors";
import { DEFAULT_PAGE_ID, type PageId } from "@my-better-t-app/backend/convex/lib/pages";

export function PurchaseResult({ purchaseId, pageId }: { purchaseId: string; pageId: PageId }) {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const result = useQuery(
    api.purchases.status,
    isAuthenticated ? { purchaseId } : "skip",
  );
  const refresh = useAction(api.payments.refresh);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
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
      ? t("payment.published", { page: t(`pages.${result.pageId}`), position: result.position })
      : t("payment.replaced"),
    expired: t("payment.expired"),
    failed: t("payment.failed"),
    refund_pending:
      t("payment.refund_pending"),
    refunded: t("payment.refunded"),
    creating: t("payment.creating"),
    pending: t("payment.pending"),
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
            t("payment.checkingSession")
          ) : !isAuthenticated ? (
            <Link
              to="/sign-in"
              className="underline underline-offset-4"
              onClick={() => rememberReturnPath(pageId, purchaseId)}
            >
              {t("payment.signIn")}
            </Link>
          ) : result === null ? (
            t("payment.notFound")
          ) : result ? (
            labels[result.status]
          ) : (
            t("payment.checking")
          )}
          {error != null && <p className="mt-2 text-destructive">{errorMessage(error, t)}</p>}
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
              setError(null);
              try {
                await refresh({ purchaseId });
              } catch (cause) {
                setError(cause);
              } finally {
                setBusy(false);
              }
            }}
          >
            {t("common.refresh")}
          </Button>
        )}
        <button
          aria-label={t("payment.close")}
          onClick={() => navigate({
            to: pageId === DEFAULT_PAGE_ID ? "/" : "/$page",
            params: pageId === DEFAULT_PAGE_ID ? {} : { page: pageId },
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
