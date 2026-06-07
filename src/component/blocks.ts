import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";
import { sortBy } from "lodash-es";

const blockArg = v.object({
  type: v.string(),
  content: v.any(),
  order: v.number(),
});

const blockDoc = v.object({
  _id: v.id("entryBlocks"),
  _creationTime: v.number(),
  entryId: v.id("entries"),
  type: v.string(),
  content: v.any(),
  order: v.number(),
});

export const list = query({
  args: { entryId: v.id("entries") },
  returns: v.array(blockDoc),
  handler: async (ctx, args) => {
    const blocks = await ctx.db
      .query("entryBlocks")
      .withIndex("by_entryId_and_order", (q) => q.eq("entryId", args.entryId))
      .take(500);
    return sortBy(blocks, "order");
  },
});

export const replace = mutation({
  args: {
    entryId: v.id("entries"),
    blocks: v.array(blockArg),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("entryBlocks")
      .withIndex("by_entryId_and_order", (q) => q.eq("entryId", args.entryId))
      .collect();
    await Promise.all(existing.map((b) => ctx.db.delete("entryBlocks", b._id)));
    const sorted = sortBy(args.blocks, "order");
    await Promise.all(
      sorted.map((block) =>
        ctx.db.insert("entryBlocks", { entryId: args.entryId, ...block }),
      ),
    );
    return null;
  },
});

export const upsertBlock = mutation({
  args: {
    entryId: v.id("entries"),
    blockId: v.optional(v.id("entryBlocks")),
    type: v.string(),
    content: v.any(),
    order: v.number(),
  },
  returns: v.id("entryBlocks"),
  handler: async (ctx, args) => {
    const { blockId, entryId, ...fields } = args;
    if (blockId !== undefined) {
      await ctx.db.patch("entryBlocks", blockId, fields);
      return blockId;
    }
    return await ctx.db.insert("entryBlocks", { entryId, ...fields });
  },
});

export const removeBlock = mutation({
  args: { blockId: v.id("entryBlocks") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete("entryBlocks", args.blockId);
    return null;
  },
});
