import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { dedupe: ["stripe"] },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    server: {
      deps: { inline: ["@convex-dev/better-auth", "@convex-dev/stripe", "@convex-dev/rate-limiter", "@convex-dev/resend", "@posthog/convex"] },
    },
  },
});
