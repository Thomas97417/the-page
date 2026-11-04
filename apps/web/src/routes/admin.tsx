import { useTranslation } from "react-i18next";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import { useState } from "react";
import { Eye, EyeOff, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminPageSelector } from "@/components/admin-page-selector";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { euros } from "@/lib/page";
import { errorMessage } from "@/lib/errors";
import { DEFAULT_PAGE_ID, type PageId } from "@my-better-t-app/backend/convex/lib/pages";

export const Route = createFileRoute("/admin")({
  beforeLoad: ({ context }) => {
    if (!context.isAuthenticated) throw redirect({ to: "/sign-in" });
  },
  head: ({ match }) => ({
    meta: [
      { title: match.context.i18n.t("meta.admin") },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

function Admin() {
  const { t, i18n } = useTranslation();
  const [pageId, setPageId] = useState<PageId>(DEFAULT_PAGE_ID);
  const viewer = useQuery(api.slots.viewer);
  const slots = useQuery(api.slots.adminList, viewer?.isAdmin ? { pageId } : "skip");
  const moderate = useMutation(api.slots.moderate);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  if (viewer === undefined)
    return <Loader2 className="mx-auto mt-20 size-5 animate-spin" />;
  if (!viewer?.isAdmin)
    return (
      <main className="mx-auto max-w-3xl px-6 py-20">
        <h1 className="font-serif text-4xl">{t("admin.restricted")}</h1>
      </main>
    );
  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-14 sm:px-10">
      <h1 className="font-serif text-5xl tracking-tight">{t("admin.title")}</h1>
      <div className="mt-8">
        <AdminPageSelector
          pageId={pageId}
          onPageChange={(nextPageId) => {
            setPageId(nextPageId);
            setError(null);
          }}
        />
      </div>
      {error != null && (
        <p role="alert" className="mt-6 text-sm text-destructive">
          {errorMessage(error, t)}
        </p>
      )}
      <div className="mt-10 overflow-x-auto">
        <table className="w-full min-w-80 table-fixed text-left text-sm">
          <colgroup>
            <col className="w-12 sm:w-20" />
            <col />
            <col className="w-24 sm:w-32" />
            <col className="w-20 sm:w-24" />
          </colgroup>
          <thead className="border-b font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="py-4 pr-4 font-normal">{t("admin.position")}</th>
              <th className="pr-4 font-normal">{t("admin.content")}</th>
              <th className="pr-4 font-normal">{t("admin.nextPrice")}</th>
              <th className="text-right font-normal">{t("admin.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {slots?.map((slot) => {
              const act = async (action: "hide" | "restore" | "remove") => {
                if (!slot.currentPurchaseId) return;
                setBusy(slot._id);
                setError(null);
                try {
                  await moderate({
                    slotId: slot._id,
                    purchaseId: slot.currentPurchaseId,
                    action,
                  });
                } catch (cause) {
                  setError(cause);
                } finally {
                  setBusy(null);
                }
              };
              return (
                <tr key={slot._id} className="border-b">
                  <td className="py-5 pr-4 font-mono text-xs text-muted-foreground">
                    {String(slot.position).padStart(2, "0")}
                  </td>
                  <td className="py-5 pr-4">
                    <span
                      className={`break-all font-serif text-xl ${slot.visibility === "hidden" ? "text-muted-foreground line-through" : ""}`}
                    >
                      {slot.word ?? "—"}
                    </span>
                    {slot.description && (
                      <p className="mt-2 whitespace-pre-line break-words text-xs leading-relaxed text-muted-foreground">
                        {slot.description}
                      </p>
                    )}
                    {slot.url && (
                      <span className="mt-1 block break-all text-xs text-muted-foreground">
                        {slot.url}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap pr-4 tabular-nums">
                    {euros((slot.acquisitions + 1) * 100, i18n.resolvedLanguage)}
                  </td>
                  <td>
                    {slot.currentPurchaseId && (
                      <div className="flex justify-end gap-1">
                        <Button
                          aria-label={
                            slot.visibility === "hidden"
                              ? t("admin.restore", { position: slot.position })
                              : t("admin.hide", { position: slot.position })
                          }
                          variant="ghost"
                          size="icon"
                          disabled={busy === slot._id}
                          onClick={() =>
                            act(
                              slot.visibility === "hidden" ? "restore" : "hide",
                            )
                          }
                        >
                          {slot.visibility === "hidden" ? (
                            <Eye className="size-4" />
                          ) : (
                            <EyeOff className="size-4" />
                          )}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger
                            render={
                              <Button
                                aria-label={t("admin.remove", { position: slot.position })}
                                variant="ghost"
                                size="icon"
                                disabled={busy === slot._id}
                              />
                            }
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {t("admin.removeTitle")}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {t("admin.removeDescription")}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                              <AlertDialogAction
                                variant="destructive"
                                onClick={() => act("remove")}
                              >
                                {t("admin.confirmRemove")}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
