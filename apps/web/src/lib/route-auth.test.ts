import {
  createMemoryHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  isNotFound,
  redirect,
} from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { PAGES, pagePath } from "@my-better-t-app/backend/convex/lib/pages";
import { describe, expect, it, vi } from "vitest";
import { loadRouteAuth, type RouteAuthContext } from "./route-auth";
import { loadCountryPage } from "./page-route";
import { validatePageSearch } from "./page";

const LEGAL_PATHS = ["/privacy", "/terms"];
const PUBLIC_PATHS = [...PAGES.map((page) => pagePath(page.id)), ...LEGAL_PATHS];
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
    validateSearch: validatePageSearch,
    beforeLoad: ({ params, search, location }) =>
      loadCountryPage(params.page, search, location.hash),
    loader: ({ context }) => context.queryClient.ensureQueryData({
      queryKey: ["slots", context.pageId],
      queryFn: () => loadWords(context.pageId),
    }),
  });
  const legalRoutes = LEGAL_PATHS.map((path) =>
    createRoute({ getParentRoute: () => root, path }),
  );
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
    routeTree: root.addChildren([world, country, ...legalRoutes, ...privateRoutes, ...authRoutes]),
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
  it.each(PAGES)("renders /$slug with the stored $id and initializes server authentication", async (page) => {
    const { router, getToken, loadWords } = setup(pagePath(page.id));
    await router.load();
    expect(getToken).toHaveBeenCalledOnce();
    expect(router.state.matches[0]?.context).toMatchObject({
      token: "initial-token",
      isAuthenticated: true,
    });
    expect(router.state.redirect).toBeUndefined();
    expect(loadWords).toHaveBeenCalledWith(page.id);
    expect(router.state.matches.at(-1)?.loaderData).toEqual({ pageId: page.id });
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

  it.each(LEGAL_PATHS)("initializes server authentication on %s", async (path) => {
    const app = setup(path);
    await app.router.load();
    expect(app.getToken).toHaveBeenCalledOnce();
    expect(app.router.state.matches[0]?.context).toMatchObject({
      token: "initial-token",
      isAuthenticated: true,
    });
    expect(app.router.state.matches.at(-1)?.status).toBe("success");
    expect(app.loadWords).not.toHaveBeenCalled();
  });

  it.each(LEGAL_PATHS)("preloads %s and navigates without another session lookup", async (path) => {
    const app = setup();
    await app.router.load();
    app.switchToClient();
    app.getToken.mockRejectedValue(new Error("Auth service unavailable"));

    await app.router.preloadRoute({ to: path });
    await app.load(path);
    expect(app.router.state.matches.at(-1)?.status).toBe("success");
    expect(app.getToken).toHaveBeenCalledOnce();
    expect(app.loadWords).toHaveBeenCalledTimes(1);
  });

  it("preloads a public destination and reuses its words without another session lookup", async () => {
    const app = setup();
    await app.router.load();
    app.switchToClient();
    app.getToken.mockRejectedValue(new Error("Auth service unavailable"));

    await app.router.preloadRoute({ to: "/$page", params: { page: "japan" } });
    expect(app.loadWords).toHaveBeenCalledWith("japon");
    await app.load("/japan");
    expect(app.router.state.matches.at(-1)?.loaderData).toEqual({ pageId: "japon" });
    expect(app.loadWords.mock.calls.filter(([page]) => page === "japon")).toHaveLength(1);
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

describe("country URL redirects", () => {
  it("preserves repurchase email links when upgrading an old country URL", async () => {
    const app = setup("/royaume-uni?reclaim=notification-123#word-12");
    await app.router.load();
    expect(app.router.state.redirect?.options).toMatchObject({
      to: "/$page",
      params: { page: "united-kingdom" },
      search: { reclaim: "notification-123" },
      hash: "word-12",
      statusCode: 301,
    });
  });
  it.each(PAGES.filter((page) => page.id !== page.slug))(
    "permanently redirects /$id to /$slug while preserving purchase tracking and the word anchor",
    async (page) => {
      const app = setup(`/${page.id}?purchase=order-123#word-12`);
      await app.router.load();
      expect(app.router.state.redirect?.options).toMatchObject({
        to: "/$page",
        params: { page: page.slug },
        search: { purchase: "order-123" },
        hash: "word-12",
        replace: true,
        statusCode: 301,
      });
      expect(app.loadWords).not.toHaveBeenCalled();
    },
  );

  it("redirects /world to the default page with its purchase and anchor", async () => {
    const app = setup("/world?purchase=order-123#word-12");
    await app.router.load();
    expect(app.router.state.redirect?.options).toMatchObject({
      to: "/",
      search: { purchase: "order-123" },
      hash: "word-12",
      statusCode: 301,
    });
  });

  it("rejects an unknown country", () => {
    expect.assertions(1);
    try {
      loadCountryPage("unknown-country", {}, "");
    } catch (error) {
      expect(isNotFound(error)).toBe(true);
    }
  });
});
