/// <reference types="vite/client" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import betterAuth from "@convex-dev/better-auth/test";
import resendTest from "@convex-dev/resend/test";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { Resend } from "@convex-dev/resend";
import schema from "../convex/schema";
import { api, components, internal } from "../convex/_generated/api";
import type { Doc, Id } from "../convex/_generated/dataModel";
import { wordNotificationEmail } from "../convex/lib/notificationEmail";

const modules = import.meta.glob("../convex/**/*.ts");
function setup() {
  const t = convexTest(schema, modules);
  t.registerComponent("betterAuth", betterAuth.schema, betterAuth.modules);
  resendTest.register(t);
  rateLimiterTest.register(t);
  return t;
}
type Test = ReturnType<typeof setup>;

async function account(t: Test, name: string) {
  const user = await t.mutation(components.betterAuth.adapter.create, {
    input: { model: "user", data: { name, email: `${name}@example.com`, emailVerified: true, createdAt: Date.now(), updatedAt: Date.now() } },
  });
  const session = await t.mutation(components.betterAuth.adapter.create, {
    input: { model: "session", data: { userId: user._id, token: name, expiresAt: Date.now() + 3_600_000, createdAt: Date.now(), updatedAt: Date.now() } },
  });
  return { id: user._id as string, client: t.withIdentity({ subject: user._id, sessionId: session._id }) };
}

async function place(t: Test) {
  return await t.run((ctx) => ctx.db.insert("slots", { pageId: "france", position: 12, acquisitions: 0, visibility: "visible" }));
}

async function reserve(t: Test, slotId: Id<"slots">, userId: string, word = "Bonjour", language: "fr" | "en" = "fr") {
  const slot = (await t.run((ctx) => ctx.db.get(slotId)))!;
  return await t.mutation(internal.purchases.reserve, { slotId, userId, acquisition: slot.acquisitions, word, language });
}

