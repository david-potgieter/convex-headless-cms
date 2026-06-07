import {
  actionGeneric,
  mutationGeneric,
  queryGeneric,
} from "convex/server";
import type { Auth } from "convex/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import type { ComponentApi } from "../component/_generated/component.js";

const entryStatusValidator = v.union(
  v.literal("draft"),
  v.literal("pending_review"),
  v.literal("published"),
  v.literal("archived"),
);

/**
 * Create app-facing query/mutation/action wrappers for the headless CMS component.
 *
 * @param component - The component API from `components.headlessCms`
 * @param options.canWrite - Return true if the current user may create/edit entries
 * @param options.canPublish - Return true if the current user may publish entries
 *
 * @example
 * ```ts
 * // convex/cms.ts
 * import { components } from "./_generated/api";
 * import { makeHeadlessCmsAPI } from "convex-headless-cms";
 * import { getAuthUserId } from "@convex-dev/auth/server";
 *
 * export const {
 *   createEntry, getEntry, listEntries, updateEntry, removeEntry,
 *   listBlocks, replaceBlocks, upsertBlock, removeBlock,
 *   requestReview, rejectReview, publish, archive, unarchive,
 *   schedulePublish, cancelSchedule,
 *   searchText, vectorSearch, setEmbedding,
 *   createTranslation, listTranslations,
 *   getSetting, getAllSettings, upsertSetting,
 *   generateUploadUrl,
 * } = makeHeadlessCmsAPI(components.headlessCms, {
 *   canWrite: async (ctx) => (await getAuthUserId(ctx)) !== null,
 *   canPublish: async (ctx) => {
 *     const userId = await getAuthUserId(ctx);
 *     // Check admin role in your own users table
 *     return userId !== null;
 *   },
 * });
 * ```
 */
