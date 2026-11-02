import { createFileRoute, redirect } from "@tanstack/react-router";
import { useCurrentUser } from "@/hooks/use-current-user";

import { AccountSettings } from "@/components/settings/account-settings";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Mon compte — the page" },
      {
        name: "description",
        content: "Gérez votre compte the page.",
      },
    ],
  }),
  beforeLoad: async ({ context }) => {
    if (!context.isAuthenticated) {
      throw redirect({ to: "/sign-in" });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const user = useCurrentUser();

  if (!user) return null;

  return <AccountSettings name={user.name} email={user.email} />;
}
