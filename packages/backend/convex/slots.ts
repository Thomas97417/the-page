import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { SLOT_COUNT, priceFor, validateContent } from "./lib/content";
import { isAdminId, requireAdmin, requireUser } from "./permissions";
import { authComponent } from "./auth";

export const initialize = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = new Set(
      (await ctx.db.query("slots").collect()).map((slot) => slot.position),
    );
    for (let position = 1; position <= SLOT_COUNT; position++) {
      if (!existing.has(position))
        await ctx.db.insert("slots", {
          position,
          acquisitions: 0,
          visibility: "visible",
        });
    }
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const slots = await ctx.db
      .query("slots")
      .withIndex("by_position")
      .collect();
    return slots.map((slot) => ({
      id: slot._id,
      position: slot.position,
      acquisitions: slot.acquisitions,
      price: priceFor(slot.acquisitions),
      word: slot.visibility === "visible" ? slot.word : undefined,
      url: slot.visibility === "visible" ? slot.url : undefined,
      // Expiry is reconciled with Polar before a reservation is released.
      reserved: !!slot.reservationId,
    }));
  },
});

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    return user ? { id: user._id, isAdmin: isAdminId(user._id) } : null;
  },
});

export const updateContent = mutation({
  args: {
    slotId: v.id("slots"),
    purchaseId: v.id("purchases"),
    word: v.string(),
    url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const slot = await ctx.db.get(args.slotId);
    const purchase = await ctx.db.get(args.purchaseId);
    if (
      !slot ||
      !purchase ||
      slot.currentPurchaseId !== purchase._id ||
      purchase.userId !== user._id
    ) {
      throw new ConvexError("Cet emplacement ne vous appartient plus.");
    }
    if (slot.visibility !== "visible")
      throw new ConvexError("Ce mot a été retiré par la modération.");
    let content;
    try {
      content = validateContent(args.word, args.url);
    } catch (error) {
      throw new ConvexError((error as Error).message);
    }
    // Keep the original purchased content in the financial history.
    await ctx.db.patch(slot._id, content);
  },
});

export const adminList = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("slots").withIndex("by_position").collect();
  },
});

export const moderate = mutation({
  args: {
    slotId: v.id("slots"),
    purchaseId: v.id("purchases"),
    action: v.union(
      v.literal("hide"),
      v.literal("restore"),
      v.literal("remove"),
    ),
  },
  handler: async (ctx, { slotId, purchaseId, action }) => {
    const admin = await requireAdmin(ctx);
    const slot = await ctx.db.get(slotId);
    if (!slot || slot.currentPurchaseId !== purchaseId)
      throw new ConvexError("Le propriétaire a changé. Actualisez la liste.");
    if (action === "remove") {
      await ctx.db.patch(slotId, {
        visibility: "removed",
        currentPurchaseId: undefined,
        word: undefined,
        url: undefined,
      });
    } else {
      await ctx.db.patch(slotId, {
        visibility: action === "hide" ? "hidden" : "visible",
      });
    }
    await ctx.db.insert("moderationLog", {
      slotId,
      purchaseId,
      adminId: admin._id,
      action,
    });
  },
});