export function makeHeadlessCmsAPI(
  component: ComponentApi,
  options: {
    canWrite: (ctx: { auth: Auth }) => Promise<boolean>;
    canPublish: (ctx: { auth: Auth }) => Promise<boolean>;
  },
) {
  async function requireWrite(ctx: { auth: Auth }) {
    if (!(await options.canWrite(ctx))) throw new Error("Unauthorized");
  }

  async function requirePublish(ctx: { auth: Auth }) {
    if (!(await options.canPublish(ctx))) throw new Error("Unauthorized");
  }

  return {
    // ── Entries ──────────────────────────────────────────────────────────────

    createEntry: mutationGeneric({
      args: {
        contentType: v.string(),
        slug: v.string(),
        title: v.optional(v.string()),
        locale: v.optional(v.string()),
        translationGroupId: v.optional(v.string()),
        authorId: v.string(),
        tags: v.optional(v.array(v.string())),
        featuredImageId: v.optional(v.string()),
        metadata: v.optional(v.any()),
      },
      handler: async (ctx, args) => {
        await requireWrite(ctx);
        return await ctx.runMutation(component.entries.create, args);
      },
    }),

    getEntry: queryGeneric({
      args: { entryId: v.string() },
      handler: async (ctx, args) => {
        return await ctx.runQuery(component.entries.get, {
          entryId: args.entryId,
        });
      },
    }),

    getEntryBySlug: queryGeneric({
      args: {
        slug: v.string(),
        locale: v.optional(v.string()),
        contentType: v.optional(v.string()),
      },
      handler: async (ctx, args) => {
        return await ctx.runQuery(component.entries.getBySlug, args);
      },
    }),

    listEntries: queryGeneric({
      args: {
        paginationOpts: paginationOptsValidator,
        contentType: v.optional(v.string()),
        status: v.optional(entryStatusValidator),
        locale: v.optional(v.string()),
      },
      handler: async (ctx, args) => {
        return await ctx.runQuery(component.entries.list, args);
      },
    }),

    updateEntry: mutationGeneric({
      args: {
        entryId: v.string(),
        slug: v.optional(v.string()),
        title: v.optional(v.string()),
        locale: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
        featuredImageId: v.optional(v.string()),
        metadata: v.optional(v.any()),
      },
      handler: async (ctx, args) => {
        await requireWrite(ctx);
        return await ctx.runMutation(component.entries.update, args);
      },
    }),

    removeEntry: mutationGeneric({
      args: { entryId: v.string() },
      handler: async (ctx, args) => {
        await requireWrite(ctx);
        return await ctx.runMutation(component.entries.remove, args);
      },
    }),

    // Public: only ever returns published entries
    getPublishedEntryBySlug: queryGeneric({
      args: {
        slug: v.string(),
        contentType: v.string(),
        locale: v.optional(v.string()),
      },
      handler: async (ctx, args) => {
        return await ctx.runQuery(component.entries.getPublishedBySlug, args);
      },
    }),

    listPublishedEntries: queryGeneric({
      args: {
        paginationOpts: paginationOptsValidator,
        contentType: v.optional(v.string()),
        locale: v.optional(v.string()),
      },
      handler: async (ctx, args) => {
        return await ctx.runQuery(component.entries.listPublished, args);
      },
    }),

    // Admin: full access regardless of status
    getEntryForAdmin: queryGeneric({
      args: { entryId: v.string() },
      handler: async (ctx, args) => {
        return await ctx.runQuery(component.entries.get, { entryId: args.entryId });
      },
    }),

    listEntriesForAdmin: queryGeneric({
      args: {
        paginationOpts: paginationOptsValidator,
        contentType: v.optional(v.string()),
        status: v.optional(entryStatusValidator),
        locale: v.optional(v.string()),
      },
      handler: async (ctx, args) => {
        return await ctx.runQuery(component.entries.list, args);
      },
    }),

    // ── Blocks ───────────────────────────────────────────────────────────────

    listBlocks: queryGeneric({
      args: { entryId: v.string() },
      handler: async (ctx, args) => {
        return await ctx.runQuery(component.blocks.list, {
          entryId: args.entryId,
        });
      },
    }),

    replaceBlocks: mutationGeneric({
      args: {
        entryId: v.string(),
        blocks: v.array(
          v.object({ type: v.string(), content: v.any(), order: v.number() }),
        ),
      },
      handler: async (ctx, args) => {
        await requireWrite(ctx);
        return await ctx.runMutation(component.blocks.replace, args);
      },
    }),

    upsertBlock: mutationGeneric({
      args: {
        entryId: v.string(),
        blockId: v.optional(v.string()),
        type: v.string(),
        content: v.any(),
        order: v.number(),
      },
      handler: async (ctx, args) => {
        await requireWrite(ctx);
        return await ctx.runMutation(component.blocks.upsertBlock, args);
      },
    }),

    removeBlock: mutationGeneric({
      args: { blockId: v.string() },
      handler: async (ctx, args) => {
        await requireWrite(ctx);
        return await ctx.runMutation(component.blocks.removeBlock, {
          blockId: args.blockId,
        });
      },
    }),

    // ── Publish state machine ─────────────────────────────────────────────────

    requestReview: mutationGeneric({
      args: { entryId: v.string() },
      handler: async (ctx, args) => {
        await requireWrite(ctx);
        return await ctx.runMutation(component.publish.requestReview, args);
      },
    }),

    rejectReview: mutationGeneric({
      args: { entryId: v.string() },
      handler: async (ctx, args) => {
        await requirePublish(ctx);
        return await ctx.runMutation(component.publish.rejectReview, args);
      },
    }),

    publish: mutationGeneric({
      args: { entryId: v.string() },
      handler: async (ctx, args) => {
        await requirePublish(ctx);
        return await ctx.runMutation(component.publish.publish, args);
      },
    }),

    archive: mutationGeneric({
      args: { entryId: v.string() },
      handler: async (ctx, args) => {
        await requirePublish(ctx);
        return await ctx.runMutation(component.publish.archive, args);
      },
    }),

    unarchive: mutationGeneric({
      args: { entryId: v.string() },
      handler: async (ctx, args) => {
        await requireWrite(ctx);
        return await ctx.runMutation(component.publish.unarchive, args);
      },
    }),

    // ── Scheduled publish ─────────────────────────────────────────────────────

    schedulePublish: mutationGeneric({
      args: { entryId: v.string(), publishAt: v.number() },
      handler: async (ctx, args) => {
        await requirePublish(ctx);
        return await ctx.runMutation(component.schedule.schedule, args);
      },
    }),

    cancelSchedule: mutationGeneric({
      args: { entryId: v.string() },
      handler: async (ctx, args) => {
        await requirePublish(ctx);
        return await ctx.runMutation(component.schedule.cancelSchedule, args);
      },
    }),

    // ── Search ────────────────────────────────────────────────────────────────

    searchText: queryGeneric({
      args: {
        queryText: v.string(),
        contentType: v.optional(v.string()),
        status: v.optional(entryStatusValidator),
        locale: v.optional(v.string()),
        limit: v.optional(v.number()),
      },
      handler: async (ctx, args) => {
        return await ctx.runQuery(component.search.searchText, args);
      },
    }),

    vectorSearch: actionGeneric({
      args: {
        embedding: v.array(v.float64()),
        contentType: v.optional(v.string()),
        status: v.optional(entryStatusValidator),
        limit: v.optional(v.number()),
      },
      handler: async (ctx, args) => {
        return await ctx.runAction(component.search.vectorSearch, args);
      },
    }),

    setEmbedding: mutationGeneric({
      args: {
        entryId: v.string(),
        embedding: v.array(v.float64()),
      },
      handler: async (ctx, args) => {
        await requireWrite(ctx);
        return await ctx.runMutation(component.search.setEmbedding, args);
      },
    }),

    // ── i18n ─────────────────────────────────────────────────────────────────

    createTranslation: mutationGeneric({
      args: {
        sourceEntryId: v.string(),
        locale: v.string(),
        authorId: v.string(),
        copyBlocks: v.optional(v.boolean()),
      },
      handler: async (ctx, args) => {
        await requireWrite(ctx);
        return await ctx.runMutation(component.i18n.createTranslation, args);
      },
    }),

    listTranslations: queryGeneric({
      args: { entryId: v.string() },
      handler: async (ctx, args) => {
        return await ctx.runQuery(component.i18n.listTranslations, {
          entryId: args.entryId,
        });
      },
    }),

    // ── Settings ──────────────────────────────────────────────────────────────

    getSetting: queryGeneric({
      args: { key: v.string() },
      handler: async (ctx, args) => {
        return await ctx.runQuery(component.settings.get, args);
      },
    }),

    getAllSettings: queryGeneric({
      args: {},
      handler: async (ctx) => {
        return await ctx.runQuery(component.settings.getAll, {});
      },
    }),

    upsertSetting: mutationGeneric({
      args: { key: v.string(), value: v.any() },
      handler: async (ctx, args) => {
        await requireWrite(ctx);
        return await ctx.runMutation(component.settings.upsert, args);
      },
    }),

    // ── Uploads ───────────────────────────────────────────────────────────────

    generateUploadUrl: mutationGeneric({
      args: {},
      handler: async (ctx) => {
        await requireWrite(ctx);
        return await ctx.runMutation(component.uploads.generateUploadUrl, {});
      },
    }),
  };
}