function order(purchase: Doc<"purchases">) {
  return { id: `order-${purchase._id}`, checkoutId: `checkout-${purchase._id}`, purchaseId: purchase._id, userId: purchase.userId, productId: "product", amount: purchase.amount, currency: "eur", refundedAmount: 0 };
}
async function publish(t: Test, purchase: Doc<"purchases">) {
  return await t.mutation(internal.purchases.applyPaidOrder, { order: order(purchase) });
}
const inbox = (t: Test) => t.run((ctx) => ctx.db.query("notifications").collect());

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-03T10:00:00Z"));
  vi.stubEnv("POLAR_PRODUCT_ID", "product");
  vi.stubEnv("SITE_URL", "https://the-page.example");
  vi.stubEnv("EMAIL_FROM", "the page <hello@the-page.example>");
  vi.stubEnv("RESEND_API_KEY", "test-key");
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("purchase notifications", () => {
  it("notifies both owners once, preserving the lost word's latest content and language", async () => {
    const t = setup();
    const first = await account(t, "first");
    const second = await account(t, "second");
    const slotId = await place(t);
    const original = await reserve(t, slotId, first.id, "Hello", "en");
    expect(await inbox(t)).toEqual([]);
    await publish(t, original);
    await first.client.mutation(api.slots.updateContent, { slotId, purchaseId: original._id, word: "Libre", url: "https://example.com/", description: "Notre histoire." });
    const next = await reserve(t, slotId, second.id, "Demain");
    await publish(t, next);
    await publish(t, original);
    await publish(t, next);

    const notifications = await inbox(t);
    expect(notifications).toHaveLength(3);
    expect(notifications.filter((n) => n.kind === "purchase_confirmed")).toHaveLength(2);
    const lost = notifications.find((n) => n.kind === "word_replaced")!;
    expect(lost).toMatchObject({ userId: first.id, purchaseId: next._id, pageId: "france", position: 12, word: "Libre", description: "Notre histoire.", url: "https://example.com/", language: "en", emailStatus: "pending" });
    expect(await first.client.query(api.notifications.reclaim, { notificationId: lost._id })).toEqual({
      notificationId: lost._id,
      draft: { slotId, pageId: "france", position: 12, acquisition: 2, word: "Libre", url: "https://example.com/", description: "Notre histoire." },
    });
    const jobs = await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect());
    expect(jobs.filter((job) => job.name === "notifications:sendEmail")).toHaveLength(3);
  });

  it("does not notify for failed, expired, invalid or refunded payments", async () => {
    const t = setup();
    const slotId = await place(t);
    const expired = await reserve(t, slotId, "expired");
    await t.mutation(internal.purchases.close, { purchaseId: expired._id, reason: "expired" });
    expect(await publish(t, expired)).toBe("refund_pending");
    const invalid = await reserve(t, slotId, "invalid");
    await t.mutation(internal.purchases.applyPaidOrder, { order: { ...order(invalid), amount: 1 } });
    const failed = await reserve(t, slotId, "failed");
    await t.mutation(internal.purchases.close, { purchaseId: failed._id, reason: "failed", failed: true });
    await t.mutation(internal.purchases.markRefunded, { orderId: order(invalid).id, refundedAmount: invalid.amount, complete: true });
    expect(await publish(t, invalid)).toBe("ignored");
    expect(await inbox(t)).toEqual([]);
  });

  it("isolates inboxes, read state and reclaim links between authenticated accounts", async () => {
    const t = setup();
    const first = await account(t, "first");
    const second = await account(t, "second");
    const slotId = await place(t);
    await publish(t, await reserve(t, slotId, first.id));
    await publish(t, await reserve(t, slotId, second.id, "Demain"));
    const notifications = await inbox(t);
    const lost = notifications.find((n) => n.kind === "word_replaced")!;
    expect(await first.client.query(api.notifications.unreadCount)).toBe(2);
    expect(await second.client.query(api.notifications.unreadCount)).toBe(1);
    expect(await t.query(api.notifications.unreadCount)).toBe(0);
    await expect(t.query(api.notifications.list, { paginationOpts: { numItems: 20, cursor: null } })).rejects.toThrow("Connectez-vous");
    await expect(t.mutation(api.notifications.markRead, { notificationId: lost._id })).rejects.toThrow("Connectez-vous");
    expect(await second.client.query(api.notifications.reclaim, { notificationId: lost._id })).toBeNull();
    expect(await first.client.query(api.notifications.reclaim, { notificationId: "invalid" })).toBeNull();
    await second.client.mutation(api.notifications.markRead, { notificationId: lost._id });
    expect(await first.client.query(api.notifications.unreadCount)).toBe(2);
    await first.client.mutation(api.notifications.markRead, { notificationId: lost._id });
    expect(await first.client.query(api.notifications.unreadCount)).toBe(1);
    vi.setSystemTime(Date.now() + 1000);
    await first.client.mutation(api.notifications.markAllRead);
    expect(await first.client.query(api.notifications.unreadCount)).toBe(0);
    expect(await second.client.query(api.notifications.unreadCount)).toBe(1);
    const list = await first.client.query(api.notifications.list, { paginationOpts: { numItems: 1, cursor: null } });
    expect(list.page).toHaveLength(1);
    expect(list.page[0]).toMatchObject({ id: lost._id, read: true });
    expect(list.isDone).toBe(false);
    expect(JSON.stringify(list)).not.toContain("emailStatus");
    expect(JSON.stringify(list)).not.toContain(second.id);
  });

  it("marks a large inbox in batches while leaving later events unread", async () => {
    const t = setup();
    const owner = await account(t, "owner");
    const p = await reserve(t, await place(t), owner.id);
    await publish(t, p);
    const original = (await inbox(t))[0]!;
    const { _id: _id, _creationTime: _creationTime, ...fields } = original;
    await t.run(async (ctx) => {
      for (let i = 0; i < 124; i++) await ctx.db.insert("notifications", fields);
    });
    expect(await owner.client.query(api.notifications.unreadCount)).toBe(100);
    vi.setSystemTime(Date.now() + 1000);
    const before = Date.now();
    await owner.client.mutation(api.notifications.markAllRead);
    expect(await owner.client.query(api.notifications.unreadCount)).toBe(25);
    vi.setSystemTime(Date.now() + 1000);
    await t.run((ctx) => ctx.db.insert("notifications", fields));
    await t.mutation(internal.notifications.continueMarkAllRead, { userId: owner.id, before });
    expect(await owner.client.query(api.notifications.unreadCount)).toBe(1);
  });

  it("returns an empty badge when a session expires while its Convex identity still exists", async () => {
    const t = setup();
    const owner = await account(t, "expired-owner");
    await publish(t, await reserve(t, await place(t), owner.id));
    expect(await owner.client.query(api.notifications.unreadCount)).toBe(1);
    vi.setSystemTime(Date.now() + 3_600_001);
    expect(await owner.client.query(api.notifications.unreadCount)).toBe(0);
    await expect(owner.client.query(api.notifications.list, { paginationOpts: { numItems: 20, cursor: null } })).rejects.toThrow("Connectez-vous");
  });
});

