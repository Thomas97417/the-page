import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import {
  languageFromCookie,
  normalizeLanguage,
} from "@my-better-t-app/backend/convex/lib/language";

export const getInitialLanguage = createIsomorphicFn()
  .server(() => languageFromCookie(getRequestHeader("cookie")))
  .client(() =>
    // Hydrate using exactly the language used to render this document.
    normalizeLanguage(document.documentElement.lang),
  );
