/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as authRateLimits from "../authRateLimits.js";
import type * as crons from "../crons.js";
import type * as env from "../env.js";
import type * as healthCheck from "../healthCheck.js";
import type * as http from "../http.js";
import type * as lib_analytics from "../lib/analytics.js";
import type * as lib_authProxy from "../lib/authProxy.js";
import type * as lib_content from "../lib/content.js";
import type * as lib_emailContent from "../lib/emailContent.js";
import type * as lib_language from "../lib/language.js";
import type * as lib_notificationEmail from "../lib/notificationEmail.js";
import type * as lib_notifications from "../lib/notifications.js";
import type * as lib_orders from "../lib/orders.js";
import type * as lib_pages from "../lib/pages.js";
import type * as lib_rateLimits from "../lib/rateLimits.js";
import type * as lib_stripeEnvironment from "../lib/stripeEnvironment.js";
import type * as notifications from "../notifications.js";
import type * as payments from "../payments.js";
import type * as permissions from "../permissions.js";
import type * as privateData from "../privateData.js";
import type * as purchases from "../purchases.js";
import type * as sendEmails from "../sendEmails.js";
import type * as slots from "../slots.js";
import type * as stripe from "../stripe.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  authRateLimits: typeof authRateLimits;
  crons: typeof crons;
  env: typeof env;
  healthCheck: typeof healthCheck;
  http: typeof http;
  "lib/analytics": typeof lib_analytics;
  "lib/authProxy": typeof lib_authProxy;
  "lib/content": typeof lib_content;
  "lib/emailContent": typeof lib_emailContent;
  "lib/language": typeof lib_language;
  "lib/notificationEmail": typeof lib_notificationEmail;
  "lib/notifications": typeof lib_notifications;
  "lib/orders": typeof lib_orders;
  "lib/pages": typeof lib_pages;
  "lib/rateLimits": typeof lib_rateLimits;
  "lib/stripeEnvironment": typeof lib_stripeEnvironment;
  notifications: typeof notifications;
  payments: typeof payments;
  permissions: typeof permissions;
  privateData: typeof privateData;
  purchases: typeof purchases;
  sendEmails: typeof sendEmails;
  slots: typeof slots;
  stripe: typeof stripe;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
  resend: import("@convex-dev/resend/_generated/component.js").ComponentApi<"resend">;
  stripe: import("@convex-dev/stripe/_generated/component.js").ComponentApi<"stripe">;
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
  posthog: import("@posthog/convex/_generated/component.js").ComponentApi<"posthog">;
};
