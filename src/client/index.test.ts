import { describe, expect, test } from "vitest";
import { makeHeadlessCmsAPI } from "./index.js";
import { anyApi, type ApiFromModules } from "convex/server";
import { components, initConvexTest } from "./setup.test.js";

export const {
  createEntry,
  getEntry,
  listBlocks,
  replaceBlocks,
  publish,
  requestReview,
} = makeHeadlessCmsAPI(components.headlessCms, {
  canWrite: async (ctx) =>
    (await ctx.auth.getUserIdentity()) !== null,
  canPublish: async (ctx) =>
    (await ctx.auth.getUserIdentity()) !== null,
});

const testApi = (
  anyApi as unknown as ApiFromModules<{
    "index.test": {
      createEntry: typeof createEntry;
      getEntry: typeof getEntry;
      listBlocks: typeof listBlocks;
      replaceBlocks: typeof replaceBlocks;
      publish: typeof publish;
      requestReview: typeof requestReview;
    };
  }>
)["index.test"];

describe("makeHeadlessCmsAPI client", () => {
  test("authenticated user can create and get entry", async () => {
    const t = initConvexTest().withIdentity({ subject: "user1" });
    const entryId = await t.mutation(testApi.createEntry, {
      contentType: "post",
      slug: "test-post",
      title: "Test Post",
      authorId: "user1",
    });
    expect(entryId).toBeDefined();

    const entry = await t.query(testApi.getEntry, { entryId });
    expect(entry).not.toBeNull();
    expect(entry!.slug).toBe("test-post");
  });

  test("unauthenticated user cannot create entry", async () => {
    const t = initConvexTest();
    await expect(
      t.mutation(testApi.createEntry, {
        contentType: "post",
        slug: "unauthorized",
        authorId: "anon",
      }),
    ).rejects.toThrow("Unauthorized");
  });

  test("replace and list blocks", async () => {
    const t = initConvexTest().withIdentity({ subject: "user1" });
    const entryId = await t.mutation(testApi.createEntry, {
      contentType: "post",
      slug: "block-test",
      authorId: "user1",
    });
    await t.mutation(testApi.replaceBlocks, {
      entryId,
      blocks: [
        { type: "heading", content: { text: "Title" }, order: 0 },
        { type: "paragraph", content: { text: "Body" }, order: 1 },
      ],
    });
    const blocks = await t.query(testApi.listBlocks, { entryId });
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe("heading");
  });

  test("publish workflow", async () => {
    const t = initConvexTest().withIdentity({ subject: "user1" });
    const entryId = await t.mutation(testApi.createEntry, {
      contentType: "post",
      slug: "publish-me",
      authorId: "user1",
    });
    await t.mutation(testApi.requestReview, { entryId });
    await t.mutation(testApi.publish, { entryId });
    const entry = await t.query(testApi.getEntry, { entryId });
    expect(entry!.status).toBe("published");
  });
});
