import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/mentions-legales")({
  head: ({ match }) => ({
    meta: [
      { title: match.context.i18n.t("meta.legalNotice") },
      { name: "description", content: match.context.i18n.t("legal.notice.description") },
    ],
  }),
  component: () => <LegalPage document="notice" />,
});
