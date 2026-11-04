// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import type { PageId } from "@my-better-t-app/backend/convex/lib/pages";
import type { Language } from "@my-better-t-app/backend/convex/lib/language";
import { createI18n } from "../lib/i18n";
import { AdminPageSelector } from "./admin-page-selector";

afterEach(cleanup);

function setup(language: Language = "fr", initialPageId: PageId = "world") {
  const onPageChange = vi.fn();
  function Selector() {
    const [pageId, setPageId] = useState(initialPageId);
    return (
      <AdminPageSelector
        pageId={pageId}
        onPageChange={(nextPageId) => {
          setPageId(nextPageId);
          onPageChange(nextPageId);
        }}
      />
    );
  }
  render(<I18nextProvider i18n={createI18n(language)}><Selector /></I18nextProvider>);
  return onPageChange;
}

describe("admin page selector", () => {
  it("selects a country by its unaccented name and keeps the selection when clearing a new search", async () => {
    const onPageChange = setup();
    fireEvent.click(screen.getByLabelText("Page à modérer World"));
    const input = await screen.findByLabelText("Rechercher un pays");
    fireEvent.change(input, { target: { value: "Etats Unis" } });
    fireEvent.click(await screen.findByRole("option", { name: "États-Unis" }));

    await waitFor(() => expect(onPageChange).toHaveBeenCalledExactlyOnceWith("etats-unis"));
    const trigger = screen.getByLabelText("Page à modérer États-Unis");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(trigger);
    const nextInput = await screen.findByLabelText("Rechercher un pays");
    expect((nextInput as HTMLInputElement).value).toBe("");
    fireEvent.change(nextInput, { target: { value: "aucun pays" } });
    await screen.findByText("Aucun pays trouvé.");
    fireEvent.click(screen.getByRole("button", { name: "Effacer la recherche" }));

    const selected = await screen.findByRole("option", { name: "États-Unis" });
    expect(selected.hasAttribute("data-selected")).toBe(true);
    expect(document.activeElement).toBe(nextInput);
    expect(onPageChange).toHaveBeenCalledTimes(1);
  });

  it("supports French names, English names and country codes in English", async () => {
    const onPageChange = setup("en");
    fireEvent.click(screen.getByLabelText("Page to moderate World"));
    const input = await screen.findByLabelText("Search countries");
    fireEvent.change(input, { target: { value: "Allemagne" } });
    await screen.findByRole("option", { name: "Germany" });
    fireEvent.change(input, { target: { value: "Japan" } });
    await screen.findByRole("option", { name: "Japan" });
    fireEvent.change(input, { target: { value: ".jp" } });
    const japan = await screen.findByRole("option", { name: "Japan" });
    await waitFor(() => expect(input.getAttribute("aria-activedescendant")).toBe(japan.id));
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    await waitFor(() => expect(onPageChange).toHaveBeenCalledExactlyOnceWith("japon"));
    expect(screen.getByLabelText("Page to moderate Japan").getAttribute("aria-expanded")).toBe("false");
  });

  it("dismisses a search without changing the page being moderated", async () => {
    const onPageChange = setup("fr", "france");
    const trigger = screen.getByLabelText("Page à modérer France");
    fireEvent.click(trigger);
    const input = await screen.findByLabelText("Rechercher un pays");
    fireEvent.change(input, { target: { value: "Canada" } });
    await screen.findByRole("option", { name: "Canada" });
    fireEvent.keyDown(input, { key: "Escape", code: "Escape" });

    await waitFor(() => expect(trigger.getAttribute("aria-expanded")).toBe("false"));
    expect(onPageChange).not.toHaveBeenCalled();
    fireEvent.click(trigger);
    const selected = await screen.findByRole("option", { name: "France" });
    expect(selected.hasAttribute("data-selected")).toBe(true);
  });
});
