export function getStripeMode(): "test" | "live" {
  // Convex variables are configured separately on each deployment. Default to
  // test payments, regardless of NODE_ENV (cloud dev also runs bundled code).
  const mode = process.env.STRIPE_MODE ?? "test";
  if (mode !== "test" && mode !== "live") {
    throw new Error("STRIPE_MODE must be test or live");
  }
  return mode;
}

export function stripeKeyMatchesMode() {
  return !!process.env.STRIPE_SECRET_KEY?.startsWith(`sk_${getStripeMode()}_`);
}

export function paymentConfigured() {
  return !!(
    stripeKeyMatchesMode() &&
    process.env.STRIPE_WEBHOOK_SECRET &&
    process.env.SITE_URL
  );
}
