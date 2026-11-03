import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const runtimeEnv = (import.meta as any).env;

export const env = createEnv({
  clientPrefix: "VITE_",
  client: {
    VITE_CONVEX_URL: z.url(),
    VITE_CONVEX_SITE_URL: z.url(),
    VITE_POSTHOG_PROJECT_TOKEN: z.string().trim().min(1).optional(),
    VITE_POSTHOG_HOST: z.url().default("https://eu.i.posthog.com"),
    VITE_POSTHOG_ENVIRONMENT: z
      .enum(["development", "production", "test"])
      .default(runtimeEnv?.PROD ? "production" : "development"),
  },
  runtimeEnv,
  emptyStringAsUndefined: true,
});
