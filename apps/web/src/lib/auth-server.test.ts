import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchToken, requestHeaders } = vi.hoisted(() => ({
  fetchToken: vi.fn<() => Promise<string | undefined>>(),
  requestHeaders: vi.fn<() => Headers>(),
}));

vi.mock("@convex-dev/better-auth/react-start", () => ({
  convexBetterAuthReactStart: () => ({ getToken: fetchToken }),
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

import { getToken } from "./auth-server";

beforeEach(() => {
  vi.resetAllMocks();
  requestHeaders.mockReturnValue(new Headers());
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
