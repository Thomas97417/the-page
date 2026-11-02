// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { I18nextProvider } from "react-i18next";
import type { i18n } from "i18next";
import { createI18n } from "../lib/i18n";
import LanguageToggle from "./language-toggle";
import AuthForm from "./auth-form";

const { signIn } = vi.hoisted(() => ({
  signIn: vi.fn().mockResolvedValue({ error: { code: "EMAIL_NOT_VERIFIED" } }),
}));

vi.mock("convex/react", () => ({ useQuery: () => ({ google: false, github: false }) }));
vi.mock("@/lib/auth-client", () => ({ authClient: { signIn: { email: signIn } } }));

afterEach(() => {
  cleanup();
  document.cookie = "the-page-language=; Path=/; Max-Age=0";
  signIn.mockClear();
});

async function setup() {
  const i18n = createI18n("fr");
  const root = createRootRouteWithContext<{ i18n: i18n }>()({ component: Outlet });
  const signInRoute = createRoute({
    getParentRoute: () => root,
    path: "/sign-in",
    head: ({ match }) => ({ meta: [{ title: match.context.i18n.t("meta.signIn") }] }),
    component: () => <><LanguageToggle /><AuthForm /></>,
  });
  const router = createRouter({
    routeTree: root.addChildren([signInRoute]),
    history: createMemoryHistory({ initialEntries: ["/sign-in?purchase=saved-purchase"] }),
    context: { i18n },
    Wrap: ({ children }) => <I18nextProvider i18n={i18n}>{children}</I18nextProvider>,
  });
  await act(() => router.load());
  render(<RouterProvider router={router} />);
  await screen.findByRole("heading", { name: "De retour." });
  return router;
}

describe("header language toggle", () => {
  it("switches both ways, saves the choice and updates metadata while preserving the form and URL", async () => {
    const router = await setup();
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "reader@example.com" } });
    fireEvent.change(screen.getByLabelText("Mot de passe"), { target: { value: "draft-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Langue : français. Passer en anglais" }));

    await screen.findByRole("heading", { name: "Welcome back." });
    expect((screen.getByLabelText("Email") as HTMLInputElement).value).toBe("reader@example.com");
    expect((screen.getByLabelText("Password") as HTMLInputElement).value).toBe("draft-password");
    expect(document.cookie).toContain("the-page-language=en");
    await waitFor(() => expect(router.state.matches.at(-1)?.meta?.[0]).toEqual({ title: "Sign in — the page" }));
    expect(router.state.location.href).toBe("/sign-in?purchase=saved-purchase");

    fireEvent.click(screen.getByRole("button", { name: "Language: English. Switch to French" }));
    await screen.findByRole("heading", { name: "De retour." });
    expect(document.cookie).toContain("the-page-language=fr");
    expect((screen.getByLabelText("Mot de passe") as HTMLInputElement).value).toBe("draft-password");
    expect(signIn).not.toHaveBeenCalled();
  });

  it("translates an existing authentication error and retains its resend action", async () => {
    await setup();
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "reader@example.com" } });
    fireEvent.change(screen.getByLabelText("Mot de passe"), { target: { value: "draft-password" } });
    fireEvent.submit(screen.getByRole("button", { name: "Se connecter" }).closest("form")!);
    await screen.findByText("Vérifiez votre email avant de vous connecter.");
    fireEvent.click(screen.getByRole("button", { name: "Langue : français. Passer en anglais" }));
    await screen.findByText("Verify your email before signing in.");
    expect(screen.getByRole("link", { name: "Resend the link" }).getAttribute("href"))
      .toBe("/verify-email");
  });
});
