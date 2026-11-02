import { createFileRoute } from "@tanstack/react-router";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import { DEFAULT_PAGE_ID } from "@my-better-t-app/backend/convex/lib/pages";
import { WordPage } from "@/components/word-page";
import { pageHead, validatePageSearch } from "@/lib/page";

export const Route = createFileRoute("/")({
  pendingMs: 150,
  pendingMinMs: 150,
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(
      convexQuery(api.slots.list, { pageId: DEFAULT_PAGE_ID }),
    ),
  validateSearch: validatePageSearch,
  head: () => pageHead(DEFAULT_PAGE_ID),
  component: WorldPage,
});

function WorldPage() {
  const { purchase } = Route.useSearch();
  return <WordPage pageId={DEFAULT_PAGE_ID} purchase={purchase} />;
}
