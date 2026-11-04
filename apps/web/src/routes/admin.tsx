import { useTranslation } from "react-i18next";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { AdminPageSelector } from "@/components/admin-page-selector";
import { AdminSlotRow } from "@/components/admin-slot-row";
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
  const { t } = useTranslation();
  const [pageId, setPageId] = useState<PageId>(DEFAULT_PAGE_ID);
  const viewer = useQuery(api.slots.viewer);
  const slots = useQuery(api.slots.adminList, viewer?.isAdmin ? { pageId } : "skip");
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
          onPageChange={setPageId}
        />
        <p className="mt-4 max-w-lg text-xs leading-relaxed text-muted-foreground">
          {t("admin.moderationHint")}
        </p>
      </div>
      <div className="mt-10 overflow-x-auto">
        <table className="w-full min-w-80 table-fixed text-left text-sm">
          <colgroup>
            <col className="w-10 sm:w-20" />
            <col />
            <col className="w-20 sm:w-32" />
            <col className="w-28 sm:w-56" />
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
            {slots?.map((slot) => (
              <AdminSlotRow key={slot._id} slot={slot} pageId={pageId} />
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
