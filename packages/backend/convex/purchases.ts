import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { RESERVATION_MS, priceFor, validateContent } from "./lib/content";
import { requireUser } from "./permissions";
import { DEFAULT_PAGE_ID } from "./lib/pages";
import { notifyPurchase } from "./lib/notifications";
import { rateLimiter } from "./lib/rateLimits";

async function release(ctx: MutationCtx, purchase: Doc<"purchases">) {
  const slot = await ctx.db.get(purchase.slotId);
  if (slot?.reservationId === purchase._id) {
    await ctx.db.patch(slot._id, {
      reservationId: undefined,
      reservedUntil: undefined,
    });
  }
}

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const purchases = await ctx.db
      .query("purchases")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(100);
    // Always include owned places, even when their purchase is older than the
    // bounded history, across all pages.
    const slots = await ctx.db.query("slots").collect();
    const current = await Promise.all(
      slots
        .filter((slot) => slot.currentPurchaseId)
        .map((slot) => ctx.db.get(slot.currentPurchaseId!)),
    );
    const included = new Set(purchases.map((purchase) => purchase._id));
    for (const purchase of current) {
      if (purchase?.userId === user._id && !included.has(purchase._id))
        purchases.push(purchase);
    }
    purchases.sort((a, b) => b._creationTime - a._creationTime);
    const slotsById = new Map(slots.map((slot) => [slot._id, slot]));
    return await Promise.all(
      purchases.map(async (purchase) => {
        const slot = slotsById.get(purchase.slotId);
        const current = slot?.currentPurchaseId === purchase._id;
        return {
          id: purchase._id,
          slotId: purchase.slotId,
          pageId: purchase.pageId ?? slot?.pageId ?? DEFAULT_PAGE_ID,
          position: purchase.position,
          word: current ? slot.word : purchase.word,
          url: current ? slot.url : purchase.url,
          description: current ? slot.description : purchase.description,
          status: purchase.status,
          amount: purchase.amount,
          createdAt: purchase._creationTime,
          current,
          hidden: current && slot.visibility !== "visible",
          checkoutUrl:
            purchase.status === "pending" && purchase.reservedUntil > Date.now()
              ? purchase.checkoutUrl
              : undefined,
        };
      }),
    );
  },
});

export const status = query({
  args: { purchaseId: v.string() },
  handler: async (ctx, { purchaseId }) => {
    const user = await requireUser(ctx);
    const id = ctx.db.normalizeId("purchases", purchaseId);
    const purchase = id ? await ctx.db.get(id) : null;
    if (!purchase || purchase.userId !== user._id) return null;
    const slot = await ctx.db.get(purchase.slotId);
    return {
      status: purchase.status,
      pageId: purchase.pageId ?? slot?.pageId ?? DEFAULT_PAGE_ID,
      position: purchase.position,
      current: slot?.currentPurchaseId === purchase._id,
    };
  },
});

export const get = internalQuery({
  args: { purchaseId: v.id("purchases") },
  handler: async (ctx, { purchaseId }) => await ctx.db.get(purchaseId),
});

export const findOwned = internalQuery({
  args: { purchaseId: v.string(), userId: v.string() },
  handler: async (ctx, { purchaseId, userId }) => {
    const id = ctx.db.normalizeId("purchases", purchaseId);
    const purchase = id ? await ctx.db.get(id) : null;
    return purchase?.userId === userId ? purchase : null;
  },
});

export const claimCheckout = internalMutation({
  args: { purchaseId: v.id("purchases") },
  handler: async (ctx, { purchaseId }) => {
    const purchase = await ctx.db.get(purchaseId);
    if (!purchase || purchase.status !== "creating" || purchase.checkoutClaimed)
      return false;
    await ctx.db.patch(purchaseId, { checkoutClaimed: true });
    return true;
  },
});

