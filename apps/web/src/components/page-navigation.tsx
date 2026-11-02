import { Link } from "@tanstack/react-router";
import { DEFAULT_PAGE_ID, PAGES, type PageId } from "@my-better-t-app/backend/convex/lib/pages";
import { cn } from "@/lib/utils";

export function PageNavigation({ pageId }: { pageId: PageId }) {
  return (
    <nav aria-label="Choisir une page" className="border-y py-2">
      <div className="mx-auto grid max-w-sm grid-cols-2 gap-1 sm:flex sm:max-w-xl sm:flex-wrap sm:items-center sm:justify-center sm:gap-2">
        {PAGES.map((page) => (
          <Link
            key={page.id}
            to={page.id === DEFAULT_PAGE_ID ? "/" : "/$page"}
            params={page.id === DEFAULT_PAGE_ID ? {} : { page: page.id }}
            search={{}}
            aria-current={pageId === page.id ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-3 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:px-4",
              pageId === page.id
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <span aria-hidden="true" className="text-sm">{page.symbol}</span>
            {page.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
