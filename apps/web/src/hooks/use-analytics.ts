import { createContext, useContext } from "react";
import type { PostHogInterface } from "posthog-js";

export const AnalyticsContext = createContext<PostHogInterface | null>(null);

export function useAnalytics() {
  return useContext(AnalyticsContext);
}
