/// <reference types="vite/client" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import betterAuth from "@convex-dev/better-auth/test";
import schema from "../convex/schema";
import { components } from "../convex/_generated/api";
import { authProxyHeaders, AUTH_PROXY_IP, AUTH_PROXY_SIGNATURE } from "../convex/lib/authProxy";

const emails = vi.hoisted(() => ({ reset: vi.fn(), verification: vi.fn() }));
vi.mock("../convex/sendEmails", async () => {
  const { internalAction } = await import("../convex/_generated/server");
  const { v } = await import("convex/values");
  const args = { from: v.string(), to: v.string(), url: v.string(), language: v.optional(v.union(v.literal("fr"), v.literal("en"))) };
  return {
    sendResetPasswordEmail: internalAction({ args, handler: async (_ctx, data) => { emails.reset(data); } }),
    sendVerificationEmail: internalAction({ args: { ...args, token: v.string() }, handler: async (_ctx, data) => { emails.verification(data); } }),
  };
});

vi.mock("../convex/env", () => ({
  SITE_URL: "https://the-page.example",
  BETTER_AUTH_URL: "https://the-page.example",
  EMAIL_FROM: "hello@the-page.example",
  RESEND_API_KEY: "test-key",
  GITHUB_CLIENT_ID: "test-github-id",
  GITHUB_CLIENT_SECRET: "test-github-secret",
  GOOGLE_CLIENT_ID: "test-google-id",
  GOOGLE_CLIENT_SECRET: "test-google-secret",
}));

const modules = import.meta.glob("../convex/**/*.{ts,tsx}");
function setup() {
  const t = convexTest(schema, modules);
  t.registerComponent("betterAuth", betterAuth.schema, betterAuth.modules);
  return t;
}
type Test = ReturnType<typeof setup>;

