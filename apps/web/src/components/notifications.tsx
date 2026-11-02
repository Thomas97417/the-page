import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { ArrowUpRight, Bell, Check, Loader2, Repeat2 } from "lucide-react";
import { formatLocale } from "@my-better-t-app/backend/convex/lib/language";
import { usePage } from "./page-provider";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "./ui/sheet";
import { Button } from "./ui/button";
import { errorMessage } from "@/lib/errors";

type Notification = FunctionReturnType<typeof api.notifications.list>["page"][number];

export function Notifications({ onClose }: { onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const { buy, showWords } = usePage();
  const { results, status, loadMore } = usePaginatedQuery(api.notifications.list, {}, { initialNumItems: 20 });
  const unread = useQuery(api.notifications.unreadCount);
  const markRead = useMutation(api.notifications.markRead);
  const markAllRead = useMutation(api.notifications.markAllRead);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function open(notification: Notification) {
    setBusy(true);
    setError(null);
    try {
      await markRead({ notificationId: notification.id });
      onClose();
      if (notification.draft) buy(notification.draft);
      else showWords();
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent>
        <SheetTitle className="mt-14 font-serif text-4xl tracking-tight sm:text-5xl">
          {t("notifications.title")}
        </SheetTitle>
        <SheetDescription className="mt-5 text-sm leading-relaxed text-muted-foreground">
          {t("notifications.description")}
        </SheetDescription>
        <div className="mt-8 flex min-h-12 items-center justify-between gap-3 border-b pb-4 text-xs">
          <p aria-live="polite" className="text-muted-foreground">
            {unread === undefined ? t("notifications.loading") : unread >= 100 ? t("notifications.unreadLimit") : unread ? t("notifications.unread", { count: unread }) : t("notifications.upToDate")}
          </p>
          <Button
            size="sm"
            variant="ghost"
            className="h-auto px-0 text-xs"
            disabled={!unread || busy}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try { await markAllRead(); }
              catch (cause) { setError(cause); }
              finally { setBusy(false); }
            }}
          >
            {busy ? <Loader2 aria-hidden="true" className="size-3.5 animate-spin" /> : <Check aria-hidden="true" className="size-3.5" />}
            {t("notifications.markAllRead")}
          </Button>
        </div>
        {error != null && <p role="alert" className="mt-4 text-sm text-destructive">{errorMessage(error, t)}</p>}
        {status === "LoadingFirstPage" ? (
          <div role="status" className="py-16 text-center text-sm text-muted-foreground">
            <Loader2 aria-hidden="true" className="mx-auto mb-3 size-5 animate-spin" />
            {t("notifications.loading")}
          </div>
        ) : results.length === 0 ? (
          <div className="py-16">
            <Bell aria-hidden="true" className="mb-6 size-6 text-muted-foreground" strokeWidth={1.5} />
            <p className="font-serif text-2xl">{t("notifications.empty")}</p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t("notifications.emptyDescription")}</p>
          </div>
        ) : (
          <ul className="divide-y" aria-label={t("common.notifications")}>
            {results.map((notification) => (
              <li key={notification.id}>
                <button
                  className="group w-full py-6 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring disabled:opacity-60"
                  disabled={busy}
                  onClick={() => void open(notification)}
                >
                  <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    {notification.kind === "purchase_confirmed" ? <Check aria-hidden="true" className="size-3.5" /> : <Repeat2 aria-hidden="true" className="size-3.5" />}
                    {t(`notifications.${notification.kind}`)}
                    {!notification.read && (
                      <span className="ml-auto size-1.5 rounded-full bg-primary">
                        <span className="sr-only">{t("notifications.new")}</span>
                      </span>
                    )}
                  </span>
                  <span className="mt-3 block break-words font-serif text-3xl leading-tight tracking-tight">{notification.word}</span>
                  <span className="mt-2 block text-sm leading-relaxed text-muted-foreground">
                    {t(`notifications.${notification.kind}Description`)}
                  </span>
                  <span className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <span>{t("myWords.position", { page: t(`pages.${notification.pageId}`), position: String(notification.position).padStart(2, "0") })}</span>
                    <time dateTime={new Date(notification.createdAt).toISOString()}>
                      {new Date(notification.createdAt).toLocaleString(formatLocale(i18n.resolvedLanguage), { dateStyle: "medium", timeStyle: "short" })}
                    </time>
                  </span>
                  <span className="mt-5 inline-flex items-center gap-2 text-xs text-primary underline-offset-4 group-hover:underline">
                    {notification.draft ? t("notifications.reclaim") : t("notifications.manageWords")}
                    <ArrowUpRight aria-hidden="true" className="size-3.5" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {(status === "CanLoadMore" || status === "LoadingMore") && (
          <Button variant="ghost" className="my-6" disabled={status === "LoadingMore"} onClick={() => loadMore(20)}>
            {status === "LoadingMore" && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
            {t("notifications.loadMore")}
          </Button>
        )}
      </SheetContent>
    </Sheet>
  );
}
