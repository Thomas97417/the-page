import { pageIdFromPath } from "@my-better-t-app/backend/convex/lib/pages";

export type RouteAuthContext = {
  token?: string;
  isAuthenticated?: boolean;
};

export async function loadRouteAuth({
  pathname,
  isServer,
  getToken,
}: {
  pathname: string;
  isServer: boolean;
  getToken: () => Promise<string | undefined>;
}) {
  // Keep the initial route context on public client navigations. The auth
  // provider tracks session changes; private and auth routes still revalidate.
  if (
    !isServer &&
    (pageIdFromPath(pathname) !== null ||
      ["/privacy", "/terms", "/mentions-legales", "/conditions-utilisation"].includes(pathname.replace(/\/$/, "")))
  ) return;

  const token = await getToken();
  return { token, isAuthenticated: !!token };
}
