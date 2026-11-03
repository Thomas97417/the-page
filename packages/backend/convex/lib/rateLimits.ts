import { MINUTE, RateLimiter } from "@convex-dev/rate-limiter";
import { components } from "../_generated/api";

// These buckets are keyed by the authenticated user, shared across every page.
// Capacity bounds bursts; rate / period controls how quickly tokens refill.
export const rateLimiter = new RateLimiter(components.rateLimiter, {
  checkoutStart: { kind: "token bucket", rate: 10, period: MINUTE, capacity: 3 },
  checkoutRefresh: { kind: "token bucket", rate: 20, period: MINUTE, capacity: 5 },
  purchaseReservation: { kind: "token bucket", rate: 5, period: 10 * MINUTE },
  updateContent: { kind: "token bucket", rate: 20, period: MINUTE, capacity: 10 },
  moderate: { kind: "token bucket", rate: 60, period: MINUTE, capacity: 30 },
  notificationRead: { kind: "token bucket", rate: 60, period: MINUTE, capacity: 30 },
});
