import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { authProxyHeaders, verifyAuthProxy, AUTH_PROXY_IP, AUTH_PROXY_TIME, AUTH_PROXY_SIGNATURE } from "../convex/lib/authProxy";

const secret = "test-only-auth-proxy-secret-0123456789abcdef";
const url = "https://the-page.example/api/auth/sign-in/email?callbackURL=%2F";
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-03T10:00:00Z"));
});
afterEach(() => vi.useRealTimers());

async function signed() {
  const original = new Request(url, { method: "POST", headers: { "cf-connecting-ip": "203.0.113.10" } });
  return new Request(url.replace("the-page.example", "example.convex.site"), { method: "POST", headers: (await authProxyHeaders(original, secret))! });
}

it("signs the visitor IP across the frontend and Convex hostnames", async () => {
  expect(await verifyAuthProxy(await signed(), secret)).toBe(true);
});

it.each(["ip", "method", "path", "query"])("rejects a modified %s", async (part) => {
  const request = await signed();
  const headers = new Headers(request.headers);
  if (part === "ip") headers.set(AUTH_PROXY_IP, "203.0.113.11");
  const destination = part === "path" ? request.url.replace("sign-in", "sign-up") : part === "query" ? request.url + "changed" : request.url;
  expect(await verifyAuthProxy(new Request(destination, { method: part === "method" ? "GET" : "POST", headers }), secret)).toBe(false);
});

it("rejects expired signatures and a mismatched server secret", async () => {
  const request = await signed();
  expect(await verifyAuthProxy(request, "another-test-only-proxy-secret-0123456789abcdef")).toBe(false);
  vi.setSystemTime(Date.now() + 60_001);
  expect(await verifyAuthProxy(request, secret)).toBe(false);
});

it("requires a private secret when forwarding a Cloudflare visitor IP", async () => {
  expect(await authProxyHeaders(new Request(url, { headers: { "cf-connecting-ip": "203.0.113.10" } }), undefined)).toBeNull();
});

it("strips client-supplied proxy headers during local development", async () => {
  const headers = await authProxyHeaders(new Request(url, { headers: { [AUTH_PROXY_IP]: "forged", [AUTH_PROXY_TIME]: "0", [AUTH_PROXY_SIGNATURE]: "forged" } }), undefined);
  expect(headers?.has(AUTH_PROXY_IP)).toBe(false);
  expect(headers?.has(AUTH_PROXY_TIME)).toBe(false);
  expect(headers?.has(AUTH_PROXY_SIGNATURE)).toBe(false);
});
