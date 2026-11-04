import { createFileRoute } from "@tanstack/react-router";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import { pageIdFromSlug } from "@my-better-t-app/backend/convex/lib/pages";
import { WordPage } from "@/components/word-page";
import { pageHead, validatePageSearch } from "@/lib/page";
import { loadCountryPage } from "@/lib/page-route";
import { NOINDEX } from "@/lib/seo";

export const Route = createFileRoute("/$page")({
  validateSearch: validatePageSearch,
  pendingMs: 150,
  pendingMinMs: 150,
  beforeLoad: ({ params, search, location }) =>
    loadCountryPage(params.page, search, location.hash),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(
      convexQuery(api.slots.list, { pageId: context.pageId }),
    ),
  head: ({ params, match }) => {
    const pageId = pageIdFromSlug(params.page);
    return pageId
      ? pageHead(pageId, match.context.i18n.t, match.context.siteUrl)
      : { meta: [
        { title: `${match.context.i18n.t("fallback.notFound")} — the page` },
        { name: "robots", content: NOINDEX },
      ] };
  },
  component: CountryPage,
});

function CountryPage() {
  const { pageId } = Route.useRouteContext();
  const { purchase, reclaim } = Route.useSearch();
  return <WordPage key={pageId} pageId={pageId} purchase={purchase} reclaim={reclaim} />;
}
