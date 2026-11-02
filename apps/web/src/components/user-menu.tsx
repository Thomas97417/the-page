import { useQuery } from "convex/react";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import { useNavigate } from "@tanstack/react-router";
import { useCurrentUser } from "@/hooks/use-current-user";
import { ArrowUpRight, LogOut } from "lucide-react";
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
    "min-h-12 cursor-pointer justify-between gap-4 px-0 py-3 text-foreground focus:bg-transparent data-highlighted:bg-transparent";
  const labelClassName =
    "font-serif text-xl leading-tight tracking-tight underline-offset-4 decoration-foreground/40 group-data-highlighted/dropdown-menu-item:underline";
  const arrowClassName =
    "size-3.5 text-muted-foreground transition-transform group-data-highlighted/dropdown-menu-item:-translate-y-0.5 group-data-highlighted/dropdown-menu-item:translate-x-0.5 motion-reduce:transform-none";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Menu du compte"
        className="flex size-9 shrink-0 items-center justify-center rounded-none border font-serif text-lg text-foreground transition-colors hover:border-foreground/30 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-popup-open:border-foreground/30 data-popup-open:bg-muted motion-reduce:transition-none"
      >
        {initial}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={12}
        className="w-72 max-w-[calc(100vw-2.5rem)] border bg-background p-5 text-foreground shadow-[0_8px_40px_-12px_rgb(0_0_0/0.18)] ring-0 motion-reduce:animate-none"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="min-w-0 px-0 pb-5 pt-0 font-normal">
            <span className="block truncate font-serif text-2xl leading-tight tracking-tight text-foreground">
              {name}
            </span>
            <span className="mt-1 block truncate text-xs">
              {user?.email}
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="mx-0" />
        <DropdownMenuGroup className="py-2">
          <DropdownMenuItem
            label="Mes mots"
            onClick={showWords}
            className={itemClassName}
          >
            <span className="min-w-0 flex-1">
              <span className={labelClassName}>Mes mots</span>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                Vos mots et leur historique
              </span>
            </span>
            <ArrowUpRight
              aria-hidden="true"
              className={arrowClassName}
              strokeWidth={1.5}
            />
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigate({ to: "/settings" })}
            className={itemClassName}
          >
            <span className={labelClassName}>Mon compte</span>
            <ArrowUpRight
              aria-hidden="true"
              className={arrowClassName}
              strokeWidth={1.5}
            />
          </DropdownMenuItem>
          {viewer?.isAdmin && (
            <DropdownMenuItem
              onClick={() => navigate({ to: "/admin" })}
              className={itemClassName}
            >
              <span className={labelClassName}>Administration</span>
              <ArrowUpRight
                aria-hidden="true"
                className={arrowClassName}
                strokeWidth={1.5}
              />
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="mx-0" />
        <DropdownMenuGroup className="pt-2">
          <DropdownMenuItem
            className="min-h-11 cursor-pointer gap-2 px-0 pb-0 pt-3 text-xs text-muted-foreground transition-colors focus:bg-transparent data-highlighted:bg-transparent data-highlighted:text-foreground motion-reduce:transition-none"
            onClick={async () => {
              await authClient.signOut();
              window.location.assign("/");
            }}
          >
            <LogOut aria-hidden="true" className="size-4" strokeWidth={1.5} />
            <span className="underline-offset-4 group-data-highlighted/dropdown-menu-item:underline">
              Déconnexion
            </span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
