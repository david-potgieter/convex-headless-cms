/// <reference types="vite/client" />

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "./_generated/api.js";
import { initConvexTest } from "./setup.test.js";

describe("entries", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test("create and get entry", async () => {
    const t = initConvexTest();
    const entryId = await t.mutation(api.entries.create, {
      contentType: "post",
      slug: "hello-world",
      title: "Hello World",
      authorId: "user1",
    });
    expect(entryId).toBeDefined();
    const entry = await t.query(api.entries.get, { entryId });
    expect(entry).not.toBeNull();
    expect(entry!.slug).toBe("hello-world");
    expect(entry!.status).toBe("draft");
  });

  test("create entry with tags, featuredImageId, metadata", async () => {
    const t = initConvexTest();
    const entryId = await t.mutation(api.entries.create, {
      contentType: "post",
      slug: "tagged-post",
      authorId: "user1",
      tags: ["tech", "convex"],
      featuredImageId: "storage_abc123",
      metadata: { seoTitle: "Custom SEO", canonical: "https://example.com" },
    });
    const entry = await t.query(api.entries.get, { entryId });
    expect(entry!.tags).toEqual(["tech", "convex"]);
    expect(entry!.featuredImageId).toBe("storage_abc123");
    expect(entry!.metadata).toEqual({ seoTitle: "Custom SEO", canonical: "https://example.com" });
  });

  test("update entry sets updatedAt", async () => {
    const t = initConvexTest();
    const entryId = await t.mutation(api.entries.create, {
      contentType: "post",
      slug: "original-slug",
      authorId: "user1",
    });
    await t.mutation(api.entries.update, {
      entryId,
      slug: "updated-slug",
      title: "New Title",
      tags: ["news"],
    });
    const entry = await t.query(api.entries.get, { entryId });
    expect(entry!.slug).toBe("updated-slug");
    expect(entry!.title).toBe("New Title");
    expect(entry!.tags).toEqual(["news"]);
    expect(entry!.updatedAt).toBeDefined();
  });

  test("remove entry cascades to blocks", async () => {
    const t = initConvexTest();
    const entryId = await t.mutation(api.entries.create, {
      contentType: "post",
      slug: "to-delete",
      authorId: "user1",
    });
    await t.mutation(api.blocks.replace, {
      entryId,
      blocks: [{ type: "paragraph", content: { text: "Hello" }, order: 0 }],
    });
    await t.mutation(api.entries.remove, { entryId });
    const entry = await t.query(api.entries.get, { entryId });
    expect(entry).toBeNull();
    const blocks = await t.query(api.blocks.list, { entryId });
    expect(blocks).toHaveLength(0);
  });
});

