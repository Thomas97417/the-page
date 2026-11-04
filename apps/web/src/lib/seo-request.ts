import { env } from "@my-better-t-app/env/web";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestUrl } from "@tanstack/react-start/server";

// Pin production canonicals to the configured origin, including on previews.
// Local development also works before a production domain has been chosen.
export const getSiteUrl = createIsomorphicFn()
  .server(() => new URL(env.VITE_SITE_URL ?? getRequestUrl().origin).origin)
  .client(() => new URL(env.VITE_SITE_URL ?? window.location.origin).origin);
