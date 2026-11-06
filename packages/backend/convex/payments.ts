import { ConvexError, v } from "convex/values";
import type Stripe from "stripe";
import { action, internalAction, query } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { stripeClient, stripeComponent } from "./stripe";
import { requireUser } from "./permissions";
import { normalizePaidOrder, PAYMENT_APP } from "./lib/orders";
import { DEFAULT_PAGE_ID, purchaseReturnPath } from "./lib/pages";
import { rateLimiter } from "./lib/rateLimits";
import { getStripeMode, paymentConfigured } from "./lib/stripeEnvironment";

export const availability = query({
  args: {},
  handler: () => ({
    configured: paymentConfigured(),
    testMode: getStripeMode() === "test",
  }),
});

async function applySession(ctx: ActionCtx, session: Stripe.Checkout.Session) {
  const order = normalizePaidOrder(session);
  if (!order) return false;
  await ctx.runMutation(internal.purchases.applyPaidOrder, { order });
  // An old completed event can arrive after a refund, or before its webhook.
  if (order.refundedAmount > 0) {
    const intent = session.payment_intent as Stripe.PaymentIntent;
    await ctx.runMutation(internal.purchases.markRefunded, {
      orderId: order.id,
      refundedAmount: order.refundedAmount,
      complete: order.refundedAmount >= intent.amount_received,
    });
  }
  return true;
}

export const verifyCheckout = internalAction({
  args: { checkoutId: v.string() },
  handler: async (ctx, { checkoutId }): Promise<void> => {
    // Always read current Stripe data instead of trusting an old event snapshot.
    const session = await stripeClient().checkout.sessions.retrieve(
      checkoutId,
      {
        expand: ["payment_intent.latest_charge"],
      },
    );
    await applySession(ctx, session);
  },
});

export const start = action({
  args: {
    slotId: v.id("slots"),
    acquisition: v.number(),
    word: v.string(),
    url: v.optional(v.string()),
    description: v.optional(v.string()),
    language: v.optional(v.union(v.literal("fr"), v.literal("en"))),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    purchaseId: Id<"purchases">;
    url: string;
    reservedUntil: number;
  }> => {
    const user = await requireUser(ctx);
    if (!paymentConfigured())
      throw new ConvexError("Le paiement est momentanément indisponible.");
    // Count failed attempts before any reservation or external API call.
    await rateLimiter.limit(ctx, "checkoutStart", {
      key: user._id,
      throws: true,
    });
    const { language, ...purchaseArgs } = args;
    const purchase = await ctx.runMutation(internal.purchases.reserve, {
      ...purchaseArgs,
      userId: user._id,
      language,
    });
    if (purchase.checkoutUrl)
      return {
        purchaseId: purchase._id,
        url: purchase.checkoutUrl,
        reservedUntil: purchase.reservedUntil,
      };
    const claimed = await ctx.runMutation(internal.purchases.claimCheckout, {
      purchaseId: purchase._id,
    });
    if (!claimed)
      throw new ConvexError(
        "Le paiement se prépare. Réessayez dans un instant.",
      );
    try {
      const siteUrl = new URL(process.env.SITE_URL!).origin;
      const returnUrl = `${siteUrl}${purchaseReturnPath(
        purchase.pageId ?? DEFAULT_PAGE_ID,
        purchase._id,
      )}`;
      const metadata = {
        app: PAYMENT_APP,
        purchaseId: purchase._id,
        userId: user._id,
      };
      const checkout = await stripeComponent().createCheckoutSession(ctx, {
        // The component requires priceId. Its documented params override replaces
        // line_items entirely with our server-priced inline price below.
        priceId: "",
        mode: "payment",
        successUrl: returnUrl,
        cancelUrl: returnUrl,
        metadata,
        paymentIntentMetadata: metadata,
        params: {
          client_reference_id: user._id,
          customer_email: user.email,
          payment_method_types: ["card"],
          allow_promotion_codes: false,
          locale: language ?? "fr",
          line_items: [
            {
              quantity: 1,
              price_data: {
                currency: "eur",
                unit_amount: purchase.amount,
                tax_behavior: "inclusive",
                product_data: {
                  name: `the page · ${purchase.pageId ?? DEFAULT_PAGE_ID} · #${purchase.position}`,
                },
              },
            },
          ],
        },
      });
      if (!checkout.url)
        throw new Error("Stripe did not return a checkout URL");
      await ctx.runMutation(internal.purchases.attachCheckout, {
        purchaseId: purchase._id,
        checkoutId: checkout.sessionId,
        checkoutUrl: checkout.url,
      });
      return {
        purchaseId: purchase._id,
        url: checkout.url,
        reservedUntil: purchase.reservedUntil,
      };
    } catch {
      // Ambiguous failures may leave a payable session. Its metadata lets a
      // later signed webhook refund it after this reservation has been released.
      await ctx.runMutation(internal.purchases.close, {
        purchaseId: purchase._id,
        reason: "checkout_creation_failed",
        failed: true,
      });
      throw new ConvexError("Le paiement n’a pas pu être ouvert. Réessayez.");
    }
  },
});

