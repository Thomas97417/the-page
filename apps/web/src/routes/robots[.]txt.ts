import { createFileRoute } from "@tanstack/react-router";
import { robotsTxt } from "@/lib/seo";
import { getSiteUrl } from "@/lib/seo-request";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () => new Response(robotsTxt(getSiteUrl()), {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "public, max-age=3600",
        },
      }),
    },
  },
});
