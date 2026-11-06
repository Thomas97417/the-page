import { PostHog } from "@posthog/convex";
import { components } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { DEFAULT_PAGE_ID } from "./pages";
import { getPolarServer } from "./polarEnvironment";

const posthog = new PostHog(components.posthog);

type PurchaseEvent =
  | "checkout_created"
  | "purchase_completed"
  | "purchase_refunded";

// Schedule alongside the state transition, so rolled-back mutations never emit events.
export async function capturePurchaseEvent(
  ctx: MutationCtx,
  event: PurchaseEvent,
  purchase: Doc<"purchases">,
) {
  if (!process.env.POSTHOG_PROJECT_TOKEN?.trim()) return;

  await posthog.capture(ctx, {
    distinctId: purchase.userId,
    event,
    timestamp: new Date(Date.now()),
    disableGeoip: true,
    properties: {
      purchase_id: purchase._id,
      order_id: purchase.orderId,
      checkout_id: purchase.checkoutId,
      page_id: purchase.pageId ?? DEFAULT_PAGE_ID,
      slot_id: purchase.slotId,
      position: purchase.position,
      purchase_type: purchase.acquisition === 0 ? "initial" : "takeover",
      acquisition_number: purchase.acquisition + 1,
      amount_cents: purchase.amount,
      currency: "EUR",
      environment: process.env.POSTHOG_ENVIRONMENT?.trim() || "development",
      payment_mode: getPolarServer(),
      ...(event === "purchase_refunded"
        ? {
            refunded_amount_cents: purchase.refundedAmount,
            refund_id: purchase.refundId,
          }
        : {}),
    },
  });
}