describe("notification email outbox", () => {
  it("enqueues each recipient in Resend once, with a localized email and a link to reclaim the correct place", async () => {
    const t = setup();
    const first = await account(t, "first");
    const second = await account(t, "second");
    const slotId = await place(t);
    await publish(t, await reserve(t, slotId, first.id, "Hello", "en"));
    await publish(t, await reserve(t, slotId, second.id, "Demain", "fr"));
    const send = vi.spyOn(Resend.prototype, "sendEmail");
    for (const n of await inbox(t)) {
      await t.mutation(internal.notifications.sendEmail, { notificationId: n._id });
      await t.mutation(internal.notifications.sendEmail, { notificationId: n._id });
    }
    expect(send).toHaveBeenCalledTimes(3);
    for (const n of await inbox(t)) {
      expect(n.emailStatus).toBe("queued");
      const email = await t.query(components.resend.lib.get, { emailId: n.emailId! });
      expect(email?.to).toEqual([`${n.userId === first.id ? "first" : "second"}@example.com`]);
      expect(email?.text).toContain(n.word);
      expect(email?.html).toContain(`lang="${n.language}"`);
      if (n.kind === "word_replaced") {
        expect(email?.subject).toContain("Your word has been replaced");
        expect(email?.text).toContain(`https://the-page.example/france?reclaim=${encodeURIComponent(n._id)}#word-12`);
      } else {
        expect(email?.text).toContain("https://the-page.example/france#word-12");
      }
    }
  });

  it("keeps the email retryable when configuration is absent or enqueueing fails", async () => {
    const t = setup();
    const owner = await account(t, "owner");
    await publish(t, await reserve(t, await place(t), owner.id));
    const n = (await inbox(t))[0]!;
    vi.stubEnv("RESEND_API_KEY", "");
    await t.mutation(internal.notifications.sendEmail, { notificationId: n._id });
    expect((await inbox(t))[0]?.emailStatus).toBe("pending");
    vi.stubEnv("RESEND_API_KEY", "test-key");
    const send = vi.spyOn(Resend.prototype, "sendEmail").mockRejectedValueOnce(new Error("outage"));
    await expect(t.mutation(internal.notifications.sendEmail, { notificationId: n._id })).rejects.toThrow("outage");
    expect((await inbox(t))[0]?.emailStatus).toBe("pending");
    expect((await t.query(internal.purchases.get, { purchaseId: n.purchaseId }))?.status).toBe("published");
    await t.mutation(internal.notifications.recoverEmails);
    await vi.advanceTimersByTimeAsync(0);
    await t.finishInProgressScheduledFunctions();
    expect((await inbox(t))[0]?.emailStatus).toBe("queued");
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("escapes user content in HTML while preserving it in the plain text email", async () => {
    const t = setup();
    await publish(t, await reserve(t, await place(t), "owner", "<img/src=x>"));
    const n = (await inbox(t))[0]!;
    const email = wordNotificationEmail(n, "https://the-page.example/a-path");
    expect(email.html).toContain("&lt;img/src=x&gt;");
    expect(email.html).not.toContain("<img/src=x>");
    expect(email.text).toContain("<img/src=x>");
    expect(email.html).toContain('href="https://the-page.example/france#word-12"');
  });
});

describe("moderation email notifications", () => {
  async function ownedWord(t: Test, language: "fr" | "en" = "fr") {
    const owner = await account(t, "owner");
    const admin = await account(t, "admin");
    vi.stubEnv("ADMIN_USER_IDS", admin.id);
    const slotId = await place(t);
    const purchase = await reserve(t, slotId, owner.id, "Original", language);
    await publish(t, purchase);
    await owner.client.mutation(api.slots.updateContent, { slotId, purchaseId: purchase._id, word: "Modifié" });
    const moderate = (action: "hide" | "restore" | "remove") =>
      admin.client.mutation(api.slots.moderate, { slotId, purchaseId: purchase._id, action });
    return { owner, admin, slotId, purchase, moderate };
  }
  const events = (t: Test) => t.run((ctx) => ctx.db.query("moderationLog").collect());

  it("queues one email per actual hide or restore, retaining every audit entry", async () => {
    const t = setup();
    const { owner, moderate } = await ownedWord(t, "en");
    for (const action of ["restore", "hide", "hide", "restore", "restore", "remove"] as const)
      await moderate(action);
    const logs = await events(t);
    expect(logs).toHaveLength(6);
    const emails = logs.filter((log) => log.email);
    expect(emails).toHaveLength(2);
    expect(emails.map((log) => log.action)).toEqual(["hide", "restore"]);
    for (const log of emails)
      expect(log.email).toMatchObject({ userId: owner.id, word: "Modifié", pageId: "france", position: 12, language: "en", status: "pending" });
    const jobs = await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect());
    expect(jobs.filter((job) => job.name === "notifications:sendModerationEmail")).toHaveLength(2);
    // Moderation emails do not create unrelated repurchase notifications.
    expect(await inbox(t)).toHaveLength(1);
  });

  it.each(["fr", "en"] as const)("sends both localized %s emails once to the affected owner, even after a repurchase", async (language) => {
    const t = setup();
    const { moderate, slotId, owner } = await ownedWord(t, language);
    await moderate("hide");
    await moderate("restore");
    const nextOwner = await account(t, "next-owner");
    await publish(t, await reserve(t, slotId, nextOwner.id, "Nouveau"));
    const send = vi.spyOn(Resend.prototype, "sendEmail");
    for (const log of await events(t)) {
      await t.mutation(internal.notifications.sendModerationEmail, { logId: log._id });
      await t.mutation(internal.notifications.sendModerationEmail, { logId: log._id });
    }
    expect(send).toHaveBeenCalledTimes(2);
    for (const log of await events(t)) {
      expect(log.email).toMatchObject({ status: "queued", userId: owner.id, word: "Modifié" });
      const email = await t.query(components.resend.lib.get, { emailId: log.email!.emailId! });
      expect(email?.to).toEqual(["owner@example.com"]);
      expect(email?.html).toContain(`lang="${language}"`);
      expect(email?.text).toContain("Modifié");
      expect(email?.text).toContain("https://the-page.example/france#word-12");
      expect(email?.text).not.toContain("Nouveau");
      expect(email?.subject).toContain(log.action === "hide"
        ? language === "fr" ? "Votre mot a été masqué" : "Your word has been hidden"
        : language === "fr" ? "Votre mot est de nouveau visible" : "Your word is visible again");
    }
  });

  it.each(["RESEND_API_KEY", "EMAIL_FROM", "SITE_URL"])("keeps moderation effective and its email pending when %s is missing", async (setting) => {
    const t = setup();
    const { moderate, slotId } = await ownedWord(t);
    await moderate("hide");
    const log = (await events(t))[0]!;
    vi.stubEnv(setting, "");
    const send = vi.spyOn(Resend.prototype, "sendEmail");
    await t.mutation(internal.notifications.sendModerationEmail, { logId: log._id });
    expect(send).not.toHaveBeenCalled();
    expect((await events(t))[0]?.email?.status).toBe("pending");
    expect((await t.run((ctx) => ctx.db.get(slotId)))?.visibility).toBe("hidden");
  });

  it("recovers failed moderation emails through the existing outbox job without duplicates", async () => {
    const t = setup();
    const { moderate, slotId } = await ownedWord(t);
    await moderate("hide");
    const log = (await events(t))[0]!;
    const send = vi.spyOn(Resend.prototype, "sendEmail").mockRejectedValueOnce(new Error("outage"));
    await expect(t.mutation(internal.notifications.sendModerationEmail, { logId: log._id })).rejects.toThrow("outage");
    expect((await events(t))[0]?.email?.status).toBe("pending");
    expect((await t.run((ctx) => ctx.db.get(slotId)))?.visibility).toBe("hidden");
    await t.mutation(internal.notifications.recoverEmails);
    await vi.advanceTimersByTimeAsync(0);
    await t.finishInProgressScheduledFunctions();
    expect((await events(t))[0]?.email?.status).toBe("queued");
    const attempts = () => send.mock.calls.filter(([, value]) => {
      // Resend's deprecated string overload is the last signature in its types.
      const options: unknown = value;
      return options !== null && typeof options === "object" && "idempotencyKey" in options && options.idempotencyKey === `moderation:${log._id}`;
    });
    expect(attempts()).toHaveLength(2);
    await t.mutation(internal.notifications.sendModerationEmail, { logId: log._id });
    expect(attempts()).toHaveLength(2);
  });

  it("skips a recipient whose account was deleted before the email was queued", async () => {
    const t = setup();
    const { moderate, owner } = await ownedWord(t);
    await moderate("hide");
    await t.mutation(components.betterAuth.adapter.deleteOne, { input: { model: "user", where: [{ field: "_id", value: owner.id }] } });
    const log = (await events(t))[0]!;
    const send = vi.spyOn(Resend.prototype, "sendEmail");
    await t.mutation(internal.notifications.sendModerationEmail, { logId: log._id });
    expect((await events(t))[0]?.email?.status).toBe("skipped");
    expect(send).not.toHaveBeenCalled();
  });

  it("defaults legacy purchases to French and World without emailing historical audit records", async () => {
    const t = setup();
    const { moderate, slotId, purchase, admin } = await ownedWord(t);
    const historical = await t.run(async (ctx) => {
      await ctx.db.patch(slotId, { pageId: undefined });
      await ctx.db.patch(purchase._id, { pageId: undefined, language: undefined });
      return await ctx.db.insert("moderationLog", { slotId, purchaseId: purchase._id, adminId: admin.id, action: "hide" });
    });
    await moderate("hide");
    const logs = await events(t);
    expect(logs.find((log) => log.email)?.email).toMatchObject({ pageId: "world", language: "fr" });
    await t.mutation(internal.notifications.sendModerationEmail, { logId: historical });
    expect((await t.run((ctx) => ctx.db.get(historical)))?.email).toBeUndefined();
    await t.mutation(internal.notifications.recoverEmails);
    const jobs = await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect());
    expect(jobs.some((job) => job.name === "notifications:sendModerationEmail" && job.args[0]?.logId === historical)).toBe(false);
  });

  it("does not enqueue emails for unauthorized or stale moderation requests", async () => {
    const t = setup();
    const { owner, admin, slotId, purchase } = await ownedWord(t);
    await expect(owner.client.mutation(api.slots.moderate, { slotId, purchaseId: purchase._id, action: "hide" })).rejects.toThrow("administration");
    const next = await account(t, "next");
    await publish(t, await reserve(t, slotId, next.id));
    await expect(admin.client.mutation(api.slots.moderate, { slotId, purchaseId: purchase._id, action: "hide" })).rejects.toThrow("propriétaire a changé");
    expect(await events(t)).toEqual([]);
  });

  it.each(["word_hidden", "word_restored"] as const)("escapes the word and retains the country link in %s emails", (kind) => {
    const email = wordNotificationEmail({ kind, language: "fr", word: "<img/src=x>", pageId: "royaume-uni", position: 17 }, "https://the-page.example/ignored");
    expect(email.html).toContain("&lt;img/src=x&gt;");
    expect(email.html).not.toContain("<img/src=x>");
    expect(email.text).toContain("<img/src=x>");
    expect(email.text).toContain("Royaume-Uni · Emplacement 17");
    expect(email.text).toContain("https://the-page.example/united-kingdom#word-17");
  });
});
