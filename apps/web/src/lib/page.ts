import type { TFunction } from "i18next";
import { SLOT_COUNT } from "@my-better-t-app/backend/convex/lib/content";
import { absoluteUrl, publicPageHead, serializeJsonLd } from "./seo";
import { formatLocale } from "@my-better-t-app/backend/convex/lib/language";
import {
  DEFAULT_PAGE_ID,
  pageIdFromPath,
  pagePath,
  purchaseReturnPath,
  reclaimPath,
  type PageId,
} from "@my-better-t-app/backend/convex/lib/pages";

export function validatePageSearch(search: Record<string, unknown>): { purchase?: string; reclaim?: string } {
  return {
    purchase:
      typeof search.purchase === "string" && search.purchase.length < 128
        ? search.purchase
        : undefined,
    reclaim:
      typeof search.reclaim === "string" && search.reclaim.length > 0 && search.reclaim.length < 128
        ? search.reclaim
        : undefined,
  };
}

export function pageHead(pageId: PageId, t: TFunction, siteUrl: string) {
  const page = t(`pages.${pageId}`);
  const title = pageId === DEFAULT_PAGE_ID
    ? t("meta.worldTitle", { count: SLOT_COUNT })
    : t("meta.pageTitle", { page });
  const description = pageId === DEFAULT_PAGE_ID
    ? t("meta.worldDescription", { count: SLOT_COUNT })
    : t("meta.countryDescription", { page, count: SLOT_COUNT });
  const url = absoluteUrl(pagePath(pageId), siteUrl);
  const home = absoluteUrl("/", siteUrl);
  const locale = t("meta.locale");
  const websiteId = `${home}#website`;
  const breadcrumbs = pageId === DEFAULT_PAGE_ID ? [] : [{
    "@type": "BreadcrumbList",
    "@id": `${url}#breadcrumb`,
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "the page · World", item: home },
      { "@type": "ListItem", position: 2, name: page, item: url },
    ],
  }];

  return {
    ...publicPageHead({ title, description, path: pagePath(pageId), siteUrl, locale }),
    scripts: [{
      type: "application/ld+json",
      children: serializeJsonLd({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "WebSite",
            "@id": websiteId,
            name: "the page",
            url: home,
            inLanguage: ["fr-FR", "en-GB"],
          },
          {
            "@type": "WebPage",
            "@id": `${url}#webpage`,
            url,
            name: title,
            description,
            inLanguage: locale.replace("_", "-"),
            isPartOf: { "@id": websiteId },
            ...(breadcrumbs.length ? { breadcrumb: { "@id": `${url}#breadcrumb` } } : {}),
            about: {
              "@type": "Service",
              name: t("marketing.serviceName", { page }),
              serviceType: t("marketing.serviceType"),
              description,
              url,
            },
          },
          ...breadcrumbs,
        ],
      }),
    }],
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
    const { purchase, reclaim } = validatePageSearch({
      purchase: url.searchParams.get("purchase"),
      reclaim: url.searchParams.get("reclaim"),
    });
    return purchase ? purchaseReturnPath(pageId, purchase) : reclaim ? reclaimPath(pageId, reclaim) : pagePath(pageId);
  } catch {
    return "/";
  }
}

export function rememberReturnPath(pageId: PageId, purchaseId?: string, notificationId?: string) {
  try {
    sessionStorage.setItem(
      "the-page:return",
      purchaseId ? purchaseReturnPath(pageId, purchaseId) : notificationId ? reclaimPath(pageId, notificationId) : pagePath(pageId),
    );
  } catch {
    /* Storage can be disabled. */
  }
}
