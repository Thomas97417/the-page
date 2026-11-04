import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";
import { publicPageHead } from "@/lib/seo";

export const Route = createFileRoute("/conditions-utilisation")({
  head: ({ match }) => publicPageHead({
    title: match.context.i18n.t("meta.terms"),
    description: match.context.i18n.t("legal.terms.description"),
    path: "/conditions-utilisation",
    siteUrl: match.context.siteUrl,
    locale: match.context.i18n.t("meta.locale"),
  }),
  component: () => <LegalPage document="terms" />,
});
