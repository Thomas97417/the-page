/// <reference types="vite/client" />
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import betterAuth from "@convex-dev/better-auth/test";
import schema from "../convex/schema";
import { api, components, internal } from "../convex/_generated/api";
import { validateContent } from "../convex/lib/content";
import { DEFAULT_PAGE_ID, PAGES, pagePath, type PageId } from "../convex/lib/pages";
import type { Doc } from "../convex/_generated/dataModel";
import { checkoutsGet } from "@polar-sh/sdk/funcs/checkoutsGet.js";
import { ordersList } from "@polar-sh/sdk/funcs/ordersList.js";
import { ordersGet } from "@polar-sh/sdk/funcs/ordersGet.js";
import { refundsList } from "@polar-sh/sdk/funcs/refundsList.js";
import { refundsCreate } from "@polar-sh/sdk/funcs/refundsCreate.js";
import { checkoutsCreate } from "@polar-sh/sdk/funcs/checkoutsCreate.js";
import { productsGet } from "@polar-sh/sdk/funcs/productsGet.js";

vi.mock("@polar-sh/sdk/funcs/checkoutsGet.js", () => ({
  checkoutsGet: vi.fn(),
}));
vi.mock("@polar-sh/sdk/funcs/checkoutsCreate.js", () => ({
  checkoutsCreate: vi.fn(),
}));
vi.mock("@polar-sh/sdk/funcs/productsGet.js", () => ({ productsGet: vi.fn() }));
vi.mock("@polar-sh/sdk/funcs/ordersList.js", () => ({ ordersList: vi.fn() }));
vi.mock("@polar-sh/sdk/funcs/ordersGet.js", () => ({ ordersGet: vi.fn() }));
vi.mock("@polar-sh/sdk/funcs/refundsList.js", () => ({ refundsList: vi.fn() }));
vi.mock("@polar-sh/sdk/funcs/refundsCreate.js", () => ({
  refundsCreate: vi.fn(),
}));

const modules = import.meta.glob("../convex/**/*.ts");
function setup() {
  const t = convexTest(schema, modules);
  t.registerComponent("betterAuth", betterAuth.schema, betterAuth.modules);
  return t;
}
type Test = ReturnType<typeof setup>;

