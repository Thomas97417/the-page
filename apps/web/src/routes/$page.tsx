import { createFileRoute } from "@tanstack/react-router";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import { DEFAULT_PAGE_ID, pageIdFromSlug } from "@my-better-t-app/backend/convex/lib/pages";
import { WordPage } from "@/components/word-page";
import { pageHead, validatePageSearch } from "@/lib/page";
import { loadCountryPage } from "@/lib/page-route";

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
  head: ({ params, match }) => pageHead(pageIdFromSlug(params.page) ?? DEFAULT_PAGE_ID, match.context.i18n.t),
  component: CountryPage,
});

function CountryPage() {
  const { pageId } = Route.useRouteContext();
  const { purchase, reclaim } = Route.useSearch();
  return <WordPage key={pageId} pageId={pageId} purchase={purchase} reclaim={reclaim} />;
}