describe("publish state machine — valid transitions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test("draft → pending_review via requestReview", async () => {
    const t = initConvexTest();
    const entryId = await t.mutation(api.entries.create, {
      contentType: "post",
      slug: "review-test",
      authorId: "user1",
    });
    await t.mutation(api.publish.requestReview, { entryId });
    const entry = await t.query(api.entries.get, { entryId });
    expect(entry!.status).toBe("pending_review");
  });

  test("pending_review → published via publish", async () => {
    const t = initConvexTest();
    const entryId = await t.mutation(api.entries.create, {
      contentType: "post",
      slug: "publish-from-review",
      authorId: "user1",
    });
    await t.mutation(api.publish.requestReview, { entryId });
    await t.mutation(api.publish.publish, { entryId });
    const entry = await t.query(api.entries.get, { entryId });
    expect(entry!.status).toBe("published");
    expect(entry!.publishedAt).toBeDefined();
  });

  test("draft → published directly via publish", async () => {
    const t = initConvexTest();
    const entryId = await t.mutation(api.entries.create, {
      contentType: "post",
      slug: "direct-publish",
      authorId: "user1",
    });
    await t.mutation(api.publish.publish, { entryId });
    const entry = await t.query(api.entries.get, { entryId });
    expect(entry!.status).toBe("published");
  });

  test("pending_review → draft via rejectReview", async () => {
    const t = initConvexTest();
    const entryId = await t.mutation(api.entries.create, {
      contentType: "post",
      slug: "reject-test",
      authorId: "user1",
    });
    await t.mutation(api.publish.requestReview, { entryId });
    await t.mutation(api.publish.rejectReview, { entryId });
    const entry = await t.query(api.entries.get, { entryId });
    expect(entry!.status).toBe("draft");
  });

  test("published → archived via archive", async () => {
    const t = initConvexTest();
    const entryId = await t.mutation(api.entries.create, {
      contentType: "post",
      slug: "archive-test",
      authorId: "user1",
    });
    await t.mutation(api.publish.publish, { entryId });
    await t.mutation(api.publish.archive, { entryId });
    const entry = await t.query(api.entries.get, { entryId });
    expect(entry!.status).toBe("archived");
  });

  test("archived → draft via unarchive", async () => {
    const t = initConvexTest();
    const entryId = await t.mutation(api.entries.create, {
      contentType: "post",
      slug: "unarchive-test",
      authorId: "user1",
    });
    await t.mutation(api.publish.publish, { entryId });
    await t.mutation(api.publish.archive, { entryId });
    await t.mutation(api.publish.unarchive, { entryId });
    const entry = await t.query(api.entries.get, { entryId });
    expect(entry!.status).toBe("draft");
  });
});

describe("publish state machine — invalid transitions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test("cannot requestReview from published", async () => {
    const t = initConvexTest();
    const entryId = await t.mutation(api.entries.create, {
      contentType: "post",
      slug: "invalid-1",
      authorId: "user1",
    });
    await t.mutation(api.publish.publish, { entryId });
    await expect(t.mutation(api.publish.requestReview, { entryId })).rejects.toThrow();
  });

  test("cannot requestReview from archived", async () => {
    const t = initConvexTest();
    const entryId = await t.mutation(api.entries.create, {
      contentType: "post",
      slug: "invalid-2",
      authorId: "user1",
    });
    await t.mutation(api.publish.publish, { entryId });
    await t.mutation(api.publish.archive, { entryId });
    await expect(t.mutation(api.publish.requestReview, { entryId })).rejects.toThrow();
  });

  test("cannot publish from archived", async () => {
    const t = initConvexTest();
    const entryId = await t.mutation(api.entries.create, {
      contentType: "post",
      slug: "invalid-3",
      authorId: "user1",
    });
    await t.mutation(api.publish.publish, { entryId });
    await t.mutation(api.publish.archive, { entryId });
    await expect(t.mutation(api.publish.publish, { entryId })).rejects.toThrow();
  });

  test("cannot archive from draft", async () => {
    const t = initConvexTest();
    const entryId = await t.mutation(api.entries.create, {
      contentType: "post",
      slug: "invalid-4",
      authorId: "user1",
    });
    await expect(t.mutation(api.publish.archive, { entryId })).rejects.toThrow();
  });

  test("cannot rejectReview from draft", async () => {
    const t = initConvexTest();
    const entryId = await t.mutation(api.entries.create, {
      contentType: "post",
      slug: "invalid-5",
      authorId: "user1",
    });
    await expect(t.mutation(api.publish.rejectReview, { entryId })).rejects.toThrow();
  });

  test("cannot unarchive from draft", async () => {
    const t = initConvexTest();
    const entryId = await t.mutation(api.entries.create, {
      contentType: "post",
      slug: "invalid-6",
      authorId: "user1",
    });
    await expect(t.mutation(api.publish.unarchive, { entryId })).rejects.toThrow();
  });
});

