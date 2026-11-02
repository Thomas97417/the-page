import { createFileRoute, redirect } from "@tanstack/react-router";
import ResetPasswordForm from "@/components/reset-password-form";

export const Route = createFileRoute("/(auth)/reset-password")({
  validateSearch: (search: Record<string, unknown>): { token?: string } => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  beforeLoad: async ({ context }) => {
    if (context.isAuthenticated) {
      throw redirect({ to: "/" });
    }
  },
  head: ({ match }) => ({
    meta: [
      { title: match.context.i18n.t("meta.resetPassword") },
      {
        name: "description",
        content: match.context.i18n.t("meta.resetPasswordDescription"),
      },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return <ResetPasswordForm />;
}
