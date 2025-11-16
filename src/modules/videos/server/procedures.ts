import { db } from "@/db";
import { videos, videoUpdateSchema, views, users, channels } from "@/db/schema";
import { mux } from "@/lib/mux";
import { createTRPCRouter, protectedProcedure, baseProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { and, eq, ilike, sql, desc, or } from "drizzle-orm";
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

      // NO crear el video en BD todavía, solo retornar el upload info
      return {
        uploadId: upload.id,
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

  finalize: protectedProcedure
    .input(
      z.object({
        uploadId: z.string(),
        title: z.string().min(1).max(100),
        description: z.string().max(5000).optional(),
        categoryId: z.string().uuid().optional(),
        visibility: z.enum(["public", "private"]).default("private"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id: userId } = ctx.user;

      // Verificar que el upload existe y obtener el asset
      try {
        const upload = await mux.video.uploads.retrieve(input.uploadId);
        
        if (!upload.asset_id) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Video is still processing. Please wait until the upload is complete.",
          });
        }

        // Obtener el asset para verificar que está listo
        const asset = await mux.video.assets.retrieve(upload.asset_id);
        const playbackId = asset.playback_ids?.[0]?.id;

        if (!playbackId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Video is not ready yet. Please wait a moment and try again.",
          });
        }

        // Verificar que no existe ya un video con este uploadId
        const existingVideo = await db
          .select()
          .from(videos)
          .where(eq(videos.muxUploadId, input.uploadId))
          .limit(1);

        if (existingVideo.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Video already exists",
          });
        }

        // Crear el video en la BD con los datos del formulario
        const duration = asset.duration ? Math.round(asset.duration * 1000) : 0;
        const thumbnailUrl = `https://image.mux.com/${playbackId}/thumbnail.png`;
        const previewUrl = `https://image.mux.com/${playbackId}/animated.gif`;

        const [video] = await db
          .insert(videos)
          .values({
            userId,
            title: input.title,
            description: input.description || null,
            categoryId: input.categoryId || null,
            visibility: input.visibility,
            muxUploadId: input.uploadId,
            muxAssetId: asset.id,
            muxPlaybackId: playbackId,
            muxStatus: asset.status,
            thumbnailUrl,
            previewUrl,
            duration,
          })
          .returning();

        return video;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Failed to finalize video", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to finalize video. Please try again.",
        });
      }
    }),

  getUploadStatus: protectedProcedure
    .input(z.object({ uploadId: z.string() }))
    .query(async ({ input }) => {
      try {
        ensureMuxCredentials();
        const upload = await mux.video.uploads.retrieve(input.uploadId);

        if (!upload.asset_id) {
          return {
            status: upload.status,
            assetId: null,
            playbackId: null,
            ready: false,
          };
        }

        const asset = await mux.video.assets.retrieve(upload.asset_id);
        const playbackId = asset.playback_ids?.[0]?.id;

        return {
          status: asset.status,
          assetId: asset.id,
          playbackId,
          ready: asset.status === "ready" && !!playbackId,
          duration: asset.duration ? Math.round(asset.duration * 1000) : 0,
          thumbnailUrl: playbackId ? `https://image.mux.com/${playbackId}/thumbnail.png` : null,
          previewUrl: playbackId ? `https://image.mux.com/${playbackId}/animated.gif` : null,
        };
      } catch (error) {
        console.error("Failed to get upload status", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to get upload status",
        });
      }
    }),

  // Public procedures
  getMany: baseProcedure
    .input(
      z.object({
        categoryId: z.string().uuid().optional(),
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
      const { categoryId, limit, cursor } = input;

      const whereConditions = [
        eq(videos.visibility, "public"),
        categoryId ? eq(videos.categoryId, categoryId) : undefined,
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
          previewUrl: videos.previewUrl,
          muxPlaybackId: videos.muxPlaybackId,
          duration: videos.duration,
          createdAt: videos.createdAt,
          userId: videos.userId,
          userName: users.name,
          userUsername: users.username,
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
          userUsername: users.username,
          userImageUrl: users.imageUrl,
          userCanMonetize: users.canMonetize,
        })
        .from(videos)
        .innerJoin(users, eq(videos.userId, users.id))
        .where(and(eq(videos.id, input.id), eq(videos.visibility, "public")))
        .limit(1);

      if (!video) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Video not found" });
      }

      // Get view count - manejar errores si la tabla no existe
      let viewCount = 0;
      try {
        const viewCountResult = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(views)
          .where(eq(views.videoId, input.id));

        viewCount = viewCountResult[0]?.count ?? 0;
      } catch (error) {
        // Si la tabla views no existe o hay un error, simplemente usar 0
        console.warn("Error getting view count (table may not exist):", error);
        viewCount = 0;
      }

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

      // Buscar videos por título
      const videoSearchCondition = ilike(videos.title, `%${query}%`);

      const videoWhereConditions = [
        eq(videos.visibility, "public"),
        videoSearchCondition,
        cursor
          ? sql`(${videos.createdAt} < ${cursor.createdAt} OR (${videos.createdAt} = ${cursor.createdAt} AND ${videos.id} < ${cursor.id}))`
          : undefined,
      ].filter(Boolean);

      const videoResults = await db
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
          userUsername: users.username,
          userImageUrl: users.imageUrl,
        })
        .from(videos)
        .innerJoin(users, eq(videos.userId, users.id))
        .where(and(...videoWhereConditions))
        .orderBy(desc(videos.createdAt), desc(videos.id))
        .limit(limit + 1);

      // Buscar canales por nombre o username
      const channelSearchCondition = or(
        ilike(channels.name, `%${query}%`),
        ilike(users.username, `%${query}%`)
      );

      const channelResults = await db
        .select({
          id: channels.id,
          name: channels.name,
          description: channels.description,
          avatar: channels.avatar,
          banner: channels.banner,
          isVerified: channels.isVerified,
          userId: channels.userId,
          userName: users.name,
          userUsername: users.username,
          userImageUrl: users.imageUrl,
          createdAt: channels.createdAt,
        })
        .from(channels)
        .innerJoin(users, eq(channels.userId, users.id))
        .where(channelSearchCondition)
        .limit(10);

      const hasMore = videoResults.length > limit;
      const videoItems = hasMore ? videoResults.slice(0, -1) : videoResults;

      const lastItem = videoItems[videoItems.length - 1];
      const nextCursor = hasMore && lastItem
        ? { id: lastItem.id, createdAt: lastItem.createdAt }
        : null;

      return {
        videos: videoItems,
        channels: channelResults,
        nextCursor,
      };
    }),

  recordView: baseProcedure
    .input(z.object({ videoId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      try {
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
          try {
            const existingView = await db
              .select()
              .from(views)
              .where(and(eq(views.videoId, input.videoId), eq(views.userId, userId)))
              .limit(1);

            if (existingView.length > 0) {
              return { success: true, alreadyViewed: true };
            }
          } catch (error) {
            // Si la tabla views no existe, simplemente retornar success sin registrar
            console.warn("Error checking existing view (table may not exist):", error);
            return { success: true, skipped: true };
          }
        }

        // Record the view
        try {
          await db.insert(views).values({
            videoId: input.videoId,
            userId: userId || null,
          });
        } catch (error) {
          // Si la tabla views no existe, simplemente retornar success sin registrar
          console.warn("Error recording view (table may not exist):", error);
          return { success: true, skipped: true };
        }

        return { success: true, alreadyViewed: false };
      } catch (error) {
        // Si hay cualquier otro error, simplemente retornar success para no romper la UX
        console.warn("Error in recordView:", error);
        return { success: true, skipped: true };
      }
    }),
});
