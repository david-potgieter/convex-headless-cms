/* eslint-disable */
/**
 * Generated `ComponentApi` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";

/**
 * A utility for referencing a Convex component's exposed API.
 *
 * Useful when expecting a parameter like `components.myComponent`.
 * Usage:
 * ```ts
 * async function myFunction(ctx: QueryCtx, component: ComponentApi) {
 *   return ctx.runQuery(component.someFile.someQuery, { ...args });
 * }
 * ```
 */
export type ComponentApi<Name extends string | undefined = string | undefined> =
  {
    tags: {
      listTags: FunctionReference<
        "query",
        "internal",
        { contentType?: string },
        Array<{ tag: string; count: number }>,
        Name
      >;
    };
    assets: {
      create: FunctionReference<
        "mutation",
        "internal",
        {
          alt?: string;
          mimeType?: string;
          name: string;
          size?: number;
          storageId: string;
          type: "image" | "video" | "audio" | "document" | "other";
        },
        string,
        Name
      >;
      list: FunctionReference<
        "query",
        "internal",
        {
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          type?: "image" | "video" | "audio" | "document" | "other";
        },
        any,
        Name
      >;
      remove: FunctionReference<
        "mutation",
        "internal",
        { assetId: string },
        null,
        Name
      >;
      update: FunctionReference<
        "mutation",
        "internal",
        { alt?: string; assetId: string; name?: string },
        null,
        Name
      >;
    };
    blocks: {
      list: FunctionReference<
        "query",
        "internal",
        { entryId: string },
        Array<{
          _creationTime: number;
          _id: string;
          content: any;
          entryId: string;
          order: number;
          type: string;
        }>,
        Name
      >;
      removeBlock: FunctionReference<
        "mutation",
        "internal",
        { blockId: string },
        null,
        Name
      >;
      replace: FunctionReference<
        "mutation",
        "internal",
        {
          blocks: Array<{ content: any; order: number; type: string }>;
          entryId: string;
        },
        null,
        Name
      >;
      upsertBlock: FunctionReference<
        "mutation",
        "internal",
        {
          blockId?: string;
          content: any;
          entryId: string;
          order: number;
          type: string;
        },
        string,
        Name
      >;
    };
    entries: {
      create: FunctionReference<
        "mutation",
        "internal",
        {
          authorId: string;
          contentType: string;
          featuredImageId?: string;
          locale?: string;
          metadata?: any;
          slug: string;
          tags?: Array<string>;
          title?: string;
          translationGroupId?: string;
        },
        string,
        Name
      >;
      get: FunctionReference<
        "query",
        "internal",
        { entryId: string },
        null | {
          _creationTime: number;
          _id: string;
          authorId: string;
          contentType: string;
          embedding?: Array<number>;
          featuredImageId?: string;
          isTranslation?: boolean;
          locale?: string;
          metadata?: any;
          publishedAt?: number;
          scheduledPublishJobId?: string;
          scheduledPublishTime?: number;
          slug: string;
          status: "draft" | "pending_review" | "published" | "archived";
          tags?: Array<string>;
          title?: string;
          translationGroupId?: string;
          updatedAt?: number;
        },
        Name
      >;
      getBySlug: FunctionReference<
        "query",
        "internal",
        { locale?: string; slug: string },
        null | {
          _creationTime: number;
          _id: string;
          authorId: string;
          contentType: string;
          embedding?: Array<number>;
          featuredImageId?: string;
          isTranslation?: boolean;
          locale?: string;
          metadata?: any;
          publishedAt?: number;
          scheduledPublishJobId?: string;
          scheduledPublishTime?: number;
          slug: string;
          status: "draft" | "pending_review" | "published" | "archived";
          tags?: Array<string>;
          title?: string;
          translationGroupId?: string;
          updatedAt?: number;
        },
        Name
      >;
      getPublishedBySlug: FunctionReference<
        "query",
        "internal",
        { contentType: string; locale?: string; slug: string },
        null | {
          _creationTime: number;
          _id: string;
          authorId: string;
          contentType: string;
          embedding?: Array<number>;
          featuredImageId?: string;
          isTranslation?: boolean;
          locale?: string;
          metadata?: any;
          publishedAt?: number;
          scheduledPublishJobId?: string;
          scheduledPublishTime?: number;
          slug: string;
          status: "draft" | "pending_review" | "published" | "archived";
          tags?: Array<string>;
          title?: string;
          translationGroupId?: string;
          updatedAt?: number;
        },
        Name
      >;
      list: FunctionReference<
        "query",
        "internal",
        {
          contentType?: string;
          locale?: string;
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          status?: "draft" | "pending_review" | "published" | "archived";
        },
        any,
        Name
      >;
      listEntriesForAdmin: FunctionReference<
        "query",
        "internal",
        {
          contentType?: string;
          locale?: string;
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          rootOnly?: boolean;
          status?: "draft" | "pending_review" | "published" | "archived";
          tag?: string;
        },
        any,
        Name
      >;
      listPublished: FunctionReference<
        "query",
        "internal",
        {
          contentType?: string;
          locale?: string;
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
        },
        any,
        Name
      >;
      remove: FunctionReference<
        "mutation",
        "internal",
        { entryId: string },
        null,
        Name
      >;
      update: FunctionReference<
        "mutation",
        "internal",
        {
          entryId: string;
          featuredImageId?: string;
          locale?: string;
          metadata?: any;
          slug?: string;
          tags?: Array<string>;
          title?: string;
        },
        null,
        Name
      >;
    };
    i18n: {
      createTranslation: FunctionReference<
        "mutation",
        "internal",
        {
          authorId: string;
          copyBlocks?: boolean;
          locale: string;
          sourceEntryId: string;
        },
        string,
        Name
      >;
      listTranslations: FunctionReference<
        "query",
        "internal",
        { entryId: string },
        Array<{
          _creationTime: number;
          _id: string;
          authorId: string;
          contentType: string;
          embedding?: Array<number>;
          featuredImageId?: string;
          isTranslation?: boolean;
          locale?: string;
          metadata?: any;
          publishedAt?: number;
          scheduledPublishJobId?: string;
          scheduledPublishTime?: number;
          slug: string;
          status: "draft" | "pending_review" | "published" | "archived";
          tags?: Array<string>;
          title?: string;
          translationGroupId?: string;
          updatedAt?: number;
        }>,
        Name
      >;
    };
    publish: {
      archive: FunctionReference<
        "mutation",
        "internal",
        { entryId: string },
        null,
        Name
      >;
      publish: FunctionReference<
        "mutation",
        "internal",
        { entryId: string },
        null,
        Name
      >;
      rejectReview: FunctionReference<
        "mutation",
        "internal",
        { entryId: string },
        null,
        Name
      >;
      requestReview: FunctionReference<
        "mutation",
        "internal",
        { entryId: string },
        null,
        Name
      >;
      unarchive: FunctionReference<
        "mutation",
        "internal",
        { entryId: string },
        null,
        Name
      >;
      unpublish: FunctionReference<
        "mutation",
        "internal",
        { entryId: string },
        null,
        Name
      >;
    };
    schedule: {
      cancelSchedule: FunctionReference<
        "mutation",
        "internal",
        { entryId: string },
        null,
        Name
      >;
      schedule: FunctionReference<
        "mutation",
        "internal",
        { entryId: string; publishAt: number },
        null,
        Name
      >;
    };
    search: {
      searchText: FunctionReference<
        "query",
        "internal",
        {
          contentType?: string;
          limit?: number;
          locale?: string;
          queryText: string;
          status?: "draft" | "pending_review" | "published" | "archived";
        },
        Array<{
          _creationTime: number;
          _id: string;
          authorId: string;
          contentType: string;
          embedding?: Array<number>;
          featuredImageId?: string;
          isTranslation?: boolean;
          locale?: string;
          metadata?: any;
          publishedAt?: number;
          scheduledPublishJobId?: string;
          scheduledPublishTime?: number;
          slug: string;
          status: "draft" | "pending_review" | "published" | "archived";
          tags?: Array<string>;
          title?: string;
          translationGroupId?: string;
          updatedAt?: number;
        }>,
        Name
      >;
      setEmbedding: FunctionReference<
        "mutation",
        "internal",
        { embedding: Array<number>; entryId: string },
        null,
        Name
      >;
      vectorSearch: FunctionReference<
        "action",
        "internal",
        {
          contentType?: string;
          embedding: Array<number>;
          limit?: number;
          status?: "draft" | "pending_review" | "published" | "archived";
        },
        Array<{ _id: string; _score: number }>,
        Name
      >;
    };
    settings: {
      get: FunctionReference<"query", "internal", { key: string }, any, Name>;
      getAll: FunctionReference<
        "query",
        "internal",
        {},
        Array<{ key: string; value: any }>,
        Name
      >;
      upsert: FunctionReference<
        "mutation",
        "internal",
        { key: string; value: any },
        null,
        Name
      >;
    };
    uploads: {
      generateUploadUrl: FunctionReference<
        "mutation",
        "internal",
        {},
        string,
        Name
      >;
      getStorageUrl: FunctionReference<
        "query",
        "internal",
        { storageId: string },
        string | null,
        Name
      >;
    };
  };
