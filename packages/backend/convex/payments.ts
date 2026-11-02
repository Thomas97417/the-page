import { ConvexError, v } from "convex/values";
import { checkoutsCreate } from "@polar-sh/sdk/funcs/checkoutsCreate.js";
import { checkoutsGet } from "@polar-sh/sdk/funcs/checkoutsGet.js";
import { productsGet } from "@polar-sh/sdk/funcs/productsGet.js";
import { ordersGet } from "@polar-sh/sdk/funcs/ordersGet.js";
import { ordersList } from "@polar-sh/sdk/funcs/ordersList.js";
import { refundsCreate } from "@polar-sh/sdk/funcs/refundsCreate.js";
import { refundsList } from "@polar-sh/sdk/funcs/refundsList.js";
import { action, internalAction, query } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { polar, paymentConfigured } from "./polar";
import { requireUser } from "./permissions";
import { normalizePaidOrder } from "./lib/orders";
import { DEFAULT_PAGE_ID, purchaseReturnPath } from "./lib/pages";

const REQUEST_OPTIONS = {
  timeoutMs: 20_000,
  retries: { strategy: "none" as const },
};

export const availability = query({
  args: {},
  handler: () => ({ configured: paymentConfigured(), sandbox: true }),
});

export const verifyOrder = internalAction({
  args: { orderId: v.string() },
  handler: async (ctx, { orderId }): Promise<void> => {
    // Read the current order: an old order.paid webhook can arrive after a refund.
    const result = await ordersGet(
      polar.polar,
      { id: orderId },
      REQUEST_OPTIONS,
    );
    if (!result.ok) throw result.error;
    const order = normalizePaidOrder(result.value);
    if (order)
      await ctx.runMutation(internal.purchases.applyPaidOrder, { order });
  },
});

export const start = action({
  args: {
    slotId: v.id("slots"),
    acquisition: v.number(),
    word: v.string(),
    url: v.optional(v.string()),
    description: v.optional(v.string()),
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
    const productId = process.env.POLAR_PRODUCT_ID!;
    const purchase = await ctx.runMutation(internal.purchases.reserve, {
      ...args,
      userId: user._id,
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
      const product = await productsGet(
        polar.polar,
        { id: productId },
        REQUEST_OPTIONS,
      );
      if (!product.ok || product.value.isRecurring || product.value.isArchived)
        throw new Error("Invalid sandbox product");
      const siteUrl = new URL(process.env.SITE_URL!).origin;
      const returnUrl = `${siteUrl}${purchaseReturnPath(
        purchase.pageId ?? DEFAULT_PAGE_ID,
        purchase._id,
      )}`;
      const checkout = await checkoutsCreate(
        polar.polar,
        {
          products: [productId],
          prices: {
            [productId]: [
              {
                amountType: "fixed",
                priceAmount: purchase.amount,
                priceCurrency: "eur",
                taxBehavior: "inclusive",
              },
            ],
          },
          allowDiscountCodes: false,
          externalCustomerId: user._id,
          customerEmail: user.email,
          customerName: user.name,
          metadata: { purchaseId: purchase._id },
          successUrl: returnUrl,
          returnUrl,
          locale: "fr",
        },
        REQUEST_OPTIONS,
      );
      if (!checkout.ok) throw checkout.error;
      await ctx.runMutation(internal.purchases.attachCheckout, {
        purchaseId: purchase._id,
        checkoutId: checkout.value.id,
        checkoutUrl: checkout.value.url,
      });
      return {
        purchaseId: purchase._id,
        url: checkout.value.url,
        reservedUntil: purchase.reservedUntil,
      };
    } catch {
      // Ambiguous failures can leave a checkout behind. Its metadata still
      // identifies this failed purchase, so a later payment is refunded.
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
      const checkout = await checkoutsGet(
        polar.polar,
        { id: purchase.checkoutId },
        REQUEST_OPTIONS,
      );
      if (!checkout.ok) throw checkout.error;
      if (checkout.value.status === "succeeded") {
        const orders = await ordersList(
          polar.polar,
          { checkoutId: purchase.checkoutId, limit: 10 },
          REQUEST_OPTIONS,
        );
        if (!orders.ok) throw orders.error;
        const paid = orders.value.result.items.find((order) => order.paid);
        const normalized = paid && normalizePaidOrder(paid);
        if (!normalized) {
          await retry(ctx, purchaseId);
          return;
        }
        await ctx.runMutation(internal.purchases.applyPaidOrder, {
          order: normalized,
        });
      } else if (checkout.value.status === "confirmed") {
        await retry(ctx, purchaseId);
      } else if (
        Date.now() >= purchase.reservedUntil ||
        ["expired", "failed"].includes(checkout.value.status)
      ) {
        await ctx.runMutation(internal.purchases.close, {
          purchaseId,
          reason: "reservation_expired",
        });
      }
    } catch {
      // Keep the reservation when Polar is unreachable; cron also recovers it.
      await retry(ctx, purchaseId);
    }
  },
});

export const refresh = action({
  args: { purchaseId: v.string() },
  handler: async (ctx, { purchaseId }): Promise<void> => {
    const user = await requireUser(ctx);
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

export const refund = internalAction({
  args: { purchaseId: v.id("purchases") },
  handler: async (ctx, { purchaseId }): Promise<void> => {
    const purchase = await ctx.runQuery(internal.purchases.get, { purchaseId });
    if (!purchase?.orderId || purchase.status !== "refund_pending") return;
    if (
      !(await ctx.runMutation(internal.purchases.claimRefund, { purchaseId }))
    )
      return;
    try {
      const order = await ordersGet(
        polar.polar,
        { id: purchase.orderId },
        REQUEST_OPTIONS,
      );
      if (!order.ok) throw order.error;
      const refunded =
        order.value.refundedAmount + order.value.refundedTaxAmount;
      if (refunded >= order.value.totalAmount) {
        await ctx.runMutation(internal.purchases.markRefunded, {
          orderId: order.value.id,
          refundedAmount: refunded,
          complete: true,
        });
        return;
      }
      const existing = await refundsList(
        polar.polar,
        { orderId: purchase.orderId, limit: 100 },
        REQUEST_OPTIONS,
      );
      if (!existing.ok) throw existing.error;
      const inFlight = existing.value.result.items.some(
        (r) =>
          r.status === "pending" ||
          (r.status === "succeeded" && r.metadata.purchaseId === purchaseId),
      );
      if (!inFlight) {
        // Polar refunds take the amount BEFORE tax and refund its tax as well.
        const result = await refundsCreate(
          polar.polar,
          {
            orderId: purchase.orderId,
            amount: order.value.netAmount - order.value.refundedAmount,
            reason: "service_disruption",
            comment: "Emplacement indisponible ou commande invalide.",
            metadata: { purchaseId },
          },
          REQUEST_OPTIONS,
        );
        if (!result.ok) throw result.error;
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
