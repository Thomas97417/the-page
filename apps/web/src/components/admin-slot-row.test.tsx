// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import type { Doc, Id } from "@my-better-t-app/backend/convex/_generated/dataModel";
import { createI18n } from "../lib/i18n";
import { AdminSlotRow } from "./admin-slot-row";

const mocks = vi.hoisted(() => ({ moderate: vi.fn(), success: vi.fn() }));
vi.mock("convex/react", () => ({ useMutation: () => mocks.moderate }));
vi.mock("sonner", () => ({ toast: { success: mocks.success } }));

const slot: Doc<"slots"> = {
  _id: "slot-12" as Id<"slots">,
  _creationTime: 0,
  pageId: "world",
  position: 12,
  acquisitions: 1,
  currentPurchaseId: "purchase-12" as Id<"purchases">,
  word: "click.build",
  url: "https://clik.build/",
  visibility: "visible",
};

function deferred() {
  let resolve!: (value: null) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<null>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function setup(initialSlots = [slot]) {
  const i18n = createI18n("fr");
  const rows = (slots: Doc<"slots">[]) => (
    <I18nextProvider i18n={i18n}>
      <table><tbody>{slots.map((entry) => <AdminSlotRow key={entry._id} slot={entry} pageId="world" />)}</tbody></table>
    </I18nextProvider>
  );
  const view = render(rows(initialSlots));
  return { ...view, update: (slots: Doc<"slots">[]) => view.rerender(rows(slots)) };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.moderate.mockResolvedValue(null);
});
afterEach(cleanup);

describe("admin word moderation", () => {
  it("labels the visibility action, prevents duplicate submissions and shows the hidden state after confirmation", async () => {
    const request = deferred();
    mocks.moderate.mockReturnValueOnce(request.promise);
    const view = setup();
    const hide = screen.getByRole("button", { name: "Masquer « click.build » à la place 12" });
    expect(hide.textContent).toBe("Masquer");
    expect(screen.getByText("Visible")).toBeTruthy();
    fireEvent.click(hide);
    fireEvent.click(hide);

    expect(mocks.moderate).toHaveBeenCalledExactlyOnceWith({ slotId: slot._id, purchaseId: slot.currentPurchaseId, action: "hide" });
    expect(hide.hasAttribute("disabled")).toBe(true);
    expect(hide.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByRole("button", { name: "Supprimer « click.build » à la place 12" }).hasAttribute("disabled")).toBe(true);
    await act(async () => request.resolve(null));
    expect(mocks.success).toHaveBeenCalledWith("« click.build » est masqué.");

    view.update([{ ...slot, visibility: "hidden" }]);
    expect(screen.getByText("Masqué")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Révéler « click.build » à la place 12" }).textContent).toBe("Révéler");
  });

  it("reveals a hidden word with the existing restore mutation", async () => {
    setup([{ ...slot, visibility: "hidden" }]);
    fireEvent.click(screen.getByRole("button", { name: "Révéler « click.build » à la place 12" }));
    await waitFor(() => expect(mocks.success).toHaveBeenCalledWith("« click.build » est de nouveau visible."));
    expect(mocks.moderate).toHaveBeenCalledExactlyOnceWith({ slotId: slot._id, purchaseId: slot.currentPurchaseId, action: "restore" });
  });

  it("identifies the word and place in the confirmation, focuses Cancel and never deletes on cancellation", async () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Supprimer « click.build » à la place 12" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Supprimer ce mot ?" });
    expect(within(dialog).getByText("click.build")).toBeTruthy();
    expect(within(dialog).getByText("World · Place 12")).toBeTruthy();
    expect(within(dialog).getByText(/La suppression est définitive/)).toBeTruthy();
    expect(mocks.moderate).not.toHaveBeenCalled();
    const cancel = within(dialog).getByRole("button", { name: "Annuler" });
    await waitFor(() => expect(document.activeElement).toBe(cancel));
    fireEvent.click(cancel);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(mocks.moderate).not.toHaveBeenCalled();
  });

  it("keeps deletion open while saving, displays an error and closes only after a successful retry", async () => {
    const request = deferred();
    mocks.moderate.mockReturnValueOnce(request.promise);
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Supprimer « click.build » à la place 12" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Supprimer le mot" }));
    const pending = within(dialog).getByRole("button", { name: "Suppression…" });
    expect(pending.getAttribute("aria-busy")).toBe("true");
    expect(pending.hasAttribute("disabled")).toBe(true);
    expect(within(dialog).getByRole("button", { name: "Annuler" }).hasAttribute("disabled")).toBe(true);
    fireEvent.keyDown(dialog, { key: "Escape", code: "Escape" });
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    await act(async () => request.reject(new Error("Network failure")));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(mocks.success).not.toHaveBeenCalled();
    const retry = within(dialog).getByRole("button", { name: "Supprimer le mot" });
    expect(retry.hasAttribute("disabled")).toBe(false);
    fireEvent.click(retry);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(mocks.moderate).toHaveBeenLastCalledWith({ slotId: slot._id, purchaseId: slot.currentPurchaseId, action: "remove" });
    expect(mocks.success).toHaveBeenCalledExactlyOnceWith("« click.build » a été supprimé.");
  });

  it.each([
    { currentPurchaseId: "new-purchase" as Id<"purchases">, word: "Nouveau" },
    { word: "Modifié" },
  ])("blocks a stale confirmation when the content changes (%j)", async (changes) => {
    const view = setup();
    fireEvent.click(screen.getByRole("button", { name: "Supprimer « click.build » à la place 12" }));
    const dialog = await screen.findByRole("alertdialog");
    view.update([{ ...slot, ...changes }]);
    expect(within(dialog).getByText("click.build")).toBeTruthy();
    expect(within(dialog).getByRole("alert").textContent).toContain("Le contenu de cette place a changé.");
    const confirm = within(dialog).getByRole("button", { name: "Supprimer le mot" });
    expect(confirm.hasAttribute("disabled")).toBe(true);
    fireEvent.click(confirm);
    expect(mocks.moderate).not.toHaveBeenCalled();
  });

  it("tracks operations independently across rows", async () => {
    const first = deferred();
    const second = deferred();
    mocks.moderate.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    setup([slot, { ...slot, _id: "slot-17" as Id<"slots">, position: 17, currentPurchaseId: "purchase-17" as Id<"purchases">, word: "Bonjour" }]);
    const firstButton = screen.getByRole("button", { name: "Masquer « click.build » à la place 12" });
    const secondButton = screen.getByRole("button", { name: "Masquer « Bonjour » à la place 17" });
    fireEvent.click(firstButton);
    expect(secondButton.hasAttribute("disabled")).toBe(false);
    fireEvent.click(secondButton);
    await act(async () => first.resolve(null));
    expect(firstButton.hasAttribute("disabled")).toBe(false);
    expect(secondButton.hasAttribute("disabled")).toBe(true);
    await act(async () => second.resolve(null));
    expect(secondButton.hasAttribute("disabled")).toBe(false);
  });

  it("does not offer moderation actions for an empty place", () => {
    setup([{ ...slot, currentPurchaseId: undefined, word: undefined, url: undefined, visibility: "removed" }]);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByText("Visible")).toBeNull();
    expect(screen.queryByText("Masqué")).toBeNull();
  });
});
