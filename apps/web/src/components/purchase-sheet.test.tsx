// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { StrictMode, type ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { getFunctionName } from "convex/server";
import type { WordDraft } from "./page-provider";
import { createI18n } from "../lib/i18n";
import { BuySheet } from "./purchase-sheet";

const mocks = vi.hoisted(() => ({
  ready: true,
  purchases: [] as { current: boolean; slotId: string; word: string }[] | undefined,
  client: { capture: vi.fn() },
}));

vi.mock("@/hooks/use-analytics", () => ({
  useAnalytics: () => mocks.ready ? mocks.client : null,
}));
vi.mock("convex/react", () => ({
  useConvexAuth: () => ({ isAuthenticated: true, isLoading: false }),
  useQuery: (reference: Parameters<typeof getFunctionName>[0]) => {
    switch (getFunctionName(reference)) {
      case "purchases:mine": return mocks.purchases;
      case "slots:list": return [];
      default: return { configured: true };
    }
  },
  useAction: () => vi.fn(),
}));
vi.mock("./page-provider", () => ({
  usePage: () => ({ showWords: vi.fn() }),
  saveDraft: vi.fn(),
}));
vi.mock("./ui/sheet", () => ({
  Sheet: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  SheetDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
}));

const draft = {
  slotId: "slot-12",
  pageId: "france",
  position: 12,
  acquisition: 2,
  word: "Bonjour",
  url: "https://example.com/private",
  description: "Private content",
} as WordDraft;

function app() {
  return (
    <StrictMode>
      <I18nextProvider i18n={createI18n("fr")}>
        <BuySheet draft={draft} onClose={vi.fn()} />
      </I18nextProvider>
    </StrictMode>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.ready = true;
  mocks.purchases = [];
});
afterEach(cleanup);

describe("purchase form analytics", () => {
  it("captures an opened or restored draft once, using only purchase metadata", () => {
    const { rerender } = render(app());
    rerender(app());
    expect(mocks.client.capture).toHaveBeenCalledExactlyOnceWith("purchase_form_opened", {
      page_id: "france",
      slot_id: "slot-12",
      position: 12,
      purchase_type: "takeover",
      acquisition_number: 3,
    });
  });

  it("waits for ownership and excludes the current owner's edit panel", () => {
    mocks.purchases = undefined;
    const { rerender } = render(app());
    expect(mocks.client.capture).not.toHaveBeenCalled();
    mocks.purchases = [{ current: true, slotId: draft.slotId, word: "Bonjour" }];
    rerender(app());
    expect(mocks.client.capture).not.toHaveBeenCalled();
  });

  it("records an already open form when PostHog finishes loading", () => {
    mocks.ready = false;
    const { rerender } = render(app());
    expect(mocks.client.capture).not.toHaveBeenCalled();
    mocks.ready = true;
    rerender(app());
    expect(mocks.client.capture).toHaveBeenCalledOnce();
  });
});
