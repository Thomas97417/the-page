/// <reference types="vite/client" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import posthogTest from "@posthog/convex/test";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import schema from "../convex/schema";
import { internal } from "../convex/_generated/api";
import type { Doc, Id } from "../convex/_generated/dataModel";

const modules = import.meta.glob("../convex/**/*.ts");
function setup() {
  const t = convexTest(schema, modules);
  posthogTest.register(t);
  rateLimiterTest.register(t);
  return t;
}
type Test = ReturnType<typeof setup>;

async function place(t: Test) {
  return await t.run((ctx) =>
    ctx.db.insert("slots", {
      pageId: "france",
      position: 12,
      acquisitions: 0,
      visibility: "visible",
    }),
  );
}

async function reserve(t: Test, slotId: Id<"slots">, userId: string) {
  const slot = (await t.run((ctx) => ctx.db.get(slotId)))!;
  return await t.mutation(internal.purchases.reserve, {
    slotId,
    userId,
    acquisition: slot.acquisitions,
    word: "Bonjour",
    description: "Private purchase content",
    url: "https://example.com/private",
  });
}

function order(purchase: Doc<"purchases">) {
  return {
    id: `order-${purchase._id}`,
    checkoutId: `checkout-${purchase._id}`,
    purchaseId: purchase._id,
    userId: purchase.userId,
    livemode: process.env.STRIPE_MODE === "live",
    amount: purchase.amount,
    currency: "eur",
    refundedAmount: 0,
  };
}

async function publish(t: Test, purchase: Doc<"purchases">) {
  return await t.mutation(internal.purchases.applyPaidOrder, {
    order: order(purchase),
  });
}

async function events(t: Test) {
  const jobs = await t.run((ctx) =>
    ctx.db.system.query("_scheduled_functions").collect(),
  );
  return jobs.flatMap((job) => {
    const args = job.args[0] as {
      event?: string;
      distinctId: string;
      properties: string;
    };
    return typeof args?.event === "string"
      ? [{ event: args.event, distinctId: args.distinctId, properties: JSON.parse(args.properties) }]
      : [];
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv("STRIPE_MODE", "test");
  vi.stubEnv("POSTHOG_PROJECT_TOKEN", "phc_test");
  vi.stubEnv("POSTHOG_ENVIRONMENT", "test");
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("purchase analytics", () => {
  it("labels real purchases with the production payment mode", async () => {
    vi.stubEnv("STRIPE_MODE", "live");
    const t = setup();
    const purchase = await reserve(t, await place(t), "production-buyer");
    await publish(t, purchase);
    expect(await events(t)).toMatchObject([{
      event: "purchase_completed",
      properties: { payment_mode: "live" },
    }]);
  });

  it("captures each checkout once without treating it as a completed purchase", async () => {
    const t = setup();
    const slotId = await place(t);
    const purchase = await reserve(t, slotId, "buyer");
    const args = {
      purchaseId: purchase._id,
      checkoutId: order(purchase).checkoutId,
      checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_example",
    };
    await t.mutation(internal.purchases.attachCheckout, args);
    await t.mutation(internal.purchases.attachCheckout, args);
    const captured = await events(t);
    expect(captured).toHaveLength(1);
    expect(captured[0]).toMatchObject({
      event: "checkout_created",
      distinctId: "buyer",
      properties: { checkout_id: args.checkoutId, purchase_id: purchase._id },
    });
  });

  it("captures validated purchases and takeovers once, using the owner's stable ID", async () => {
    const t = setup();
    const slotId = await place(t);
    const initial = await reserve(t, slotId, "first-buyer");
    await publish(t, initial);
    await publish(t, initial);
    const takeover = await reserve(t, slotId, "second-buyer");
    await publish(t, takeover);
    await publish(t, takeover);
    const captured = await events(t);
    expect(captured).toHaveLength(2);
    expect(captured[0]).toMatchObject({
      event: "purchase_completed",
      distinctId: "first-buyer",
      properties: {
        purchase_type: "initial",
        acquisition_number: 1,
        amount_cents: 100,
        currency: "EUR",
        page_id: "france",
        slot_id: slotId,
        order_id: order(initial).id,
        environment: "test",
        payment_mode: "test",
      },
    });
    expect(captured[1]).toMatchObject({
      event: "purchase_completed",
      distinctId: "second-buyer",
      properties: { purchase_type: "takeover", acquisition_number: 2, amount_cents: 200 },
    });
    expect(JSON.stringify(captured)).not.toMatch(/Bonjour|Private purchase content|example\.com/);
  });

  it("does not count invalid orders or payments made after a reservation was released", async () => {
    const t = setup();
    const slotId = await place(t);
    const invalid = await reserve(t, slotId, "invalid-buyer");
    await t.mutation(internal.purchases.applyPaidOrder, {
      order: { ...order(invalid), amount: 1 },
    });
    const expired = await reserve(t, slotId, "late-buyer");
    await t.mutation(internal.purchases.close, { purchaseId: expired._id, reason: "expired" });
    expect(await publish(t, expired)).toBe("refund_pending");
    expect(await events(t)).toEqual([]);
  });

  it("captures a full refund once, including when the webhook is replayed", async () => {
    const t = setup();
    const slotId = await place(t);
    const purchase = await reserve(t, slotId, "buyer");
    await publish(t, purchase);
    await t.mutation(internal.purchases.markRefunded, {
      orderId: order(purchase).id,
      refundedAmount: 50,
    });
    expect((await events(t)).filter((event) => event.event === "purchase_refunded")).toHaveLength(0);
    const refund = { orderId: order(purchase).id, refundedAmount: 100, refundId: "refund-1", complete: true };
    await t.mutation(internal.purchases.markRefunded, refund);
    await t.mutation(internal.purchases.markRefunded, refund);
    expect((await events(t)).filter((event) => event.event === "purchase_refunded")).toEqual([
      expect.objectContaining({
        distinctId: "buyer",
        properties: expect.objectContaining({ refunded_amount_cents: 100, refund_id: "refund-1" }),
      }),
    ]);
  });

  it("keeps the purchase flow working without scheduling analytics when no token is configured", async () => {
    vi.stubEnv("POSTHOG_PROJECT_TOKEN", "");
    const t = setup();
    const slotId = await place(t);
    const purchase = await reserve(t, slotId, "buyer");
    await t.mutation(internal.purchases.attachCheckout, {
      purchaseId: purchase._id,
      checkoutId: order(purchase).checkoutId,
      checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_example",
    });
    expect(await publish(t, purchase)).toBe("published");
    await t.mutation(internal.purchases.markRefunded, {
      orderId: order(purchase).id,
      refundedAmount: 100,
      complete: true,
    });
    expect(await events(t)).toEqual([]);
    expect(await t.run((ctx) => ctx.db.get(purchase._id))).toMatchObject({ status: "refunded" });
  });
});
