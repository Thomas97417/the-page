import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PAGES, pagePath } from "../convex/lib/pages";
import { rememberReturnPath, returnPath } from "../../../apps/web/src/lib/page";

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
});

afterEach(() => vi.unstubAllGlobals());

describe("returning after authentication", () => {
  it.each(PAGES)("returns to $id with or without a purchase", (page) => {
    rememberReturnPath(page.id);
    expect(returnPath()).toBe(pagePath(page.id));
    rememberReturnPath(page.id, "purchase/value?next=1");
    expect(returnPath()).toBe(`${pagePath(page.id)}?purchase=purchase%2Fvalue%3Fnext%3D1`);
  });

  it.each([
    "https://example.com/france",
    "//example.com/france",
    "/unknown-country?purchase=123",
    "/admin",
    "javascript:alert(1)",
  ])("ignores destinations outside the available pages: %s", (destination) => {
    sessionStorage.setItem("the-page:return", destination);
    expect(returnPath()).toBe("/");
  });

  it("removes unrelated search parameters and rejects oversized purchase IDs", () => {
    sessionStorage.setItem("the-page:return", "/france?redirect=https://example.com&purchase=123");
    expect(returnPath()).toBe("/france?purchase=123");
    sessionStorage.setItem("the-page:return", `/france?purchase=${"x".repeat(128)}`);
    expect(returnPath()).toBe("/france");
  });

  it("falls back to World when browser storage is unavailable", () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () => { throw new Error("Storage disabled"); },
      setItem: () => { throw new Error("Storage disabled"); },
    });
    expect(() => rememberReturnPath("france")).not.toThrow();
    expect(returnPath()).toBe("/");
  });
});
