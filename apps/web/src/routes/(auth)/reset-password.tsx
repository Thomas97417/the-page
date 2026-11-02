import { createFileRoute, redirect } from "@tanstack/react-router";
import ResetPasswordForm from "@/components/reset-password-form";

export const Route = createFileRoute("/(auth)/reset-password")({
  validateSearch: (search: Record<string, unknown>): { token?: string } => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Nouveau mot de passe — the page" },
      {
        name: "description",
        content: "Choisissez un nouveau mot de passe.",
      },
    ],
  }),
  beforeLoad: async ({ context }) => {
    if (context.isAuthenticated) {
      throw redirect({ to: "/" });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <ResetPasswordForm />;
}