export const reserve = internalMutation({
  args: {
    userId: v.string(),
    slotId: v.id("slots"),
    acquisition: v.number(),
    word: v.string(),
    url: v.optional(v.string()),
    description: v.optional(v.string()),
    language: v.optional(v.union(v.literal("fr"), v.literal("en"))),
  },
  handler: async (ctx, args): Promise<Doc<"purchases">> => {
    const content = validateContent(args.word, args.url, args.description);
    const slot = await ctx.db.get(args.slotId);
    if (!slot) throw new ConvexError("Emplacement introuvable.");
    if (slot.currentPurchaseId) {
      const owner = await ctx.db.get(slot.currentPurchaseId);
      if (owner?.userId === args.userId)
        throw new ConvexError(
          "Cet emplacement vous appartient. Modifiez votre mot gratuitement dans Mes mots.",
        );
    }
    if (slot.acquisitions !== args.acquisition)
      throw new ConvexError("Le prix a changé. Vérifiez le nouveau montant.");
    const recent = await ctx.db
      .query("purchases")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(10);
    const active = recent.find(
      (p) => p.status === "creating" || p.status === "pending",
    );
    if (active) {
      if (
        active.slotId === slot._id &&
        active.word === content.word &&
        active.url === content.url &&
        active.description === content.description &&
        active.reservedUntil > Date.now()
      )
        return active;
      throw new ConvexError(
        "Terminez votre paiement en cours ou attendez la fin de sa réservation.",
      );
    }
    if (slot.reservationId)
      throw new ConvexError(
        "Un paiement est déjà en cours sur cet emplacement.",
      );
    // Reusing an existing checkout above does not consume another reservation.
    // This quota is committed atomically with the new purchase.
    await rateLimiter.limit(ctx, "purchaseReservation", {
      key: args.userId,
      throws: true,
    });
    const reservedUntil = Date.now() + RESERVATION_MS;
    const id = await ctx.db.insert("purchases", {
      slotId: slot._id,
      pageId: slot.pageId ?? DEFAULT_PAGE_ID,
      position: slot.position,
      userId: args.userId,
      ...content,
      acquisition: slot.acquisitions,
      amount: priceFor(slot.acquisitions),
      status: "creating",
      reservedUntil,
      language: args.language,
    });
    await ctx.db.patch(slot._id, { reservationId: id, reservedUntil });
    await ctx.scheduler.runAfter(RESERVATION_MS, internal.payments.reconcile, {
      purchaseId: id,
    });
    return (await ctx.db.get(id))!;
  },
});

export const attachCheckout = internalMutation({
  args: {
    purchaseId: v.id("purchases"),
    checkoutId: v.string(),
    checkoutUrl: v.string(),
  },
  handler: async (ctx, { purchaseId, checkoutId, checkoutUrl }) => {
    const purchase = await ctx.db.get(purchaseId);
    if (!purchase) throw new Error("Purchase not found");
    if (purchase.checkoutId && purchase.checkoutId !== checkoutId)
      throw new Error("Checkout mismatch");
    await ctx.db.patch(purchaseId, {
      checkoutId,
      checkoutUrl,
      ...(purchase.status === "creating" ? { status: "pending" as const } : {}),
    });
  },
});

export const close = internalMutation({
  args: {
    purchaseId: v.id("purchases"),
    reason: v.string(),
    failed: v.optional(v.boolean()),
  },
  handler: async (ctx, { purchaseId, reason, failed }) => {
    const purchase = await ctx.db.get(purchaseId);
    if (!purchase || !["creating", "pending"].includes(purchase.status)) return;
    await ctx.db.patch(purchaseId, {
      status: failed ? "failed" : "expired",
      failureReason: reason,
    });
    await release(ctx, purchase);
  },
});

export const paidOrder = v.object({
  id: v.string(),
  checkoutId: v.string(),
  purchaseId: v.string(),
  userId: v.string(),
  productId: v.string(),
  amount: v.number(),
  currency: v.string(),
  refundedAmount: v.number(),
});

