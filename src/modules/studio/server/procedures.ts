import { db } from "@/db";
import { videos, views, subscriptions, channels, comments, videoLikes, users } from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, lt, or, sql, gte, inArray } from "drizzle-orm";
import { subDays } from "date-fns";
import { z } from "zod";
import { getSignedDownloadUrl } from "@/lib/aws";

const studioVideoSelect = {
  id: videos.id,
  title: videos.title,
  description: videos.description,
  s3Key: videos.s3Key,
  s3Url: videos.s3Url,
  thumbnailUrl: videos.thumbnailUrl,
  thumbnailKey: videos.thumbnailKey,
  thumbnailImage: videos.thumbnailImage, // Para verificar si hay imagen en BD
  previewUrl: videos.previewUrl,
  previewKey: videos.previewKey,
  duration: videos.duration,
  visibility: videos.visibility,
  userId: videos.userId,
  categoryId: videos.categoryId,
  createdAt: videos.createdAt,
  updatedAt: videos.updatedAt,
};


async function fetchCountsForVideos(videoIds: string[]) {
  const viewCounts = new Map<string, number>();
  const likeCounts = new Map<string, number>();
  const commentCounts = new Map<string, number>();

  if (videoIds.length === 0) {
    return { viewCounts, likeCounts, commentCounts };
  }

  await Promise.all([
    (async () => {
      try {
        const rows = await db
          .select({ videoId: views.videoId, count: sql<number>`count(*)::int` })
          .from(views)
          .where(inArray(views.videoId, videoIds))
          .groupBy(views.videoId);
        rows.forEach((row) => viewCounts.set(row.videoId, row.count));
      } catch (error) {
        console.warn("[studio.counts] views table unavailable", error);
      }
    })(),
    (async () => {
      try {
        const rows = await db
          .select({ videoId: videoLikes.videoId, count: sql<number>`count(*)::int` })
          .from(videoLikes)
          .where(inArray(videoLikes.videoId, videoIds))
          .groupBy(videoLikes.videoId);
        rows.forEach((row) => likeCounts.set(row.videoId, row.count));
      } catch (error) {
        console.warn("[studio.counts] video_likes table unavailable", error);
      }
    })(),
    (async () => {
      try {
        const rows = await db
          .select({ videoId: comments.videoId, count: sql<number>`count(*)::int` })
          .from(comments)
          .where(inArray(comments.videoId, videoIds))
          .groupBy(comments.videoId);
        rows.forEach((row) => commentCounts.set(row.videoId, row.count));
      } catch (error) {
        console.warn("[studio.counts] comments table unavailable", error);
      }
    })(),
  ]);

  return { viewCounts, likeCounts, commentCounts };
}

