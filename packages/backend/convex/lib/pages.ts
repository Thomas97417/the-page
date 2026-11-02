export const DEFAULT_PAGE_ID = "world";

export const PAGES = [
  { id: DEFAULT_PAGE_ID, label: "World", symbol: "🌐" },
  { id: "france", label: "France", symbol: "🇫🇷" },
  { id: "royaume-uni", label: "Royaume-Uni", symbol: "🇬🇧" },
  { id: "etats-unis", label: "États-Unis", symbol: "🇺🇸" },
] as const;

export type PageId = (typeof PAGES)[number]["id"];

export function isPageId(value: unknown): value is PageId {
  return PAGES.some((page) => page.id === value);
}

export function getPage(id: PageId) {
  return PAGES.find((page) => page.id === id)!;
}

export function pagePath(id: PageId) {
  return id === DEFAULT_PAGE_ID ? "/" : (`/${id}` as const);
}

export function pageIdFromPath(pathname: string): PageId | null {
  if (pathname === "/") return DEFAULT_PAGE_ID;
  const id = pathname.replace(/^\//, "").replace(/\/$/, "");
  return isPageId(id) ? id : null;
}

export function purchaseReturnPath(pageId: PageId, purchaseId: string) {
  return `${pagePath(pageId)}?purchase=${encodeURIComponent(purchaseId)}`;
}
