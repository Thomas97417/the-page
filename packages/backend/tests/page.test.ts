/// <reference types="vite/client" />
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import betterAuth from "@convex-dev/better-auth/test";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import schema from "../convex/schema";
import { api, components, internal } from "../convex/_generated/api";
import { validateContent } from "../convex/lib/content";
import { DEFAULT_PAGE_ID, PAGES, type PageId } from "../convex/lib/pages";
import type { Doc } from "../convex/_generated/dataModel";
import Stripe from "stripe";
import stripeTest from "@convex-dev/stripe/test";
import { stripeMocks, checkoutSession, paymentIntent } from "./stripeMock";

const modules = import.meta.glob("../convex/**/*.ts");
function setup() {
  const t = convexTest(schema, modules);
  t.registerComponent("betterAuth", betterAuth.schema, betterAuth.modules);
  rateLimiterTest.register(t);
  stripeTest.register(t);
  return t;
}
type Test = ReturnType<typeof setup>;

async function account(t: Test, name: string, sessionDuration = 3_600_000) {
  const user = await t.mutation(components.betterAuth.adapter.create, {
    input: {
      model: "user",
      data: {
        email: `${name}@example.com`,
        name,
        emailVerified: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    },
  });
  const session = await t.mutation(components.betterAuth.adapter.create, {
    input: {
      model: "session",
      data: {
        userId: user._id,
        token: `${name}-token`,
        expiresAt: Date.now() + sessionDuration,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    },
  });
  return {
    id: user._id as string,
    client: t.withIdentity({ subject: user._id, sessionId: session._id }),
  };
}

async function reserve(
  t: Test,
  userId = "buyer",
  position = 1,
  word = "Bonjour",
  description?: string,
  pageId: PageId = DEFAULT_PAGE_ID,
) {
  const slot = (await t.query(api.slots.list, { pageId })).find(
    (s) => s.position === position,
  )!;
  return await t.mutation(internal.purchases.reserve, {
    userId,
    slotId: slot.id,
    acquisition: slot.acquisitions,
    word,
    url: "https://example.com/",
    description,
  });
}
async function createPlace(t: Test, pageId: PageId = DEFAULT_PAGE_ID) {
  return await t.run((ctx) => ctx.db.insert("slots", {
    pageId, position: 1, acquisitions: 0, visibility: "visible",
  }));
}

function order(p: Doc<"purchases">, overrides = {}) {
  return {
    id: `order-${p._id}`,
    checkoutId: `checkout-${p._id}`,
    purchaseId: p._id,
    userId: p.userId,
    livemode: process.env.STRIPE_MODE === "live",
    amount: p.amount,
    currency: "eur",
    refundedAmount: 0,
    ...overrides,
  };
}
async function paid(t: Test, purchase: Doc<"purchases">) {
  return await t.mutation(internal.purchases.applyPaidOrder, {
    order: order(purchase),
  });
}

beforeEach(() => {
  stripeMocks.keys.length = 0;
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-02T10:00:00Z"));
  vi.stubEnv("STRIPE_MODE", "test");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test_secret");
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_example");
  vi.stubEnv("SITE_URL", "http://localhost:3003");
  vi.stubEnv("ADMIN_USER_IDS", "");
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.resetAllMocks();
});

describe("content", () => {
  it("accepts one normalized Unicode word and an optional HTTPS URL", () => {
    expect(validateContent("Cafe\u0301", " https://example.com ")).toEqual({
      word: "Café",
      url: "https://example.com/",
      description: undefined,
    });
    expect(validateContent("Été", "").url).toBeUndefined();
  });
  it.each([undefined, "", " \n\t "])(
    "allows an omitted or blank description: %j",
    (description) => {
      expect(validateContent("Mot", undefined, description)).toEqual({
        word: "Mot",
        url: undefined,
        description: undefined,
      });
    },
  );
  it("normalizes descriptions and counts Unicode characters up to 160", () => {
    expect(
      validateContent("Mot", undefined, "  Un cafe\u0301 à partager.  "),
    ).toEqual({
      word: "Mot",
      url: undefined,
      description: "Un café à partager.",
    });
    expect(validateContent("Mot", undefined, "🌻".repeat(160)).description).toBe(
      "🌻".repeat(160),
    );
    expect(() => validateContent("Mot", undefined, "a".repeat(161))).toThrow(
      "160 caractères",
    );
  });
  it.each(["", "deux mots", "mot\n", "mot\u200b", "a".repeat(25)])(
    "rejects invalid words: %j",
    (word) => expect(() => validateContent(word)).toThrow(),
  );
  it.each([
    "http://example.com",
    "javascript:alert(1)",
    "https://user:password@example.com",
    "pas-un-lien",
  ])("rejects unsafe URLs: %s", (url) =>
    expect(() => validateContent("Mot", url)).toThrow(),
  );
});

describe("purchases and ownership", () => {
  it("initializes 50 independent places per page idempotently", async () => {
    const t = setup();
    await t.mutation(internal.slots.initialize);
    await t.mutation(internal.slots.initialize);
    const slots = await t.query(api.slots.list, {});
    expect(slots).toHaveLength(50);
    expect(slots.map((s) => s.position)).toEqual(
      Array.from({ length: 50 }, (_, i) => i + 1),
    );
    expect(slots.every((s) => s.price === 100 && !s.word)).toBe(true);
    const ids = new Set<string>();
    for (const page of PAGES) {
      const pageSlots = await t.query(api.slots.list, { pageId: page.id });
      expect(pageSlots).toHaveLength(50);
      expect(pageSlots.map((s) => s.position)).toEqual(
        Array.from({ length: 50 }, (_, i) => i + 1),
      );
      expect(pageSlots.every((s) => s.pageId === page.id && s.price === 100)).toBe(true);
      pageSlots.forEach((slot) => ids.add(slot.id));
    }
    expect(ids.size).toBe(PAGES.length * 50);
    expect(slots).toEqual(await t.query(api.slots.list, { pageId: DEFAULT_PAGE_ID }));
  });
  it("migrates legacy World places without changing ownership, prices or reservations", async () => {
    const t = setup();
    const legacy = await t.run(async (ctx) => {
      const slotId = await ctx.db.insert("slots", {
        position: 1,
        acquisitions: 4,
        word: "Ensemble",
        description: "Notre histoire.",
        visibility: "visible",
      });
      const purchaseId = await ctx.db.insert("purchases", {
        slotId,
        position: 1,
        userId: "original-owner",
        word: "Ensemble",
        acquisition: 3,
        amount: 400,
        status: "published",
        reservedUntil: Date.now(),
      });
      const reservationId = await ctx.db.insert("purchases", {
        paymentProvider: "stripe",
        slotId,
        position: 1,
        userId: "next-owner",
        word: "Demain",
        acquisition: 4,
        amount: 500,
        status: "pending",
        reservedUntil: Date.now() + 300_000,
      });
      await ctx.db.patch(slotId, {
        currentPurchaseId: purchaseId,
        reservationId,
        reservedUntil: Date.now() + 300_000,
      });
      return (await ctx.db.get(slotId))!;
    });
    const before = await t.query(api.slots.list, {});
    expect(before[0]).toMatchObject({ id: legacy._id, pageId: "world", word: "Ensemble", price: 500 });
    expect(await t.query(api.slots.list, { pageId: "france" })).toEqual([]);
    await t.mutation(internal.slots.initialize);
    await t.mutation(internal.slots.initialize);
    expect(await t.run((ctx) => ctx.db.get(legacy._id))).toEqual({ ...legacy, pageId: "world" });
    expect((await t.query(api.slots.list, {}))[0]).toEqual(before[0]);
    expect((await t.query(api.slots.list, { pageId: "france" }))[0]).toMatchObject({ price: 100, reserved: false });
    // A Stripe checkout without a pageId can still publish to World.
    const pending = (await t.query(internal.purchases.get, { purchaseId: legacy.reservationId! }))!;
    await paid(t, pending);
    expect((await t.query(api.slots.list, {}))[0]).toMatchObject({ word: "Demain", price: 600 });
  });
  it("isolates reservations, publication and refunds between the same position on different pages", async () => {
    const t = setup();
    await t.mutation(internal.slots.initialize);
    const world = await reserve(t, "world-owner");
    const france = await reserve(t, "france-owner", 1, "Salut", undefined, "france");
    expect(france.pageId).toBe("france");
    await paid(t, france);
    expect((await t.query(api.slots.list, { pageId: "france" }))[0]).toMatchObject({ word: "Salut", price: 200, reserved: false });
    expect((await t.query(api.slots.list, {}))[0]).toMatchObject({ price: 100, reserved: true });
    await paid(t, world);
    await t.mutation(internal.purchases.markRefunded, { orderId: order(france).id, refundedAmount: france.amount });
    const refunded = (await t.query(api.slots.list, { pageId: "france" }))[0];
    expect(refunded.price).toBe(200);
    expect(refunded.word).toBeUndefined();
    expect((await t.query(api.slots.list, {}))[0]).toMatchObject({ word: "Bonjour", price: 200 });
    for (const pageId of ["royaume-uni", "etats-unis"] as const) {
      const untouched = (await t.query(api.slots.list, { pageId }))[0];
      expect(untouched).toMatchObject({ price: 100, reserved: false });
      expect(untouched.word).toBeUndefined();
    }
  });
  it("identifies every owned word and purchase status by page", async () => {
    const t = setup();
    await t.mutation(internal.slots.initialize);
    const owner = await account(t, "owner", (PAGES.length + 1) * 11 * 60_000);
    for (const page of PAGES) {
      const p = await reserve(t, owner.id, 1, "Ensemble", undefined, page.id);
      await paid(t, p);
      expect(await owner.client.query(api.purchases.status, { purchaseId: p._id })).toMatchObject({ pageId: page.id, current: true });
      // Purchases across all countries still respect the buyer's rate limit.
      vi.setSystemTime(Date.now() + 11 * 60_000);
    }
    const purchases = await owner.client.query(api.purchases.mine);
    expect(purchases).toHaveLength(PAGES.length);
    expect(new Set(purchases.map((purchase) => purchase.pageId))).toEqual(new Set(PAGES.map((page) => page.id)));
  });
  it("moderates a country page without hiding the same position on World", async () => {
    const t = setup();
    await t.mutation(internal.slots.initialize);
    const admin = await account(t, "admin");
    vi.stubEnv("ADMIN_USER_IDS", admin.id);
    const world = await reserve(t, "world-owner");
    const france = await reserve(t, "france-owner", 1, "Salut", undefined, "france");
    await paid(t, world);
    await paid(t, france);
    const slots = await admin.client.query(api.slots.adminList, { pageId: "france" });
    expect(slots).toHaveLength(50);
    expect(slots.every((slot) => slot.pageId === "france")).toBe(true);
    await admin.client.mutation(api.slots.moderate, { slotId: france.slotId, purchaseId: france._id, action: "hide" });
    expect((await t.query(api.slots.list, { pageId: "france" }))[0].word).toBeUndefined();
    expect((await t.query(api.slots.list, {}))[0].word).toBe("Bonjour");
  });
  it("raises only the purchased place's price and handles duplicate events", async () => {
    const t = setup();
    await t.mutation(internal.slots.initialize);
    const p = await reserve(t);
    await paid(t, p);
    await paid(t, p);
    const slots = await t.query(api.slots.list, {});
    expect(slots[0]).toMatchObject({
      word: "Bonjour",
      price: 200,
      acquisitions: 1,
      reserved: false,
    });
    expect(slots.slice(1).every((s) => s.price === 100)).toBe(true);
    expect(JSON.stringify(slots)).not.toContain("userId");
    expect(JSON.stringify(slots)).not.toContain("orderId");
  });
  it("allows free edits, then prevents the displaced owner from editing", async () => {
    const t = setup();
    await t.mutation(internal.slots.initialize);
    const owner = await account(t, "first");
    const p = await reserve(t, owner.id, 1, "Bonjour", "Une première histoire.");
    await paid(t, p);
    expect((await t.query(api.slots.list, {}))[0].description).toBe(
      "Une première histoire.",
    );
    await owner.client.mutation(api.slots.updateContent, {
      slotId: p.slotId,
      purchaseId: p._id,
      word: "Libre",
      url: "https://new.example/",
      description: "Une nouvelle histoire.",
    });
    expect((await t.query(api.slots.list, {}))[0]).toMatchObject({
      word: "Libre",
      description: "Une nouvelle histoire.",
      price: 200,
    });
    expect((await owner.client.query(api.purchases.mine))[0].description).toBe(
      "Une nouvelle histoire.",
    );
    const next = await reserve(t, "second", 1, "Suivant");
    await paid(t, next);
    await expect(
      owner.client.mutation(api.slots.updateContent, {
        slotId: p.slotId,
        purchaseId: p._id,
        word: "Volé",
      }),
    ).rejects.toThrow("ne vous appartient plus");
    expect((await t.query(api.slots.list, {}))[0]).toMatchObject({
      word: "Suivant",
      price: 300,
    });
    expect((await t.query(api.slots.list, {}))[0].description).toBeUndefined();
    expect((await owner.client.query(api.purchases.mine))[0]).toMatchObject({
      word: "Bonjour",
      description: "Une première histoire.",
    });
  });
  it("lets an existing owner add and clear a description", async () => {
    const t = setup();
    await t.mutation(internal.slots.initialize);
    const owner = await account(t, "owner");
    const p = await reserve(t, owner.id);
    await paid(t, p);
    const args = { slotId: p.slotId, purchaseId: p._id, word: p.word };
    await owner.client.mutation(api.slots.updateContent, {
      ...args,
      description: "Une dédicace.",
    });
    expect((await t.query(api.slots.list, {}))[0].description).toBe("Une dédicace.");
    await expect(
      owner.client.mutation(api.slots.updateContent, {
        ...args,
        description: "a".repeat(161),
      }),
    ).rejects.toThrow("160 caractères");
    expect((await t.query(api.slots.list, {}))[0].description).toBe("Une dédicace.");
    await owner.client.mutation(api.slots.updateContent, {
      ...args,
      description: " \n ",
    });
    expect((await t.query(api.slots.list, {}))[0].description).toBeUndefined();
    expect(
      (await owner.client.query(api.purchases.mine))[0].description,
    ).toBeUndefined();
  });
  it("validates descriptions on reservation and includes them when matching retries", async () => {
    const t = setup();
    await t.mutation(internal.slots.initialize);
    await expect(reserve(t, "buyer", 1, "Mot", "a".repeat(161))).rejects.toThrow(
      "160 caractères",
    );
    expect((await t.query(api.slots.list, {}))[0].reserved).toBe(false);
    const p = await reserve(t, "buyer", 1, "Mot", "Mon projet.");
    expect((await reserve(t, "buyer", 1, "Mot", "Mon projet."))._id).toBe(p._id);
    await expect(
      reserve(t, "buyer", 1, "Mot", "Un autre projet."),
    ).rejects.toThrow("paiement en cours");
  });
  it("clears a current description on a full refund", async () => {
    const t = setup();
    await t.mutation(internal.slots.initialize);
    const p = await reserve(t, "buyer", 1, "Mot", "Une dédicace.");
    await paid(t, p);
    await t.mutation(internal.purchases.markRefunded, {
      orderId: order(p).id,
      refundedAmount: p.amount,
    });
    const slot = (await t.query(api.slots.list, {}))[0];
    expect(slot.word).toBeUndefined();
    expect(slot.description).toBeUndefined();
    expect(slot.price).toBe(200);
    expect(await t.run((ctx) => ctx.db.get(p.slotId))).not.toHaveProperty(
      "description",
    );
  });
  it("serializes competing reservations and preserves the previous word during checkout", async () => {
    const t = setup();
    await t.mutation(internal.slots.initialize);
    const first = await reserve(t);
    await paid(t, first);
    const second = await reserve(t, "second");
    await expect(reserve(t, "third")).rejects.toThrow(
      "paiement est déjà en cours",
    );
    expect((await t.query(api.slots.list, {}))[0]).toMatchObject({
      word: "Bonjour",
      price: 200,
      reserved: true,
    });
    await paid(t, second);
    expect((await t.query(api.slots.list, {}))[0].acquisitions).toBe(2);
  });
  it("requires explicit acceptance of a changed price", async () => {
    const t = setup();
    await t.mutation(internal.slots.initialize);
    const first = await reserve(t);
    await paid(t, first);
    await expect(
      t.mutation(internal.purchases.reserve, {
        userId: "other",
        slotId: first.slotId,
        acquisition: 0,
        word: "Mot",
      }),
    ).rejects.toThrow("prix a changé");
  });
  it("limits a buyer to one outstanding reservation and a burst of five attempts", async () => {
    const t = setup();
    await t.mutation(internal.slots.initialize);
    const p = await reserve(t);
    await expect(reserve(t, "buyer", 2)).rejects.toThrow("paiement en cours");
    await t.mutation(internal.purchases.close, {
      purchaseId: p._id,
      reason: "test",
    });
    for (let i = 0; i < 4; i++) {
      const next = await reserve(t);
      await t.mutation(internal.purchases.close, {
        purchaseId: next._id,
        reason: "test",
      });
    }
    await expect(reserve(t)).rejects.toThrow(
      JSON.stringify({ kind: "RateLimited", name: "purchaseReservation", retryAfter: 120_000 }),
    );
  });
  it("expired or failed attempts never increase the price", async () => {
    const t = setup();
    await t.mutation(internal.slots.initialize);
    const p = await reserve(t);
    await t.mutation(internal.purchases.close, {
      purchaseId: p._id,
      reason: "expired",
    });
    expect((await t.query(api.slots.list, {}))[0]).toMatchObject({
      price: 100,
      reserved: false,
    });
  });
  it("refunds a late payment without overwriting the new owner", async () => {
    const t = setup();
    await t.mutation(internal.slots.initialize);
    const old = await reserve(t);
    await t.mutation(internal.purchases.close, {
      purchaseId: old._id,
      reason: "expired",
    });
    const current = await reserve(t, "second", 1, "Actuel");
    await paid(t, current);
    expect(await paid(t, old)).toBe("refund_pending");
    await t.mutation(internal.purchases.markRefunded, {
      orderId: order(old).id,
      refundedAmount: 100,
    });
    expect((await t.query(api.slots.list, {}))[0]).toMatchObject({
      word: "Actuel",
      price: 200,
    });
  });
  it.each([
    { amount: 1 },
    { currency: "usd" },
    { userId: "impostor" },
    { refundedAmount: 1 },
  ])("rejects and refunds mismatched order %j", async (invalid) => {
    const t = setup();
    await t.mutation(internal.slots.initialize);
    const p = await reserve(t);
    expect(
      await t.mutation(internal.purchases.applyPaidOrder, {
        order: order(p, invalid),
      }),
    ).toBe("refund_pending");
    expect((await t.query(api.slots.list, {}))[0]).toMatchObject({
      price: 100,
      acquisitions: 0,
    });
  });
  it("ignores unrelated checkout and metadata values", async () => {
    const t = setup();
    await t.mutation(internal.slots.initialize);
    const p = await reserve(t);
    await t.mutation(internal.purchases.attachCheckout, {
      purchaseId: p._id,
      checkoutId: "real",
      checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_example",
    });
    expect(await paid(t, p)).toBe("ignored");
    expect(
      await t.mutation(internal.purchases.applyPaidOrder, {
        order: order(p, { purchaseId: "invalid" }),
      }),
    ).toBe("ignored");
    expect((await t.query(api.slots.list, {}))[0].price).toBe(100);
  });
  it("does not expose another buyer's payment status", async () => {
    const t = setup();
    await t.mutation(internal.slots.initialize);
    const a = await account(t, "a");
    const b = await account(t, "b");
    const p = await reserve(t, a.id);
    expect(
      await b.client.query(api.purchases.status, { purchaseId: p._id }),
    ).toBeNull();
    await expect(
      t.action(api.payments.start, {
        slotId: p.slotId,
        acquisition: 0,
        word: "Mot",
      }),
    ).rejects.toThrow("Connectez-vous");
  });
});

describe("moderation", () => {
  it("checks admin permissions server-side and hides word, description and link", async () => {
    const t = setup();
    await t.mutation(internal.slots.initialize);
    const owner = await account(t, "owner");
    const admin = await account(t, "admin");
    vi.stubEnv("ADMIN_USER_IDS", admin.id);
    const p = await reserve(t, owner.id, 1, "Bonjour", "Mon histoire.");
    await paid(t, p);
    await expect(owner.client.query(api.slots.adminList, {})).rejects.toThrow(
      "administration",
    );
    await expect(
      owner.client.mutation(api.slots.moderate, {
        slotId: p.slotId,
        purchaseId: p._id,
        action: "hide",
      }),
    ).rejects.toThrow("administration");
    await admin.client.mutation(api.slots.moderate, {
      slotId: p.slotId,
      purchaseId: p._id,
      action: "hide",
    });
    const publicSlot = (await t.query(api.slots.list, {}))[0];
    expect(publicSlot.word).toBeUndefined();
    expect(publicSlot.url).toBeUndefined();
    expect(publicSlot.description).toBeUndefined();
    expect(publicSlot.price).toBe(200);
    await expect(
      owner.client.mutation(api.slots.updateContent, {
        slotId: p.slotId,
        purchaseId: p._id,
        word: "Contournement",
      }),
    ).rejects.toThrow("modération");
    await admin.client.mutation(api.slots.moderate, {
      slotId: p.slotId,
      purchaseId: p._id,
      action: "restore",
    });
    expect((await t.query(api.slots.list, {}))[0]).toMatchObject({
      word: "Bonjour",
      description: "Mon histoire.",
    });
    await admin.client.mutation(api.slots.moderate, {
      slotId: p.slotId,
      purchaseId: p._id,
      action: "remove",
    });
    expect((await t.query(api.slots.list, {}))[0]).toMatchObject({
      price: 200,
      acquisitions: 1,
    });
    expect((await t.query(api.slots.list, {}))[0].description).toBeUndefined();
    expect(await t.run((ctx) => ctx.db.get(p.slotId))).not.toHaveProperty(
      "description",
    );
    expect(
      await t.query(internal.purchases.get, { purchaseId: p._id }),
    ).not.toBeNull();
  });
  it("rejects a stale moderation action after a new purchase", async () => {
    const t = setup();
    await t.mutation(internal.slots.initialize);
    const admin = await account(t, "admin");
    vi.stubEnv("ADMIN_USER_IDS", admin.id);
    const first = await reserve(t);
    await paid(t, first);
    const second = await reserve(t, "second");
    await paid(t, second);
    await expect(
      admin.client.mutation(api.slots.moderate, {
        slotId: first.slotId,
        purchaseId: first._id,
        action: "remove",
      }),
    ).rejects.toThrow("propriétaire a changé");
  });
});

describe("reconciliation", () => {
  it("prevents owners from paying again for a place they can edit for free", async () => {
    const t = setup();
    await t.mutation(internal.slots.initialize);
    const p = await reserve(t, "owner");
    await paid(t, p);
    await expect(reserve(t, "owner")).rejects.toThrow(
      "gratuitement dans Mes mots",
    );
    expect((await t.query(api.slots.list, {}))[0]).toMatchObject({
      price: 200,
      reserved: false,
    });
  });
  it("keeps every currently owned word available beyond the history limit", async () => {
    const t = setup();
    await t.mutation(internal.slots.initialize);
    const owner = await account(t, "owner");
    const p = await reserve(t, owner.id);
    await paid(t, p);
    vi.setSystemTime(Date.now() + 1000);
    await t.run(async (ctx) => {
      for (let i = 0; i < 101; i++)
        await ctx.db.insert("purchases", {
          slotId: p.slotId,
          position: 1,
          userId: owner.id,
          word: "Essai",
          acquisition: 1,
          amount: 200,
          status: "expired",
          reservedUntil: Date.now(),
        });
    });
    const purchases = await owner.client.query(api.purchases.mine);
    expect(purchases.find((purchase) => purchase.current)?.id).toBe(p._id);
  });
  it("reserves only once when two buyers submit concurrently", async () => {
    const t = setup();
    await t.mutation(internal.slots.initialize);
    const slot = (await t.query(api.slots.list, {}))[0];
    const results = await Promise.allSettled(
      ["first", "second"].map((userId) =>
        t.mutation(internal.purchases.reserve, {
          userId,
          slotId: slot.id,
          acquisition: 0,
          word: "Mot",
        }),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  });
  it("finishes a full refund even when the received amount was incorrect", async () => {
    const t = setup();
    await createPlace(t);
    const p = await reserve(t);
    await t.mutation(internal.purchases.applyPaidOrder, { order: order(p, { amount: 1 }) });
    stripeMocks.intentsRetrieve.mockResolvedValue(paymentIntent(p, {
      amount_received: 1,
      latest_charge: { amount: 1, amount_refunded: 1 },
    }));
    await t.action(internal.payments.refund, { purchaseId: p._id });
    expect((await t.query(internal.purchases.get, { purchaseId: p._id }))?.status).toBe("refunded");
    expect(stripeMocks.refundsCreate).not.toHaveBeenCalled();
  });

  it("re-reads a completed event so an earlier refund cannot publish a word", async () => {
    const t = setup();
    await createPlace(t);
    const p = await reserve(t);
    stripeMocks.sessionsRetrieve.mockResolvedValue(checkoutSession(p, {
      payment_intent: paymentIntent(p, { latest_charge: { amount: 100, amount_refunded: 100 } }),
    }));
    await t.action(internal.payments.verifyCheckout, { checkoutId: order(p).checkoutId });
    expect((await t.query(api.slots.list, {}))[0]).toMatchObject({ acquisitions: 0, price: 100 });
    expect((await t.query(internal.purchases.get, { purchaseId: p._id }))?.status).toBe("refunded");
  });

  it("expires Stripe before releasing an expired reservation", async () => {
    const t = setup();
    await createPlace(t);
    const p = await reserve(t);
    await t.mutation(internal.purchases.attachCheckout, {
      purchaseId: p._id, checkoutId: order(p).checkoutId, checkoutUrl: "https://checkout.stripe.com/test",
    });
    vi.setSystemTime(Date.now() + 300_001);
    stripeMocks.sessionsRetrieve.mockResolvedValue(checkoutSession(p, {
      status: "open", payment_status: "unpaid", payment_intent: null,
    }));
    stripeMocks.sessionsExpire.mockResolvedValue({ status: "expired" });
    await t.action(internal.payments.reconcile, { purchaseId: p._id });
    expect(stripeMocks.sessionsExpire).toHaveBeenCalledExactlyOnceWith(order(p).checkoutId);
    expect((await t.query(api.slots.list, {}))[0]).toMatchObject({ reserved: false, price: 100 });
  });

  it("recovers a payment that completes while the session is being expired", async () => {
    const t = setup();
    await createPlace(t);
    const p = await reserve(t);
    await t.mutation(internal.purchases.attachCheckout, {
      purchaseId: p._id, checkoutId: order(p).checkoutId, checkoutUrl: "https://checkout.stripe.com/test",
    });
    vi.setSystemTime(Date.now() + 300_001);
    stripeMocks.sessionsRetrieve
      .mockResolvedValueOnce(checkoutSession(p, { status: "open", payment_status: "unpaid", payment_intent: null }))
      .mockResolvedValue(checkoutSession(p));
    stripeMocks.sessionsExpire.mockRejectedValue(new Error("Session already completed"));
    await t.action(internal.payments.reconcile, { purchaseId: p._id });
    expect((await t.query(api.slots.list, {}))[0].reserved).toBe(true);
    await t.action(internal.payments.reconcile, { purchaseId: p._id });
    expect((await t.query(api.slots.list, {}))[0]).toMatchObject({ word: "Bonjour", price: 200, reserved: false });
  });

  it("retains a reservation during an outage or an unsettled payment", async () => {
    const t = setup();
    await createPlace(t);
    const p = await reserve(t);
    await t.mutation(internal.purchases.attachCheckout, {
      purchaseId: p._id, checkoutId: order(p).checkoutId, checkoutUrl: "https://checkout.stripe.com/test",
    });
    vi.setSystemTime(Date.now() + 300_001);
    stripeMocks.sessionsRetrieve
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValue(checkoutSession(p, { payment_status: "unpaid" }));
    await t.action(internal.payments.reconcile, { purchaseId: p._id });
    await t.action(internal.payments.reconcile, { purchaseId: p._id });
    expect((await t.query(api.slots.list, {}))[0].reserved).toBe(true);
    expect(stripeMocks.sessionsExpire).not.toHaveBeenCalled();
  });

  it("recovers a paid session when its webhook is missing", async () => {
    const t = setup();
    await createPlace(t);
    const p = await reserve(t);
    await t.mutation(internal.purchases.attachCheckout, {
      purchaseId: p._id, checkoutId: order(p).checkoutId, checkoutUrl: "https://checkout.stripe.com/test",
    });
    stripeMocks.sessionsRetrieve.mockResolvedValue(checkoutSession(p));
    await t.action(internal.payments.reconcile, { purchaseId: p._id });
    await t.action(internal.payments.reconcile, { purchaseId: p._id });
    expect((await t.query(api.slots.list, {}))[0]).toMatchObject({ word: "Bonjour", price: 200 });
    expect(stripeMocks.sessionsRetrieve).toHaveBeenCalledOnce();
  });

  it("refunds the charged remainder including tax without duplicate pending refunds", async () => {
    const t = setup();
    await createPlace(t);
    const p = await reserve(t);
    await t.mutation(internal.purchases.close, { purchaseId: p._id, reason: "expired" });
    await paid(t, p);
    stripeMocks.intentsRetrieve.mockResolvedValue(paymentIntent(p, {
      latest_charge: { amount: 100, amount_refunded: 20 },
    }));
    stripeMocks.refundsList
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValue({ data: [{ id: "re_test", status: "pending" }] });
    stripeMocks.refundsCreate.mockResolvedValue({ id: "re_test", status: "pending", amount: 80 });
    await t.action(internal.payments.refund, { purchaseId: p._id });
    await t.action(internal.payments.refund, { purchaseId: p._id });
    vi.setSystemTime(Date.now() + 60_001);
    await t.action(internal.payments.refund, { purchaseId: p._id });
    expect(stripeMocks.refundsCreate).toHaveBeenCalledExactlyOnceWith({
      payment_intent: order(p).id, amount: 80, metadata: { app: "the-page", purchaseId: p._id },
    }, { idempotencyKey: `refund:${p._id}:20:initial` });
    expect((await t.query(internal.purchases.get, { purchaseId: p._id }))?.status).toBe("refund_pending");
  });

  it("reuses the refund idempotency key after an ambiguous network failure", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const t = setup();
    await createPlace(t);
    const p = await reserve(t);
    await t.mutation(internal.purchases.close, { purchaseId: p._id, reason: "expired" });
    await paid(t, p);
    stripeMocks.intentsRetrieve.mockResolvedValue(paymentIntent(p));
    stripeMocks.refundsList.mockResolvedValue({ data: [] });
    stripeMocks.refundsCreate
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValue({ id: "re_test", status: "succeeded", amount: 100 });
    await t.action(internal.payments.refund, { purchaseId: p._id });
    vi.setSystemTime(Date.now() + 60_001);
    await t.action(internal.payments.refund, { purchaseId: p._id });
    expect(stripeMocks.refundsCreate.mock.calls.map((call) => call[1])).toEqual([
      { idempotencyKey: `refund:${p._id}:0:initial` },
      { idempotencyKey: `refund:${p._id}:0:initial` },
    ]);
    expect((await t.query(internal.purchases.get, { purchaseId: p._id }))?.status).toBe("refunded");
  });

  it("keeps refunding an overpayment partially refunded by the expected purchase amount", async () => {
    const t = setup();
    await createPlace(t);
    const p = await reserve(t);
    stripeMocks.sessionsRetrieve.mockResolvedValue(checkoutSession(p, {
      amount_total: 200,
      payment_intent: paymentIntent(p, {
        amount_received: 200,
        latest_charge: { amount: 200, amount_refunded: 100 },
      }),
    }));
    await t.action(internal.payments.verifyCheckout, { checkoutId: order(p).checkoutId });
    expect(await t.query(internal.purchases.get, { purchaseId: p._id })).toMatchObject({
      status: "refund_pending", refundedAmount: 100,
    });
    stripeMocks.intentsRetrieve.mockResolvedValue(paymentIntent(p, {
      amount_received: 200,
      latest_charge: { amount: 200, amount_refunded: 100 },
    }));
    stripeMocks.refundsList.mockResolvedValue({ data: [] });
    stripeMocks.refundsCreate.mockResolvedValue({ id: "re_remainder", amount: 100, status: "succeeded" });
    await t.action(internal.payments.refund, { purchaseId: p._id });
    expect(await t.query(internal.purchases.get, { purchaseId: p._id })).toMatchObject({
      status: "refunded", refundedAmount: 200,
    });
    expect((await t.query(api.slots.list, {}))[0].acquisitions).toBe(0);
  });

  it.each([
    { amount_total: 1 },
    { currency: "usd" },
    { client_reference_id: "another-buyer" },
  ])("refunds inconsistent Stripe checkout data: %j", async (invalid) => {
    const t = setup();
    await createPlace(t);
    const p = await reserve(t);
    stripeMocks.sessionsRetrieve.mockResolvedValue(checkoutSession(p, invalid));
    await t.action(internal.payments.verifyCheckout, { checkoutId: order(p).checkoutId });
    expect((await t.query(internal.purchases.get, { purchaseId: p._id }))?.status).toBe("refund_pending");
    expect((await t.query(api.slots.list, {}))[0].acquisitions).toBe(0);
  });

  it("rejects invalid webhook signatures", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const t = setup();
    const response = await t.fetch("/stripe/webhook", {
      method: "POST", headers: { "stripe-signature": "t=1,v1=bad" }, body: "{}",
    });
    expect(response.status).toBe(400);
    expect(stripeMocks.sessionsRetrieve).not.toHaveBeenCalled();
  });

  it("processes and replays signed webhooks through the official component", async () => {
    const t = setup();
    await createPlace(t);
    const p = await reserve(t);
    const session = checkoutSession(p, { payment_intent: order(p).id });
    stripeMocks.sessionsRetrieve.mockResolvedValue(checkoutSession(p));
    const payload = JSON.stringify({
      id: "evt_test", object: "event", type: "checkout.session.completed", livemode: false,
      created: Math.floor(Date.now() / 1000), data: { object: session },
    });
    const signature = new Stripe("sk_test_example").webhooks.generateTestHeaderString({
      payload, secret: "whsec_test_secret", timestamp: Math.floor(Date.now() / 1000),
    });
    for (let i = 0; i < 2; i++) {
      expect((await t.fetch("/stripe/webhook", {
        method: "POST", headers: { "stripe-signature": signature }, body: payload,
      })).status).toBe(200);
    }
    expect((await t.query(api.slots.list, {}))[0]).toMatchObject({ word: "Bonjour", price: 200 });
    expect(await t.query(components.stripe.public.getCheckoutSession, {
      stripeCheckoutSessionId: session.id,
    })).toMatchObject({ stripeCheckoutSessionId: session.id, status: "complete" });
  });

  it("re-reads charge.refunded and removes only the current refunded word", async () => {
    const t = setup();
    await createPlace(t);
    const p = await reserve(t);
    await paid(t, p);
    stripeMocks.intentsRetrieve.mockResolvedValue(paymentIntent(p, {
      latest_charge: { amount: 100, amount_refunded: 100 },
    }));
    await t.action(internal.payments.verifyRefund, { orderId: order(p).id });
    const slot = (await t.query(api.slots.list, {}))[0];
    expect(slot.word).toBeUndefined();
    expect(slot.price).toBe(200);
    expect((await t.query(internal.purchases.get, { purchaseId: p._id }))?.status).toBe("refunded");
  });

  it.each(PAGES)("builds a server-priced Stripe checkout returning to $id", async (page) => {
    const t = setup();
    await createPlace(t, page.id);
    const buyer = await account(t, "buyer");
    stripeMocks.sessionsCreate.mockResolvedValue({ id: "cs_test_example", url: "https://checkout.stripe.com/test" });
    const slot = (await t.query(api.slots.list, { pageId: page.id }))[0];
    const result = await buyer.client.action(api.payments.start, {
      slotId: slot.id, acquisition: 0, word: "Mot", description: "Une histoire à partager.", language: "en",
    });
    const purchase = (await buyer.client.query(api.purchases.mine))[0];
    const path = page.id === DEFAULT_PAGE_ID ? "/" : `/${page.slug}`;
    const metadata = { app: "the-page", purchaseId: purchase.id, userId: buyer.id };
    expect(stripeMocks.sessionsCreate).toHaveBeenCalledExactlyOnceWith({
      mode: "payment",
      success_url: `http://localhost:3003${path}?purchase=${encodeURIComponent(purchase.id)}`,
      cancel_url: `http://localhost:3003${path}?purchase=${encodeURIComponent(purchase.id)}`,
      metadata,
      payment_intent_data: { metadata },
      client_reference_id: buyer.id,
      customer_email: "buyer@example.com",
      payment_method_types: ["card"],
      allow_promotion_codes: false,
      locale: "en",
      line_items: [{ quantity: 1, price_data: {
        currency: "eur", unit_amount: 100, tax_behavior: "inclusive",
        product_data: { name: `the page · ${page.id} · #${slot.position}` },
      } }],
    });
    expect(purchase.description).toBe("Une histoire à partager.");
    expect(result.url).toBe("https://checkout.stripe.com/test");
    // A repeat request resumes the existing session without charging twice.
    await buyer.client.action(api.payments.start, {
      slotId: slot.id, acquisition: 0, word: "Mot", description: "Une histoire à partager.", language: "en",
    });
    expect(stripeMocks.sessionsCreate).toHaveBeenCalledOnce();
  });

  it("replaces a legacy checkout without losing historical purchases", async () => {
    const t = setup();
    await createPlace(t);
    const p = await reserve(t);
    await t.run((ctx) => ctx.db.patch(p._id, {
      paymentProvider: undefined, checkoutId: "legacy-checkout", checkoutUrl: "https://legacy.example/checkout", status: "pending",
    }));
    const replacement = await reserve(t);
    expect(replacement._id).not.toBe(p._id);
    expect(replacement.paymentProvider).toBe("stripe");
    expect(replacement.checkoutUrl).toBeUndefined();
    expect(await t.query(internal.purchases.get, { purchaseId: p._id })).toMatchObject({
      status: "failed", failureReason: "payment_provider_replaced",
    });
    expect(stripeMocks.sessionsRetrieve).not.toHaveBeenCalled();
  });

  it("hides legacy resume links while preserving an existing owner's edit rights", async () => {
    const t = setup();
    await createPlace(t);
    const buyer = await account(t, "legacy-buyer");
    const p = await reserve(t, buyer.id);
    await t.run((ctx) => ctx.db.patch(p._id, {
      paymentProvider: undefined, status: "pending", checkoutUrl: "https://legacy.example/checkout",
    }));
    expect((await buyer.client.query(api.purchases.mine))[0].checkoutUrl).toBeUndefined();
    await t.action(internal.payments.reconcile, { purchaseId: p._id });
    expect((await t.query(api.slots.list, {}))[0].reserved).toBe(false);
    const current = await reserve(t, buyer.id);
    await paid(t, current);
    await t.run((ctx) => ctx.db.patch(current._id, { paymentProvider: undefined }));
    await buyer.client.mutation(api.slots.updateContent, {
      slotId: current.slotId, purchaseId: current._id, word: "Toujours",
    });
    expect((await t.query(api.slots.list, {}))[0].word).toBe("Toujours");
    expect(stripeMocks.sessionsRetrieve).not.toHaveBeenCalled();
  });
});

describe("Stripe environments", () => {
  it.each([
    { mode: undefined, key: "sk_test_example", testMode: true },
    { mode: "test", key: "sk_test_example", testMode: true },
    { mode: "live", key: "sk_live_example", testMode: false },
  ])("uses $key with STRIPE_MODE=$mode", async ({ mode, key, testMode }) => {
    vi.stubEnv("STRIPE_MODE", mode);
    vi.stubEnv("STRIPE_SECRET_KEY", key);
    const t = setup();
    await createPlace(t);
    const buyer = await account(t, "environment-buyer");
    stripeMocks.sessionsCreate.mockResolvedValue({ id: "cs_example", url: "https://checkout.stripe.com/example" });
    expect(await t.query(api.payments.availability)).toEqual({ configured: true, testMode });
    await buyer.client.action(api.payments.start, {
      slotId: (await t.query(api.slots.list, {}))[0].id, acquisition: 0, word: "Bonjour",
    });
    expect(stripeMocks.keys).toEqual([key]);
  });

  it.each([
    { mode: undefined, key: "sk_live_example" },
    { mode: "test", key: "sk_live_example" },
    { mode: "live", key: "sk_test_example" },
    { mode: "test", key: "pk_test_example" },
    { mode: "test", key: "" },
  ])("disables payments for mismatched keys: $mode / $key", async ({ mode, key }) => {
    vi.stubEnv("STRIPE_MODE", mode);
    vi.stubEnv("STRIPE_SECRET_KEY", key);
    const t = setup();
    await createPlace(t);
    const buyer = await account(t, "misconfigured-buyer");
    expect(await t.query(api.payments.availability)).toMatchObject({ configured: false });
    await expect(buyer.client.action(api.payments.start, {
      slotId: (await t.query(api.slots.list, {}))[0].id, acquisition: 0, word: "Bonjour",
    })).rejects.toThrow("momentanément indisponible");
    expect(await t.run((ctx) => ctx.db.query("purchases").collect())).toEqual([]);
    expect(stripeMocks.sessionsCreate).not.toHaveBeenCalled();
  });

  it("rejects an invalid mode instead of opening a payment", async () => {
    vi.stubEnv("STRIPE_MODE", "production");
    const t = setup();
    await expect(t.query(api.payments.availability)).rejects.toThrow("STRIPE_MODE must be test or live");
    expect(stripeMocks.sessionsCreate).not.toHaveBeenCalled();
  });

  it("rejects a payment from the other mode before publishing", async () => {
    const t = setup();
    await createPlace(t);
    const p = await reserve(t);
    stripeMocks.sessionsRetrieve.mockResolvedValue(checkoutSession(p, { livemode: true }));
    await expect(t.action(internal.payments.verifyCheckout, {
      checkoutId: order(p).checkoutId,
    })).rejects.toThrow("mode does not match");
    expect((await t.query(api.slots.list, {}))[0].acquisitions).toBe(0);
  });
});
