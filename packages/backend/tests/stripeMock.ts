import { vi } from "vitest";
import type Stripe from "stripe";
import type { Doc } from "../convex/_generated/dataModel";

// Keep the real SDK's webhook signature verification. Only network methods are
// replaced, so the official Convex component builds and processes real requests.
const stripeMocks = vi.hoisted(() => ({
  keys: [] as string[],
  sessionsCreate: vi.fn(),
  sessionsRetrieve: vi.fn(),
  sessionsExpire: vi.fn(),
  intentsRetrieve: vi.fn(),
  refundsList: vi.fn(),
  refundsCreate: vi.fn(),
}));

export { stripeMocks };

vi.mock("stripe", async (importOriginal) => {
  const actual = await importOriginal<typeof import("stripe")>();
  return {
    ...actual,
    default: class extends actual.default {
      constructor(...args: ConstructorParameters<typeof actual.default>) {
        super(...args);
        stripeMocks.keys.push(args[0]);
        this.checkout.sessions.create = stripeMocks.sessionsCreate;
        this.checkout.sessions.retrieve = stripeMocks.sessionsRetrieve;
        this.checkout.sessions.expire = stripeMocks.sessionsExpire;
        this.paymentIntents.retrieve = stripeMocks.intentsRetrieve;
        this.refunds.list = stripeMocks.refundsList;
        this.refunds.create = stripeMocks.refundsCreate;
      }
    },
  };
});

export function paymentIntent(purchase: Doc<"purchases">, overrides = {}) {
  return {
    id: `order-${purchase._id}`,
    object: "payment_intent",
    status: "succeeded",
    amount_received: purchase.amount,
    currency: "eur",
    livemode: process.env.STRIPE_MODE === "live",
    metadata: {
      app: "the-page",
      purchaseId: purchase._id,
      userId: purchase.userId,
    },
    latest_charge: {
      id: "ch_test",
      amount: purchase.amount,
      amount_refunded: 0,
    },
    ...overrides,
  } as unknown as Stripe.PaymentIntent;
}

export function checkoutSession(purchase: Doc<"purchases">, overrides = {}) {
  return {
    id: `checkout-${purchase._id}`,
    object: "checkout.session",
    mode: "payment",
    status: "complete",
    payment_status: "paid",
    amount_total: purchase.amount,
    currency: "eur",
    livemode: process.env.STRIPE_MODE === "live",
    client_reference_id: purchase.userId,
    metadata: {
      app: "the-page",
      purchaseId: purchase._id,
      userId: purchase.userId,
    },
    payment_intent: paymentIntent(purchase),
    ...overrides,
  } as unknown as Stripe.Checkout.Session;
}
