import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const entryStatusValidator = v.union(
  v.literal("draft"),
  v.literal("pending_review"),
  v.literal("published"),
  v.literal("archived"),
);

export default defineSchema({
  entries: defineTable({
    contentType: v.string(),
    status: entryStatusValidator,
    slug: v.string(),
    title: v.optional(v.string()),
    locale: v.optional(v.string()),
    translationGroupId: v.optional(v.id("entries")),
    isTranslation: v.optional(v.boolean()),
    authorId: v.string(),
    tags: v.optional(v.array(v.string())),
    featuredImageId: v.optional(v.string()),
    metadata: v.optional(v.any()),
    publishedAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
    scheduledPublishTime: v.optional(v.number()),
    scheduledPublishJobId: v.optional(v.string()),
    embedding: v.optional(v.array(v.float64())),
  })
    .index("by_contentType", ["contentType"])
    .index("by_slug", ["slug"])
    .index("by_slug_and_contentType", ["slug", "contentType"])
    .index("by_slug_and_locale", ["slug", "locale"])
    .index("by_contentType_and_status", ["contentType", "status"])
    .index("by_contentType_and_locale", ["contentType", "locale"])
    .index("by_contentType_status_and_locale", ["contentType", "status", "locale"])
    .index("by_locale", ["locale"])
    .index("by_locale_and_status", ["locale", "status"])
    .index("by_translationGroupId", ["translationGroupId"])
    .index("by_isTranslation", ["isTranslation"])
    .index("by_contentType_and_isTranslation", ["contentType", "isTranslation"])
    .index("by_authorId", ["authorId"])
    .index("by_status", ["status"])
    .index("by_scheduledPublishTime", ["scheduledPublishTime"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["contentType", "status", "locale"],
    })
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["contentType", "status"],
    }),

  assets: defineTable({
    storageId: v.string(),
    name: v.string(),
    type: v.union(
      v.literal("image"),
      v.literal("video"),
      v.literal("audio"),
      v.literal("document"),
      v.literal("other"),
    ),
    mimeType: v.optional(v.string()),
    alt: v.optional(v.string()),
    size: v.optional(v.number()),
  })
    .index("by_storageId", ["storageId"])
    .index("by_type", ["type"]),

  entryTags: defineTable({
    entryId: v.id("entries"),
    tag: v.string(),
    contentType: v.string(),
    locale: v.optional(v.string()),
  })
    .index("by_tag", ["tag"])
    .index("by_tag_and_contentType", ["tag", "contentType"])
    .index("by_tag_and_locale", ["tag", "locale"])
    .index("by_tag_contentType_and_locale", ["tag", "contentType", "locale"])
    .index("by_contentType", ["contentType"])
    .index("by_contentType_and_locale", ["contentType", "locale"])
    .index("by_locale", ["locale"])
    .index("by_entryId", ["entryId"]),

  entryBlocks: defineTable({
    entryId: v.id("entries"),
    type: v.string(),
    content: v.any(),
    order: v.number(),
  }).index("by_entryId_and_order", ["entryId", "order"]),

  siteSettings: defineTable({
    key: v.string(),
    value: v.any(),
  }).index("by_key", ["key"]),
});
