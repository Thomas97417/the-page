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
import { AUTH_PROXY_IP, AUTH_PROXY_TIME, AUTH_PROXY_SIGNATURE, verifyAuthProxy } from "@my-better-t-app/backend/convex/lib/authProxy";

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("AUTH_PROXY_SECRET", "");
  requestHeaders.mockReturnValue(new Headers());
});
afterEach(() => vi.unstubAllEnvs());

describe("Cloudflare authentication proxy", () => {
  it.each(["GET", "POST"])(
    "forwards a server-adapter %s request without relying on Node's private Request state",
    async (method) => {
      const body = method === "POST" ? JSON.stringify({ email: "test@example.com" }) : undefined;
      const native = new Request("http://localhost:3003/api/auth/get-session?test=1", {
        method,
        headers: { cookie: "better-auth.session_token=test", "content-type": "application/json" },
        body,
      });
      // Like srvx's NodeRequest, the adapter exposes the Fetch API without
      // exposing undici's private state to another Request constructor.
      const request = new Proxy(native, {
        get(target, property) {
          if (typeof property === "symbol") return undefined;
          const value = Reflect.get(target, property, target);
          return typeof value === "function" ? value.bind(target) : value;
        },
      });
      proxyRequest.mockResolvedValue(new Response(null, { status: 200 }));
      expect((await handler(request)).status).toBe(200);
      const forwarded = proxyRequest.mock.calls[0]![0];
      expect(forwarded.url).toBe(native.url);
      expect(forwarded.method).toBe(method);
      expect(forwarded.headers.get("cookie")).toBe("better-auth.session_token=test");
      expect(await forwarded.text()).toBe(body ?? "");
    },
  );

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

  it.each(["", "too-short"])("fails closed when the Cloudflare signing secret is missing or invalid (%s)", async (secret) => {
    vi.stubEnv("AUTH_PROXY_SECRET", secret);
    expect((await handler(new Request("https://the-page.example/api/auth/sign-in/email", { headers: { "cf-connecting-ip": "203.0.113.10" } }))).status).toBe(503);
    expect(proxyRequest).not.toHaveBeenCalled();
  });

  it("does not allow a localhost URL to bypass production signing", async () => {
    expect((await handler(new Request("http://localhost:3003/api/auth/get-session", { headers: { "cf-connecting-ip": "127.0.0.1" } }))).status).toBe(503);
    expect(proxyRequest).not.toHaveBeenCalled();
  });
});

describe("Cloudflare local authentication configuration", () => {
  it.each([
    ["GET", "/get-session"],
    ["GET", "/convex/token"],
    ["POST", "/sign-in/email"],
  ])("forwards %s %s with the shared signing secret configured", async (method, path) => {
    const secret = "test-only-auth-proxy-secret-0123456789abcdef";
    vi.stubEnv("AUTH_PROXY_SECRET", secret);
    const body = method === "POST" ? JSON.stringify({ email: "test@example.com" }) : undefined;
    const request = new Request(`http://localhost:3003/api/auth${path}?test=1`, {
      method,
      headers: {
        "cf-connecting-ip": "127.0.0.1",
        [AUTH_PROXY_IP]: "forged",
        [AUTH_PROXY_TIME]: "0",
        [AUTH_PROXY_SIGNATURE]: "forged",
        cookie: "better-auth.session_token=test",
        authorization: "Bearer test-token",
        "content-type": "application/json",
      },
      body,
    });
    proxyRequest.mockResolvedValue(new Response(null, { status: 200 }));

    expect((await handler(request)).status).toBe(200);
    const forwarded = proxyRequest.mock.calls[0]![0];
    expect(forwarded.headers.get(AUTH_PROXY_IP)).toBe("127.0.0.1");
    expect(forwarded.headers.get(AUTH_PROXY_TIME)).not.toBe("0");
    expect(forwarded.headers.get(AUTH_PROXY_SIGNATURE)).not.toBe("forged");
    expect(await verifyAuthProxy(forwarded, secret)).toBe(true);
    expect(forwarded.url).toBe(request.url);
    expect(forwarded.method).toBe(method);
    expect(forwarded.headers.get("cookie")).toBe("better-auth.session_token=test");
    expect(forwarded.headers.get("authorization")).toBe("Bearer test-token");
    expect(await forwarded.text()).toBe(body ?? "");
    expect(request.headers.get("cf-connecting-ip")).toBe("127.0.0.1");
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
