import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "@tanstack/react-router";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import { DEFAULT_PAGE_ID, getPage, type PageId } from "@my-better-t-app/backend/convex/lib/pages";
import { Loader2 } from "lucide-react";
import { rememberReturnPath } from "@/lib/page";
import { usePage } from "./page-provider";

export function ReclaimWord({ notificationId, pageId }: { notificationId: string; pageId: PageId }) {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const result = useQuery(api.notifications.reclaim, isAuthenticated ? { notificationId } : "skip");
  const markRead = useMutation(api.notifications.markRead);
  const { buy } = usePage();
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    if (!result || result.draft.pageId !== pageId || handled.current) return;
    handled.current = true;
    buy(result.draft);
    void markRead({ notificationId: result.notificationId }).catch(() => {});
    void navigate({
      to: pageId === DEFAULT_PAGE_ID ? "/" : "/$page",
      params: pageId === DEFAULT_PAGE_ID ? {} : { page: getPage(pageId).slug },
      search: (previous) => ({ purchase: previous.purchase }),
      replace: true,
    });
  }, [result, pageId, buy, markRead, navigate]);

  const loading = isLoading || (isAuthenticated && result === undefined);
  return (
    <div role="status" className="mt-6 flex items-center gap-3 border bg-card p-4 text-sm">
      {loading ? (
        <><Loader2 aria-hidden="true" className="size-4 animate-spin text-primary" />{t("notifications.opening")}</>
      ) : !isAuthenticated ? (
        <Link to="/sign-in" className="underline underline-offset-4" onClick={() => rememberReturnPath(pageId, undefined, notificationId)}>
          {t("notifications.signInToReclaim")}
        </Link>
      ) : (!result || result.draft.pageId !== pageId) ? t("notifications.unavailable") : t("notifications.opening")}
    </div>
  );
}
