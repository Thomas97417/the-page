// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { PAGES, pagePath } from "@my-better-t-app/backend/convex/lib/pages";
import { createI18n } from "./i18n";
import { pageHead } from "./page";
import { INDEXABLE, LEGAL_PATHS, robotsTxt, serializeJsonLd, sitemapXml } from "./seo";

const origin = "https://example.com";

describe("public SEO", () => {
  it.each(["fr", "en"] as const)("renders localized, distinct metadata for every page in %s", (language) => {
    const { t } = createI18n(language);
    const titles = new Set<string>();
    const canonicals = new Set<string>();

    for (const page of PAGES) {
      const head = pageHead(page.id, t, origin);
      const title = head.meta.find((meta) => meta.title)?.title!;
      const canonical = head.links.find((link) => link.rel === "canonical")!.href;
      expect(title).not.toMatch(/\{\{|meta\./);
      expect(head.meta.find((meta) => meta.name === "description")?.content).not.toMatch(/\{\{/);
      expect(head.meta.find((meta) => meta.name === "robots")?.content).toBe(INDEXABLE);
      expect(head.meta.find((meta) => meta.property === "og:url")?.content).toBe(canonical);
      expect(canonical).toBe(`${origin}${pagePath(page.id)}`);
      titles.add(title);
      canonicals.add(canonical);
    }

    expect(titles.size).toBe(PAGES.length);
    expect(canonicals.size).toBe(PAGES.length);
  });

  it("uses the canonical country slug, regardless of the origin's trailing slash", () => {
    const { t } = createI18n("fr");
    expect(pageHead("royaume-uni", t, `${origin}/`).links).toEqual([
      { rel: "canonical", href: `${origin}/united-kingdom` },
    ]);
    expect(pageHead("world", t, origin).links).toEqual([
      { rel: "canonical", href: `${origin}/` },
    ]);
  });

  it("describes the advertising service with matching URLs and country breadcrumbs", () => {
    const head = pageHead("france", createI18n("fr").t, origin);
    const data = JSON.parse(head.scripts[0]!.children);
    const webPage = data["@graph"].find((node: { "@type": string }) => node["@type"] === "WebPage");
    const breadcrumb = data["@graph"].find((node: { "@type": string }) => node["@type"] === "BreadcrumbList");
    expect(webPage.url).toBe(`${origin}/france`);
    expect(webPage.inLanguage).toBe("fr-FR");
    expect(webPage.about["@type"]).toBe("Service");
    expect(webPage.about.name).toContain("France");
    expect(breadcrumb.itemListElement.map((item: { item: string }) => item.item))
      .toEqual([`${origin}/`, `${origin}/france`]);
    expect(head.scripts[0]!.children).not.toContain('"offers"');
  });

  it("produces valid XML containing only canonical public routes", () => {
    const document = new DOMParser().parseFromString(sitemapXml(origin), "application/xml");
    expect(document.querySelector("parsererror")).toBeNull();
    const urls = [...document.querySelectorAll("loc")].map((node) => node.textContent);
    expect(urls).toEqual([
      ...PAGES.map((page) => `${origin}${pagePath(page.id)}`),
      ...LEGAL_PATHS.map((path) => `${origin}${path}`),
    ]);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls).not.toContain(`${origin}/world`);
    expect(urls).not.toContain(`${origin}/royaume-uni`);
    expect(urls.some((url) => /[?#]|sign-in|settings|admin|api\//.test(url!))).toBe(false);
    expect(document.querySelector("lastmod")).toBeNull();
  });

  it("advertises the same sitemap origin while leaving noindex pages crawlable", () => {
    const robots = robotsTxt(`${origin}/`);
    expect(robots).toContain(`Sitemap: ${origin}/sitemap.xml`);
    expect(robots).toContain("Disallow: /api/");
    expect(robots).not.toMatch(/Disallow: \/(sign-in|settings|admin)/);
  });

  it("prevents structured data from terminating the script element", () => {
    const unsafe = { name: '</script><img src=x onerror="alert(1)">' };
    const json = serializeJsonLd(unsafe);
    expect(json).not.toContain("<");
    expect(JSON.parse(json)).toEqual(unsafe);
  });
});