function request(t: Test, path: string, ip = "203.0.113.10", body: unknown = {}) {
  return t.fetch(`/api/auth${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": ip, origin: "https://the-page.example" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-03T10:00:00Z"));
  vi.stubEnv("BETTER_AUTH_SECRET", "test-only-secret-for-auth-rate-limit-0123456789");
  vi.stubEnv("POLAR_ORGANIZATION_TOKEN", "");
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("Better Auth HTTP rate limits", () => {
  it("persists failed login attempts across HTTP invocations and isolates IP addresses", async () => {
    const t = setup();
    const body = { email: "invalid-email", password: "invalid-password" };
    for (let i = 0; i < 5; i++) expect((await request(t, "/sign-in/email", undefined, body)).status).toBe(400);
    const response = await request(t, "/sign-in/email", undefined, body);
    expect(response.status).toBe(429);
    expect(response.headers.get("x-retry-after")).toBe("60");
    expect((await request(t, "/sign-in/email", "203.0.113.11", body)).status).toBe(400);
    vi.setSystemTime(Date.now() + 60_001);
    expect((await request(t, "/sign-in/email", undefined, body)).status).toBe(400);
  });

  it.each([
    ["/sign-up/email", 3, 60],
    ["/request-password-reset", 3, 300],
    ["/send-verification-email", 3, 300],
    ["/reset-password", 5, 60],
    ["/change-password", 5, 60],
    ["/change-email", 3, 300],
    ["/sign-in/social", 10, 60],
  ] as const)("limits %s before validating or executing the request", async (path, max, seconds) => {
    const t = setup();
    for (let i = 0; i < max; i++) expect((await request(t, path)).status).not.toBe(429);
    const response = await request(t, path);
    expect(response.status).toBe(429);
    expect(response.headers.get("x-retry-after")).toBe(String(seconds));
    expect(await response.json()).toEqual({ message: "Too many requests. Please try again later." });
  });

  it("keeps session reads available when login is rate limited", async () => {
    const t = setup();
    for (let i = 0; i < 6; i++) await request(t, "/sign-in/email");
    const response = await t.fetch("/api/auth/get-session", { headers: { "cf-connecting-ip": "203.0.113.10" } });
    expect(response.status).toBe(200);
    expect(await response.json()).toBeNull();
    const stored = await t.query(components.betterAuth.adapter.findMany, { model: "rateLimit", paginationOpts: { numItems: 10, cursor: null } });
    expect(stored.page).toHaveLength(1);
    expect(stored.page[0]).toMatchObject({ key: "203.0.113.10/sign-in/email", count: 5 });
  });

  it("enforces the login budget under concurrent HTTP requests", async () => {
    const t = setup();
    const responses = await Promise.all(Array.from({ length: 10 }, () => request(t, "/sign-in/email", undefined, { email: "invalid-email", password: "invalid-password" })));
    expect(responses.filter((response) => response.status !== 429)).toHaveLength(5);
  });

  it("groups IPv6 addresses and equivalent spellings within the same /64", async () => {
    const t = setup();
    for (let i = 0; i < 5; i++) await request(t, "/sign-in/email", "2001:db8:1:2::1");
    expect((await request(t, "/sign-in/email", "2001:0db8:0001:0002:0000:0000:0000:0001")).status).toBe(429);
    expect((await request(t, "/sign-in/email", "2001:db8:1:2::abcd")).status).toBe(429);
    expect((await request(t, "/sign-in/email", "2001:db8:1:3::1")).status).not.toBe(429);
  });

  it("shares the quota between IPv4 and IPv4-mapped IPv6", async () => {
    const t = setup();
    for (let i = 0; i < 5; i++) await request(t, "/sign-in/email", "203.0.113.10");
    expect((await request(t, "/sign-in/email", "::ffff:203.0.113.10")).status).toBe(429);
  });

  it("uses signed visitor IPs through Cloudflare rather than sharing the Worker's budget", async () => {
    const t = setup();
    const secret = "test-only-auth-proxy-secret-0123456789abcdef";
    vi.stubEnv("AUTH_PROXY_SECRET", secret);
    async function forwarded(ip: string) {
      const original = new Request("https://the-page.example/api/auth/sign-in/email", { method: "POST", headers: { "cf-connecting-ip": ip } });
      const headers = (await authProxyHeaders(original, secret))!;
      headers.set("cf-connecting-ip", "2a06:98c0:3600::103");
      headers.set("content-type", "application/json");
      return t.fetch("/api/auth/sign-in/email", { method: "POST", headers, body: "{}" });
    }
    for (let i = 0; i < 5; i++) expect((await forwarded("203.0.113.10")).status).toBe(400);
    expect((await forwarded("203.0.113.10")).status).toBe(429);
    expect((await forwarded("203.0.113.11")).status).toBe(400);
  });

  it("rejects forged visitor headers before they can bypass the IP quota", async () => {
    const t = setup();
    vi.stubEnv("AUTH_PROXY_SECRET", "test-only-auth-proxy-secret-0123456789abcdef");
    const response = await t.fetch("/api/auth/sign-in/email", { method: "POST", headers: { [AUTH_PROXY_IP]: "203.0.113.99", [AUTH_PROXY_SIGNATURE]: "forged" }, body: "{}" });
    expect(response.status).toBe(403);
  });

  it.each([
    ["/request-password-reset", "reset"],
    ["/send-verification-email", "verification"],
  ] as const)("blocks %s before creating another token or sending another email", async (path, kind) => {
    const t = setup();
    await t.mutation(components.betterAuth.adapter.create, {
      input: { model: "user", data: { name: "User", email: "user@example.com", emailVerified: false, createdAt: Date.now(), updatedAt: Date.now() } },
    });
    const body = { email: "user@example.com", callbackURL: "https://the-page.example/", redirectTo: "https://the-page.example/reset-password" };
    for (let i = 0; i < 3; i++) expect((await request(t, path, undefined, body)).status).toBe(200);
    const before = await t.query(components.betterAuth.adapter.findMany, { model: "verification", paginationOpts: { numItems: 10, cursor: null } });
    expect((await request(t, path, undefined, body)).status).toBe(429);
    expect(emails[kind]).toHaveBeenCalledTimes(3);
    const after = await t.query(components.betterAuth.adapter.findMany, { model: "verification", paginationOpts: { numItems: 10, cursor: null } });
    expect(after.page).toEqual(before.page);
  });
});
