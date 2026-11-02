import { createFileRoute, redirect } from "@tanstack/react-router";
import ForgotPasswordForm from "@/components/forgot-password-form";

export const Route = createFileRoute("/(auth)/forgot-password")({
  head: () => ({
    meta: [
      { title: "Mot de passe oublié — the page" },
      {
        name: "description",
        content: "Réinitialisez votre mot de passe.",
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
  return <ForgotPasswordForm />;
}
