import { notFound, redirect } from "@tanstack/react-router";
import {
  DEFAULT_PAGE_ID,
  getPage,
  pageIdFromSlug,
} from "@my-better-t-app/backend/convex/lib/pages";

export function loadCountryPage(
  slug: string,
  search: { purchase?: string; reclaim?: string },
  hash: string,
) {
  const pageId = pageIdFromSlug(slug);
  if (!pageId) throw notFound();
  if (pageId === DEFAULT_PAGE_ID)
    throw redirect({ to: "/", search, hash, replace: true, statusCode: 301 });
  const page = getPage(pageId);
  if (slug !== page.slug)
    throw redirect({
      to: "/$page",
      params: { page: page.slug },
      search,
      hash,
      replace: true,
      statusCode: 301,
    });
  return { pageId };
}
