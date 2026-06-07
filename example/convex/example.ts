import { mutation, query } from "./_generated/server.js";
import { components } from "./_generated/api.js";
import { makeHeadlessCmsAPI } from "convex-headless-cms";
import { v } from "convex/values";
import type { Auth } from "convex/server";

// Auth helper — replace with your own auth logic (e.g. @convex-dev/auth)
async function getAuthUserId(ctx: { auth: Auth }) {
  return (await ctx.auth.getUserIdentity())?.subject ?? null;
}

// Wire up the CMS API with your auth rules.
// canWrite — any authenticated user may create/edit drafts
// canPublish — same for this example; add role checks for RBAC
export const {
  createEntry,
  getEntry,
  getEntryBySlug,
  getPublishedEntryBySlug,
  listPublishedEntries,
  getEntryForAdmin,
  listEntriesForAdmin,
  listEntries,
  updateEntry,
  removeEntry,
  listBlocks,
  replaceBlocks,
  upsertBlock,
  removeBlock,
  requestReview,
  rejectReview,
  publish,
  archive,
  unarchive,
  schedulePublish,
  cancelSchedule,
  searchText,
  vectorSearch,
  setEmbedding,
  createTranslation,
  listTranslations,
  getSetting,
  getAllSettings,
  upsertSetting,
  generateUploadUrl,
} = makeHeadlessCmsAPI(components.headlessCms, {
  canWrite: async (ctx) => (await getAuthUserId(ctx)) !== null,
  canPublish: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;
    // Add role check here, e.g. look up user in your own table
    return true;
  },
});

// Example: a custom mutation wrapping createEntry to inject authorId from auth
export const createPost = mutation({
  args: {
    slug: v.string(),
    title: v.optional(v.string()),
    locale: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    return await ctx.runMutation(components.headlessCms.entries.create, {
      contentType: "post",
      slug: args.slug,
      title: args.title,
      locale: args.locale,
      authorId: userId,
    });
  },
});

// Example: get published posts for a locale
export const listPublishedPosts = query({
  args: {
    locale: v.optional(v.string()),
    paginationOpts: v.object({
      numItems: v.number(),
      cursor: v.union(v.string(), v.null()),
    }),
  },
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.headlessCms.entries.list, {
      contentType: "post",
      status: "published",
      locale: args.locale,
      paginationOpts: args.paginationOpts,
    });
  },
});
