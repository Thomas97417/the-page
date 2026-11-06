import { Polar } from "@convex-dev/polar";
import { api, components } from "./_generated/api";
import { ConvexError } from "convex/values";
import { getPolarServer } from "./lib/polarEnvironment";

export const polar: Polar = new Polar(components.polar, {
  server: getPolarServer(),
  getUserInfo: async (ctx): Promise<{ userId: string; email: string }> => {
    const user = await ctx.runQuery(api.auth.getCurrentUser, {});
    if (!user) throw new ConvexError("Connectez-vous pour continuer.");
    return { userId: user._id, email: user.email };
  },
});

export function paymentConfigured() {
  return !!(
    process.env.POLAR_ORGANIZATION_TOKEN &&
    process.env.POLAR_WEBHOOK_SECRET &&
    process.env.POLAR_PRODUCT_ID &&
    process.env.SITE_URL
  );
}
