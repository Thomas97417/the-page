import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const purchaseStatus = v.union(
  v.literal("creating"),
  v.literal("pending"),
  v.literal("published"),
  v.literal("expired"),
  v.literal("failed"),
  v.literal("refund_pending"),
  v.literal("refunded"),
);

export default defineSchema({
  slots: defineTable({
    position: v.number(),
    acquisitions: v.number(),
    currentPurchaseId: v.optional(v.id("purchases")),
    word: v.optional(v.string()),
    url: v.optional(v.string()),
    visibility: v.union(
      v.literal("visible"),
      v.literal("hidden"),
      v.literal("removed"),
    ),
    reservationId: v.optional(v.id("purchases")),
    reservedUntil: v.optional(v.number()),
  }).index("by_position", ["position"]),
  purchases: defineTable({
    slotId: v.id("slots"),
    position: v.number(),
    userId: v.string(),
    word: v.string(),
    url: v.optional(v.string()),
    acquisition: v.number(),
    amount: v.number(),
    status: purchaseStatus,
    reservedUntil: v.number(),
    checkoutId: v.optional(v.string()),
    checkoutUrl: v.optional(v.string()),
    orderId: v.optional(v.string()),
    refundId: v.optional(v.string()),
    publishedAt: v.optional(v.number()),
    refundedAmount: v.optional(v.number()),
    failureReason: v.optional(v.string()),
    refundLeaseUntil: v.optional(v.number()),
    checkoutClaimed: v.optional(v.boolean()),
  })
    .index("by_user", ["userId"])
    .index("by_checkout", ["checkoutId"])
    .index("by_order", ["orderId"])
    .index("by_status", ["status"]),
  moderationLog: defineTable({
    slotId: v.id("slots"),
    purchaseId: v.id("purchases"),
    adminId: v.string(),
    action: v.union(
      v.literal("hide"),
      v.literal("restore"),
      v.literal("remove"),
    ),
  }),
});
