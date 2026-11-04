import { createFileRoute } from "@tanstack/react-router";
import { sitemapXml } from "@/lib/seo";
import { getSiteUrl } from "@/lib/seo-request";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: () => new Response(sitemapXml(getSiteUrl()), {
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "Cache-Control": "public, max-age=3600",
        },
      }),
    },
  },
});
