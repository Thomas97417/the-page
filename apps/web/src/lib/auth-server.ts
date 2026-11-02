import { convexBetterAuthReactStart } from "@convex-dev/better-auth/react-start";
import { env } from "@my-better-t-app/env/web";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { getSessionCookie } from "better-auth/cookies";

const convexAuth = convexBetterAuthReactStart({
  convexUrl: env.VITE_CONVEX_URL,
  convexSiteUrl: env.VITE_CONVEX_SITE_URL,
});

export const { handler, fetchAuthQuery, fetchAuthMutation, fetchAuthAction } = convexAuth;

export async function getToken() {
  const headers = getRequestHeaders();
  // No credential means there is no session to validate remotely. A cookie's
  // presence is never proof of authentication: Convex still validates it.
  if (!getSessionCookie(headers) && !headers.has("authorization")) return;
  return await convexAuth.getToken();
}
