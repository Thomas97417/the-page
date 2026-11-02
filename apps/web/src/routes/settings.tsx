import { createFileRoute, redirect } from "@tanstack/react-router";
import { useCurrentUser } from "@/hooks/use-current-user";

import { AccountSettings } from "@/components/settings/account-settings";

export const Route = createFileRoute("/settings")({
  beforeLoad: async ({ context }) => {
    if (!context.isAuthenticated) {
      throw redirect({ to: "/sign-in" });
    }
  },
  head: ({ match }) => ({
    meta: [
      { title: match.context.i18n.t("meta.settings") },
      {
        name: "description",
        content: match.context.i18n.t("meta.settingsDescription"),
      },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const user = useCurrentUser();

  if (!user) return null;

  return <AccountSettings name={user.name} email={user.email} />;
}