async function retry(ctx: ActionCtx, purchaseId: Id<"purchases">) {
  await ctx.scheduler.runAfter(60_000, internal.payments.reconcile, {
    purchaseId,
  });
}

export const reconcile = internalAction({
  args: { purchaseId: v.id("purchases") },
  handler: async (ctx, { purchaseId }): Promise<void> => {
    const purchase = await ctx.runQuery(internal.purchases.get, { purchaseId });
    if (
      !purchase ||
      ["published", "refunded", "failed", "expired"].includes(purchase.status)
    )
      return;
    if (purchase.paymentProvider !== "stripe") {
      // Historical provider IDs must never be sent to Stripe.
      await ctx.runMutation(internal.purchases.close, {
        purchaseId,
        reason: "payment_provider_replaced",
        failed: true,
      });
      return;
    }
    if (purchase.status === "refund_pending") {
      await ctx.runAction(internal.payments.refund, { purchaseId });
      return;
    }
    if (!purchase.checkoutId) {
      if (Date.now() >= purchase.reservedUntil)
        await ctx.runMutation(internal.purchases.close, {
          purchaseId,
          reason: "checkout_not_created",
          failed: true,
        });
      return;
    }
    try {
      const stripe = stripeClient();
      const session = await stripe.checkout.sessions.retrieve(
        purchase.checkoutId,
        {
          expand: ["payment_intent.latest_charge"],
        },
      );
      if (session.payment_status === "paid") {
        if (!(await applySession(ctx, session))) await retry(ctx, purchaseId);
      } else if (session.status === "complete") {
        // Completed but unsettled sessions must retain their reservation.
        await retry(ctx, purchaseId);
      } else if (
        session.status === "expired" ||
        Date.now() >= purchase.reservedUntil
      ) {
        // Stripe's automatic expiry has a 30-minute minimum. Explicitly expire
        // the session at our five-minute deadline before releasing the slot.
        // If completion races with expiration, retry and re-read the payment.
        if (session.status !== "expired") {
          const expired = await stripe.checkout.sessions.expire(session.id);
          if (expired.status !== "expired")
            throw new Error("Checkout is still payable");
        }
        await ctx.runMutation(internal.purchases.close, {
          purchaseId,
          reason: "reservation_expired",
        });
      }
    } catch {
      // Keep the reservation while Stripe is unreachable; cron also recovers it.
      await retry(ctx, purchaseId);
    }
  },
});

export const refresh = action({
  args: { purchaseId: v.string() },
  handler: async (ctx, { purchaseId }): Promise<void> => {
    const user = await requireUser(ctx);
    await rateLimiter.limit(ctx, "checkoutRefresh", {
      key: user._id,
      throws: true,
    });
    const purchase = await ctx.runQuery(internal.purchases.findOwned, {
      purchaseId,
      userId: user._id,
    });
    if (purchase)
      await ctx.runAction(internal.payments.reconcile, {
        purchaseId: purchase._id,
      });
  },
});

