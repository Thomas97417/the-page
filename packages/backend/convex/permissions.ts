import { ConvexError } from "convex/values";
import type { QueryCtx, MutationCtx, ActionCtx } from "./_generated/server";
import { authComponent } from "./auth";

export function isAdminId(userId: string) {
  return (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .includes(userId);
}

export async function requireUser(ctx: QueryCtx | MutationCtx | ActionCtx) {
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user) throw new ConvexError("Connectez-vous pour continuer.");
  return user;
}

export async function requireAdmin(ctx: QueryCtx | MutationCtx | ActionCtx) {
  const user = await requireUser(ctx);
  if (!isAdminId(user._id))
    throw new ConvexError("Accès réservé à l’administration.");
  return user;
}
