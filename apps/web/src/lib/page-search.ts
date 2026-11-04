import type { PAGES } from "@my-better-t-app/backend/convex/lib/pages";

export type Page = (typeof PAGES)[number];

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function matchesPage(page: Page, query: string, label: string) {
  const search = normalizeSearch(query);
  return [label, page.label, page.id, page.slug, page.suffix].some((value) =>
    normalizeSearch(value).includes(search),
  );
}
