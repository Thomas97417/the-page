import {
  createMemoryHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  notFound,
  redirect,
} from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { isPageId } from "@my-better-t-app/backend/convex/lib/pages";
import { describe, expect, it, vi } from "vitest";
import { loadRouteAuth, type RouteAuthContext } from "./route-auth";

const PUBLIC_PATHS = ["/", "/france", "/royaume-uni", "/etats-unis"];
const PRIVATE_PATHS = ["/settings", "/admin"];
const AUTH_PATHS = [
  "/sign-in",
  "/sign-up",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
];

function setup(initialPath = "/") {
  let isServer = true;
  const queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity, retry: false } } });
  const getToken = vi.fn<() => Promise<string | undefined>>().mockResolvedValue("initial-token");
  const loadWords = vi.fn((pageId: string) => ({ pageId }));
  const root = createRootRouteWithContext<RouteAuthContext & { queryClient: QueryClient }>()({
    beforeLoad: ({ location }) =>
      loadRouteAuth({ pathname: location.pathname, isServer, getToken }),
  });
  const world = createRoute({
    getParentRoute: () => root,
    path: "/",
    loader: ({ context }) => context.queryClient.ensureQueryData({
      queryKey: ["slots", "world"],
      queryFn: () => loadWords("world"),
    }),
  });
  const country = createRoute({
    getParentRoute: () => root,
    path: "$page",
    beforeLoad: ({ params }) => {
      if (!isPageId(params.page)) throw notFound();
    },
    loader: ({ context, params }) => context.queryClient.ensureQueryData({
      queryKey: ["slots", params.page],
      queryFn: () => loadWords(params.page),
    }),
  });
  const privateRoutes = PRIVATE_PATHS.map((path) =>
    createRoute({
      getParentRoute: () => root,
      path,
      beforeLoad: ({ context }) => {
        if (!context.isAuthenticated) throw redirect({ to: "/sign-in" });
      },
    }),
  );
  const authRoutes = AUTH_PATHS.map((path) =>
    createRoute({
      getParentRoute: () => root,
      path,
      beforeLoad: ({ context }) => {
        if (context.isAuthenticated) throw redirect({ to: "/" });
      },
    }),
  );
  const history = createMemoryHistory({ initialEntries: [initialPath] });
  const router = createRouter({
    routeTree: root.addChildren([world, country, ...privateRoutes, ...authRoutes]),
    history,
    isServer: true,
    context: { queryClient },
  });

  return {
    router,
    getToken,
    loadWords,
    switchToClient: () => { isServer = false; },
    load: async (path: string) => {
      history.push(path);
      await router.load();
    },
  };
}

describe("authentication during page navigation", () => {
  it.each(PUBLIC_PATHS)("initializes authentication when rendering %s on the server", async (path) => {
    const { router, getToken } = setup(path);
    await router.load();
    expect(getToken).toHaveBeenCalledOnce();
    expect(router.state.matches[0]?.context).toMatchObject({
      token: "initial-token",
      isAuthenticated: true,
    });
  });

  it("switches between every public page without waiting for another session lookup", async () => {
    const app = setup();
    await app.router.load();
    app.switchToClient();
    app.getToken.mockRejectedValue(new Error("Auth service unavailable"));

    for (const path of [...PUBLIC_PATHS.slice(1), "/"]) {
      await app.load(path);
      expect(app.router.state.matches.at(-1)?.status).toBe("success");
      expect(app.router.state.matches[0]?.context).toMatchObject({
        token: "initial-token",
        isAuthenticated: true,
      });
    }
    expect(app.getToken).toHaveBeenCalledOnce();
  });

  it("preloads a public destination and reuses its words without another session lookup", async () => {
    const app = setup();
    await app.router.load();
    app.switchToClient();
    app.getToken.mockRejectedValue(new Error("Auth service unavailable"));

    await app.router.preloadRoute({ to: "/$page", params: { page: "france" } });
    expect(app.loadWords).toHaveBeenCalledWith("france");
    await app.load("/france");
    expect(app.router.state.matches.at(-1)?.loaderData).toEqual({ pageId: "france" });
    expect(app.loadWords.mock.calls.filter(([page]) => page === "france")).toHaveLength(1);
    expect(app.getToken).toHaveBeenCalledOnce();
  });

  it.each(PRIVATE_PATHS)("revalidates the session before entering %s after it expires", async (path) => {
    const app = setup();
    await app.router.load();
    app.switchToClient();
    app.getToken.mockResolvedValue(undefined);

    await app.load(path);
    expect(app.getToken).toHaveBeenCalledTimes(2);
    expect(app.router.state.redirect?.options.to).toBe("/sign-in");
  });

  it.each(AUTH_PATHS)("refreshes the session before applying the guard for %s", async (path) => {
    const app = setup();
    app.getToken.mockResolvedValue(undefined);
    await app.router.load();
    app.switchToClient();
    app.getToken.mockResolvedValue("new-token");

    await app.load(path);
    expect(app.getToken).toHaveBeenCalledTimes(2);
    expect(app.router.state.redirect?.options.to).toBe("/");
  });

  it("keeps authentication isolated between server requests", async () => {
    const first = setup();
    const second = setup();
    second.getToken.mockResolvedValue(undefined);
    await Promise.all([first.router.load(), second.router.load()]);
    expect(first.router.state.matches[0]?.context.isAuthenticated).toBe(true);
    expect(second.router.state.matches[0]?.context.isAuthenticated).toBe(false);
  });
});
