import { v } from "convex/values";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server.js";
import { paginationOptsValidator } from "convex/server";
import { Doc, Id } from "./_generated/dataModel.js";
import { paginator } from "convex-helpers/server/pagination";
import schema, { entryStatusValidator } from "./schema.js";

export const entryDoc = schema.tables.entries.validator.extend({
  _id: v.id("entries"),
  _creationTime: v.number(),
});

export async function getEntryLocales(
  ctx: QueryCtx,
  entry: Doc<"entries">,
): Promise<string[]> {
  const groupId = entry.translationGroupId;
  if (!groupId) {
    return entry.locale !== undefined ? [entry.locale] : [];
  }
  const siblings = await ctx.db
    .query("entries")
    .withIndex("by_translationGroupId", (q) =>
      q.eq("translationGroupId", groupId),
    )
    .take(50);
  return siblings
    .map((s) => s.locale)
    .filter((l): l is string => l !== undefined);
}

async function syncEntryTags(
  ctx: MutationCtx,
  entryId: Id<"entries">,
  newTags: string[],
  contentType: string,
): Promise<void> {
  const currentRows = await ctx.db
    .query("entryTags")
    .withIndex("by_entryId", (q) => q.eq("entryId", entryId))
    .take(200);

  const currentTagSet = new Set(currentRows.map((r) => r.tag));
  const newTagSet = new Set(newTags);

  await Promise.all([
    ...currentRows
      .filter((r) => !newTagSet.has(r.tag))
      .map((r) => ctx.db.delete("entryTags", r._id)),
    ...[...newTagSet]
      .filter((t) => !currentTagSet.has(t))
      .map((t) => ctx.db.insert("entryTags", { entryId, tag: t, contentType })),
  ]);
}

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
    const entryId = await ctx.db.insert("entries", {
      ...args,
      status: "draft",
      isTranslation: false,
    });
    if (args.tags && args.tags.length > 0) {
      await Promise.all(
        args.tags.map((tag) =>
          ctx.db.insert("entryTags", {
            entryId,
            tag,
            contentType: args.contentType,
          }),
        ),
      );
    }
    return entryId;
  },
});

export const get = query({
  args: { entryId: v.id("entries") },
  returns: v.union(v.null(), entryDoc),
  handler: async (ctx, args) => {
    return await ctx.db.get("entries", args.entryId);
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
    if (fields.featuredImageId !== undefined) patch.featuredImageId = fields.featuredImageId;
    if (fields.metadata !== undefined) patch.metadata = fields.metadata;

    if (fields.tags !== undefined) {
      patch.tags = fields.tags;
      const entry = await ctx.db.get("entries", entryId);
      if (entry) {
        await syncEntryTags(ctx, entryId, fields.tags, entry.contentType);
      }
    }

    await ctx.db.patch("entries", entryId, patch);
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
        // eslint-disable-next-line @convex-dev/no-filter-in-query
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
        // eslint-disable-next-line @convex-dev/no-filter-in-query
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
      // eslint-disable-next-line @convex-dev/no-filter-in-query
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

export const listEntriesForAdmin = query({
  args: {
    paginationOpts: paginationOptsValidator,
    contentType: v.optional(v.string()),
    status: v.optional(entryStatusValidator),
    locale: v.optional(v.string()),
    rootOnly: v.optional(v.boolean()),
    tag: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { contentType, status, locale, rootOnly, tag, paginationOpts } = args;
    const db = paginator(ctx.db, schema);

    // Tag filter: paginate junction table, fetch and enrich entries
    if (tag !== undefined) {
      const tagResult = contentType !== undefined
        ? await db
            .query("entryTags")
            .withIndex("by_tag_and_contentType", (q) =>
              q.eq("tag", tag).eq("contentType", contentType),
            )
            .order("desc")
            .paginate(paginationOpts)
        : await db
            .query("entryTags")
            .withIndex("by_tag", (q) => q.eq("tag", tag))
            .order("desc")
            .paginate(paginationOpts);

      const page = (
        await Promise.all(
          tagResult.page.map(async (row) => {
            const entry = await ctx.db.get("entries", row.entryId);
            if (!entry) return null;
            if (status !== undefined && entry.status !== status) return null;
            if (locale !== undefined && entry.locale !== locale) return null;
            if (rootOnly === true && entry.isTranslation === true) return null;
            const locales = await getEntryLocales(ctx, entry);
            return { ...entry, locales };
          }),
        )
      ).filter((e): e is NonNullable<typeof e> => e !== null);

      return { ...tagResult, page };
    }

    let result;

    if (rootOnly === true && contentType !== undefined) {
      result = await db
        .query("entries")
        .withIndex("by_contentType_and_isTranslation", (q) =>
          q.eq("contentType", contentType).eq("isTranslation", false),
        )
        .order("desc")
        .paginate(paginationOpts);
    } else if (rootOnly === true) {
      result = await db
        .query("entries")
        .withIndex("by_isTranslation", (q) => q.eq("isTranslation", false))
        .order("desc")
        .paginate(paginationOpts);
    } else if (contentType !== undefined && locale !== undefined) {
      result = await db
        .query("entries")
        .withIndex("by_contentType_and_locale", (q) =>
          q.eq("contentType", contentType).eq("locale", locale),
        )
        .order("desc")
        .paginate(paginationOpts);
    } else if (contentType !== undefined && status !== undefined) {
      result = await db
        .query("entries")
        .withIndex("by_contentType_and_status", (q) =>
          q.eq("contentType", contentType).eq("status", status),
        )
        .order("desc")
        .paginate(paginationOpts);
    } else if (contentType !== undefined) {
      result = await db
        .query("entries")
        .withIndex("by_contentType", (q) => q.eq("contentType", contentType))
        .order("desc")
        .paginate(paginationOpts);
    } else if (locale !== undefined) {
      result = await db
        .query("entries")
        .withIndex("by_locale", (q) => q.eq("locale", locale))
        .order("desc")
        .paginate(paginationOpts);
    } else if (status !== undefined) {
      result = await db
        .query("entries")
        .withIndex("by_status", (q) => q.eq("status", status))
        .order("desc")
        .paginate(paginationOpts);
    } else {
      result = await db.query("entries").order("desc").paginate(paginationOpts);
    }

    const page = await Promise.all(
      result.page.map(async (entry) => {
        const locales = await getEntryLocales(ctx, entry);
        return { ...entry, locales };
      }),
    );

    return { ...result, page };
  },
});

export const remove = mutation({
  args: { entryId: v.id("entries") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const [blocks, tagRows] = await Promise.all([
      ctx.db
        .query("entryBlocks")
        .withIndex("by_entryId_and_order", (q) => q.eq("entryId", args.entryId))
        .collect(),
      ctx.db
        .query("entryTags")
        .withIndex("by_entryId", (q) => q.eq("entryId", args.entryId))
        .take(200),
    ]);
    await Promise.all([
      ...blocks.map((b) => ctx.db.delete("entryBlocks", b._id)),
      ...tagRows.map((t) => ctx.db.delete("entryTags", t._id)),
    ]);
    await ctx.db.delete("entries", args.entryId);
    return null;
  },
});
