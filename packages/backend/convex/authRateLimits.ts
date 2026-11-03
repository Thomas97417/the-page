import { v } from "convex/values";
import { components } from "./_generated/api";
import { internalMutation, internalQuery, type QueryCtx } from "./_generated/server";

type Rule = { window: number; max: number };

export const authRateLimitOptions = {
  enabled: true,
  storage: "database" as const,
  window: 10,
  max: 100,
  customRules: {
    "/sign-in/social": { window: 60, max: 10 },
    "/sign-in/**": { window: 60, max: 5 },
    "/sign-up/**": { window: 60, max: 3 },
    "/request-password-reset": { window: 300, max: 3 },
    "/send-verification-email": { window: 300, max: 3 },
    "/reset-password": { window: 60, max: 5 },
    "/change-password": { window: 60, max: 5 },
    "/change-email": { window: 300, max: 3 },
    // Background session reads must not consume the authentication budget.
    "/get-session": false,
    "/convex/token": false,
  } satisfies Record<string, Rule | false>,
};

function ruleForKey(key: string): Rule {
  // Better Auth 1.4 constructs this key as the validated IP + endpoint path.
  const path = key.slice(key.indexOf("/"));
  for (const [pattern, rule] of Object.entries(authRateLimitOptions.customRules)) {
    const prefix = pattern.endsWith("/**") ? pattern.slice(0, -3) : null;
    if (prefix !== null ? path === prefix || path.startsWith(`${prefix}/`) : path === pattern) {
      if (!rule) throw new Error("This authentication endpoint is exempt from rate limiting");
      return rule;
    }
  }
  // Keep the fallback aligned with Better Auth 1.4's built-in special rules.
  if (["/sign-in", "/sign-up", "/change-password", "/change-email"].some((prefix) => path.startsWith(prefix)))
    return { window: 10, max: 3 };
  return authRateLimitOptions;
}

function storageKey(key: string) {
  const separator = key.indexOf("/");
  const ip = separator < 0 ? key : key.slice(0, separator);
  const path = separator < 0 ? "" : key.slice(separator);
  if (!ip.includes(":")) return key;
  // Better Auth 1.4 validates IPs but does not normalize IPv6 or group /64s.
  const address = new URL(`http://[${ip}]/`).hostname.slice(1, -1);
  const [left, right] = address.split("::");
  const head = left ? left.split(":") : [];
  const tail = right ? right.split(":") : [];
  const words = (right === undefined ? head : [...head, ...Array(8 - head.length - tail.length).fill("0"), ...tail]).map((word) => Number.parseInt(word, 16));
  if (words.slice(0, 5).every((word) => word === 0) && words[5] === 0xffff)
    return `${[words[6] >> 8, words[6] & 255, words[7] >> 8, words[7] & 255].join(".")}${path}`;
  return `${words.slice(0, 4).map((word) => word.toString(16)).join(":")}::/64${path}`;
}

async function find(ctx: QueryCtx, key: string) {
  return ctx.runQuery(components.betterAuth.adapter.findOne, {
    model: "rateLimit",
    where: [{ field: "key", value: key }],
  });
}

export const read = internalQuery({
  args: { key: v.string() },
  handler: async (ctx, { key }): Promise<{ key: string; count: number; lastRequest: number } | null> => {
    const record = await find(ctx, storageKey(key));
    return record ? { key, count: record.count ?? 0, lastRequest: record.lastRequest ?? 0 } : null;
  },
});

export const consume = internalMutation({
  args: { key: v.string() },
  handler: async (ctx, { key }): Promise<{ allowed: boolean; retryAfter: number }> => {
    const { window, max } = ruleForKey(key);
    const normalizedKey = storageKey(key);
    const record = await find(ctx, normalizedKey);
    const now = Date.now();
    const withinWindow = record && now - (record.lastRequest ?? 0) < window * 1000;
    if (withinWindow && (record.count ?? 0) >= max)
      return { allowed: false, retryAfter: Math.ceil(((record.lastRequest ?? 0) + window * 1000 - now) / 1000) };

    const data = { count: withinWindow ? (record.count ?? 0) + 1 : 1, lastRequest: now };
    // Both component calls run inside this parent mutation's transaction.
    // Re-read here rather than trusting Better Auth 1.4's earlier get/set pair.
    if (record) {
      await ctx.runMutation(components.betterAuth.adapter.updateOne, {
        input: { model: "rateLimit", where: [{ field: "_id", value: record._id }], update: data },
      });
    } else {
      await ctx.runMutation(components.betterAuth.adapter.create, {
        input: { model: "rateLimit", data: { key: normalizedKey, ...data } },
      });
    }
    return { allowed: true, retryAfter: 0 };
  },
});

export class AuthRateLimitError extends Error {
  constructor(readonly retryAfter: number) {
    super("Too many requests. Please try again later.");
  }

  toResponse() {
    return Response.json({ message: this.message }, {
      status: 429,
      statusText: "Too Many Requests",
      headers: { "X-Retry-After": String(this.retryAfter) },
    });
  }
}
