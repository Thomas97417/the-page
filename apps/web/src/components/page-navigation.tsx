import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Check, ChevronDown, Search, X } from "lucide-react";
import {
  DEFAULT_PAGE_ID,
  getPage,
  PAGES,
  type PageId,
} from "@my-better-t-app/backend/convex/lib/pages";

type Page = (typeof PAGES)[number];

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function matchesPage(page: Page, query: string, label: string) {
  const search = normalizeSearch(query);
  return [label, page.label, page.id, page.slug, page.suffix].some((value) =>
    normalizeSearch(value).includes(search),
  );
}

export function PageNavigation({ pageId }: { pageId: PageId }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const currentPage = getPage(pageId);

  return (
    <Combobox.Root<Page>
      items={PAGES}
      value={currentPage}
      open={open}
      inputValue={query}
      onInputValueChange={setQuery}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        setQuery("");
      }}
      filter={(page, query) => matchesPage(page, query, t(`pages.${page.id}`))}
      autoHighlight
    >
      <Combobox.Trigger
        aria-label={t("header.choosePage", { page: t(`pages.${pageId}`) })}
        className="group inline-flex min-h-11 items-center gap-1 pr-0.5 font-serif text-sm tracking-[-0.025em] text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:text-foreground data-popup-open:text-foreground sm:text-base"
      >
        <span>.{currentPage.suffix}</span>
        <ChevronDown
          aria-hidden="true"
          className="size-3 transition-transform group-data-popup-open:rotate-180 motion-reduce:transition-none"
          strokeWidth={1.5}
        />
      </Combobox.Trigger>
      <Combobox.Portal>
        <Combobox.Positioner
          align="start"
          alignOffset={-9}
          sideOffset={-6}
          className="isolate z-50 outline-none"
        >
          <Combobox.Popup
            aria-label={t("pageNavigation.choose")}
            className="flex max-h-[min(21rem,var(--available-height))] w-52 max-w-[calc(100vw-2.5rem)] origin-(--transform-origin) flex-col overflow-hidden border bg-background text-foreground shadow-[0_8px_40px_-12px_rgb(0_0_0/0.18)] outline-none duration-100 data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 motion-reduce:animate-none"
          >
            <div className="mx-2 flex shrink-0 items-center gap-2 border-b px-1 py-2 focus-within:border-foreground/40">
              <Search aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
              <Combobox.Input
                aria-label={t("pageNavigation.search")}
                placeholder={t("pageNavigation.searchPlaceholder")}
                autoComplete="off"
                spellCheck={false}
                className="h-7 min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
              />
              {query && (
                <Combobox.Clear
                  aria-label={t("pageNavigation.clear")}
                  className="flex size-7 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <X aria-hidden="true" className="size-3" strokeWidth={1.5} />
                </Combobox.Clear>
              )}
            </div>
            <Combobox.Empty className="px-4 py-6 text-center text-xs leading-relaxed text-muted-foreground empty:hidden">
              {t("pageNavigation.empty")}
            </Combobox.Empty>
            <Combobox.List
              aria-label={t("pageNavigation.available")}
              className="country-scrollbar min-h-0 overflow-y-auto overscroll-contain p-2 empty:hidden"
            >
              {(page: Page) => (
                <Combobox.Item
                  key={page.id}
                  value={page}
                  aria-label={`.${page.suffix} — ${t(`pages.${page.id}`)}`}
                  render={
                    <Link
                      preload="intent"
                      to={page.id === DEFAULT_PAGE_ID ? "/" : "/$page"}
                      params={page.id === DEFAULT_PAGE_ID ? {} : { page: page.slug }}
                      search={{}}
                      onClick={() => setOpen(false)}
                      aria-current={pageId === page.id ? "page" : undefined}
                    />
                  }
                  className="group/page-option flex min-h-10 cursor-pointer items-center justify-between gap-3 px-1 py-1 text-foreground outline-none data-highlighted:bg-muted"
                >
                  <span className="min-w-0 flex-1">
                    <span className="font-serif text-base leading-tight tracking-tight decoration-foreground/40 underline-offset-4 group-data-highlighted/page-option:underline">
                      .{page.suffix}
                    </span>
                    <span className="mt-0.5 block text-[10px] leading-tight text-muted-foreground">
                      {t(`pages.${page.id}`)}
                    </span>
                  </span>
                  {pageId === page.id ? (
                    <Check aria-hidden="true" className="size-3 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                  ) : (
                    <ArrowUpRight
                      aria-hidden="true"
                      className="size-3 shrink-0 text-muted-foreground transition-transform group-data-highlighted/page-option:-translate-y-0.5 group-data-highlighted/page-option:translate-x-0.5 motion-reduce:transform-none"
                      strokeWidth={1.5}
                    />
                  )}
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
