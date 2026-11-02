import { Link } from "@tanstack/react-router";
import { Check, ChevronDown } from "lucide-react";
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
        alignOffset={-8}
        sideOffset={0}
        className="w-22 min-w-0 p-1"
      >
        {PAGES.map((page) => (
          <DropdownMenuItem
            key={page.id}
            aria-label={`.${PAGE_SUFFIXES[page.id]} — ${page.label}`}
            render={
              <Link
                preload="render"
                to={page.id === DEFAULT_PAGE_ID ? "/" : "/$page"}
                params={page.id === DEFAULT_PAGE_ID ? {} : { page: page.id }}
                search={{}}
                aria-current={pageId === page.id ? "page" : undefined}
              />
            }
            className="min-h-8 cursor-pointer justify-between gap-2 px-1 py-1"
          >
            <span className="whitespace-nowrap font-serif text-sm tracking-[-0.025em] sm:text-base">
              .{PAGE_SUFFIXES[page.id]}
            </span>
            <span className="flex size-3 shrink-0 items-center justify-center">
              {pageId === page.id && <Check aria-hidden="true" className="size-3" />}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
