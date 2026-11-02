import { createFileRoute, redirect } from "@tanstack/react-router";
import VerifyEmailForm from "@/components/verify-email-form";

export const Route = createFileRoute("/(auth)/verify-email")({
  head: () => ({
    meta: [
      { title: "Vérification de l’email — the page" },
      {
        name: "description",
        content: "Vérifiez votre adresse email.",
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
  return <VerifyEmailForm />;
}
