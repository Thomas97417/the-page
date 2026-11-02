import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { DEFAULT_PAGE_ID } from "./pages";
import { normalizeLanguage } from "./language";

// Called only by the atomic transition to "published", after order validation.
export async function notifyPurchase(
  ctx: MutationCtx,
  purchase: Doc<"purchases">,
  previousSlot: Doc<"slots">,
) {
  const location = {
    purchaseId: purchase._id,
    slotId: previousSlot._id,
    pageId: purchase.pageId ?? previousSlot.pageId ?? DEFAULT_PAGE_ID,
    position: previousSlot.position,
    emailStatus: "pending" as const,
  };
  const confirmed = await ctx.db.insert("notifications", {
    ...location,
    userId: purchase.userId,
    kind: "purchase_confirmed",
    word: purchase.word,
    language: normalizeLanguage(purchase.language),
  });
  await ctx.scheduler.runAfter(0, internal.notifications.sendEmail, {
    notificationId: confirmed,
  });

  const previous = previousSlot.currentPurchaseId
    ? await ctx.db.get(previousSlot.currentPurchaseId)
    : null;
  if (!previous || previous.userId === purchase.userId) return;
  const replaced = await ctx.db.insert("notifications", {
    ...location,
    userId: previous.userId,
    kind: "word_replaced",
    // Preserve the owner's latest edits for a future repurchase.
    word: previousSlot.word ?? previous.word,
    url: previousSlot.url,
    description: previousSlot.description,
    language: normalizeLanguage(previous.language),
  });
  await ctx.scheduler.runAfter(0, internal.notifications.sendEmail, {
    notificationId: replaced,
  });
}
