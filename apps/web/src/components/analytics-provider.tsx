import { PostHogProvider } from "@posthog/react";
import type { PostHogInterface } from "posthog-js";
import { env } from "@my-better-t-app/env/web";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import { pageIdFromPath } from "@my-better-t-app/backend/convex/lib/pages";
import { useLocation } from "@tanstack/react-router";
import { useConvexAuth, useQuery } from "convex/react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { sanitizeAnalyticsEvent } from "@/lib/analytics";
import { AnalyticsContext } from "@/hooks/use-analytics";

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<PostHogInterface | null>(null);
  const options = useMemo(
    () => ({
      api_host: env.VITE_POSTHOG_HOST,
      ui_host: "https://eu.posthog.com",
      capture_pageview: false as const,
      capture_pageleave: false,
      autocapture: false,
      capture_exceptions: false,
      capture_performance: false,
      capture_heatmaps: false,
      capture_dead_clicks: false,
      disable_session_recording: true,
      disable_surveys: true,
      advanced_disable_feature_flags: true,
      person_profiles: "identified_only" as const,
      before_send: sanitizeAnalyticsEvent,
      loaded: (posthog: PostHogInterface) => {
        posthog.register({ environment: env.VITE_POSTHOG_ENVIRONMENT });
        setClient(posthog);
      },
    }),
    [],
  );

  if (!env.VITE_POSTHOG_PROJECT_TOKEN) return children;

  return (
    <PostHogProvider apiKey={env.VITE_POSTHOG_PROJECT_TOKEN} options={options}>
      <AnalyticsContext.Provider value={client}>
        {client && <AnalyticsSync client={client} />}
        {children}
      </AnalyticsContext.Provider>
    </PostHogProvider>
  );
}

function AnalyticsSync({ client }: { client: PostHogInterface }) {
  const { pathname } = useLocation();
  const { isAuthenticated, isLoading } = useConvexAuth();
  // This is the same Better Auth ID persisted as purchase.userId by the backend.
  const user = useQuery(api.auth.getCurrentUser, isAuthenticated ? {} : "skip");
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (isLoading || (isAuthenticated && user === undefined)) return;

    const userId = isAuthenticated ? user?._id : undefined;
    const identifiedUserId = client.get_property("$user_id");
    if (identifiedUserId && identifiedUserId !== userId) {
      client.reset();
      client.register({ environment: env.VITE_POSTHOG_ENVIRONMENT });
    }
    if (userId && identifiedUserId !== userId) client.identify(userId);

    // Search/hash changes, reactive query updates and StrictMode do not add pageviews.
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    const pageId = pageIdFromPath(pathname);
    client.capture("$pageview", {
      $current_url: `${window.location.origin}${pathname}`,
      $pathname: pathname,
      ...(pageId ? { page_id: pageId } : {}),
    });
  }, [client, pathname, isAuthenticated, isLoading, user]);

  return null;
}
