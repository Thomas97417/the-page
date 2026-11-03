/// <reference types="vite/client" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import betterAuth from "@convex-dev/better-auth/test";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { checkoutsCreate } from "@polar-sh/sdk/funcs/checkoutsCreate.js";
import { productsGet } from "@polar-sh/sdk/funcs/productsGet.js";
import schema from "../convex/schema";
import { api, components, internal } from "../convex/_generated/api";

vi.mock("@polar-sh/sdk/funcs/checkoutsCreate.js", () => ({ checkoutsCreate: vi.fn() }));
vi.mock("@polar-sh/sdk/funcs/productsGet.js", () => ({ productsGet: vi.fn() }));

const modules = import.meta.glob("../convex/**/*.ts");
function setup() {
  const t = convexTest(schema, modules);
  t.registerComponent("betterAuth", betterAuth.schema, betterAuth.modules);
  rateLimiterTest.register(t);
  return t;
}
type Test = ReturnType<typeof setup>;

async function account(t: Test, name: string) {
  const now = Date.now();
  const user = await t.mutation(components.betterAuth.adapter.create, {
    input: { model: "user", data: { name, email: `${name}@example.com`, emailVerified: true, createdAt: now, updatedAt: now } },
  });
  const session = await t.mutation(components.betterAuth.adapter.create, {
    input: { model: "session", data: { userId: user._id, token: name, expiresAt: now + 3_600_000, createdAt: now, updatedAt: now } },
  });
  return { id: user._id as string, client: t.withIdentity({ subject: user._id, sessionId: session._id }) };
}

async function slot(t: Test, pageId: "world" | "france" = "world") {
  return t.run((ctx) => ctx.db.insert("slots", { pageId, position: 1, acquisitions: 0, visibility: "visible" }));
}

async function own(t: Test, userId: string, pageId: "world" | "france") {
  const slotId = await slot(t, pageId);
  const purchase = await t.mutation(internal.purchases.reserve, { slotId, userId, acquisition: 0, word: "Initial" });
  await t.mutation(internal.purchases.applyPaidOrder, {
    order: { id: `order-${purchase._id}`, checkoutId: `checkout-${purchase._id}`, purchaseId: purchase._id, userId, productId: "product", amount: purchase.amount, currency: "eur", refundedAmount: 0 },
  });
  return { slotId, purchaseId: purchase._id };
}

async function expectRateLimit(request: Promise<unknown>, name: string, retryAfter: number) {
  // convex-test leaves ConvexError.data serialized at nested function boundaries.
  await expect(request).rejects.toThrow(JSON.stringify({ kind: "RateLimited", name, retryAfter }));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-03T10:00:00Z"));
  vi.stubEnv("POLAR_PRODUCT_ID", "product");
  vi.stubEnv("POLAR_ORGANIZATION_TOKEN", "sandbox-token");
  vi.stubEnv("POLAR_WEBHOOK_SECRET", "whsec_dGVzdC1zZWNyZXQ=");
  vi.stubEnv("SITE_URL", "https://the-page.example");
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.resetAllMocks();
});

