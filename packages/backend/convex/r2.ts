import { R2 } from "@convex-dev/r2";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { mutation, type MutationCtx } from "./_generated/server";
import { requireUser } from "./permissions";
import { rateLimiter } from "./lib/rateLimits";

export const r2 = new R2(components.r2);

async function requireUpload(ctx: MutationCtx) {
  const user = await requireUser(ctx);
  await rateLimiter.limit(ctx, "upload", { key: user._id, throws: true });
  return user;
}

export const { syncMetadata, listMetadata, getMetadata } = r2.clientApi<DataModel>({
  onUpload: async (ctx) => {
    await requireUpload(ctx);
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUpload(ctx);
    return r2.generateUploadUrl();
  },
});

export const generateUserUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUpload(ctx);
    const key = `uploads/${crypto.randomUUID()}`;
    return r2.generateUploadUrl(key);
  },
});

export const generateAvatarUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUpload(ctx);
    // Delete the old avatar from R2 if it exists
    if (user.image && user.image.startsWith("avatars/")) {
      await r2.deleteObject(ctx, user.image);
    }
    const key = `avatars/${user._id}/${crypto.randomUUID()}`;
    return r2.generateUploadUrl(key);
  },
});
