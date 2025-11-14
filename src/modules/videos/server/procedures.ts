import { db } from "@/db";
import { videos, videoUpdateSchema, views, users } from "@/db/schema";
import { mux } from "@/lib/mux";
import { createTRPCRouter, protectedProcedure, baseProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { and, eq, ilike, sql, desc } from "drizzle-orm";
import { UTApi } from "uploadthing/server";
import z from "zod";

const ensureMuxCredentials = () => {
  if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Missing Mux credentials. Set MUX_TOKEN_ID and MUX_TOKEN_SECRET.",
    });
  }
};

export const videosRouter = createTRPCRouter({
  restoreThumbnail: protectedProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { id: userId } = ctx.user;

      const [existingVideo] = await db
        .select()
        .from(videos)
        .where(and(eq(videos.id, input.id), eq(videos.userId, userId)));

      if (!existingVideo) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (!existingVideo.muxPlaybackId) {
        throw new TRPCError({ code: "BAD_REQUEST" });
      }

      const tempthumbnailUrl = `https://image.mux.com/${existingVideo.muxPlaybackId}/thumbnail.png`;

      const utapi = new UTApi();
      const uploadedThumbnail = await utapi.uploadFilesFromUrl(tempthumbnailUrl);

      if (!uploadedThumbnail.data) {
        throw new TRPCError({ code: "BAD_REQUEST" });
      }

      const { key: thumbnailKey, ufsUrl: thumbnailUrl } = uploadedThumbnail.data;

      const [updatedVideo] = await db
        .update(videos)
        .set({ thumbnailUrl, thumbnailKey })
        .where(and(eq(videos.id, input.id), eq(videos.userId, userId)))
        .returning();

      return updatedVideo;
    }),

  remove: protectedProcedure.input(z.object({ id: z.uuid() })).mutation(async ({ ctx, input }) => {
    const { id: userId } = ctx.user;

    const [removeVideo] = await db
      .delete(videos)
      .where(and(eq(videos.id, input.id), eq(videos.userId, userId)))
      .returning();

    if (!removeVideo) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    return removeVideo;
  }),
  update: protectedProcedure.input(videoUpdateSchema).mutation(async ({ ctx, input }) => {
    const { id: userId } = ctx.user;

    if (!input.id) {
      throw new TRPCError({ code: "BAD_REQUEST" });
    }

    const [updatedVideo] = await db
      .update(videos)
      .set({
        title: input.title,
        description: input.description,
        categoryId: input.categoryId,
        visibility: input.visibility,
        updatedAt: new Date(),
      })
      .where(and(eq(videos.id, input.id), eq(videos.userId, userId)))
      .returning();

    if (!updatedVideo) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    return updatedVideo;
  }),
  create: protectedProcedure.mutation(async ({ ctx }) => {
    const { id: userId } = ctx.user;

    try {
      ensureMuxCredentials();

      const upload = await mux.video.uploads.create({
        new_asset_settings: {
          passthrough: userId,
          playback_policies: ["public"],
          static_renditions: [
            {
              resolution: "highest",
            },
            {
              resolution: "audio-only",
            },
          ],
          input: [
            {
              generated_subtitles: [
                {
                  language_code: "en",
                  name: "English",
                },
              ],
            },
          ],
        },
        cors_origin: "*", // TODO: In production this should be restricted to the domain of the app
      });

      const [video] = await db
        .insert(videos)
        .values({
          userId,
          title: "Untitled",
          muxStatus: "waiting",
          muxUploadId: upload.id,
        })
        .returning();

      return {
        video,
        url: upload.url,
      };
    } catch (error) {
      console.error("Failed to create Mux upload", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Unable to create upload. Check your Mux credentials and quota.",
      });
    }
  }),

  // Public procedures
  getPublic: baseProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const [video] = await db
        .select({
          id: videos.id,
          title: videos.title,
          description: videos.description,
          thumbnailUrl: videos.thumbnailUrl,
          muxPlaybackId: videos.muxPlaybackId,
          duration: videos.duration,
          visibility: videos.visibility,
          createdAt: videos.createdAt,
          updatedAt: videos.updatedAt,
          userId: videos.userId,
          categoryId: videos.categoryId,
          userName: users.name,
          userImageUrl: users.imageUrl,
        })
        .from(videos)
        .innerJoin(users, eq(videos.userId, users.id))
        .where(and(eq(videos.id, input.id), eq(videos.visibility, "public")))
        .limit(1);

      if (!video) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Video not found" });
      }

      // Get view count
      const viewCountResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(views)
        .where(eq(views.videoId, input.id));

      const viewCount = viewCountResult[0]?.count ?? 0;

      return {
        ...video,
        viewCount,
      };
    }),

  search: baseProcedure
    .input(
      z.object({
        query: z.string().min(1).max(100),
        limit: z.number().min(1).max(50).default(20),
        cursor: z
          .object({
            id: z.string().uuid(),
            createdAt: z.date(),
          })
          .optional(),
      })
    )
    .query(async ({ input }) => {
      const { query, limit, cursor } = input;

      const searchCondition = ilike(videos.title, `%${query}%`);

      const whereConditions = [
        eq(videos.visibility, "public"),
        searchCondition,
        cursor
          ? sql`(${videos.createdAt} < ${cursor.createdAt} OR (${videos.createdAt} = ${cursor.createdAt} AND ${videos.id} < ${cursor.id}))`
          : undefined,
      ].filter(Boolean);

      const results = await db
        .select({
          id: videos.id,
          title: videos.title,
          description: videos.description,
          thumbnailUrl: videos.thumbnailUrl,
          muxPlaybackId: videos.muxPlaybackId,
          duration: videos.duration,
          createdAt: videos.createdAt,
          userId: videos.userId,
          userName: users.name,
          userImageUrl: users.imageUrl,
        })
        .from(videos)
        .innerJoin(users, eq(videos.userId, users.id))
        .where(and(...whereConditions))
        .orderBy(desc(videos.createdAt), desc(videos.id))
        .limit(limit + 1);

      const hasMore = results.length > limit;
      const items = hasMore ? results.slice(0, -1) : results;

      const lastItem = items[items.length - 1];
      const nextCursor = hasMore && lastItem
        ? { id: lastItem.id, createdAt: lastItem.createdAt }
        : null;

      return {
        items,
        nextCursor,
      };
    }),

  recordView: baseProcedure
    .input(z.object({ videoId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      // Get user ID if authenticated
      let userId: string | null = null;
      if (ctx.clerkUserId) {
        const [user] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.clerkId, ctx.clerkUserId))
          .limit(1);
        userId = user?.id || null;
      }

      // Check if view already exists (prevent duplicate views from same user)
      if (userId) {
        const existingView = await db
          .select()
          .from(views)
          .where(and(eq(views.videoId, input.videoId), eq(views.userId, userId)))
          .limit(1);

        if (existingView.length > 0) {
          return { success: true, alreadyViewed: true };
        }
      }

      // Record the view
      await db.insert(views).values({
        videoId: input.videoId,
        userId: userId || null,
      });

      return { success: true, alreadyViewed: false };
    }),
});