export const applyPaidOrder = internalMutation({
  args: { order: paidOrder },
  handler: async (
    ctx,
    { order },
  ): Promise<"published" | "refund_pending" | "ignored"> => {
    const id = ctx.db.normalizeId("purchases", order.purchaseId);
    const purchase = id ? await ctx.db.get(id) : null;
    if (!purchase) return "ignored";
    // Never let unrelated orders overwrite an already bound order or checkout.
    if (
      (purchase.orderId && purchase.orderId !== order.id) ||
      (purchase.checkoutId && purchase.checkoutId !== order.checkoutId)
    )
      return "ignored";
    if (
      purchase.status === "published" ||
      purchase.status === "refunded" ||
      purchase.status === "refund_pending"
    )
      return "ignored";
    const other = await ctx.db
      .query("purchases")
      .withIndex("by_order", (q) => q.eq("orderId", order.id))
      .unique();
    if (other && other._id !== purchase._id) return "ignored";
    const slot = await ctx.db.get(purchase.slotId);
    const valid =
      order.userId === purchase.userId &&
      order.productId === process.env.POLAR_PRODUCT_ID &&
      order.amount === purchase.amount &&
      order.currency === "eur" &&
      order.refundedAmount === 0;
    // A delayed webhook can still publish after five minutes if reconciliation
    // has not released the reservation. A released reservation never publishes.
    const ownsReservation =
      slot?.reservationId === purchase._id &&
      slot.acquisitions === purchase.acquisition &&
      (purchase.status === "creating" || purchase.status === "pending");
    await ctx.db.patch(purchase._id, {
      orderId: order.id,
      checkoutId: order.checkoutId,
    });
    if (!valid || !ownsReservation) {
      await ctx.db.patch(purchase._id, {
        status: "refund_pending",
        failureReason: valid ? "reservation_released" : "invalid_order",
      });
      await release(ctx, purchase);
      await ctx.scheduler.runAfter(0, internal.payments.refund, {
        purchaseId: purchase._id,
      });
      return "refund_pending";
    }
    await ctx.db.patch(slot._id, {
      acquisitions: slot.acquisitions + 1,
      currentPurchaseId: purchase._id,
      word: purchase.word,
      url: purchase.url,
      description: purchase.description,
      visibility: "visible",
      reservationId: undefined,
      reservedUntil: undefined,
    });
    await ctx.db.patch(purchase._id, {
      status: "published",
      publishedAt: Date.now(),
    });
    await notifyPurchase(ctx, purchase, slot);
    return "published";
  },
});

export const markRefunded = internalMutation({
  args: {
    orderId: v.string(),
    refundedAmount: v.number(),
    refundId: v.optional(v.string()),
    complete: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const purchase = await ctx.db
      .query("purchases")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .unique();
    if (!purchase) return;
    await ctx.db.patch(purchase._id, {
      refundedAmount: args.refundedAmount,
      refundId: args.refundId ?? purchase.refundId,
    });
    if (!args.complete && args.refundedAmount < purchase.amount) return;
    await ctx.db.patch(purchase._id, { status: "refunded" });
    await release(ctx, purchase);
    const slot = await ctx.db.get(purchase.slotId);
    if (slot?.currentPurchaseId === purchase._id) {
      await ctx.db.patch(slot._id, {
        currentPurchaseId: undefined,
        word: undefined,
        url: undefined,
        description: undefined,
        visibility: "visible",
      });
    }
  },
});

export const recoveryQueue = internalQuery({
  args: {},
  handler: async (ctx): Promise<Id<"purchases">[]> => {
    const groups = await Promise.all(
      (["creating", "pending", "refund_pending"] as const).map((status) =>
        ctx.db
          .query("purchases")
          .withIndex("by_status", (q) => q.eq("status", status))
          .take(100),
      ),
    );
    return groups
      .flat()
      .filter(
        (p) => p.status === "refund_pending" || p.reservedUntil <= Date.now(),
      )
      .map((p) => p._id);
  },
});

export const claimRefund = internalMutation({
  args: { purchaseId: v.id("purchases") },
  handler: async (ctx, { purchaseId }) => {
    const purchase = await ctx.db.get(purchaseId);
    if (
      !purchase ||
      purchase.status !== "refund_pending" ||
      (purchase.refundLeaseUntil ?? 0) > Date.now()
    )
      return false;
    await ctx.db.patch(purchaseId, { refundLeaseUntil: Date.now() + 60_000 });
    return true;
  },
});
