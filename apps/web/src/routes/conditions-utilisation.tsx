import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/conditions-utilisation")({
  head: ({ match }) => ({
    meta: [
      { title: match.context.i18n.t("meta.terms") },
      { name: "description", content: match.context.i18n.t("legal.terms.description") },
    ],
  }),
  component: () => <LegalPage document="terms" />,
});