export const studioRouter = createTRPCRouter({
  getOne: protectedProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    try {
      const userId = ctx.user.id;

      const [video] = await db
        .select(studioVideoSelect)
        .from(videos)
        .where(and(eq(videos.id, input.id), eq(videos.userId, userId)))
        .limit(1);
      if (!video) throw new TRPCError({ code: "NOT_FOUND" });

      const { viewCounts, likeCounts, commentCounts } = await fetchCountsForVideos([video.id]);

      // Generar URL firmada si hay s3Key
      const signedS3Url = video.s3Key ? await getSignedDownloadUrl(video.s3Key) : video.s3Url;
      
      // Normalizar thumbnail URL: prioridad a thumbnailImage (ruta API), luego thumbnailKey (URL firmada), luego thumbnailUrl
      let finalThumbnailUrl: string | null = null;
      if (video.thumbnailImage) {
        // Si hay imagen en BD, usar la ruta API
        finalThumbnailUrl = `/api/videos/${video.id}/thumbnail`;
      } else if (video.thumbnailKey) {
        // Si hay thumbnailKey, generar URL firmada
        finalThumbnailUrl = await getSignedDownloadUrl(video.thumbnailKey);
      } else {
        // Fallback a thumbnailUrl
        finalThumbnailUrl = video.thumbnailUrl;
      }

      // Eliminar thumbnailImage del objeto retornado (no debe exponerse)
      const { thumbnailImage, ...videoWithoutThumbnailImage } = video;

      return {
        ...videoWithoutThumbnailImage,
        s3Url: signedS3Url,
        thumbnailUrl: finalThumbnailUrl,
        viewCount: viewCounts.get(video.id) ?? 0,
        likeCount: likeCounts.get(video.id) ?? 0,
        commentCount: commentCounts.get(video.id) ?? 0,
      };
    } catch (error) {
      console.error("[studio.getOne]", error);
      throw error instanceof TRPCError ? error : new TRPCError({ code: "INTERNAL_SERVER_ERROR", cause: error });
    }
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
      try {
        const { cursor, limit } = input;
        const userId = ctx.user.id;

        console.log(`[studio.getMany] Fetching videos for userId: ${userId}`);

        const data = await db
          .select(studioVideoSelect)
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

        console.log(`[studio.getMany] Found ${data.length} videos`);

        const hasMore = data.length > limit;
        const items = hasMore ? data.slice(0, -1) : data;

        const { viewCounts, likeCounts, commentCounts } = await fetchCountsForVideos(items.map((v) => v.id));
        const enrichedItems = await Promise.all(items.map(async (video) => {
          // Normalizar thumbnail URL: prioridad a thumbnailImage (ruta API), luego thumbnailKey (URL firmada), luego thumbnailUrl
          let finalThumbnailUrl: string | null = null;
          if (video.thumbnailImage) {
            finalThumbnailUrl = `/api/videos/${video.id}/thumbnail`;
          } else if (video.thumbnailKey) {
            finalThumbnailUrl = await getSignedDownloadUrl(video.thumbnailKey);
          } else {
            finalThumbnailUrl = video.thumbnailUrl;
          }

          // Eliminar thumbnailImage del objeto retornado
          const { thumbnailImage, ...videoWithoutThumbnailImage } = video;

          return {
            ...videoWithoutThumbnailImage,
            s3Url: video.s3Key ? await getSignedDownloadUrl(video.s3Key) : video.s3Url,
            thumbnailUrl: finalThumbnailUrl,
            viewCount: viewCounts.get(video.id) ?? 0,
            likeCount: likeCounts.get(video.id) ?? 0,
            commentCount: commentCounts.get(video.id) ?? 0,
          };
        }));

        // Set the next cursor
        const lastItem = items[items.length - 1];
        const nextCursor = hasMore ? { id: lastItem.id, updatedAt: lastItem.updatedAt } : null;

        return {
          items: enrichedItems,
          nextCursor,
        };
      } catch (error) {
        console.error("[studio.getMany]", error);
        throw error instanceof TRPCError
          ? error
          : new TRPCError({ code: "INTERNAL_SERVER_ERROR", cause: error });
      }
    }),
  getAnalytics: protectedProcedure.query(async ({ ctx }) => {
    try {
      const { id: userId, clerkId } = ctx.user;

      // Fetch per-video stats to build aggregates
      const baseVideoStats = await db
        .select({
          id: videos.id,
          title: videos.title,
          thumbnailUrl: videos.thumbnailUrl,
          thumbnailKey: videos.thumbnailKey,
          thumbnailImage: videos.thumbnailImage,
          s3Key: videos.s3Key,
          s3Url: videos.s3Url,
          duration: videos.duration,
          createdAt: videos.createdAt,
          viewCount: sql<number>`COALESCE(count(${views.id}), 0)::int`,
        })
        .from(videos)
        .innerJoin(users, eq(videos.userId, users.id))
        .leftJoin(views, eq(views.videoId, videos.id))
        .where(eq(users.clerkId, clerkId))
        .groupBy(videos.id)
        .orderBy(desc(videos.createdAt));

      const { likeCounts } = await fetchCountsForVideos(baseVideoStats.map((video) => video.id));
      const videoStats = baseVideoStats.map((video) => ({
        ...video,
        likeCount: likeCounts.get(video.id) ?? 0,
      }));

      const totalVideos = videoStats.length;
      const totalViews = videoStats.reduce((acc, video) => acc + (video.viewCount ?? 0), 0);
      const totalLikes = videoStats.reduce((acc, video) => acc + (video.likeCount ?? 0), 0);
      const totalWatchTimeMinutes = videoStats.reduce((acc, video) => {
        const durationMs = video.duration ?? 0;
        const durationMinutes = durationMs / 1000 / 60;
        return acc + (video.viewCount ?? 0) * durationMinutes;
      }, 0);

      const averageViewDurationSeconds = totalViews > 0
        ? (totalWatchTimeMinutes * 60) / totalViews
        : 0;

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
        const normalizedDate = new Date(item.date).toISOString().split("T")[0];
        rawTimelineMap.set(normalizedDate, Number(item.views ?? 0));
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

      const topVideos = await Promise.all([...videoStats]
        .sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
        .slice(0, 5)
        .map(async (video) => {
          // Normalizar thumbnail URL: prioridad a thumbnailImage (ruta API), luego thumbnailKey (URL firmada), luego thumbnailUrl
          let finalThumbnailUrl: string | null = null;
          if (video.thumbnailImage) {
            finalThumbnailUrl = `/api/videos/${video.id}/thumbnail`;
          } else if (video.thumbnailKey) {
            finalThumbnailUrl = await getSignedDownloadUrl(video.thumbnailKey);
          } else {
            finalThumbnailUrl = video.thumbnailUrl;
          }

          return {
            id: video.id,
            title: video.title,
            thumbnailUrl: finalThumbnailUrl,
            views: video.viewCount ?? 0,
            likes: video.likeCount ?? 0,
            createdAt: video.createdAt,
          };
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
    } catch (error) {
      console.error("[studio.getAnalytics]", error);
      throw error instanceof TRPCError ? error : new TRPCError({ code: "INTERNAL_SERVER_ERROR", cause: error });
    }
  }),
});
