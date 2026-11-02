import { createFileRoute, redirect } from "@tanstack/react-router";
import SignUpForm from "@/components/sign-up-form";

export const Route = createFileRoute("/(auth)/sign-up")({
  beforeLoad: async ({ context }) => {
    if (context.isAuthenticated) {
      throw redirect({ to: "/" });
    }
  },
  head: ({ match }) => ({
    meta: [
      { title: match.context.i18n.t("meta.signUp") },
      {
        name: "description",
        content: match.context.i18n.t("meta.signUpDescription"),
      },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return <SignUpForm />;
}
