import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { fetchToken, requestHeaders, proxyRequest } = vi.hoisted(() => ({
  fetchToken: vi.fn<() => Promise<string | undefined>>(),
  requestHeaders: vi.fn<() => Headers>(),
  proxyRequest: vi.fn<(request: Request) => Promise<Response>>(),
}));

vi.mock("@convex-dev/better-auth/react-start", () => ({
  convexBetterAuthReactStart: () => ({ getToken: fetchToken, handler: proxyRequest }),
}));
vi.mock("@tanstack/react-start/server", () => ({
  getRequestHeaders: requestHeaders,
}));
vi.mock("@my-better-t-app/env/web", () => ({
  env: {
    VITE_CONVEX_URL: "https://example.convex.cloud",
    VITE_CONVEX_SITE_URL: "https://example.convex.site",
  },
}));

import { getToken, handler } from "./auth-server";
import { AUTH_PROXY_IP, verifyAuthProxy } from "@my-better-t-app/backend/convex/lib/authProxy";

beforeEach(() => {
  vi.resetAllMocks();
  requestHeaders.mockReturnValue(new Headers());
});
afterEach(() => vi.unstubAllEnvs());

describe("Cloudflare authentication proxy", () => {
  it("signs the edge-provided IP instead of a forged visitor header", async () => {
    const secret = "test-only-auth-proxy-secret-0123456789abcdef";
    vi.stubEnv("AUTH_PROXY_SECRET", secret);
    proxyRequest.mockResolvedValue(new Response(null, { status: 200 }));
    const response = await handler(new Request("https://the-page.example/api/auth/sign-in/email", { headers: { "cf-connecting-ip": "203.0.113.10", [AUTH_PROXY_IP]: "forged" } }));
    expect(response.status).toBe(200);
    const forwarded = proxyRequest.mock.calls[0]![0];
    expect(forwarded.headers.get(AUTH_PROXY_IP)).toBe("203.0.113.10");
    expect(await verifyAuthProxy(forwarded, secret)).toBe(true);
  });

  it("fails closed when the Cloudflare signing secret is missing", async () => {
    vi.stubEnv("AUTH_PROXY_SECRET", "");
    expect((await handler(new Request("https://the-page.example/api/auth/sign-in/email", { headers: { "cf-connecting-ip": "203.0.113.10" } }))).status).toBe(503);
    expect(proxyRequest).not.toHaveBeenCalled();
  });
});

describe("server session lookup", () => {
  it.each([undefined, "theme=light; analytics=example"])(
    "avoids a remote auth request when there is no credential (%s)",
    async (cookie) => {
      requestHeaders.mockReturnValue(new Headers(cookie ? { cookie } : {}));
      expect(await getToken()).toBeUndefined();
      expect(fetchToken).not.toHaveBeenCalled();
    },
  );

  it.each(["better-auth.session_token", "__Secure-better-auth.session_token"])(
    "validates %s remotely before returning a token",
    async (cookieName) => {
      requestHeaders.mockReturnValue(new Headers({ cookie: `${cookieName}=session` }));
      fetchToken.mockResolvedValue("validated-token");
      expect(await getToken()).toBe("validated-token");
      expect(fetchToken).toHaveBeenCalledOnce();
    },
  );

  it("preserves authentication via an explicit Authorization header", async () => {
    requestHeaders.mockReturnValue(new Headers({ authorization: "Bearer credential" }));
    fetchToken.mockResolvedValue("validated-token");
    expect(await getToken()).toBe("validated-token");
    expect(fetchToken).toHaveBeenCalledOnce();
  });

  it("does not authenticate a forged or expired session cookie", async () => {
    requestHeaders.mockReturnValue(new Headers({ cookie: "better-auth.session_token=invalid" }));
    fetchToken.mockResolvedValue(undefined);
    expect(await getToken()).toBeUndefined();
    expect(fetchToken).toHaveBeenCalledOnce();
  });

  it("propagates validation failures instead of treating them as authentication", async () => {
    requestHeaders.mockReturnValue(new Headers({ cookie: "better-auth.session_token=invalid" }));
    fetchToken.mockRejectedValue(new Error("Session validation unavailable"));
    await expect(getToken()).rejects.toThrow("Session validation unavailable");
  });

  it("does not share the previous request's token with an anonymous visitor", async () => {
    requestHeaders.mockReturnValueOnce(new Headers({ cookie: "better-auth.session_token=first-user" }));
    fetchToken.mockResolvedValue("first-user-token");
    expect(await getToken()).toBe("first-user-token");
    expect(await getToken()).toBeUndefined();
    expect(fetchToken).toHaveBeenCalledOnce();
  });
});
