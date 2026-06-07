import { v } from "convex/values";
import type { Id } from "./_generated/dataModel.js";
import { internalMutation, mutation } from "./_generated/server.js";
import { internal } from "./_generated/api.js";

export const schedule = mutation({
  args: {
    entryId: v.id("entries"),
    publishAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId);
    if (!entry) throw new Error("Entry not found");
    if (entry.status === "published" || entry.status === "archived") {
      throw new Error(`Cannot schedule publish for status "${entry.status}"`);
    }
    if (entry.scheduledPublishJobId) {
      await ctx.scheduler.cancel(
        entry.scheduledPublishJobId as Id<"_scheduled_functions">,
      );
    }
    const jobId = await ctx.scheduler.runAt(
      args.publishAt,
      internal.schedule.publishScheduled,
      { entryId: args.entryId },
    );
    await ctx.db.patch(args.entryId, {
      scheduledPublishTime: args.publishAt,
      scheduledPublishJobId: jobId as string,
    });
    return null;
  },
});

export const cancelSchedule = mutation({
  args: { entryId: v.id("entries") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId);
    if (!entry) throw new Error("Entry not found");
    if (entry.scheduledPublishJobId) {
      await ctx.scheduler.cancel(
        entry.scheduledPublishJobId as Id<"_scheduled_functions">,
      );
    }
    await ctx.db.patch(args.entryId, {
      scheduledPublishTime: undefined,
      scheduledPublishJobId: undefined,
    });
    return null;
  },
});

export const publishScheduled = internalMutation({
  args: { entryId: v.id("entries") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId);
    if (!entry) return null;
    if (entry.status === "published" || entry.status === "archived") {
      return null;
    }
    await ctx.db.patch(args.entryId, {
      status: "published",
      publishedAt: Date.now(),
      scheduledPublishTime: undefined,
      scheduledPublishJobId: undefined,
    });
    return null;
  },
});
