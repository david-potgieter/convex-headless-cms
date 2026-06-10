import { v } from "convex/values";
import { query } from "./_generated/server.js";

export const listTags = query({
  args: {
    contentType: v.optional(v.string()),
  },
  returns: v.array(v.object({ tag: v.string(), count: v.number() })),
  handler: async (ctx, args) => {
    const rows = args.contentType !== undefined
      ? await ctx.db
          .query("entryTags")
          .withIndex("by_contentType", (q) =>
            q.eq("contentType", args.contentType!),
          )
          .take(2000)
      : await ctx.db
          .query("entryTags")
          .withIndex("by_tag")
          .take(2000);

    const counts = new Map<string, number>();
    for (const row of rows) {
      counts.set(row.tag, (counts.get(row.tag) ?? 0) + 1);
    }

    return [...counts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  },
});