describe("blocks", () => {
  test("replace blocks sorts by order", async () => {
    const t = initConvexTest();
    const entryId = await t.mutation(api.entries.create, {
      contentType: "post",
      slug: "blocks-test",
      authorId: "user1",
    });
    await t.mutation(api.blocks.replace, {
      entryId,
      blocks: [
        { type: "paragraph", content: { text: "Second" }, order: 1 },
        { type: "heading", content: { text: "First" }, order: 0 },
      ],
    });
    const blocks = await t.query(api.blocks.list, { entryId });
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe("heading");
    expect(blocks[1].type).toBe("paragraph");
  });

  test("replaceBlocks atomically replaces previous blocks", async () => {
    const t = initConvexTest();
    const entryId = await t.mutation(api.entries.create, {
      contentType: "post",
      slug: "blocks-replace",
      authorId: "user1",
    });
    await t.mutation(api.blocks.replace, {
      entryId,
      blocks: [{ type: "paragraph", content: { text: "Old" }, order: 0 }],
    });
    await t.mutation(api.blocks.replace, {
      entryId,
      blocks: [
        { type: "heading", content: { text: "New H" }, order: 0 },
        { type: "paragraph", content: { text: "New P" }, order: 1 },
      ],
    });
    const blocks = await t.query(api.blocks.list, { entryId });
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe("heading");
  });
});

describe("scheduled publish", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test("schedule sets scheduledPublishTime and jobId", async () => {
    const t = initConvexTest();
    const entryId = await t.mutation(api.entries.create, {
      contentType: "post",
      slug: "sched-1",
      authorId: "user1",
    });
    const publishAt = Date.now() + 10_000;
    await t.mutation(api.schedule.schedule, { entryId, publishAt });
    const entry = await t.query(api.entries.get, { entryId });
    expect(entry!.scheduledPublishTime).toBe(publishAt);
    expect(entry!.scheduledPublishJobId).toBeDefined();
  });

  test("cancelSchedule clears scheduledPublishTime and jobId", async () => {
    const t = initConvexTest();
    const entryId = await t.mutation(api.entries.create, {
      contentType: "post",
      slug: "sched-2",
      authorId: "user1",
    });
    await t.mutation(api.schedule.schedule, { entryId, publishAt: Date.now() + 10_000 });
    await t.mutation(api.schedule.cancelSchedule, { entryId });
    const entry = await t.query(api.entries.get, { entryId });
    expect(entry!.scheduledPublishTime).toBeUndefined();
    expect(entry!.scheduledPublishJobId).toBeUndefined();
  });

  test("re-scheduling cancels prior job and sets new time", async () => {
    const t = initConvexTest();
    const entryId = await t.mutation(api.entries.create, {
      contentType: "post",
      slug: "sched-3",
      authorId: "user1",
    });
    await t.mutation(api.schedule.schedule, { entryId, publishAt: Date.now() + 10_000 });
    const firstJob = (await t.query(api.entries.get, { entryId }))!.scheduledPublishJobId;
    const laterTime = Date.now() + 60_000;
    await t.mutation(api.schedule.schedule, { entryId, publishAt: laterTime });
    const entry = await t.query(api.entries.get, { entryId });
    expect(entry!.scheduledPublishJobId).not.toBe(firstJob);
    expect(entry!.scheduledPublishTime).toBe(laterTime);
  });

  test("publishScheduled transitions entry to published", async () => {
    const t = initConvexTest();
    const entryId = await t.mutation(api.entries.create, {
      contentType: "post",
      slug: "sched-4",
      authorId: "user1",
    });
    await t.mutation(api.schedule.schedule, {
      entryId,
      publishAt: Date.now() + 100,
    });
    await vi.runAllTimersAsync();
    const entry = await t.query(api.entries.get, { entryId });
    expect(entry!.status).toBe("published");
    expect(entry!.scheduledPublishTime).toBeUndefined();
    expect(entry!.scheduledPublishJobId).toBeUndefined();
  });
});

