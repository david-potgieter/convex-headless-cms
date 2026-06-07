import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";

export const get = query({
  args: { key: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query("siteSettings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    return doc?.value ?? null;
  },
});

export const getAll = query({
  args: {},
  returns: v.array(v.object({ key: v.string(), value: v.any() })),
  handler: async (ctx) => {
    const docs = await ctx.db.query("siteSettings").collect();
    return docs.map((d) => ({ key: d.key, value: d.value }));
  },
});

export const upsert = mutation({
  args: {
    key: v.string(),
    value: v.any(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("siteSettings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    if (existing) {
      await ctx.db.patch("siteSettings", existing._id, { value: args.value });
    } else {
      await ctx.db.insert("siteSettings", {
        key: args.key,
        value: args.value,
      });
    }
    return null;
  },
});
