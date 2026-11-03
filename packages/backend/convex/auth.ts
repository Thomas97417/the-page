import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";

import type { DataModel } from "./_generated/dataModel";

import { components, internal } from "./_generated/api";
import { query, type ActionCtx } from "./_generated/server";
import authConfig from "./auth.config";
import { languageFromCookie } from "./lib/language";
import { authRateLimitOptions, AuthRateLimitError } from "./authRateLimits";
import { AUTH_PROXY_IP, verifyAuthProxy } from "./lib/authProxy";
import {
  SITE_URL,
  EMAIL_FROM,
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  BETTER_AUTH_URL,
} from "./env";

export const authComponent = createClient<DataModel>(components.betterAuth);

function createAuth(ctx: GenericCtx<DataModel>) {
  const auth = betterAuth({
    baseURL: BETTER_AUTH_URL,
    trustedOrigins: [SITE_URL],
    database: authComponent.adapter(ctx),
    advanced: { ipAddress: { ipAddressHeaders: [AUTH_PROXY_IP, "cf-connecting-ip"] } },
    rateLimit: {
      ...authRateLimitOptions,
      // Compatibility with Better Auth 1.4's documented get/set storage API.
      // consume rechecks and increments atomically, including concurrent calls.
      customStorage: {
        get: async (key) => (await ctx.runQuery(internal.authRateLimits.read, { key })) ?? undefined,
        set: async (key) => {
          if (!("runMutation" in ctx)) throw new Error("Auth rate limiting requires a mutation-capable context");
          const result = await ctx.runMutation(internal.authRateLimits.consume, { key });
          if (!result.allowed) throw new AuthRateLimitError(result.retryAfter);
        },
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendResetPassword: async ({ user, url }, request) => {
        const actionCtx = ctx as unknown as ActionCtx;
        await actionCtx.runAction(internal.sendEmails.sendResetPasswordEmail, {
          from: EMAIL_FROM,
          to: user.email,
          url,
          language: languageFromCookie(request?.headers.get("cookie")),
        });
      },
    },
    emailVerification: {
      sendVerificationEmail: async ({ user, url, token }, request) => {
        const actionCtx = ctx as unknown as ActionCtx;
        await actionCtx.runAction(internal.sendEmails.sendVerificationEmail, {
          from: EMAIL_FROM,
          to: user.email,
          url,
          token,
          language: languageFromCookie(request?.headers.get("cookie")),
        });
      },
    },
    user: {
      changeEmail: {
        enabled: true,
        updateEmailWithoutVerification: true,
      },
      deleteUser: {
        enabled: true,
      },
    },
    socialProviders: {
      github: {
        clientId: GITHUB_CLIENT_ID,
        clientSecret: GITHUB_CLIENT_SECRET,
      },
      google: {
        prompt: "select_account",
        clientId: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
      },
    },
    plugins: [
      convex({
        authConfig,
        jwksRotateOnTokenGenerationError: true,
      }),
    ],
  });
  return {
    ...auth,
    handler: async (request: Request) => {
      if (!(await verifyAuthProxy(request, process.env.AUTH_PROXY_SECRET)))
        return Response.json({ code: "AUTH_ERROR", message: "Invalid authentication request" }, { status: 403 });
      try {
        return await auth.handler(request);
      } catch (error) {
        // Better Auth 1.4's request hook does not convert storage errors to HTTP.
        if (error instanceof AuthRateLimitError) return error.toResponse();
        throw error;
      }
    },
  };
}

export { createAuth };

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return await authComponent.safeGetAuthUser(ctx);
  },
});

export const providers = query({
  args: {},
  handler: () => ({
    google: !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET),
    github: !!(GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET),
  }),
});
