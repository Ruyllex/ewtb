import { db } from "@/db";
import { videos, views, subscriptions, channels, comments } from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, lt, or, sql, gte } from "drizzle-orm";
import { subDays } from "date-fns";
import { z } from "zod";

export const studioRouter = createTRPCRouter({
  getOne: protectedProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    const { id } = input;
    const { id: userId } = ctx.user;

    const [video] = await db
      .select()
      .from(videos)
      .where(and(eq(videos.id, id), eq(videos.userId, userId)))
      .limit(1);
    if (!video) throw new TRPCError({ code: "NOT_FOUND" });

    return video;
  }),
  getMany: protectedProcedure
    .input(
      z.object({
        cursor: z
          .object({
            id: z.string().uuid(),
            updatedAt: z.date(),
          })
          .nullish(),
        limit: z.number().min(1).max(100),
      })
    )
    .query(async ({ ctx, input }) => {
      const { cursor, limit } = input;
      const { id: userId } = ctx.user;
      const data = await db
        .select()
        .from(videos)
        .where(
          and(
            eq(videos.userId, userId),
            cursor
              ? or(
                  lt(videos.updatedAt, cursor.updatedAt),
                  and(eq(videos.updatedAt, cursor.updatedAt), eq(videos.id, cursor.id))
                )
              : undefined
          )
        )
        .orderBy(desc(videos.updatedAt), desc(videos.id))
        .limit(limit + 1);

      const hasMore = data.length > limit;
      const items = hasMore ? data.slice(0, -1) : data;

      // Set the next cursor
      const lastItem = items[items.length - 1];
      const nextCursor = hasMore ? { id: lastItem.id, updatedAt: lastItem.updatedAt } : null;

      return {
        items,
        nextCursor,
      };
    }),
  getAnalytics: protectedProcedure.query(async ({ ctx }) => {
    const { id: userId } = ctx.user;

    // Fetch per-video stats to build aggregates
    const videoStats = await db
      .select({
        id: videos.id,
        title: videos.title,
        thumbnailUrl: videos.thumbnailUrl,
        likes: videos.likes,
        duration: videos.duration,
        createdAt: videos.createdAt,
        viewCount: sql<number>`COALESCE(count(${views.id}), 0)::int`,
      })
      .from(videos)
      .leftJoin(views, eq(views.videoId, videos.id))
      .where(eq(videos.userId, userId))
      .groupBy(videos.id)
      .orderBy(desc(videos.createdAt));

    const totalVideos = videoStats.length;
    const totalViews = videoStats.reduce((acc, video) => acc + (video.viewCount ?? 0), 0);
    const totalLikes = videoStats.reduce((acc, video) => acc + (video.likes ?? 0), 0);
    const totalWatchTimeMinutes = videoStats.reduce((acc, video) => {
      const durationSeconds = video.duration ?? 0;
      return acc + ((video.viewCount ?? 0) * durationSeconds) / 60;
    }, 0);

    const averageViewDurationSeconds = totalViews > 0 ? (totalWatchTimeMinutes * 60) / totalViews : 0;

    const [commentsRow] = await db
      .select({
        count: sql<number>`COALESCE(count(${comments.id}), 0)::int`,
      })
      .from(comments)
      .innerJoin(videos, eq(comments.videoId, videos.id))
      .where(eq(videos.userId, userId));

    const [channel] = await db
      .select({ id: channels.id })
      .from(channels)
      .where(eq(channels.userId, userId))
      .limit(1);

    let totalSubscribers = 0;
    if (channel) {
      const [subscriberRow] = await db
        .select({ count: sql<number>`COALESCE(count(${subscriptions.id}), 0)::int` })
        .from(subscriptions)
        .where(eq(subscriptions.channelId, channel.id));
      totalSubscribers = subscriberRow?.count ?? 0;
    }

    const timelineDays = 14;
    const timelineSince = subDays(new Date(), timelineDays - 1);

    const rawTimeline = await db
      .select({
        date: sql<string>`date_trunc('day', ${views.createdAt})::date`,
        views: sql<number>`count(${views.id})::int`,
      })
      .from(views)
      .innerJoin(videos, eq(views.videoId, videos.id))
      .where(and(eq(videos.userId, userId), gte(views.createdAt, timelineSince)))
      .groupBy(sql`date_trunc('day', ${views.createdAt})`)
      .orderBy(sql`date_trunc('day', ${views.createdAt})`);

    const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
    const today = new Date();
    const rawTimelineMap = new Map<string, number>();
    rawTimeline.forEach((item) => {
      rawTimelineMap.set(item.date, item.views ?? 0);
    });

    const timeline = Array.from({ length: timelineDays }, (_, index) => {
      const date = subDays(today, timelineDays - 1 - index);
      const key = date.toISOString().split("T")[0];
      return {
        date: key,
        label: dateFormatter.format(date),
        views: rawTimelineMap.get(key) ?? 0,
      };
    });

    const lastSeven = timeline.slice(-7).reduce((acc, day) => acc + day.views, 0);
    const previousSeven = timeline.slice(-14, -7).reduce((acc, day) => acc + day.views, 0);
    const viewsChangePercent = previousSeven === 0
      ? lastSeven > 0
        ? 100
        : 0
      : ((lastSeven - previousSeven) / previousSeven) * 100;

    const topVideos = [...videoStats]
      .sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
      .slice(0, 5)
      .map((video) => ({
        id: video.id,
        title: video.title,
        thumbnailUrl: video.thumbnailUrl,
        views: video.viewCount ?? 0,
        likes: video.likes ?? 0,
        createdAt: video.createdAt,
      }));

    return {
      summary: {
        totalViews,
        totalVideos,
        totalLikes,
        totalComments: commentsRow?.count ?? 0,
        totalWatchTimeMinutes: Math.round(totalWatchTimeMinutes),
        averageViewDurationSeconds: Math.round(averageViewDurationSeconds),
        totalSubscribers,
        viewsChangePercent,
      },
      timeline,
      topVideos,
    };
  }),
});
