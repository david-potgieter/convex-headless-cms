import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";
import { paginationOptsValidator } from "convex/server";
import { paginator } from "convex-helpers/server/pagination";
import schema, { entryStatusValidator } from "./schema.js";

export const entryDoc = schema.tables.entries.validator.extend({
  _id: v.id("entries"),
  _creationTime: v.number(),
});

export const create = mutation({
  args: {
    contentType: v.string(),
    slug: v.string(),
    title: v.optional(v.string()),
    locale: v.optional(v.string()),
    translationGroupId: v.optional(v.id("entries")),
    authorId: v.string(),
    tags: v.optional(v.array(v.string())),
    featuredImageId: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  returns: v.id("entries"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("entries", {
      ...args,
      status: "draft",
    });
  },
});

export const get = query({
  args: { entryId: v.id("entries") },
  returns: v.union(v.null(), entryDoc),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.entryId);
  },
});

export const getBySlug = query({
  args: {
    slug: v.string(),
    locale: v.optional(v.string()),
  },
  returns: v.union(v.null(), entryDoc),
  handler: async (ctx, args) => {
    if (args.locale !== undefined) {
      return await ctx.db
        .query("entries")
        .withIndex("by_slug_and_locale", (q) =>
          q.eq("slug", args.slug).eq("locale", args.locale),
        )
        .first();
    }
    return await ctx.db
      .query("entries")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
    contentType: v.optional(v.string()),
    status: v.optional(entryStatusValidator),
    locale: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { contentType, status, locale, paginationOpts } = args;
    const db = paginator(ctx.db, schema);

    if (contentType !== undefined && locale !== undefined) {
      return await db
        .query("entries")
        .withIndex("by_contentType_and_locale", (q) =>
          q.eq("contentType", contentType).eq("locale", locale),
        )
        .order("desc")
        .paginate(paginationOpts);
    }
    if (contentType !== undefined && status !== undefined) {
      return await db
        .query("entries")
        .withIndex("by_contentType_and_status", (q) =>
          q.eq("contentType", contentType).eq("status", status),
        )
        .order("desc")
        .paginate(paginationOpts);
    }
    if (contentType !== undefined) {
      return await db
        .query("entries")
        .withIndex("by_contentType", (q) => q.eq("contentType", contentType))
        .order("desc")
        .paginate(paginationOpts);
    }
    if (locale !== undefined) {
      return await db
        .query("entries")
        .withIndex("by_locale", (q) => q.eq("locale", locale))
        .order("desc")
        .paginate(paginationOpts);
    }
    if (status !== undefined) {
      return await db
        .query("entries")
        .withIndex("by_status", (q) => q.eq("status", status))
        .order("desc")
        .paginate(paginationOpts);
    }
    return await db.query("entries").order("desc").paginate(paginationOpts);
  },
});

export const update = mutation({
  args: {
    entryId: v.id("entries"),
    slug: v.optional(v.string()),
    title: v.optional(v.string()),
    locale: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    featuredImageId: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { entryId, ...fields } = args;
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (fields.slug !== undefined) patch.slug = fields.slug;
    if (fields.title !== undefined) patch.title = fields.title;
    if (fields.locale !== undefined) patch.locale = fields.locale;
    if (fields.tags !== undefined) patch.tags = fields.tags;
    if (fields.featuredImageId !== undefined) patch.featuredImageId = fields.featuredImageId;
    if (fields.metadata !== undefined) patch.metadata = fields.metadata;
    await ctx.db.patch(entryId, patch);
    return null;
  },
});

export const getPublishedBySlug = query({
  args: {
    slug: v.string(),
    contentType: v.string(),
    locale: v.optional(v.string()),
  },
  returns: v.union(v.null(), entryDoc),
  handler: async (ctx, args) => {
    const { slug, contentType, locale } = args;

    if (locale !== undefined) {
      const entry = await ctx.db
        .query("entries")
        .withIndex("by_slug_and_contentType", (q) =>
          q.eq("slug", slug).eq("contentType", contentType),
        )
        .filter((q) =>
          q.and(
            q.eq(q.field("status"), "published"),
            q.eq(q.field("locale"), locale),
          ),
        )
        .first();
      if (entry) return entry;
    }

    // Fall back to defaultLocale from siteSettings
    const defaultLocaleSetting = await ctx.db
      .query("siteSettings")
      .withIndex("by_key", (q) => q.eq("key", "defaultLocale"))
      .first();
    const defaultLocale = defaultLocaleSetting?.value as string | undefined;

    if (defaultLocale !== undefined && defaultLocale !== locale) {
      const entry = await ctx.db
        .query("entries")
        .withIndex("by_slug_and_contentType", (q) =>
          q.eq("slug", slug).eq("contentType", contentType),
        )
        .filter((q) =>
          q.and(
            q.eq(q.field("status"), "published"),
            q.eq(q.field("locale"), defaultLocale),
          ),
        )
        .first();
      if (entry) return entry;
    }

    // Final fallback: slug + contentType, any locale
    return await ctx.db
      .query("entries")
      .withIndex("by_slug_and_contentType", (q) =>
        q.eq("slug", slug).eq("contentType", contentType),
      )
      .filter((q) => q.eq(q.field("status"), "published"))
      .first();
  },
});

export const listPublished = query({
  args: {
    paginationOpts: paginationOptsValidator,
    contentType: v.optional(v.string()),
    locale: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { contentType, locale, paginationOpts } = args;
    const db = paginator(ctx.db, schema);

    if (contentType !== undefined && locale !== undefined) {
      return await db
        .query("entries")
        .withIndex("by_contentType_status_and_locale", (q) =>
          q.eq("contentType", contentType).eq("status", "published").eq("locale", locale),
        )
        .order("desc")
        .paginate(paginationOpts);
    }
    if (contentType !== undefined) {
      return await db
        .query("entries")
        .withIndex("by_contentType_and_status", (q) =>
          q.eq("contentType", contentType).eq("status", "published"),
        )
        .order("desc")
        .paginate(paginationOpts);
    }
    if (locale !== undefined) {
      return await db
        .query("entries")
        .withIndex("by_locale_and_status", (q) =>
          q.eq("locale", locale).eq("status", "published"),
        )
        .order("desc")
        .paginate(paginationOpts);
    }
    return await db
      .query("entries")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .order("desc")
      .paginate(paginationOpts);
  },
});

export const remove = mutation({
  args: { entryId: v.id("entries") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const blocks = await ctx.db
      .query("entryBlocks")
      .withIndex("by_entryId_and_order", (q) => q.eq("entryId", args.entryId))
      .collect();
    await Promise.all(blocks.map((b) => ctx.db.delete(b._id)));
    await ctx.db.delete(args.entryId);
    return null;
  },
});
