// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { I18nextProvider } from "react-i18next";
import type { Language } from "@my-better-t-app/backend/convex/lib/language";
import { createI18n } from "../lib/i18n";
import { PageNavigation } from "./page-navigation";

afterEach(cleanup);

async function setup(language: Language) {
  const i18n = createI18n(language);
  const root = createRootRoute({ component: () => <PageNavigation pageId="world" /> });
  const world = createRoute({ getParentRoute: () => root, path: "/" });
  const country = createRoute({ getParentRoute: () => root, path: "$page" });
  const router = createRouter({
    routeTree: root.addChildren([world, country]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
    Wrap: ({ children }) => <I18nextProvider i18n={i18n}>{children}</I18nextProvider>,
  });
  await act(() => router.load());
  render(<RouterProvider router={router} />);
  return router;
}

describe("localized country navigation", () => {
  it("searches French and English country names and follows the canonical English URL", async () => {
    const router = await setup("en");
    fireEvent.click(screen.getByLabelText("Choose a page, current page: World"));
    const input = await screen.findByLabelText("Search countries");

    fireEvent.change(input, { target: { value: "Allemagne" } });
    const germany = await screen.findByRole("option", { name: ".de — Germany" });
    expect(germany.getAttribute("href")).toBe("/germany");

    fireEvent.change(input, { target: { value: "Japan" } });
    const japan = await screen.findByRole("option", { name: ".jp — Japan" });
    expect(japan.getAttribute("href")).toBe("/japan");
    fireEvent.click(japan);
    await waitFor(() => expect(router.state.location.pathname).toBe("/japan"));
  });

  it("keeps French labels, accent-insensitive search and translated empty results", async () => {
    await setup("fr");
    fireEvent.click(screen.getByLabelText("Choisir une page, page actuelle : World"));
    const input = await screen.findByLabelText("Rechercher un pays");
    expect(input.getAttribute("placeholder")).toBe("Rechercher un pays…");
    fireEvent.change(input, { target: { value: "Etats Unis" } });
    const country = await screen.findByRole("option", { name: ".us — États-Unis" });
    expect(country.getAttribute("href")).toBe("/united-states");
    fireEvent.change(input, { target: { value: "not-a-country" } });
    await screen.findByText("Aucun pays trouvé.");
  });
});
