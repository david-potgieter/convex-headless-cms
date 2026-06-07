import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { initConvexTest } from "./setup.test";
import { api } from "./_generated/api";

describe("example", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
  });

  afterEach(async () => {
    vi.useRealTimers();
  });

  test("createPost and listPublishedPosts", async () => {
    const t = initConvexTest().withIdentity({ subject: "user_test" });

    const entryId = await t.mutation(api.example.createEntry, {
      contentType: "post",
      slug: "hello-world",
      title: "Hello World",
      authorId: "user_test",
    });
    expect(entryId).toBeDefined();

    await t.mutation(api.example.publish, { entryId });

    const page = await t.query(api.example.listPublishedPosts, {
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(page.page).toHaveLength(1);
    expect(page.page[0].slug).toBe("hello-world");
  });
});
