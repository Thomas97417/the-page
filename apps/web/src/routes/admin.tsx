import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import { useState } from "react";
import { Eye, EyeOff, Loader2, Trash2 } from "lucide-react";
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
import { euros, errorMessage } from "@/lib/page";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Modération — the page" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: ({ context }) => {
    if (!context.isAuthenticated) throw redirect({ to: "/sign-in" });
  },
  component: Admin,
});

function Admin() {
  const viewer = useQuery(api.slots.viewer);
  const slots = useQuery(api.slots.adminList, viewer?.isAdmin ? {} : "skip");
  const moderate = useMutation(api.slots.moderate);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  if (viewer === undefined)
    return <Loader2 className="mx-auto mt-20 size-5 animate-spin" />;
  if (!viewer?.isAdmin)
    return (
      <main className="mx-auto max-w-3xl px-6 py-20">
        <h1 className="font-serif text-4xl">Accès réservé.</h1>
      </main>
    );
  return (
    <main className="mx-auto max-w-5xl px-5 py-14 sm:px-10">
      <h1 className="font-serif text-5xl tracking-tight">Modération.</h1>
      {error && (
        <p role="alert" className="mt-6 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="mt-10 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="py-4 pr-4 font-normal">Place</th>
              <th className="pr-4 font-normal">Mot / lien</th>
              <th className="pr-4 font-normal">Prix suivant</th>
              <th className="text-right font-normal">Actions</th>
            </tr>
          </thead>
          <tbody>
            {slots?.map((slot) => {
              const act = async (action: "hide" | "restore" | "remove") => {
                if (!slot.currentPurchaseId) return;
                setBusy(slot._id);
                setError("");
                try {
                  await moderate({
                    slotId: slot._id,
                    purchaseId: slot.currentPurchaseId,
                    action,
                  });
                } catch (cause) {
                  setError(errorMessage(cause));
                } finally {
                  setBusy(null);
                }
              };
              return (
                <tr key={slot._id} className="border-b">
                  <td className="py-5 pr-4 font-mono text-xs text-muted-foreground">
                    {String(slot.position).padStart(2, "0")}
                  </td>
                  <td className="max-w-60 py-5 pr-4">
                    <span
                      className={`break-all font-serif text-xl ${slot.visibility === "hidden" ? "text-muted-foreground line-through" : ""}`}
                    >
                      {slot.word ?? "—"}
                    </span>
                    {slot.url && (
                      <span className="mt-1 block break-all text-xs text-muted-foreground">
                        {slot.url}
                      </span>
                    )}
                  </td>
                  <td className="pr-4 tabular-nums">
                    {euros((slot.acquisitions + 1) * 100)}
                  </td>
                  <td>
                    {slot.currentPurchaseId && (
                      <div className="flex justify-end gap-1">
                        <Button
                          aria-label={
                            slot.visibility === "hidden"
                              ? `Rétablir la place ${slot.position}`
                              : `Masquer la place ${slot.position}`
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
                                aria-label={`Retirer la place ${slot.position}`}
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
                                Retirer ce mot ?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                La place sera libérée au prix actuel.
                                L’historique d’achat sera conservé.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                variant="destructive"
                                onClick={() => act("remove")}
                              >
                                Retirer
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