export const verifyRefund = internalAction({
  args: { orderId: v.string() },
  handler: async (ctx, { orderId }): Promise<void> => {
    const intent = await stripeClient().paymentIntents.retrieve(orderId, {
      expand: ["latest_charge"],
    });
    if (intent.metadata.app !== PAYMENT_APP) return;
    if (intent.livemode !== (getStripeMode() === "live"))
      throw new Error("Stripe refund mode does not match this deployment");
    const charge = intent.latest_charge;
    if (!charge || typeof charge === "string") return;
    await ctx.runMutation(internal.purchases.markRefunded, {
      orderId,
      refundedAmount: charge.amount_refunded,
      complete: charge.amount_refunded >= charge.amount,
    });
  },
});

export const refund = internalAction({
  args: { purchaseId: v.id("purchases") },
  handler: async (ctx, { purchaseId }): Promise<void> => {
    const purchase = await ctx.runQuery(internal.purchases.get, { purchaseId });
    if (
      !purchase?.orderId ||
      purchase.paymentProvider !== "stripe" ||
      purchase.status !== "refund_pending"
    )
      return;
    if (
      !(await ctx.runMutation(internal.purchases.claimRefund, { purchaseId }))
    )
      return;
    try {
      const stripe = stripeClient();
      const intent = await stripe.paymentIntents.retrieve(purchase.orderId, {
        expand: ["latest_charge"],
      });
      if (
        intent.livemode !== (getStripeMode() === "live") ||
        intent.metadata.app !== PAYMENT_APP ||
        intent.metadata.purchaseId !== purchaseId
      )
        throw new Error("Refund payment does not match this purchase");
      const charge = intent.latest_charge;
      if (!charge || typeof charge === "string")
        throw new Error("Missing charge");
      if (charge.amount_refunded >= charge.amount) {
        await ctx.runMutation(internal.purchases.markRefunded, {
          orderId: intent.id,
          refundedAmount: charge.amount_refunded,
          complete: true,
        });
        return;
      }
      const existing = await stripe.refunds.list({
        payment_intent: intent.id,
        limit: 100,
      });
      const inFlight = existing.data.some(
        (r) => r.status === "pending" || r.status === "requires_action",
      );
      if (!inFlight) {
        // Refund the charged amount, including tax. A retry after an ambiguous
        // response uses the same key; a definitively failed refund can be retried.
        const failed = existing.data.find(
          (r) => r.status === "failed" || r.status === "canceled",
        );
        const result = await stripe.refunds.create(
          {
            payment_intent: intent.id,
            amount: charge.amount - charge.amount_refunded,
            metadata: { app: PAYMENT_APP, purchaseId },
          },
          {
            idempotencyKey: `refund:${purchaseId}:${charge.amount_refunded}:${failed?.id ?? "initial"}`,
          },
        );
        const refundedAmount =
          charge.amount_refunded +
          (result.status === "succeeded" ? result.amount : 0);
        await ctx.runMutation(internal.purchases.markRefunded, {
          orderId: intent.id,
          refundId: result.id,
          refundedAmount,
          complete: refundedAmount >= charge.amount,
        });
        if (refundedAmount >= charge.amount) return;
      }
    } catch {
      console.error("Refund pending; reconciliation will retry", purchaseId);
    }
    await retry(ctx, purchaseId);
  },
});

export const recover = internalAction({
  args: {},
  handler: async (ctx): Promise<void> => {
    const ids = await ctx.runQuery(internal.purchases.recoveryQueue, {});
    for (const purchaseId of ids)
      await ctx.scheduler.runAfter(0, internal.payments.reconcile, {
        purchaseId,
      });
  },
});
