import { createFileRoute, redirect } from "@tanstack/react-router";
import { useCurrentUser } from "@/hooks/use-current-user";

import ChangePasswordCard from "@/components/settings/change-password-card";
import DeleteAccountCard from "@/components/settings/delete-account-card";
import SessionsCard from "@/components/settings/sessions-card";
import EmailCard from "@/components/settings/update-email-card";
import UpdateNameCard from "@/components/settings/update-name-card";

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

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-5 py-14">
      <div>
        <h1 className="mb-4 font-serif text-5xl tracking-tight">Mon compte.</h1>
      </div>
      <UpdateNameCard name={user.name} />
      <EmailCard email={user.email} />
      <ChangePasswordCard />
      <SessionsCard />
      <DeleteAccountCard />
    </div>
  );
}
