import { createFileRoute, redirect } from "@tanstack/react-router";
import SignInForm from "@/components/sign-in-form";

export const Route = createFileRoute("/(auth)/sign-in")({
  beforeLoad: async ({ context }) => {
    if (context.isAuthenticated) {
      throw redirect({ to: "/" });
    }
  },
  head: ({ match }) => ({
    meta: [
      { title: match.context.i18n.t("meta.signIn") },
      {
        name: "description",
        content: match.context.i18n.t("meta.signInDescription"),
      },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return <SignInForm />;
}
