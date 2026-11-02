/// <reference types="vite/client" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import betterAuth from "@convex-dev/better-auth/test";
import resendTest from "@convex-dev/resend/test";
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
    await expect(t.query(api.notifications.unreadCount)).rejects.toThrow("Connectez-vous");
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
