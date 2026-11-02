import { useQuery } from "convex/react";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import { useNavigate } from "@tanstack/react-router";
import { useCurrentUser } from "@/hooks/use-current-user";
import { LogOut, Settings, Shield } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";

export default function UserMenu() {
  const user = useCurrentUser();
  const viewer = useQuery(api.slots.viewer);
  const navigate = useNavigate();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Mon compte"
        className="flex size-9 items-center justify-center rounded-full border bg-secondary font-serif text-lg text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {user?.name?.charAt(0).toUpperCase() || "M"}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-card">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="truncate font-normal">
            {user?.email}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>
            <Settings className="mr-2 size-4" />
            Mon compte
          </DropdownMenuItem>
          {viewer?.isAdmin && (
            <DropdownMenuItem onClick={() => navigate({ to: "/admin" })}>
              <Shield className="mr-2 size-4" />
              Administration
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={async () => {
              await authClient.signOut();
              window.location.assign("/");
            }}
          >
            <LogOut className="mr-2 size-4" />
            Déconnexion
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
