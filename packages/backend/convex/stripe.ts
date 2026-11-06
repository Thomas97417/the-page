import { StripeSubscriptions } from "@convex-dev/stripe";
import Stripe from "stripe";
import { components } from "./_generated/api";
import { stripeKeyMatchesMode } from "./lib/stripeEnvironment";

function secretKey() {
  if (!stripeKeyMatchesMode()) {
    throw new Error("STRIPE_SECRET_KEY must match STRIPE_MODE (test or live)");
  }
  return process.env.STRIPE_SECRET_KEY!;
}

export function stripeComponent() {
  return new StripeSubscriptions(components.stripe, {
    STRIPE_SECRET_KEY: secretKey(),
  });
}

export function stripeClient() {
  return new Stripe(secretKey(), { timeout: 20_000, maxNetworkRetries: 2 });
}