describe("i18n", () => {
  test("createTranslation with copyBlocks:true copies all blocks", async () => {
    const t = initConvexTest();
    const sourceId = await t.mutation(api.entries.create, {
      contentType: "post",
      slug: "hello-en",
      authorId: "user1",
      locale: "en",
    });
    await t.mutation(api.blocks.replace, {
      entryId: sourceId,
      blocks: [
        { type: "heading", content: { text: "Hello" }, order: 0 },
        { type: "paragraph", content: { text: "World" }, order: 1 },
      ],
    });
    const translationId = await t.mutation(api.i18n.createTranslation, {
      sourceEntryId: sourceId,
      locale: "fr",
      authorId: "user1",
      copyBlocks: true,
    });
    const blocks = await t.query(api.blocks.list, { entryId: translationId });
    expect(blocks).toHaveLength(2);
    expect(blocks[0].content).toEqual({ text: "Hello" });
  });

  test("createTranslation with copyBlocks:false has zero blocks", async () => {
    const t = initConvexTest();
    const sourceId = await t.mutation(api.entries.create, {
      contentType: "post",
      slug: "hello-en-2",
      authorId: "user1",
      locale: "en",
    });
    await t.mutation(api.blocks.replace, {
      entryId: sourceId,
      blocks: [{ type: "paragraph", content: { text: "Hello" }, order: 0 }],
    });
    const translationId = await t.mutation(api.i18n.createTranslation, {
      sourceEntryId: sourceId,
      locale: "de",
      authorId: "user1",
      copyBlocks: false,
    });
    const blocks = await t.query(api.blocks.list, { entryId: translationId });
    expect(blocks).toHaveLength(0);
  });

  test("both source and translation share the same translationGroupId", async () => {
    const t = initConvexTest();
    const sourceId = await t.mutation(api.entries.create, {
      contentType: "post",
      slug: "src-i18n",
      authorId: "user1",
      locale: "en",
    });
    const translationId = await t.mutation(api.i18n.createTranslation, {
      sourceEntryId: sourceId,
      locale: "es",
      authorId: "user1",
    });
    const source = await t.query(api.entries.get, { entryId: sourceId });
    const translation = await t.query(api.entries.get, { entryId: translationId });
    expect(source!.translationGroupId).toBeDefined();
    expect(translation!.translationGroupId).toBe(source!.translationGroupId);
  });

  test("listTranslations returns all entries in the group", async () => {
    const t = initConvexTest();
    const sourceId = await t.mutation(api.entries.create, {
      contentType: "post",
      slug: "group-src",
      authorId: "user1",
      locale: "en",
    });
    await t.mutation(api.i18n.createTranslation, {
      sourceEntryId: sourceId,
      locale: "fr",
      authorId: "user1",
    });
    await t.mutation(api.i18n.createTranslation, {
      sourceEntryId: sourceId,
      locale: "de",
      authorId: "user1",
    });
    const translations = await t.query(api.i18n.listTranslations, { entryId: sourceId });
    expect(translations.length).toBe(3);
  });
});

