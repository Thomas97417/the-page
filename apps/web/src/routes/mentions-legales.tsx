import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/mentions-legales")({
  beforeLoad: ({ location }) => {
    throw redirect({
      to: "/privacy",
      search: true,
      hash: location.hash,
      replace: true,
      statusCode: 301,
    });
  },
});