async function account(t: Test, name: string) {
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
        expiresAt: Date.now() + 3_600_000,
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
function order(p: Doc<"purchases">, overrides = {}) {
  return {
    id: `order-${p._id}`,
    checkoutId: `checkout-${p._id}`,
    purchaseId: p._id,
    userId: p.userId,
    productId: "product",
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
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-02T10:00:00Z"));
  vi.stubEnv("POLAR_PRODUCT_ID", "product");
  vi.stubEnv("POLAR_WEBHOOK_SECRET", "whsec_dGVzdC1zZWNyZXQ=");
  vi.stubEnv("POLAR_ORGANIZATION_TOKEN", "sandbox-token");
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
    // A checkout created before the migration can still publish to World.
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
    const owner = await account(t, "owner");
    for (const page of PAGES) {
      const p = await reserve(t, owner.id, 1, "Ensemble", undefined, page.id);
      await paid(t, p);
      expect(await owner.client.query(api.purchases.status, { purchaseId: p._id })).toMatchObject({ pageId: page.id, current: true });
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
  it("limits a buyer to one outstanding reservation and five attempts per ten minutes", async () => {
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
    await expect(reserve(t)).rejects.toThrow("Trop de tentatives");
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
    { productId: "another-product" },
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
      checkoutUrl: "https://sandbox.polar.sh/checkout",
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
    await t.mutation(internal.slots.initialize);
    const p = await reserve(t);
    await t.mutation(internal.purchases.applyPaidOrder, {
      order: order(p, { amount: 1 }),
    });
    vi.mocked(ordersGet).mockResolvedValue({
      ok: true,
      value: {
        id: order(p).id,
        totalAmount: 1,
        refundedAmount: 1,
        refundedTaxAmount: 0,
      },
    } as never);
    await t.action(internal.payments.refund, { purchaseId: p._id });
    expect(
      (await t.query(internal.purchases.get, { purchaseId: p._id }))?.status,
    ).toBe("refunded");
  });
  it("re-reads an order.paid event so a previous refund cannot be ignored", async () => {
    const t = setup();
    await t.mutation(internal.slots.initialize);
    const p = await reserve(t);
    const data = order(p);
    vi.mocked(ordersGet).mockResolvedValue({
      ok: true,
      value: {
        paid: true,
        id: data.id,
        checkoutId: data.checkoutId,
        metadata: { purchaseId: p._id },
        customer: { externalId: p.userId },
        productId: "product",
        totalAmount: 100,
        currency: "eur",
        refundedAmount: 83,
        refundedTaxAmount: 17,
      },
    } as never);
    await t.action(internal.payments.verifyOrder, { orderId: data.id });
    expect((await t.query(api.slots.list, {}))[0]).toMatchObject({
      acquisitions: 0,
      price: 100,
    });
    expect(
      (await t.query(internal.purchases.get, { purchaseId: p._id }))?.status,
    ).toBe("refund_pending");
  });
  it("verifies with Polar before releasing an expired checkout", async () => {
    const t = setup();
    await t.mutation(internal.slots.initialize);
    const p = await reserve(t);
    await t.mutation(internal.purchases.attachCheckout, {
      purchaseId: p._id,
      checkoutId: "checkout",
      checkoutUrl: "https://sandbox.polar.sh/checkout",
    });
    vi.setSystemTime(Date.now() + 300_001);
    vi.mocked(checkoutsGet).mockResolvedValue({
      ok: true,
      value: { status: "open" },
    } as never);
    await t.action(internal.payments.reconcile, { purchaseId: p._id });
    expect(checkoutsGet).toHaveBeenCalled();
    expect((await t.query(api.slots.list, {}))[0]).toMatchObject({
      reserved: false,
      price: 100,
    });
  });
  it("retains a reservation during a provider outage or an unsettled payment", async () => {
    const t = setup();
    await t.mutation(internal.slots.initialize);
    const p = await reserve(t);
    await t.mutation(internal.purchases.attachCheckout, {
      purchaseId: p._id,
      checkoutId: "checkout",
      checkoutUrl: "https://sandbox.polar.sh/checkout",
    });
    vi.setSystemTime(Date.now() + 300_001);
    vi.mocked(checkoutsGet)
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValue({ ok: true, value: { status: "confirmed" } } as never);
    await t.action(internal.payments.reconcile, { purchaseId: p._id });
    await t.action(internal.payments.reconcile, { purchaseId: p._id });
    expect((await t.query(api.slots.list, {}))[0].reserved).toBe(true);
  });
  it("recovers a succeeded payment when its webhook is missing", async () => {
    const t = setup();
    await t.mutation(internal.slots.initialize);
    const p = await reserve(t);
    const data = order(p);
    await t.mutation(internal.purchases.attachCheckout, {
      purchaseId: p._id,
      checkoutId: data.checkoutId,
      checkoutUrl: "https://sandbox.polar.sh/checkout",
    });
    vi.mocked(checkoutsGet).mockResolvedValue({
      ok: true,
      value: { status: "succeeded" },
    } as never);
    vi.mocked(ordersList).mockResolvedValue({
      ok: true,
      value: {
        result: {
          items: [
            {
              paid: true,
              id: data.id,
              checkoutId: data.checkoutId,
              metadata: { purchaseId: p._id },
              customer: { externalId: p.userId },
              productId: "product",
              totalAmount: 100,
              currency: "eur",
              refundedAmount: 0,
              refundedTaxAmount: 0,
            },
          ],
        },
      },
    } as never);
    await t.action(internal.payments.reconcile, { purchaseId: p._id });
    expect((await t.query(api.slots.list, {}))[0]).toMatchObject({
      word: "Bonjour",
      price: 200,
    });
  });
  it("refunds the untaxed remainder and never creates duplicate in-flight refunds", async () => {
    const t = setup();
    await t.mutation(internal.slots.initialize);
    const p = await reserve(t);
    await t.mutation(internal.purchases.close, {
      purchaseId: p._id,
      reason: "expired",
    });
    await paid(t, p);
    vi.mocked(ordersGet).mockResolvedValue({
      ok: true,
      value: {
        id: order(p).id,
        totalAmount: 100,
        netAmount: 83,
        refundedAmount: 0,
        refundedTaxAmount: 0,
      },
    } as never);
    vi.mocked(refundsList).mockResolvedValue({
      ok: true,
      value: { result: { items: [] } },
    } as never);
    vi.mocked(refundsCreate).mockResolvedValue({
      ok: true,
      value: { id: "refund", status: "pending" },
    } as never);
    await t.action(internal.payments.refund, { purchaseId: p._id });
    await t.action(internal.payments.refund, { purchaseId: p._id });
    expect(refundsCreate).toHaveBeenCalledTimes(1);
    expect(vi.mocked(refundsCreate).mock.calls[0][1]).toMatchObject({
      amount: 83,
    });
  });
  it("rejects invalid webhook signatures", async () => {
    const t = setup();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await t.fetch("/polar/events", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "webhook-id": "fake",
        "webhook-timestamp": String(Date.now() / 1000),
        "webhook-signature": "v1,invalid",
      },
      body: JSON.stringify({ type: "order.paid", data: {} }),
    });
    expect(response.status).toBe(403);
  });
  it.each(PAGES)("builds a server-priced checkout returning to $id", async (page) => {
    const t = setup();
    await t.mutation(internal.slots.initialize);
    const buyer = await account(t, "buyer");
    vi.mocked(productsGet).mockResolvedValue({
      ok: true,
      value: { isRecurring: false, isArchived: false },
    } as never);
    vi.mocked(checkoutsCreate).mockResolvedValue({
      ok: true,
      value: { id: "checkout", url: "https://sandbox.polar.sh/checkout" },
    } as never);
    const slot = (await t.query(api.slots.list, { pageId: page.id }))[0];
    await buyer.client.action(api.payments.start, {
      slotId: slot.id,
      acquisition: 0,
      word: "Mot",
      description: "Une histoire à partager.",
    });
    expect((await buyer.client.query(api.purchases.mine))[0].description).toBe(
      "Une histoire à partager.",
    );
    const call = vi.mocked(checkoutsCreate).mock.calls[0];
    const purchase = (await buyer.client.query(api.purchases.mine))[0];
    expect(call[1]).toMatchObject({
      successUrl: `http://localhost:3003${pagePath(page.id)}?purchase=${encodeURIComponent(purchase.id)}`,
      returnUrl: `http://localhost:3003${pagePath(page.id)}?purchase=${encodeURIComponent(purchase.id)}`,
    });
    expect(call[1]).toMatchObject({
      externalCustomerId: buyer.id,
      allowDiscountCodes: false,
      prices: {
        product: [
          {
            priceAmount: 100,
            priceCurrency: "eur",
            amountType: "fixed",
            taxBehavior: "inclusive",
          },
        ],
      },
    });
    expect(call[0]._options.server).toBe("sandbox");
  });
});
