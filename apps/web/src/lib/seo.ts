import {
  PAGES,
  pagePath,
} from "@my-better-t-app/backend/convex/lib/pages";

export const NOINDEX = "noindex, follow";
export const INDEXABLE = "index, follow, max-image-preview:large";

type SeoOptions = {
  title: string;
  description: string;
  path: string;
  siteUrl: string;
  locale: string;
};

export function absoluteUrl(path: string, siteUrl: string) {
  return new URL(path, new URL(siteUrl).origin).href;
}

export function publicPageHead({ title, description, path, siteUrl, locale }: SeoOptions) {
  const url = absoluteUrl(path, siteUrl);
  const image = absoluteUrl(`/social-preview-${locale === "en_GB" ? "en" : "fr"}.png`, siteUrl);

  return {
    meta: [
      { title },
      { name: "description", content: description },
      { name: "robots", content: INDEXABLE },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "the page" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:locale", content: locale },
      { property: "og:image", content: image },
      { property: "og:image:type", content: "image/png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: locale === "en_GB"
        ? "the page — 50 places. One word. An exclusive advertising space."
        : "the page — 50 places. Un mot. Un espace publicitaire à part." },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: image },
      { name: "twitter:image:alt", content: title },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

// Escape markup even if future structured data includes user-authored content.
export function serializeJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export const LEGAL_PATHS = ["/mentions-legales", "/conditions-utilisation"] as const;

function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, (character) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    '"': "&quot;",
    "'": "&apos;",
  })[character]!);
}

export function sitemapXml(siteUrl: string) {
  const paths = [...PAGES.map((page) => pagePath(page.id)), ...LEGAL_PATHS];
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...paths.map((path) => `  <url><loc>${escapeXml(absoluteUrl(path, siteUrl))}</loc></url>`),
    "</urlset>",
  ].join("\n");
}

export function robotsTxt(siteUrl: string) {
  // Account routes remain crawlable so their noindex directive can be read.
  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /api/",
    "Disallow: /_server/",
    "",
    `Sitemap: ${absoluteUrl("/sitemap.xml", siteUrl)}`,
    "",
  ].join("\n");
}
