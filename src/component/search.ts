import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server.js";
import { entryStatusValidator } from "./schema.js";
import { entryDoc } from "./entries.js";

export const searchText = query({
  args: {
    queryText: v.string(),
    contentType: v.optional(v.string()),
    status: v.optional(entryStatusValidator),
    locale: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(entryDoc),
  handler: async (ctx, args) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q = ctx.db.query("entries").withSearchIndex("search_title", (s: any) => {
      let sq = s.search("title", args.queryText);
      if (args.contentType !== undefined) sq = sq.eq("contentType", args.contentType);
      if (args.status !== undefined) sq = sq.eq("status", args.status);
      if (args.locale !== undefined) sq = sq.eq("locale", args.locale);
      return sq;
    });
    return await q.take(args.limit ?? 20);
  },
});

export const vectorSearch = action({
  args: {
    embedding: v.array(v.float64()),
    contentType: v.optional(v.string()),
    status: v.optional(entryStatusValidator),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({ _id: v.string(), _score: v.number() }),
  ),
  handler: async (ctx, args) => {
    const { embedding, contentType, status, limit } = args;
    const numItems = limit ?? 10;

    // VectorFilterBuilder only supports eq() per field (no AND across fields).
    // When both filters are requested, apply the most selective one (contentType) at
    // the DB level. The caller is responsible for post-filtering by status if needed.
    let raw: Array<{ _id: string; _score: number }>;

    if (contentType !== undefined) {
      const results = await ctx.vectorSearch("entries", "by_embedding", {
        vector: embedding,
        limit: numItems,
        filter: (q) => q.eq("contentType", contentType),
      });
      raw = results.map((r) => ({ _id: r._id as string, _score: r._score }));
    } else if (status !== undefined) {
      const results = await ctx.vectorSearch("entries", "by_embedding", {
        vector: embedding,
        limit: numItems,
        filter: (q) => q.eq("status", status),
      });
      raw = results.map((r) => ({ _id: r._id as string, _score: r._score }));
    } else {
      const results = await ctx.vectorSearch("entries", "by_embedding", {
        vector: embedding,
        limit: numItems,
      });
      raw = results.map((r) => ({ _id: r._id as string, _score: r._score }));
    }

    return raw;
  },
});

export const setEmbedding = mutation({
  args: {
    entryId: v.id("entries"),
    embedding: v.array(v.float64()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.entryId, { embedding: args.embedding });
    return null;
  },
});
