import type { TFunction } from "i18next";
import { formatLocale } from "@my-better-t-app/backend/convex/lib/language";
import {
  DEFAULT_PAGE_ID,
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

export function pageHead(pageId: PageId, t: TFunction) {
  const page = t(`pages.${pageId}`);
  return {
    meta: [
      { title: t("meta.pageTitle", { page }) },
      {
        name: "description",
        content: pageId === DEFAULT_PAGE_ID
          ? t("meta.worldDescription")
          : t("meta.countryDescription", { page }),
      },
    ],
  };
}

export const euros = (amount: number, language: string | undefined) =>
  new Intl.NumberFormat(formatLocale(language), {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: Number.isInteger(amount / 100) ? 0 : 2,
  }).format(amount / 100);

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
