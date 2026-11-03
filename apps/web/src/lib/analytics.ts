import type { CaptureResult } from "posthog-js";

const URL_PROPERTIES = [
  "$current_url",
  "$referrer",
  "$initial_current_url",
  "$initial_referrer",
] as const;

function stripUrlParameters(properties: Record<string, unknown>) {
  for (const key of URL_PROPERTIES) {
    const value = properties[key];
    if (typeof value !== "string") continue;
    try {
      const url = new URL(value);
      properties[key] = `${url.origin}${url.pathname}`;
    } catch {
      // PostHog also uses non-URL values such as "$direct" for referrers.
    }
  }
}

// Auth and payment return URLs can contain tokens, purchase IDs and notification IDs.
export function sanitizeAnalyticsEvent(event: CaptureResult | null) {
  if (!event) return null;
  stripUrlParameters(event.properties);
  for (const key of ["$set", "$set_once"]) {
    const properties = event.properties[key];
    if (properties && typeof properties === "object") {
      stripUrlParameters(properties);
    }
  }
  return event;
}
