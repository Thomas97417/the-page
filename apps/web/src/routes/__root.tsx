import type { ConvexQueryClient } from "@convex-dev/react-query";
import type { QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouteContext,
} from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

import { Toaster } from "@/components/ui/sonner";
import { authClient } from "@/lib/auth-client";
import { getToken } from "@/lib/auth-server";
import { loadRouteAuth, type RouteAuthContext } from "@/lib/route-auth";

import Header from "../components/header";
import TargetCursor from "@/components/target-cursor";
import ErrorBoundary from "../components/error-boundary";
import NotFound from "../components/not-found";
import appCss from "../index.css?url";
import { ThemeProvider } from "@/components/theme-provider";
import { PageProvider } from "@/components/page-provider";

const getAuth = createServerFn({ method: "GET" }).handler(async () => {
  return await getToken();
});

export interface RouterAppContext extends RouteAuthContext {
  queryClient: QueryClient;
  convexQueryClient: ConvexQueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "the page",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),

  component: RootComponent,
  shellComponent: RootDocument,
  beforeLoad: async ({ context, location }) => {
    const auth = await loadRouteAuth({
      pathname: location.pathname,
      isServer: typeof window === "undefined",
      getToken: getAuth,
    });
    if (auth?.token) {
      context.convexQueryClient.serverHttpClient?.setAuth(auth.token);
    }
    return auth;
  },
  errorComponent: ErrorBoundary,
  notFoundComponent: NotFound,
});

function RootComponent() {
  const context = useRouteContext({ from: Route.id });
  return (
    <ConvexBetterAuthProvider
      client={context.convexQueryClient.convexClient}
      authClient={authClient}
      initialToken={context.token}
    >
      <PageProvider>
        <TargetCursor
          targetSelector={'a[href]:not([aria-disabled="true"]), button:not(:disabled):not([aria-disabled="true"]), [role="menuitem"]:not([aria-disabled="true"]):not([data-disabled])'}
          spinDuration={0}
          hoverDuration={0.35}
          size={30}
          cornerSize={10}
          thickness={1.5}
          padding={8}
        />
        <Header />
        <Outlet />
      </PageProvider>
    </ConvexBetterAuthProvider>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
          storageKey="vite-ui-theme"
        >
          <div id="top" className="paper-background flex min-h-dvh flex-col">
            {children}
          </div>
          <Toaster richColors />
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
