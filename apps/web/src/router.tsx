import { ConvexQueryClient } from "@convex-dev/react-query";
import { env } from "@my-better-t-app/env/web";
import { QueryClient } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { I18nextProvider } from "react-i18next";
import { createI18n } from "./lib/i18n";
import { getInitialLanguage } from "./lib/i18n-request";
import { getSiteUrl } from "./lib/seo-request";

import Loader from "./components/loader";
import NotFound from "./components/not-found";
import "./index.css";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  const i18n = createI18n(getInitialLanguage());
  const convexUrl = env.VITE_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("VITE_CONVEX_URL is not set");
  }

  const convexQueryClient = new ConvexQueryClient(convexUrl);

  const queryClient: QueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        queryKeyHashFn: convexQueryClient.hashFn(),
        queryFn: convexQueryClient.queryFn(),
      },
    },
  });
  convexQueryClient.connect(queryClient);

  const router = createTanStackRouter({
    routeTree,
    defaultPreload: "intent",
    defaultPendingComponent: () => <Loader />,
    defaultNotFoundComponent: NotFound,
    context: { queryClient, convexQueryClient, i18n, siteUrl: getSiteUrl() },
    Wrap: ({ children }) => (
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    ),
  });

  setupRouterSsrQueryIntegration({
    router,
    queryClient,
  });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
