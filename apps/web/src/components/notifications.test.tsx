// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { getFunctionName } from "convex/server";
import type { ReactNode } from "react";
import { createI18n } from "../lib/i18n";
import { returnPath } from "../lib/page";
import { Notifications } from "./notifications";
import { ReclaimWord } from "./reclaim-word";
import UserMenu from "./user-menu";

const mocks = vi.hoisted(() => ({
  unread: 2,
  authenticated: true,
  user: { name: "Thomas", email: "thomas@example.com" } as { name: string; email: string } | null | undefined,
  results: [] as unknown[],
  status: "Exhausted",
  reclaim: null as unknown,
  buy: vi.fn(),
  showWords: vi.fn(),
  showNotifications: vi.fn(),
  navigate: vi.fn(),
  markRead: vi.fn(),
  markAllRead: vi.fn(),
  loadMore: vi.fn(),
  query: vi.fn(),
  paginatedQuery: vi.fn(),
}));

vi.mock("convex/react", () => ({
  useConvexAuth: () => ({ isAuthenticated: mocks.authenticated, isLoading: false }),
  useQuery: (reference: Parameters<typeof getFunctionName>[0], args?: unknown) => {
    const name = getFunctionName(reference);
    mocks.query(name, args);
    if (args === "skip") return undefined;
    if (name === "notifications:unreadCount") return mocks.unread;
    if (name === "notifications:reclaim") return mocks.reclaim;
    return { isAdmin: false };
  },
  useMutation: (reference: Parameters<typeof getFunctionName>[0]) => getFunctionName(reference) === "notifications:markRead" ? mocks.markRead : mocks.markAllRead,
  usePaginatedQuery: (reference: Parameters<typeof getFunctionName>[0], args?: unknown) => {
    mocks.paginatedQuery(getFunctionName(reference), args);
    return { results: args === "skip" ? [] : mocks.results, status: mocks.status, loadMore: mocks.loadMore };
  },
}));
vi.mock("./page-provider", () => ({ usePage: () => mocks }));
vi.mock("@/hooks/use-current-user", () => ({ useCurrentUser: () => mocks.user }));
vi.mock("@/lib/auth-client", () => ({ authClient: { signOut: vi.fn() } }));
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mocks.navigate,
  Link: ({ to, children, ...props }: { to: string; children: ReactNode; onClick?: () => void; className?: string }) => <a href={to} {...props}>{children}</a>,
}));

const draft = { slotId: "slot-12", pageId: "france", position: 12, acquisition: 4, word: "Libre", url: "https://example.com/", description: "Notre histoire." };
const lost = { id: "notification-12", kind: "word_replaced", word: "Libre", pageId: "france", position: 12, createdAt: 1_793_700_000_000, read: false, draft };

function localized(children: ReactNode) {
  return <I18nextProvider i18n={createI18n("fr")}>{children}</I18nextProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.unread = 2;
  mocks.authenticated = true;
  mocks.user = { name: "Thomas", email: "thomas@example.com" };
  mocks.results = [];
  mocks.status = "Exhausted";
  mocks.reclaim = null;
  mocks.markRead.mockResolvedValue(null);
  mocks.markAllRead.mockResolvedValue(null);
  mocks.navigate.mockResolvedValue(undefined);
  sessionStorage.clear();
});
afterEach(cleanup);

