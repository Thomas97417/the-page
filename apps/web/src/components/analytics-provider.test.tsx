// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import type { CaptureResult } from "posthog-js";
import { AnalyticsProvider } from "./analytics-provider";
import { sanitizeAnalyticsEvent } from "../lib/analytics";

const mocks = vi.hoisted(() => ({
  token: "phc_test" as string | undefined,
  pathname: "/",
  authenticated: false,
  loading: false,
  user: null as { _id: string } | null | undefined,
  identifiedId: undefined as string | undefined,
  provider: vi.fn(),
  client: {
    capture: vi.fn(),
    identify: vi.fn(),
    reset: vi.fn(),
    register: vi.fn(),
    get_property: vi.fn(),
  },
}));

vi.mock("@my-better-t-app/env/web", () => ({
  env: {
    get VITE_POSTHOG_PROJECT_TOKEN() { return mocks.token; },
    VITE_POSTHOG_HOST: "https://eu.i.posthog.com",
    VITE_POSTHOG_ENVIRONMENT: "test",
  },
}));
vi.mock("@tanstack/react-router", () => ({
  useLocation: () => ({ pathname: mocks.pathname }),
}));
vi.mock("convex/react", () => ({
  useConvexAuth: () => ({ isAuthenticated: mocks.authenticated, isLoading: mocks.loading }),
  useQuery: () => mocks.user,
}));
vi.mock("@posthog/react", async () => {
  const { useEffect } = await import("react");
  return {
    PostHogProvider: ({ options, children }: {
      options: { loaded: (client: typeof mocks.client) => void };
      children: import("react").ReactNode;
    }) => {
      mocks.provider(options);
      useEffect(() => { options.loaded(mocks.client); }, [options]);
      return children;
    },
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.token = "phc_test";
  mocks.pathname = "/";
  mocks.authenticated = false;
  mocks.loading = false;
  mocks.user = null;
  mocks.identifiedId = undefined;
  mocks.client.get_property.mockImplementation(() => mocks.identifiedId);
  mocks.client.identify.mockImplementation((id: string) => { mocks.identifiedId = id; });
  mocks.client.reset.mockImplementation(() => { mocks.identifiedId = undefined; });
});
afterEach(cleanup);

function app() {
  return <StrictMode><AnalyticsProvider><span>the page</span></AnalyticsProvider></StrictMode>;
}

describe("browser analytics", () => {
  it("counts initial visits and route changes once, including back navigation", async () => {
    const { rerender } = render(app());
    await waitFor(() => expect(mocks.client.capture).toHaveBeenCalledTimes(1));
    rerender(app());
    expect(mocks.client.capture).toHaveBeenCalledTimes(1);
    mocks.pathname = "/france";
    rerender(app());
    expect(mocks.client.capture).toHaveBeenLastCalledWith("$pageview", {
      $current_url: `${window.location.origin}/france`,
      $pathname: "/france",
      page_id: "france",
    });
    mocks.pathname = "/";
    rerender(app());
    expect(mocks.client.capture).toHaveBeenCalledTimes(3);
  });

  it("waits for auth and identifies the Better Auth user before capturing the visit", async () => {
    mocks.loading = true;
    mocks.authenticated = true;
    mocks.user = undefined;
    const { rerender } = render(app());
    expect(mocks.client.capture).not.toHaveBeenCalled();
    mocks.loading = false;
    rerender(app());
    expect(mocks.client.capture).not.toHaveBeenCalled();
    mocks.user = { _id: "better-auth-user" };
    rerender(app());
    await waitFor(() => expect(mocks.client.identify).toHaveBeenCalledWith("better-auth-user"));
    expect(mocks.client.identify.mock.invocationCallOrder[0]).toBeLessThan(mocks.client.capture.mock.invocationCallOrder[0]!);
    expect(mocks.client.capture).toHaveBeenCalledOnce();
    expect(mocks.client.reset).not.toHaveBeenCalled();
  });

  it("resets a persisted identity on logout and before switching accounts", async () => {
    mocks.authenticated = true;
    mocks.user = { _id: "first-user" };
    const { rerender } = render(app());
    await waitFor(() => expect(mocks.client.identify).toHaveBeenCalledWith("first-user"));
    mocks.user = { _id: "second-user" };
    rerender(app());
    expect(mocks.client.reset).toHaveBeenCalledOnce();
    expect(mocks.client.identify).toHaveBeenLastCalledWith("second-user");
    mocks.authenticated = false;
    mocks.user = null;
    rerender(app());
    expect(mocks.client.reset).toHaveBeenCalledTimes(2);
    expect(mocks.client.register).toHaveBeenLastCalledWith({ environment: "test" });
    expect(mocks.client.capture).toHaveBeenCalledOnce();
  });

  it("clears a previous account's persisted identity before an anonymous visit", async () => {
    mocks.identifiedId = "previous-user";
    render(app());
    await waitFor(() => expect(mocks.client.capture).toHaveBeenCalledOnce());
    expect(mocks.client.reset).toHaveBeenCalledOnce();
    expect(mocks.client.reset.mock.invocationCallOrder[0]).toBeLessThan(mocks.client.capture.mock.invocationCallOrder[0]!);
  });

  it("does not initialize PostHog without a token and keeps the app visible", () => {
    mocks.token = undefined;
    const { getByText } = render(app());
    expect(getByText("the page")).toBeTruthy();
    expect(mocks.provider).not.toHaveBeenCalled();
    expect(mocks.client.capture).not.toHaveBeenCalled();
  });

  it("strips auth and payment URL parameters from events and person properties", () => {
    const event = {
      event: "$identify",
      properties: {
        $current_url: "https://the-page.example/reset-password?token=secret#private",
        $referrer: "https://example.com/?private=value",
        $set_once: { $initial_current_url: "https://the-page.example/france?purchase=id", $initial_referrer: "$direct" },
      },
    } as unknown as CaptureResult;
    expect(sanitizeAnalyticsEvent(event)?.properties).toEqual({
      $current_url: "https://the-page.example/reset-password",
      $referrer: "https://example.com/",
      $set_once: { $initial_current_url: "https://the-page.example/france", $initial_referrer: "$direct" },
    });
    expect(sanitizeAnalyticsEvent(null)).toBeNull();
  });
});
