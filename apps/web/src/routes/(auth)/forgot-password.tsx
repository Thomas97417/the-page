import { createFileRoute, redirect } from "@tanstack/react-router";
import ForgotPasswordForm from "@/components/forgot-password-form";

export const Route = createFileRoute("/(auth)/forgot-password")({
  beforeLoad: async ({ context }) => {
    if (context.isAuthenticated) {
      throw redirect({ to: "/" });
    }
  },
  head: ({ match }) => ({
    meta: [
      { title: match.context.i18n.t("meta.forgotPassword") },
      {
        name: "description",
        content: match.context.i18n.t("meta.forgotPasswordDescription"),
      },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return <ForgotPasswordForm />;
}