describe("notifications menu and sidebar", () => {
  it("waits for a validated user before subscribing to the unread badge", () => {
    mocks.user = undefined;
    const view = render(localized(<UserMenu />));
    expect(mocks.query).toHaveBeenCalledWith("notifications:unreadCount", "skip");
    mocks.query.mockClear();
    mocks.user = { name: "Thomas", email: "thomas@example.com" };
    view.rerender(localized(<UserMenu />));
    expect(mocks.query).toHaveBeenCalledWith("notifications:unreadCount", {});
    mocks.query.mockClear();
    mocks.authenticated = false;
    view.rerender(localized(<UserMenu />));
    expect(mocks.query).toHaveBeenCalledWith("notifications:unreadCount", "skip");
  });

  it("stops notification subscriptions when authentication is lost", () => {
    const view = render(localized(<Notifications onClose={vi.fn()} />));
    expect(mocks.paginatedQuery).toHaveBeenCalledWith("notifications:list", {});
    mocks.query.mockClear();
    mocks.paginatedQuery.mockClear();
    mocks.authenticated = false;
    view.rerender(localized(<Notifications onClose={vi.fn()} />));
    expect(mocks.query).toHaveBeenCalledWith("notifications:unreadCount", "skip");
    expect(mocks.paginatedQuery).toHaveBeenCalledWith("notifications:list", "skip");
  });

  it("shows the unread count and opens notifications from the user menu", async () => {
    render(localized(<UserMenu />));
    fireEvent.click(screen.getByRole("button", { name: "Menu du compte, 2 notifications non lues" }));
    const item = await screen.findByRole("menuitem", { name: /Notifications/ });
    expect(item.textContent).toContain("2 notifications non lues");
    fireEvent.click(item);
    expect(mocks.showNotifications).toHaveBeenCalledOnce();
  });

  it("opens a repurchase with the lost content, and marks the selected notification as read", async () => {
    mocks.results = [lost];
    const close = vi.fn();
    render(localized(<Notifications onClose={close} />));
    expect(screen.getByRole("dialog").textContent).toContain("Libre");
    expect(screen.getByText("Non lue")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Racheter mon mot/ }));
    await waitFor(() => expect(mocks.buy).toHaveBeenCalledWith(draft));
    expect(mocks.markRead).toHaveBeenCalledWith({ notificationId: lost.id });
    expect(close).toHaveBeenCalledOnce();
  });

  it("marks all notifications as read and loads older notifications", async () => {
    mocks.results = [lost];
    mocks.status = "CanLoadMore";
    render(localized(<Notifications onClose={vi.fn()} />));
    fireEvent.click(screen.getByRole("button", { name: "Tout marquer comme lu" }));
    await waitFor(() => expect(mocks.markAllRead).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole("button", { name: "Voir les notifications précédentes" }));
    expect(mocks.loadMore).toHaveBeenCalledWith(20);
  });

  it("provides an empty state and opens confirmed purchases in My words", async () => {
    const view = render(localized(<Notifications onClose={vi.fn()} />));
    expect(screen.getByText("Tout commence par un mot.")).toBeTruthy();
    mocks.results = [{ ...lost, kind: "purchase_confirmed", draft: null }];
    view.rerender(localized(<Notifications onClose={vi.fn()} />));
    fireEvent.click(screen.getByRole("button", { name: /Gérer mes mots/ }));
    await waitFor(() => expect(mocks.showWords).toHaveBeenCalledOnce());
    expect(mocks.buy).not.toHaveBeenCalled();
  });
});

describe("repurchase email links", () => {
  it("requires sign-in and preserves the correct place for the authentication return", () => {
    mocks.authenticated = false;
    render(localized(<ReclaimWord notificationId="notification-12" pageId="france" />));
    const link = screen.getByRole("link", { name: "Connectez-vous pour racheter votre mot." });
    link.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(link);
    expect(returnPath()).toBe("/france?reclaim=notification-12");
    expect(mocks.buy).not.toHaveBeenCalled();
  });

  it("opens the authenticated owner's draft once and removes the consumed link", async () => {
    mocks.reclaim = { notificationId: lost.id, draft };
    const view = render(localized(<ReclaimWord notificationId={lost.id} pageId="france" />));
    await waitFor(() => expect(mocks.buy).toHaveBeenCalledWith(draft));
    expect(mocks.markRead).toHaveBeenCalledWith({ notificationId: lost.id });
    expect(mocks.navigate).toHaveBeenCalledWith(expect.objectContaining({ to: "/$page", params: { page: "france" }, replace: true }));
    view.rerender(localized(<ReclaimWord notificationId={lost.id} pageId="france" />));
    expect(mocks.buy).toHaveBeenCalledOnce();
  });

  it("does not open a draft from an unavailable link or the wrong country", () => {
    const view = render(localized(<ReclaimWord notificationId={lost.id} pageId="france" />));
    expect(screen.getByRole("status").textContent).toContain("indisponible pour ce compte");
    mocks.reclaim = { notificationId: lost.id, draft };
    view.rerender(localized(<ReclaimWord notificationId={lost.id} pageId="japon" />));
    expect(mocks.buy).not.toHaveBeenCalled();
  });
});
