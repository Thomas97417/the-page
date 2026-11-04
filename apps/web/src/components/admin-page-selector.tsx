import { useId, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Combobox } from "@base-ui/react/combobox";
import { Check, ChevronDown, Search, X } from "lucide-react";
import {
  DEFAULT_PAGE_ID,
  getPage,
  PAGES,
  type PageId,
} from "@my-better-t-app/backend/convex/lib/pages";
import { matchesPage, type Page } from "@/lib/page-search";

export function AdminPageSelector({
  pageId,
  onPageChange,
}: {
  pageId: PageId;
  onPageChange: (pageId: PageId) => void;
}) {
  const { t, i18n } = useTranslation();
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const currentPage = getPage(pageId);
  const pages = useMemo(
    () => [
      getPage(DEFAULT_PAGE_ID),
      ...PAGES.filter((page) => page.id !== DEFAULT_PAGE_ID).sort((a, b) =>
        t(`pages.${a.id}`).localeCompare(t(`pages.${b.id}`), i18n.resolvedLanguage),
      ),
    ],
    [t, i18n.resolvedLanguage],
  );

  return (
    <div className="w-full sm:max-w-80">
      <label
        id={`${id}-label`}
        htmlFor={id}
        className="mb-2.5 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
      >
        {t("admin.choosePage")}
      </label>
      <Combobox.Root<Page>
        items={pages}
        value={currentPage}
        onValueChange={(page) => {
          if (page) onPageChange(page.id);
        }}
        inputValue={query}
        onInputValueChange={setQuery}
        onOpenChange={() => setQuery("")}
        itemToStringLabel={(page) => t(`pages.${page.id}`)}
        filter={(page, search) => matchesPage(page, search, t(`pages.${page.id}`))}
        autoHighlight
      >
        <Combobox.Trigger
          id={id}
          aria-labelledby={`${id}-label ${id}-value`}
          className="group flex min-h-14 w-full items-center gap-3 border bg-background px-4 text-left outline-none transition-colors hover:border-foreground/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-popup-open:border-foreground/40 motion-reduce:transition-none"
        >
          <span id={`${id}-value`} className="min-w-0 flex-1 truncate font-serif text-xl tracking-tight">
            {t(`pages.${pageId}`)}
          </span>
          <span aria-hidden="true" className="font-mono text-[11px] text-muted-foreground">
            .{currentPage.suffix}
          </span>
          <ChevronDown
            aria-hidden="true"
            className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-popup-open:rotate-180 motion-reduce:transition-none"
            strokeWidth={1.5}
          />
        </Combobox.Trigger>
        <Combobox.Portal>
          <Combobox.Positioner align="start" sideOffset={6} className="isolate z-50 outline-none">
            <Combobox.Popup
              aria-labelledby={`${id}-label`}
              className="flex max-h-[min(24rem,var(--available-height))] w-(--anchor-width) max-w-[calc(100vw-2.5rem)] origin-(--transform-origin) flex-col overflow-hidden border bg-background text-foreground shadow-[0_8px_40px_-12px_rgb(0_0_0/0.18)] outline-none duration-100 data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 motion-reduce:animate-none"
            >
              <div className="mx-3 flex shrink-0 items-center gap-2 border-b py-2 focus-within:border-foreground/40">
                <Search aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                <Combobox.Input
                  ref={inputRef}
                  aria-label={t("pageNavigation.search")}
                  placeholder={t("pageNavigation.searchPlaceholder")}
                  autoComplete="off"
                  spellCheck={false}
                  className="h-9 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground sm:text-sm"
                />
                {query && (
                  <button
                    type="button"
                    aria-label={t("pageNavigation.clear")}
                    onClick={() => {
                      setQuery("");
                      inputRef.current?.focus();
                    }}
                    className="flex size-9 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <X aria-hidden="true" className="size-3.5" strokeWidth={1.5} />
                  </button>
                )}
              </div>
              <Combobox.Empty className="px-4 py-8 text-center text-sm text-muted-foreground empty:hidden">
                {t("pageNavigation.empty")}
              </Combobox.Empty>
              <Combobox.List
                aria-label={t("pageNavigation.available")}
                className="country-scrollbar min-h-0 overflow-y-auto overscroll-contain p-1.5 empty:hidden"
              >
                {(page: Page) => (
                  <Combobox.Item
                    key={page.id}
                    value={page}
                    aria-label={t(`pages.${page.id}`)}
                    className="flex min-h-11 cursor-pointer items-center gap-3 px-2.5 py-2 outline-none data-highlighted:bg-muted data-selected:bg-muted/60"
                  >
                    <span className="min-w-0 flex-1 font-serif text-lg leading-snug tracking-tight">
                      {t(`pages.${page.id}`)}
                    </span>
                    <span aria-hidden="true" className="font-mono text-[10px] text-muted-foreground">
                      .{page.suffix}
                    </span>
                    <span className="flex size-4 shrink-0 items-center justify-center">
                      <Combobox.ItemIndicator>
                        <Check aria-hidden="true" className="size-3.5" strokeWidth={1.5} />
                      </Combobox.ItemIndicator>
                    </span>
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    </div>
  );
}
