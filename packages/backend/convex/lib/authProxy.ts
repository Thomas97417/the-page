// A Worker subrequest can replace CF-Connecting-IP with the Worker's address.
// Authenticate the visitor IP forwarded by our own server before using it.
export const AUTH_PROXY_IP = "x-the-page-client-ip";
export const AUTH_PROXY_TIME = "x-the-page-auth-time";
export const AUTH_PROXY_SIGNATURE = "x-the-page-auth-signature";
const MAX_AGE = 60_000;
const encoder = new TextEncoder();

function payload(request: Request, ip: string, timestamp: string) {
  const url = new URL(request.url);
  return encoder.encode(JSON.stringify([timestamp, ip, request.method, url.pathname + url.search]));
}

function key(secret: string, usage: "sign" | "verify") {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [usage]);
}

export async function authProxyHeaders(request: Request, secret: string | undefined): Promise<Headers | null> {
  const headers = new Headers(request.headers);
  for (const name of [AUTH_PROXY_IP, AUTH_PROXY_TIME, AUTH_PROXY_SIGNATURE]) headers.delete(name);
  const ip = request.headers.get("cf-connecting-ip");
  // Direct local development has no Cloudflare visitor header.
  if (!ip) return headers;
  if (!secret || secret.length < 32) return null;
  const timestamp = String(Date.now());
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", await key(secret, "sign"), payload(request, ip, timestamp)));
  headers.set(AUTH_PROXY_IP, ip);
  headers.set(AUTH_PROXY_TIME, timestamp);
  headers.set(AUTH_PROXY_SIGNATURE, Array.from(signature, (byte) => byte.toString(16).padStart(2, "0")).join(""));
  return headers;
}

export async function verifyAuthProxy(request: Request, secret: string | undefined) {
  const ip = request.headers.get(AUTH_PROXY_IP);
  const timestamp = request.headers.get(AUTH_PROXY_TIME);
  const signature = request.headers.get(AUTH_PROXY_SIGNATURE);
  if (ip === null && timestamp === null && signature === null) return true;
  if (!ip || !timestamp || !signature || !secret || secret.length < 32) return false;
  const time = Number(timestamp);
  if (!Number.isSafeInteger(time) || Math.abs(Date.now() - time) > MAX_AGE || !/^[a-f0-9]{64}$/.test(signature)) return false;
  const bytes = Uint8Array.from(signature.match(/../g)!, (pair) => Number.parseInt(pair, 16));
  return crypto.subtle.verify("HMAC", await key(secret, "verify"), bytes, payload(request, ip, timestamp));
}