describe("application rate limits", () => {
  it("counts failed checkout actions and blocks before creating a reservation or calling Polar", async () => {
    const t = setup();
    const first = await account(t, "first");
    const second = await account(t, "second");
    const world = await slot(t);
    const france = await slot(t, "france");
    vi.mocked(productsGet).mockResolvedValue({ ok: true, value: { isRecurring: false, isArchived: false } } as never);
    vi.mocked(checkoutsCreate).mockResolvedValue({ ok: false, error: new Error("Polar unavailable") } as never);
    const start = (client = first.client, slotId = world) => client.action(api.payments.start, { slotId, acquisition: 0, word: "Bonjour" });

    for (let i = 0; i < 3; i++) await expect(start()).rejects.toThrow("Le paiement n’a pas pu être ouvert");
    await expectRateLimit(start(first.client, france), "checkoutStart", 6_000);
    expect(await t.run((ctx) => ctx.db.query("purchases").collect())).toHaveLength(3);
    expect(checkoutsCreate).toHaveBeenCalledTimes(3);
    expect(productsGet).toHaveBeenCalledTimes(3);

    await expect(start(second.client, france)).rejects.toThrow("Le paiement n’a pas pu être ouvert");
    vi.setSystemTime(Date.now() + 6_000);
    await expect(start()).rejects.toThrow("Le paiement n’a pas pu être ouvert");
    expect(checkoutsCreate).toHaveBeenCalledTimes(5);
  });

  it("limits payment refreshes independently and keeps public queries readable", async () => {
    const t = setup();
    const user = await account(t, "buyer");
    for (let i = 0; i < 5; i++) await user.client.action(api.payments.refresh, { purchaseId: "missing" });
    await expectRateLimit(user.client.action(api.payments.refresh, { purchaseId: "missing" }), "checkoutRefresh", 3_000);
    await expect(user.client.mutation(api.notifications.markAllRead, {})).resolves.toBeNull();
    await expect(t.query(api.slots.list, {})).resolves.toEqual([]);
    vi.setSystemTime(Date.now() + 3_000);
    await expect(user.client.action(api.payments.refresh, { purchaseId: "missing" })).resolves.toBeNull();
  });

  it("shares reservation capacity across pages, preserves idempotency and refills over time", async () => {
    const t = setup();
    const world = await slot(t);
    const france = await slot(t, "france");
    const reserve = (slotId = world, userId = "buyer") => t.mutation(internal.purchases.reserve, { slotId, userId, acquisition: 0, word: "Bonjour" });
    for (let i = 0; i < 5; i++) {
      const purchase = await reserve();
      expect((await reserve())._id).toBe(purchase._id);
      await t.mutation(internal.purchases.close, { purchaseId: purchase._id, reason: "test" });
    }
    await expectRateLimit(reserve(france), "purchaseReservation", 120_000);
    expect((await t.run((ctx) => ctx.db.get(france)))?.reservationId).toBeUndefined();
    await expect(reserve(france, "another-buyer")).resolves.toMatchObject({ userId: "another-buyer" });
    vi.setSystemTime(Date.now() + 120_000);
    await expect(reserve()).resolves.toMatchObject({ userId: "buyer" });
  });

  it("rejects edits beyond the quota without changing the word, then allows another user and a later edit", async () => {
    const t = setup();
    const owner = await account(t, "owner");
    const another = await account(t, "another");
    const world = await own(t, owner.id, "world");
    const france = await own(t, owner.id, "france");
    const otherWord = await own(t, another.id, "world");
    for (let i = 0; i < 10; i++) await owner.client.mutation(api.slots.updateContent, { ...world, word: "Modifié" });
    await expectRateLimit(owner.client.mutation(api.slots.updateContent, { ...france, word: "Bloqué" }), "updateContent", 3_000);
    expect((await t.run((ctx) => ctx.db.get(france.slotId)))?.word).toBe("Initial");
    await another.client.mutation(api.slots.updateContent, { ...otherWord, word: "Libre" });
    vi.setSystemTime(Date.now() + 3_000);
    await owner.client.mutation(api.slots.updateContent, { ...france, word: "Autorisé" });
  });

  it("enforces the moderation quota before changing visibility or writing the audit log", async () => {
    const t = setup();
    const admin = await account(t, "admin");
    const word = await own(t, admin.id, "world");
    vi.stubEnv("ADMIN_USER_IDS", admin.id);
    for (let i = 0; i < 30; i++) await admin.client.mutation(api.slots.moderate, { ...word, action: i % 2 ? "hide" : "restore" });
    await expectRateLimit(admin.client.mutation(api.slots.moderate, { ...word, action: "remove" }), "moderate", 1_000);
    expect((await t.run((ctx) => ctx.db.get(word.slotId)))?.visibility).toBe("hidden");
    expect(await t.run((ctx) => ctx.db.query("moderationLog").collect())).toHaveLength(30);
    vi.setSystemTime(Date.now() + 1_000);
    await admin.client.mutation(api.slots.moderate, { ...word, action: "restore" });
    expect((await t.run((ctx) => ctx.db.get(word.slotId)))?.visibility).toBe("visible");
  });

  it("shares the notification quota between individual and batch read operations", async () => {
    const t = setup();
    const user = await account(t, "reader");
    const other = await account(t, "other-reader");
    const slotId = await slot(t);
    const purchase = await t.mutation(internal.purchases.reserve, { slotId, userId: user.id, acquisition: 0, word: "Bonjour" });
    const notificationId = await t.run((ctx) => ctx.db.insert("notifications", {
      userId: user.id, kind: "purchase_confirmed", purchaseId: purchase._id, slotId, pageId: "world", position: 1, word: "Bonjour", language: "fr", emailStatus: "skipped",
    }));
    for (let i = 0; i < 30; i++) await user.client.mutation(api.notifications.markRead, { notificationId });
    await expectRateLimit(user.client.mutation(api.notifications.markAllRead, {}), "notificationRead", 1_000);
    await expect(other.client.mutation(api.notifications.markAllRead, {})).resolves.toBeNull();
    vi.setSystemTime(Date.now() + 1_000);
    await expect(user.client.mutation(api.notifications.markAllRead, {})).resolves.toBeNull();
  });

});
