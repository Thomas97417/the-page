import type Stripe from "stripe";
import { getStripeMode } from "./stripeEnvironment";

export const PAYMENT_APP = "the-page";

export function normalizePaidOrder(session: Stripe.Checkout.Session) {
  const intent = session.payment_intent;
  if (
    session.mode !== "payment" ||
    session.payment_status !== "paid" ||
    session.metadata?.app !== PAYMENT_APP ||
    !session.metadata.purchaseId ||
    !intent ||
    typeof intent === "string" ||
    intent.status !== "succeeded" ||
    intent.metadata.app !== PAYMENT_APP ||
    intent.metadata.purchaseId !== session.metadata.purchaseId
  )
    return null;

  if (
    session.livemode !== (getStripeMode() === "live") ||
    intent.livemode !== session.livemode
  )
    throw new Error("Stripe payment mode does not match this deployment");

  const charge = intent.latest_charge;
  if (!charge || typeof charge === "string") return null;

  return {
    id: intent.id,
    checkoutId: session.id,
    purchaseId: session.metadata.purchaseId,
    // Both metadata copies and client_reference_id must identify the buyer.
    userId:
      session.metadata.userId === intent.metadata.userId &&
      session.client_reference_id === intent.metadata.userId
        ? (intent.metadata.userId ?? "")
        : "",
    amount:
      session.amount_total === intent.amount_received &&
      session.currency === intent.currency
        ? intent.amount_received
        : -1,
    currency: intent.currency,
    livemode: intent.livemode,
    refundedAmount: charge.amount_refunded,
  };
}
