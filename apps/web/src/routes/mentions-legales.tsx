import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";
import { publicPageHead } from "@/lib/seo";

export const Route = createFileRoute("/mentions-legales")({
  head: ({ match }) => publicPageHead({
    title: match.context.i18n.t("meta.legalNotice"),
    description: match.context.i18n.t("legal.notice.description"),
    path: "/mentions-legales",
    siteUrl: match.context.siteUrl,
    locale: match.context.i18n.t("meta.locale"),
  }),
  component: () => <LegalPage document="notice" />,
});
