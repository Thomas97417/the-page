import { useQuery } from "convex/react";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import { useNavigate } from "@tanstack/react-router";
import { useCurrentUser } from "@/hooks/use-current-user";
import { BookOpen, ChevronRight, LogOut, Settings, Shield } from "lucide-react";
import { usePage } from "@/components/page-provider";
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
  const { showWords } = usePage();
  const name = user?.name?.trim() || "Mon espace";
  const initial = (user?.name?.trim() || user?.email || "M")
    .charAt(0)
    .toUpperCase();
  const itemClassName =
    "min-h-11 cursor-pointer gap-3 rounded-lg px-3 py-3 text-sm transition-colors data-highlighted:bg-muted data-highlighted:text-foreground motion-reduce:transition-none";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Menu du compte"
        className="flex size-9 shrink-0 items-center justify-center rounded-full border bg-secondary font-serif text-lg text-foreground transition-colors hover:border-foreground/25 hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-popup-open:border-foreground/25 data-popup-open:bg-accent motion-reduce:transition-none"
      >
        {initial}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={12}
        className="w-72 max-w-[calc(100vw-2.5rem)] rounded-xl bg-card p-1.5 shadow-lg shadow-foreground/5 ring-border motion-reduce:animate-none"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-3 px-3 py-3.5 font-normal">
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-full border bg-background font-serif text-xl text-foreground"
            >
              {initial}
            </span>
            <span className="min-w-0">
              <span className="block truncate font-serif text-lg leading-snug tracking-tight text-foreground">
                {name}
              </span>
              <span className="mt-0.5 block truncate text-xs">
                {user?.email}
              </span>
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="mx-3 mb-1.5" />
        <DropdownMenuGroup className="space-y-1">
          <DropdownMenuItem
            label="Mes mots"
            onClick={showWords}
            className={`${itemClassName} bg-muted/50`}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full border bg-card">
              <BookOpen aria-hidden="true" className="size-4" strokeWidth={1.5} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">Mes mots</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                Vos mots et leur historique
              </span>
            </span>
            <ChevronRight
              aria-hidden="true"
              className="size-3.5 text-muted-foreground"
              strokeWidth={1.5}
            />
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigate({ to: "/settings" })}
            className={itemClassName}
          >
            <Settings
              aria-hidden="true"
              className="size-4 text-muted-foreground"
              strokeWidth={1.5}
            />
            <span className="flex-1">Mon compte</span>
            <ChevronRight
              aria-hidden="true"
              className="size-3.5 text-muted-foreground"
              strokeWidth={1.5}
            />
          </DropdownMenuItem>
          {viewer?.isAdmin && (
            <DropdownMenuItem
              onClick={() => navigate({ to: "/admin" })}
              className={itemClassName}
            >
              <Shield
                aria-hidden="true"
                className="size-4 text-muted-foreground"
                strokeWidth={1.5}
              />
              <span className="flex-1">Administration</span>
              <ChevronRight
                aria-hidden="true"
                className="size-3.5 text-muted-foreground"
                strokeWidth={1.5}
              />
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="mx-3 my-1.5" />
        <DropdownMenuGroup>
          <DropdownMenuItem
            className={`${itemClassName} text-muted-foreground`}
            onClick={async () => {
              await authClient.signOut();
              window.location.assign("/");
            }}
          >
            <LogOut aria-hidden="true" className="size-4" strokeWidth={1.5} />
            Déconnexion
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
