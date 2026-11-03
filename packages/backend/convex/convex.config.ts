import betterAuth from "@convex-dev/better-auth/convex.config";
import resend from "@convex-dev/resend/convex.config.js";
import { defineApp } from "convex/server";
import polar from "@convex-dev/polar/convex.config.js";
import rateLimiter from "@convex-dev/rate-limiter/convex.config.js";
import posthog from "@posthog/convex/convex.config.js";
import { v } from "convex/values";

const app = defineApp({
  env: {
    // An empty value disables captures until a PostHog project is configured.
    POSTHOG_PROJECT_TOKEN: v.string(),
  },
});
app.use(betterAuth);
app.use(resend);
app.use(polar);
app.use(rateLimiter);
app.use(posthog, {
  env: {
    POSTHOG_PROJECT_TOKEN: app.env.POSTHOG_PROJECT_TOKEN,
    POSTHOG_HOST: "https://eu.i.posthog.com",
  },
});

export default app;