describe("public queries", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test("listPublished never returns draft entries", async () => {
    const t = initConvexTest();
    await t.mutation(api.entries.create, {
      contentType: "post",
      slug: "draft-post",
      authorId: "user1",
    });
    const publishedId = await t.mutation(api.entries.create, {
      contentType: "post",
      slug: "live-post",
      authorId: "user1",
    });
    await t.mutation(api.publish.publish, { entryId: publishedId });

    const page = await t.query(api.entries.listPublished, {
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(page.page).toHaveLength(1);
    expect(page.page[0].slug).toBe("live-post");
  });

  test("listPublished never returns archived entries", async () => {
    const t = initConvexTest();
    const entryId = await t.mutation(api.entries.create, {
      contentType: "post",
      slug: "archived-post",
      authorId: "user1",
    });
    await t.mutation(api.publish.publish, { entryId });
    await t.mutation(api.publish.archive, { entryId });

    const page = await t.query(api.entries.listPublished, {
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(page.page).toHaveLength(0);
  });

  test("listPublished filters by contentType", async () => {
    const t = initConvexTest();
    const postId = await t.mutation(api.entries.create, {
      contentType: "post",
      slug: "my-post",
      authorId: "user1",
    });
    const pageId = await t.mutation(api.entries.create, {
      contentType: "page",
      slug: "my-page",
      authorId: "user1",
    });
    await t.mutation(api.publish.publish, { entryId: postId });
    await t.mutation(api.publish.publish, { entryId: pageId });

    const page = await t.query(api.entries.listPublished, {
      contentType: "post",
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(page.page).toHaveLength(1);
    expect(page.page[0].contentType).toBe("post");
  });

  test("listPublished filters by locale", async () => {
    const t = initConvexTest();
    const enId = await t.mutation(api.entries.create, {
      contentType: "post",
      slug: "en-post",
      authorId: "user1",
      locale: "en",
    });
    const frId = await t.mutation(api.entries.create, {
      contentType: "post",
      slug: "fr-post",
      authorId: "user1",
      locale: "fr",
    });
    await t.mutation(api.publish.publish, { entryId: enId });
    await t.mutation(api.publish.publish, { entryId: frId });

    const page = await t.query(api.entries.listPublished, {
      contentType: "post",
      locale: "en",
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(page.page).toHaveLength(1);
    expect(page.page[0].locale).toBe("en");
  });

  test("getPublishedBySlug returns null for unpublished slug", async () => {
    const t = initConvexTest();
    await t.mutation(api.entries.create, {
      contentType: "post",
      slug: "still-a-draft",
      authorId: "user1",
    });
    const entry = await t.query(api.entries.getPublishedBySlug, {
      slug: "still-a-draft",
      contentType: "post",
    });
    expect(entry).toBeNull();
  });

  test("getPublishedBySlug returns published entry", async () => {
    const t = initConvexTest();
    const entryId = await t.mutation(api.entries.create, {
      contentType: "post",
      slug: "live-slug",
      authorId: "user1",
    });
    await t.mutation(api.publish.publish, { entryId });
    const entry = await t.query(api.entries.getPublishedBySlug, {
      slug: "live-slug",
      contentType: "post",
    });
    expect(entry).not.toBeNull();
    expect(entry!.slug).toBe("live-slug");
  });

  test("getPublishedBySlug falls back to defaultLocale when requested locale has no match", async () => {
    const t = initConvexTest();
    await t.mutation(api.settings.upsert, { key: "defaultLocale", value: "en" });
    const enId = await t.mutation(api.entries.create, {
      contentType: "post",
      slug: "hello",
      authorId: "user1",
      locale: "en",
    });
    await t.mutation(api.publish.publish, { entryId: enId });

    const entry = await t.query(api.entries.getPublishedBySlug, {
      slug: "hello",
      contentType: "post",
      locale: "fr",
    });
    expect(entry).not.toBeNull();
    expect(entry!.locale).toBe("en");
  });
});

describe("settings", () => {
  test("upsert and get setting", async () => {
    const t = initConvexTest();
    await t.mutation(api.settings.upsert, { key: "siteName", value: "My CMS" });
    const value = await t.query(api.settings.get, { key: "siteName" });
    expect(value).toBe("My CMS");
  });

  test("upsert overwrites existing", async () => {
    const t = initConvexTest();
    await t.mutation(api.settings.upsert, { key: "siteName", value: "Old" });
    await t.mutation(api.settings.upsert, { key: "siteName", value: "New" });
    const value = await t.query(api.settings.get, { key: "siteName" });
    expect(value).toBe("New");
  });

  test("getAll returns all settings", async () => {
    const t = initConvexTest();
    await t.mutation(api.settings.upsert, { key: "siteName", value: "Test" });
    await t.mutation(api.settings.upsert, { key: "defaultLocale", value: "en" });
    const all = await t.query(api.settings.getAll, {});
    expect(all).toHaveLength(2);
  });
});
