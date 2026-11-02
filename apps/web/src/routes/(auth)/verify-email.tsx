import { createFileRoute, redirect } from "@tanstack/react-router";
import VerifyEmailForm from "@/components/verify-email-form";

export const Route = createFileRoute("/(auth)/verify-email")({
  beforeLoad: async ({ context }) => {
    if (context.isAuthenticated) {
      throw redirect({ to: "/" });
    }
  },
  head: ({ match }) => ({
    meta: [
      { title: match.context.i18n.t("meta.verifyEmail") },
      {
        name: "description",
        content: match.context.i18n.t("meta.verifyEmailDescription"),
      },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return <VerifyEmailForm />;
}
