import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import { DEFAULT_PAGE_ID, isPageId } from "@my-better-t-app/backend/convex/lib/pages";
import { WordPage } from "@/components/word-page";
import { pageHead, validatePageSearch } from "@/lib/page";

export const Route = createFileRoute("/$page")({
  validateSearch: validatePageSearch,
  beforeLoad: ({ params, search }) => {
    if (!isPageId(params.page)) throw notFound();
    if (params.page === DEFAULT_PAGE_ID)
      throw redirect({ to: "/", search, replace: true });
    return { pageId: params.page };
  },
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(
      convexQuery(api.slots.list, { pageId: context.pageId }),
    ),
  head: ({ params }) => pageHead(isPageId(params.page) ? params.page : DEFAULT_PAGE_ID),
  component: CountryPage,
});

function CountryPage() {
  const { pageId } = Route.useRouteContext();
  const { purchase } = Route.useSearch();
  return <WordPage key={pageId} pageId={pageId} purchase={purchase} />;
}
