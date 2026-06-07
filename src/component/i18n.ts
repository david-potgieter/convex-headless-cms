import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";
import { entryDoc } from "./entries.js";

export const createTranslation = mutation({
  args: {
    sourceEntryId: v.id("entries"),
    locale: v.string(),
    authorId: v.string(),
    copyBlocks: v.optional(v.boolean()),
  },
  returns: v.id("entries"),
  handler: async (ctx, args) => {
    const source = await ctx.db.get(args.sourceEntryId);
    if (!source) throw new Error("Source entry not found");

    // Use or create a translationGroupId to link all translations
    const translationGroupId = source.translationGroupId ?? args.sourceEntryId;

    // Stamp the source entry with the group ID if it doesn't have one yet
    if (!source.translationGroupId) {
      await ctx.db.patch(args.sourceEntryId, {
        translationGroupId: args.sourceEntryId,
      });
    }

    const newEntryId = await ctx.db.insert("entries", {
      contentType: source.contentType,
      status: "draft",
      slug: `${source.slug}-${args.locale}`,
      title: source.title,
      locale: args.locale,
      translationGroupId,
      authorId: args.authorId,
    });

    if (args.copyBlocks) {
      const blocks = await ctx.db
        .query("entryBlocks")
        .withIndex("by_entryId_and_order", (q) =>
          q.eq("entryId", args.sourceEntryId),
        )
        .collect();
      await Promise.all(
        blocks.map((b) =>
          ctx.db.insert("entryBlocks", {
            entryId: newEntryId,
            type: b.type,
            content: b.content,
            order: b.order,
          }),
        ),
      );
    }

    return newEntryId;
  },
});

export const listTranslations = query({
  args: { entryId: v.id("entries") },
  returns: v.array(entryDoc),
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId);
    if (!entry) return [];
    const groupId = entry.translationGroupId ?? args.entryId;
    return await ctx.db
      .query("entries")
      .withIndex("by_translationGroupId", (q) =>
        q.eq("translationGroupId", groupId),
      )
      .take(50);
  },
});
