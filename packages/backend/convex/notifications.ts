import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { Resend } from "@convex-dev/resend";
import { components, internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { authComponent } from "./auth";
import { requireUser } from "./permissions";
import { wordNotificationEmail } from "./lib/notificationEmail";
import { rateLimiter } from "./lib/rateLimits";

async function reclaimDraft(ctx: QueryCtx, notification: Doc<"notifications">) {
  const slot = await ctx.db.get(notification.slotId);
  if (!slot || notification.kind !== "word_replaced") return null;
  return {
    slotId: slot._id,
    pageId: notification.pageId,
    position: slot.position,
    acquisition: slot.acquisitions,
    word: notification.word,
    url: notification.url ?? "",
    description: notification.description,
  };
}

export const list = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    const user = await requireUser(ctx);
    const result = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .paginate(paginationOpts);
    return {
      ...result,
      page: await Promise.all(result.page.map(async (notification) => ({
        id: notification._id,
        kind: notification.kind,
        word: notification.word,
        pageId: notification.pageId,
        position: notification.position,
        createdAt: notification._creationTime,
        read: notification.readAt !== undefined,
        draft: await reclaimDraft(ctx, notification),
      }))),
    };
  },
});

export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    // An active subscription can rerun after logout or session revocation.
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return 0;
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) => q.eq("userId", user._id).eq("readAt", undefined))
      .take(100);
    return unread.length;
  },
});

export const reclaim = query({
  args: { notificationId: v.string() },
  handler: async (ctx, { notificationId }) => {
    const user = await requireUser(ctx);
    const id = ctx.db.normalizeId("notifications", notificationId);
    const notification = id ? await ctx.db.get(id) : null;
    if (!notification || notification.userId !== user._id) return null;
    const draft = await reclaimDraft(ctx, notification);
    return draft ? { notificationId: notification._id, draft } : null;
  },
});

export const markRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, { notificationId }) => {
    const user = await requireUser(ctx);
    await rateLimiter.limit(ctx, "notificationRead", { key: user._id, throws: true });
    const notification = await ctx.db.get(notificationId);
    if (notification?.userId === user._id && notification.readAt === undefined)
      await ctx.db.patch(notificationId, { readAt: Date.now() });
  },
});

async function markReadBatch(ctx: MutationCtx, userId: string, before: number) {
  const unread = await ctx.db
    .query("notifications")
    .withIndex("by_user_read", (q) =>
      q.eq("userId", userId).eq("readAt", undefined).lte("_creationTime", before),
    )
    .take(100);
  for (const notification of unread)
    await ctx.db.patch(notification._id, { readAt: before });
  if (unread.length === 100)
    await ctx.scheduler.runAfter(0, internal.notifications.continueMarkAllRead, { userId, before });
}

export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    await rateLimiter.limit(ctx, "notificationRead", { key: user._id, throws: true });
    await markReadBatch(ctx, user._id, Date.now());
  },
});

export const continueMarkAllRead = internalMutation({
  args: { userId: v.string(), before: v.number() },
  handler: async (ctx, { userId, before }) => {
    await markReadBatch(ctx, userId, before);
  },
});

export const sendEmail = internalMutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, { notificationId }) => {
    const notification = await ctx.db.get(notificationId);
    if (!notification || notification.emailStatus !== "pending") return;
    const user = await authComponent.getAnyUserById(ctx, notification.userId);
    if (!user) {
      await ctx.db.patch(notificationId, { emailStatus: "skipped" });
      return;
    }
    const { EMAIL_FROM, RESEND_API_KEY, SITE_URL } = process.env;
    // Keep the outbox pending so configuration problems cannot lose an email.
    if (!EMAIL_FROM || !RESEND_API_KEY || !SITE_URL) return;
    const email = wordNotificationEmail(notification, SITE_URL);
    const resend = new Resend(components.resend, { testMode: false, apiKey: RESEND_API_KEY });
    // Enqueueing and updating the outbox share a transaction, including retries.
    const emailId = await resend.sendEmail(ctx, { from: EMAIL_FROM, to: user.email, ...email });
    await ctx.db.patch(notificationId, { emailStatus: "queued", emailId });
  },
});

export const sendModerationEmail = internalMutation({
  args: { logId: v.id("moderationLog") },
  handler: async (ctx, { logId }) => {
    const log = await ctx.db.get(logId);
    if (!log?.email || log.email.status !== "pending") return;
    const user = await authComponent.getAnyUserById(ctx, log.email.userId);
    if (!user || log.action === "remove") {
      await ctx.db.patch(logId, { email: { ...log.email, status: "skipped" } });
      return;
    }
    const { EMAIL_FROM, RESEND_API_KEY, SITE_URL } = process.env;
    if (!EMAIL_FROM || !RESEND_API_KEY || !SITE_URL) return;
    const content = wordNotificationEmail({
      ...log.email,
      kind: log.action === "hide" ? "word_hidden" : "word_restored",
    }, SITE_URL);
    const resend = new Resend(components.resend, { testMode: false, apiKey: RESEND_API_KEY });
    const emailId = await resend.sendEmail(ctx, {
      from: EMAIL_FROM,
      to: user.email,
      ...content,
      idempotencyKey: `moderation:${logId}`,
    });
    await ctx.db.patch(logId, { email: { ...log.email, status: "queued", emailId } });
  },
});

export const recoverEmails = internalMutation({
  args: {},
  handler: async (ctx) => {
    const pending = await ctx.db.query("notifications")
      .withIndex("by_email_status", (q) => q.eq("emailStatus", "pending"))
      .take(100);
    for (const notification of pending)
      await ctx.scheduler.runAfter(0, internal.notifications.sendEmail, { notificationId: notification._id });
    const moderation = await ctx.db.query("moderationLog")
      .withIndex("by_email_status", (q) => q.eq("email.status", "pending"))
      .take(100);
    for (const log of moderation)
      await ctx.scheduler.runAfter(0, internal.notifications.sendModerationEmail, { logId: log._id });
  },
});
