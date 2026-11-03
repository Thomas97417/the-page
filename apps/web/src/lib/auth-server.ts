import { convexBetterAuthReactStart } from "@convex-dev/better-auth/react-start";
import { env } from "@my-better-t-app/env/web";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { getSessionCookie } from "better-auth/cookies";
import { createServerOnlyFn } from "@tanstack/react-start";
import { authProxyHeaders } from "@my-better-t-app/backend/convex/lib/authProxy";

const convexAuth = convexBetterAuthReactStart({
  convexUrl: env.VITE_CONVEX_URL,
  convexSiteUrl: env.VITE_CONVEX_SITE_URL,
});

export const { fetchAuthQuery, fetchAuthMutation, fetchAuthAction } = convexAuth;

export const handler = createServerOnlyFn(async (request: Request) => {
  const headers = await authProxyHeaders(request, process.env.AUTH_PROXY_SECRET);
  if (!headers)
    return Response.json({ code: "AUTH_ERROR", message: "Authentication temporarily unavailable" }, { status: 503 });
  return convexAuth.handler(new Request(request, { headers }));
});

export async function getToken() {
  const headers = getRequestHeaders();
  // No credential means there is no session to validate remotely. A cookie's
  // presence is never proof of authentication: Convex still validates it.
  if (!getSessionCookie(headers) && !headers.has("authorization")) return;
  return await convexAuth.getToken();
}
