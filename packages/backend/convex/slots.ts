import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { SLOT_COUNT, priceFor, validateContent } from "./lib/content";
import { isAdminId, requireAdmin, requireUser } from "./permissions";
import { authComponent } from "./auth";
import { internal } from "./_generated/api";
import { DEFAULT_PAGE_ID, PAGES, type PageId } from "./lib/pages";
import { normalizeLanguage } from "./lib/language";
import { pageIdValidator } from "./schema";
import { rateLimiter } from "./lib/rateLimits";

async function pageSlots(ctx: QueryCtx, pageId: PageId) {
  const slots = await ctx.db
    .query("slots")
    .withIndex("by_page_position", (q) => q.eq("pageId", pageId))
    .collect();
  // World remains readable before the one-time initialization runs.
  if (pageId === DEFAULT_PAGE_ID) {
    slots.push(
      ...(await ctx.db
        .query("slots")
        .withIndex("by_page_position", (q) => q.eq("pageId", undefined))
        .collect()),
    );
    slots.sort((a, b) => a.position - b.position);
  }
  return slots;
}

export const initialize = internalMutation({
  args: {},
  handler: async (ctx) => {
    const slots = await ctx.db.query("slots").collect();
    // Preserve IDs, ownership, prices and reservations on the original page.
    for (const slot of slots) {
      if (!slot.pageId)
        await ctx.db.patch(slot._id, { pageId: DEFAULT_PAGE_ID });
    }
    const existing = new Set(
      slots.map((slot) => `${slot.pageId ?? DEFAULT_PAGE_ID}:${slot.position}`),
    );
    for (const page of PAGES) {
      for (let position = 1; position <= SLOT_COUNT; position++) {
        if (!existing.has(`${page.id}:${position}`))
          await ctx.db.insert("slots", {
            pageId: page.id,
            position,
            acquisitions: 0,
            visibility: "visible",
          });
      }
    }
  },
});

export const list = query({
  args: { pageId: v.optional(pageIdValidator) },
  handler: async (ctx, { pageId = DEFAULT_PAGE_ID }) => {
    const slots = await pageSlots(ctx, pageId);
    return slots.map((slot) => ({
      id: slot._id,
      pageId: slot.pageId ?? DEFAULT_PAGE_ID,
      position: slot.position,
      acquisitions: slot.acquisitions,
      price: priceFor(slot.acquisitions),
      word: slot.visibility === "visible" ? slot.word : undefined,
      url: slot.visibility === "visible" ? slot.url : undefined,
      description: slot.visibility === "visible" ? slot.description : undefined,
      // Expiry is reconciled with Stripe before a reservation is released.
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
    description: v.optional(v.string()),
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
      content = validateContent(args.word, args.url, args.description);
    } catch (error) {
      throw new ConvexError((error as Error).message);
    }
    await rateLimiter.limit(ctx, "updateContent", { key: user._id, throws: true });
    // Keep the original purchased content in the financial history.
    await ctx.db.patch(slot._id, content);
  },
});

export const adminList = query({
  args: { pageId: v.optional(pageIdValidator) },
  handler: async (ctx, { pageId = DEFAULT_PAGE_ID }) => {
    await requireAdmin(ctx);
    return await pageSlots(ctx, pageId);
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
    await rateLimiter.limit(ctx, "moderate", { key: admin._id, throws: true });
    const nextVisibility = action === "hide" ? "hidden" : "visible";
    const purchase = action !== "remove" && slot.visibility !== nextVisibility
      ? await ctx.db.get(purchaseId)
      : null;
    // Snapshot the current owner's edited word in the same transaction as moderation.
    // Repeating hide/show still writes an audit entry, but never sends another email.
    const email = purchase && purchase.slotId === slotId ? {
      userId: purchase.userId,
      word: slot.word ?? purchase.word,
      pageId: slot.pageId ?? purchase.pageId ?? DEFAULT_PAGE_ID,
      position: slot.position,
      language: normalizeLanguage(purchase.language),
      status: "pending" as const,
    } : undefined;
    if (action === "remove") {
      await ctx.db.patch(slotId, {
        visibility: "removed",
        currentPurchaseId: undefined,
        word: undefined,
        url: undefined,
        description: undefined,
      });
    } else {
      await ctx.db.patch(slotId, {
        visibility: nextVisibility,
      });
    }
    const logId = await ctx.db.insert("moderationLog", {
      slotId,
      purchaseId,
      adminId: admin._id,
      action,
      email,
    });
    if (email)
      await ctx.scheduler.runAfter(0, internal.notifications.sendModerationEmail, { logId });
  },
});
