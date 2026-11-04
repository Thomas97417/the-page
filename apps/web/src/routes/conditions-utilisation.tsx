import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/conditions-utilisation")({
  beforeLoad: ({ location }) => {
    throw redirect({
      to: "/terms",
      search: true,
      hash: location.hash,
      replace: true,
      statusCode: 301,
    });
  },
});
