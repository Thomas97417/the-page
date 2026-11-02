import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Check, ChevronDown } from "lucide-react";
import {
  DEFAULT_PAGE_ID,
  getPage,
  PAGES,
  type PageId,
} from "@my-better-t-app/backend/convex/lib/pages";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const PAGE_SUFFIXES: Record<PageId, string> = {
  world: "world",
  france: "fr",
  "royaume-uni": "uk",
  "etats-unis": "us",
};

export function PageNavigation({ pageId }: { pageId: PageId }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Choisir une page, page actuelle : ${getPage(pageId).label}`}
        className="group inline-flex min-h-11 items-center gap-1 pr-0.5 font-serif text-sm tracking-[-0.025em] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-popup-open:text-foreground sm:text-base"
      >
        <span>.{PAGE_SUFFIXES[pageId]}</span>
        <ChevronDown
          aria-hidden="true"
          className="size-3 transition-transform group-data-popup-open:rotate-180 motion-reduce:transition-none"
          strokeWidth={1.5}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        alignOffset={-9}
        sideOffset={-6}
        className="w-40 max-w-[calc(100vw-2.5rem)] border bg-background p-2 text-foreground shadow-[0_8px_40px_-12px_rgb(0_0_0/0.18)] ring-0 motion-reduce:animate-none"
      >
        {PAGES.map((page) => (
          <DropdownMenuItem
            key={page.id}
            aria-label={`.${PAGE_SUFFIXES[page.id]} — ${page.label}`}
            render={
              <Link
                to={page.id === DEFAULT_PAGE_ID ? "/" : "/$page"}
                params={page.id === DEFAULT_PAGE_ID ? {} : { page: page.id }}
                search={{}}
                aria-current={pageId === page.id ? "page" : undefined}
              />
            }
            className="min-h-10 cursor-pointer justify-between gap-3 px-0 py-1 text-foreground focus:bg-transparent data-highlighted:bg-transparent"
          >
            <span className="min-w-0 flex-1">
              <span className="font-serif text-base leading-tight tracking-tight underline-offset-4 decoration-foreground/40 group-data-highlighted/dropdown-menu-item:underline">
                .{PAGE_SUFFIXES[page.id]}
              </span>
              <span className="mt-0.5 block text-[10px] leading-tight text-muted-foreground">
                {page.label}
              </span>
            </span>
            {pageId === page.id ? (
              <Check
                aria-hidden="true"
                className="size-3 text-muted-foreground"
                strokeWidth={1.5}
              />
            ) : (
              <ArrowUpRight
                aria-hidden="true"
                className="size-3 text-muted-foreground transition-transform group-data-highlighted/dropdown-menu-item:-translate-y-0.5 group-data-highlighted/dropdown-menu-item:translate-x-0.5 motion-reduce:transform-none"
                strokeWidth={1.5}
              />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
