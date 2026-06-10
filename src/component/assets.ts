import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";
import { paginationOptsValidator } from "convex/server";
import { paginator } from "convex-helpers/server/pagination";
import schema from "./schema.js";

export const assetTypeValidator = v.union(
  v.literal("image"),
  v.literal("video"),
  v.literal("audio"),
  v.literal("document"),
  v.literal("other"),
);

export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
    type: v.optional(assetTypeValidator),
  },
  handler: async (ctx, args) => {
    const db = paginator(ctx.db, schema);

    const result = args.type !== undefined
      ? await db
          .query("assets")
          .withIndex("by_type", (q) => q.eq("type", args.type!))
          .order("desc")
          .paginate(args.paginationOpts)
      : await db
          .query("assets")
          .order("desc")
          .paginate(args.paginationOpts);

    const page = await Promise.all(
      result.page.map(async (asset) => ({
        ...asset,
        url: await ctx.storage.getUrl(asset.storageId),
      })),
    );

    return { ...result, page };
  },
});

export const create = mutation({
  args: {
    storageId: v.string(),
    name: v.string(),
    type: assetTypeValidator,
    mimeType: v.optional(v.string()),
    alt: v.optional(v.string()),
    size: v.optional(v.number()),
  },
  returns: v.id("assets"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("assets", args);
  },
});

export const update = mutation({
  args: {
    assetId: v.id("assets"),
    name: v.optional(v.string()),
    alt: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { assetId, ...fields } = args;
    const patch: Record<string, unknown> = {};
    if (fields.name !== undefined) patch.name = fields.name;
    if (fields.alt !== undefined) patch.alt = fields.alt;
    await ctx.db.patch("assets", assetId, patch);
    return null;
  },
});

export const remove = mutation({
  args: { assetId: v.id("assets") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete("assets", args.assetId);
    return null;
  },
});
