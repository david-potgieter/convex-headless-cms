import { v } from "convex/values";
import { mutation } from "./_generated/server.js";

export const requestReview = mutation({
  args: { entryId: v.id("entries") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const entry = await ctx.db.get("entries", args.entryId);
    if (!entry) throw new Error("Entry not found");
    if (entry.status !== "draft") {
      throw new Error(`Cannot request review from status "${entry.status}"`);
    }
    await ctx.db.patch("entries", args.entryId, { status: "pending_review" });
    return null;
  },
});

export const rejectReview = mutation({
  args: { entryId: v.id("entries") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const entry = await ctx.db.get("entries", args.entryId);
    if (!entry) throw new Error("Entry not found");
    if (entry.status !== "pending_review") {
      throw new Error(`Cannot reject review from status "${entry.status}"`);
    }
    await ctx.db.patch("entries", args.entryId, { status: "draft" });
    return null;
  },
});

export const publish = mutation({
  args: { entryId: v.id("entries") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const entry = await ctx.db.get("entries", args.entryId);
    if (!entry) throw new Error("Entry not found");
    if (entry.status !== "draft" && entry.status !== "pending_review") {
      throw new Error(`Cannot publish from status "${entry.status}"`);
    }
    await ctx.db.patch("entries", args.entryId, {
      status: "published",
      publishedAt: Date.now(),
      scheduledPublishTime: undefined,
      scheduledPublishJobId: undefined,
    });
    return null;
  },
});

export const archive = mutation({
  args: { entryId: v.id("entries") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const entry = await ctx.db.get("entries", args.entryId);
    if (!entry) throw new Error("Entry not found");
    if (entry.status !== "published") {
      throw new Error(`Cannot archive from status "${entry.status}"`);
    }
    await ctx.db.patch("entries", args.entryId, { status: "archived" });
    return null;
  },
});

export const unarchive = mutation({
  args: { entryId: v.id("entries") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const entry = await ctx.db.get("entries", args.entryId);
    if (!entry) throw new Error("Entry not found");
    if (entry.status !== "archived") {
      throw new Error(`Cannot unarchive from status "${entry.status}"`);
    }
    await ctx.db.patch("entries", args.entryId, { status: "draft" });
    return null;
  },
});

export const unpublish = mutation({
  args: { entryId: v.id("entries") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const entry = await ctx.db.get("entries", args.entryId);
    if (!entry) throw new Error("Entry not found");
    if (entry.status !== "published") {
      throw new Error(`Cannot unpublish from status "${entry.status}"`);
    }
    await ctx.db.patch("entries", args.entryId, { status: "draft" });
    return null;
  },
});
