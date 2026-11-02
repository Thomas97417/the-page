import { ConvexError } from "convex/values";
import {
  DEFAULT_PAGE_ID,
  getPage,
  pageIdFromPath,
  pagePath,
  purchaseReturnPath,
  type PageId,
} from "@my-better-t-app/backend/convex/lib/pages";

export function validatePageSearch(search: Record<string, unknown>): { purchase?: string } {
  return {
    purchase:
      typeof search.purchase === "string" && search.purchase.length < 128
        ? search.purchase
        : undefined,
  };
}

export function pageHead(pageId: PageId) {
  const page = getPage(pageId);
  return {
    meta: [
      { title: `${page.label} — the page · Une page à tous. Un mot de vous.` },
      {
        name: "description",
        content: pageId === DEFAULT_PAGE_ID
          ? "La page mondiale écrite à plusieurs. 50 places, un mot par place. Ajoutez le vôtre à l’histoire."
          : `Une page pour ${page.label}. 50 places, un mot par place. Ajoutez le vôtre à cette histoire collective.`,
      },
    ],
  };
}

export const euros = (amount: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: Number.isInteger(amount / 100) ? 0 : 2,
  }).format(amount / 100);

export function errorMessage(error: unknown) {
  if (error instanceof ConvexError && typeof error.data === "string")
    return error.data;
  return "Une erreur est survenue. Réessayez.";
}

export function returnPath() {
  try {
    const value = sessionStorage.getItem("the-page:return");
    if (!value?.startsWith("/") || value.startsWith("//")) return "/";
    const url = new URL(value, "https://the-page.invalid");
    const pageId = pageIdFromPath(url.pathname);
    if (!pageId) return "/";
    const { purchase } = validatePageSearch({ purchase: url.searchParams.get("purchase") });
    return purchase ? purchaseReturnPath(pageId, purchase) : pagePath(pageId);
  } catch {
    return "/";
  }
}

export function rememberReturnPath(pageId: PageId, purchaseId?: string) {
  try {
    sessionStorage.setItem(
      "the-page:return",
      purchaseId ? purchaseReturnPath(pageId, purchaseId) : pagePath(pageId),
    );
  } catch {
    /* Storage can be disabled. */
  }
}
