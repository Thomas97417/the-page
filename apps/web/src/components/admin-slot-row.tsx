import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import type { PageId } from "@my-better-t-app/backend/convex/lib/pages";
import { Eye, EyeOff, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { euros } from "@/lib/page";
import { errorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
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

type Slot = FunctionReturnType<typeof api.slots.adminList>[number];
type Action = "hide" | "restore" | "remove";

export function AdminSlotRow({ slot, pageId }: { slot: Slot; pageId: PageId }) {
  const { t, i18n } = useTranslation();
  const moderate = useMutation(api.slots.moderate);
  const [pending, setPending] = useState<Action | null>(null);
  const inFlight = useRef(false);
  const [error, setError] = useState<unknown>(null);
  const [removalTarget, setRemovalTarget] = useState<Slot | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const hidden = slot.visibility === "hidden";
  const targetChanged = removalTarget !== null && (
    removalTarget.currentPurchaseId !== slot.currentPurchaseId ||
    removalTarget.word !== slot.word ||
    removalTarget.description !== slot.description ||
    removalTarget.url !== slot.url
  );
  const context = { position: slot.position, word: slot.word ?? "—" };

  async function act(action: Action, target = slot) {
    if (!target.currentPurchaseId || inFlight.current) return;
    inFlight.current = true;
    setPending(action);
    setError(null);
    try {
      await moderate({ slotId: target._id, purchaseId: target.currentPurchaseId, action });
      if (action === "remove") setRemovalTarget(null);
      const message = action === "hide" ? "wordHidden" : action === "restore" ? "wordRestored" : "wordRemoved";
      toast.success(t(`admin.${message}`, { word: target.word ?? "—" }));
    } catch (cause) {
      setError(cause);
    } finally {
      inFlight.current = false;
      setPending(null);
    }
  }

  return (
    <tr className="border-b" aria-busy={pending !== null}>
      <td className="py-5 pr-4 font-mono text-xs text-muted-foreground">
        {String(slot.position).padStart(2, "0")}
      </td>
      <td className="py-5 pr-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className={`min-w-0 max-w-full break-all font-serif text-lg sm:text-xl ${hidden ? "text-muted-foreground" : ""}`}>
            {slot.word ?? "—"}
          </span>
          {slot.currentPurchaseId && (
            <span className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
              {hidden ? (
                <EyeOff aria-hidden="true" className="size-3" strokeWidth={1.5} />
              ) : (
                <span aria-hidden="true" className="size-1 rounded-full bg-foreground/60" />
              )}
              {t(hidden ? "admin.hidden" : "admin.visible")}
            </span>
          )}
        </div>
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
        {error != null && !removalTarget && (
          <p role="alert" className="mt-3 text-xs leading-relaxed text-destructive">
            {errorMessage(error, t)}
          </p>
        )}
      </td>
      <td className="whitespace-nowrap pr-4 tabular-nums">
        {euros((slot.acquisitions + 1) * 100, i18n.resolvedLanguage)}
      </td>
      <td className="py-3">
        <AlertDialog
          open={removalTarget !== null}
          onOpenChange={(open, eventDetails) => {
            if (pending === "remove") {
              eventDetails.cancel();
              return;
            }
            setError(null);
            setRemovalTarget(open ? slot : null);
          }}
        >
          {slot.currentPurchaseId && (
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              <Button
                aria-label={t(hidden ? "admin.restore" : "admin.hide", context)}
                aria-busy={pending === "hide" || pending === "restore"}
                variant="outline"
                disabled={pending !== null}
                className="h-11 w-full gap-1.5 px-2 font-normal sm:h-10"
                onClick={() => act(hidden ? "restore" : "hide")}
              >
                {pending === "hide" || pending === "restore" ? (
                  <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
                ) : hidden ? (
                  <Eye aria-hidden="true" className="size-3.5" strokeWidth={1.5} />
                ) : (
                  <EyeOff aria-hidden="true" className="size-3.5" strokeWidth={1.5} />
                )}
                {t(hidden ? "admin.restoreWord" : "admin.hideWord")}
              </Button>
              <AlertDialogTrigger
                render={
                  <Button
                    aria-label={t("admin.remove", context)}
                    variant="ghost"
                    disabled={pending !== null}
                    className="h-11 w-full gap-1.5 px-2 font-normal text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:h-10"
                  />
                }
              >
                <Trash2 aria-hidden="true" className="size-3.5" strokeWidth={1.5} />
                {t("admin.removeWord")}
              </AlertDialogTrigger>
            </div>
          )}
          <AlertDialogContent initialFocus={cancelRef} className="rounded-none p-6">
            <AlertDialogHeader className="place-items-start gap-3 text-left">
              <AlertDialogTitle className="font-serif text-2xl font-normal tracking-tight sm:text-3xl">
                {t("admin.removeTitle")}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-pretty leading-relaxed">
                {t("admin.removeDescription")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {removalTarget && (
              <div className="min-w-0 border px-4 py-3">
                <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                  {t("admin.removalContext", { page: t(`pages.${pageId}`), position: String(removalTarget.position).padStart(2, "0") })}
                </p>
                <p className="mt-2 break-all font-serif text-2xl tracking-tight">
                  {removalTarget.word ?? "—"}
                </p>
              </div>
            )}
            <p className="text-xs leading-relaxed text-muted-foreground">{t("admin.removeNotice")}</p>
            {(targetChanged || error != null) && (
              <p role="alert" className="text-sm leading-relaxed text-destructive">
                {targetChanged ? t("admin.wordChanged") : errorMessage(error, t)}
              </p>
            )}
            <AlertDialogFooter className="-mx-6 -mb-6 mt-2 rounded-none bg-transparent p-6">
              <AlertDialogCancel ref={cancelRef} disabled={pending === "remove"} className="h-11 px-4">
                {t("common.cancel")}
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={pending !== null || targetChanged || !removalTarget?.currentPurchaseId}
                aria-busy={pending === "remove"}
                className="h-11 gap-2 px-4"
                onClick={() => {
                  if (removalTarget && !targetChanged) void act("remove", removalTarget);
                }}
              >
                {pending === "remove" ? (
                  <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 aria-hidden="true" className="size-3.5" strokeWidth={1.5} />
                )}
                {t(pending === "remove" ? "admin.removing" : "admin.confirmRemove")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </td>
    </tr>
  );
}
