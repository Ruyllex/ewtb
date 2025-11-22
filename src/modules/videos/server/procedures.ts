import { db } from "@/db";
import { videos, videoUpdateSchema, views, users, channels, subscriptions } from "@/db/schema";
import { ensureAwsCredentials, getSignedUploadUrl, checkFileExists, getS3PublicUrl, getSignedDownloadUrl } from "@/lib/aws";
import { createTRPCRouter, protectedProcedure, baseProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { and, eq, ilike, sql, desc, or, inArray } from "drizzle-orm";
import { UTApi } from "uploadthing/server";
import z from "zod";
import { randomUUID } from "crypto";

/**
 * Normaliza avatares para que Next/Image los pueda consumir:
 * - Si es URL absoluta (http(s)) la devuelve
 * - Si parece una key de UploadThing la convierte a https://utfs.io/f/{key}
 * - Si contiene utfs.io o img.clerk.com y falta protocolo, lo agrega
 * - Si no, devuelve el valor tal cual (puede ser null)
 */
function normalizeAvatar(avatar?: string | null, fallback?: string | null): string | null {
  const src = (avatar ?? fallback) ?? null;
  if (!src) return null;

  // Absoluta
  if (/^https?:\/\//i.test(src)) return src;

  // UploadThing key-like (heurística)
  const keyRegex = /^[A-Za-z0-9_\-]{8,}$/;
  if (keyRegex.test(src)) {
    return `https://utfs.io/f/${src}`;
  }

  // utfs.io parcial (sin protocolo)
  if (src.includes("utfs.io")) {
    return src.startsWith("http") ? src : `https://${src.replace(/^\/+/, "")}`;
  }

  // Clerk proxy parcial (img.clerk.com)
  if (src.includes("img.clerk.com")) {
    return src.startsWith("http") ? src : `https://${src.replace(/^\/+/, "")}`;
  }

  // Fallback: devolver tal cual (por si ya es algo que funcione)
  return src;
}

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

      if (!existingVideo.s3Key) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Video does not have an S3 key. Cannot restore thumbnail."
        });
      }

      // Para videos en S3, no podemos generar thumbnails automáticamente
      // El usuario deberá subir uno manualmente
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Thumbnail restoration is not available for S3 videos. Please upload a thumbnail manually."
      });
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

    const { thumbnailImage, ...videoWithoutImage } = updatedVideo;

    return videoWithoutImage;
  }),

  create: protectedProcedure
    .input(z.object({ contentType: z.string().default("video/mp4") }))
    .mutation(async ({ ctx, input }) => {
      const { id: userId } = ctx.user;

      try {
        ensureAwsCredentials();

        // Generar una clave única para el archivo en S3
        // Formato: videos/{userId}/{uuid}.{ext} (el cliente puede determinar la extensión)
        // Intentar determinar la extensión basada en el contentType
        const ext = input.contentType.split("/")[1] || "mp4";
        const s3Key = `videos/${userId}/${randomUUID()}.${ext}`;

        // Generar URL firmada para subir el archivo
        // El tipo MIME será determinado por el cliente
        const signedUrl = await getSignedUploadUrl(s3Key, input.contentType, 3600); // 1 hora de validez

        // Retornar la información de upload
        // uploadId será la s3Key para poder verificar después
        return {
          uploadId: s3Key, // Usamos la s3Key como uploadId para identificarlo después
          url: signedUrl,
        };
      } catch (error) {
        console.error("Failed to create S3 upload URL", error);
        if (error instanceof Error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Unable to create upload: ${error.message}`,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to create upload. Check your AWS credentials and S3 bucket configuration.",
        });
      }
    }),

  finalize: protectedProcedure
    .input(
      z.object({
        uploadId: z.string(), // En S3, esto es la s3Key
        title: z.string().min(1).max(100),
        description: z.string().max(5000).optional(),
        categoryId: z.string().uuid().optional(),
        visibility: z.enum(["public", "private"]).default("private"),
        duration: z.number().int().min(0).default(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id: userId } = ctx.user;

      try {
        ensureAwsCredentials();

        // En S3, uploadId es la s3Key
        const s3Key = input.uploadId;

        // Verificar que el archivo existe en S3
        const fileExists = await checkFileExists(s3Key);

        if (!fileExists) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Video file not found in S3. Please ensure the upload completed successfully.",
          });
        }

        // Verificar que no existe ya un video con esta s3Key
        const existingVideo = await db
          .select()
          .from(videos)
          .where(eq(videos.s3Key, s3Key))
          .limit(1);

        if (existingVideo.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Video already exists",
          });
        }

        // Generar URL pública del video
        const s3Url = getS3PublicUrl(s3Key);

        // Crear el video en la BD con los datos del formulario
        // Nota: Para duración y thumbnails, estos deberán ser generados por el cliente
        // o usando servicios adicionales (como AWS MediaConvert para generar thumbnails)
        const [video] = await db
          .insert(videos)
          .values({
            userId,
            title: input.title,
            description: input.description || null,
            categoryId: input.categoryId || null,
            visibility: input.visibility,
            s3Key,
            s3Url,
            duration: input.duration, // Duración extraída del cliente
          })
          .returning();

        return video;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Failed to finalize video", error);
        if (error instanceof Error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Unable to finalize video: ${error.message}`,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to finalize video. Please try again.",
        });
      }
    }),

  getUploadStatus: protectedProcedure
    .input(z.object({ uploadId: z.string() })) // En S3, esto es la s3Key
    .query(async ({ input }) => {
      try {
        ensureAwsCredentials();

        const s3Key = input.uploadId;

        // Verificar si el archivo existe en S3
        const fileExists = await checkFileExists(s3Key);

        if (!fileExists) {
          return {
            status: "uploading",
            assetId: null,
            playbackId: null,
            ready: false,
            duration: 0,
            thumbnailUrl: null,
            previewUrl: null,
          };
        }

        // Si el archivo existe, está listo
        // Generar URL firmada para el preview (ya que el bucket es privado)
        const s3Url = await getSignedDownloadUrl(s3Key);

        return {
          status: "ready",
          assetId: s3Key, // Usamos s3Key como assetId
          playbackId: s3Url, // Usamos s3Url como playbackId para el player
          ready: true,
          duration: 0, // Se puede calcular después si es necesario
          thumbnailUrl: null, // El usuario debe subir un thumbnail manualmente
          previewUrl: null,
        };
      } catch (error) {
        console.error("Failed to get upload status", error);
        if (error instanceof Error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Unable to get upload status: ${error.message}`,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to get upload status",
        });
      }
    }),

  // Public procedures
  getTrending: baseProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        cursor: z
          .object({
            id: z.string().uuid(),
            likes: z.number(),
          })
          .optional(),
      })
    )
    .query(async ({ input }) => {
      const { limit, cursor } = input;

      const whereConditions = [
        eq(videos.visibility, "public"),
        cursor
          ? sql`(${videos.likes} < ${cursor.likes} OR (${videos.likes} = ${cursor.likes} AND ${videos.id} < ${cursor.id}))`
          : undefined,
      ].filter(Boolean);

      const results = await db
        .select({
          id: videos.id,
          title: videos.title,
          description: videos.description,
          thumbnailUrl: videos.thumbnailUrl,
          thumbnailKey: videos.thumbnailKey,
          thumbnailImage: videos.thumbnailImage,
          previewUrl: videos.previewUrl,
          s3Url: videos.s3Url,
          s3Key: videos.s3Key,
          duration: videos.duration,
          createdAt: videos.createdAt,
          likes: videos.likes,

          // Usuario (owner)
          userId: users.id,
          userName: users.name,
          userUsername: users.username,
          userImageUrl: users.imageUrl,

          // Channel
          channelName: channels.name,
          channelAvatar: channels.avatar,
        })
        .from(videos)
        .innerJoin(users, eq(videos.userId, users.id))
        .leftJoin(channels, eq(channels.userId, users.id))
        .where(and(...whereConditions))
        .orderBy(desc(videos.likes), desc(videos.id))
        .limit(limit + 1);

      const hasMore = results.length > limit;
      const items = hasMore ? results.slice(0, -1) : results;

      // Calculate view counts for all videos
      const videoIds = items.map(v => v.id);
      const viewCountsMap = new Map<string, number>();

      if (videoIds.length > 0) {
        try {
          const viewCounts = await db
            .select({
              videoId: views.videoId,
              count: sql<number>`count(*)::int`
            })
            .from(views)
            .where(inArray(views.videoId, videoIds))
            .groupBy(views.videoId);

          viewCounts.forEach(vc => viewCountsMap.set(vc.videoId, vc.count));
        } catch (error) {
          console.warn('[getTrending] Error fetching view counts:', error);
        }
      }

      const normalized = await Promise.all(items.map(async (item) => {
        let finalThumbnailUrl: string | null = null;
        if (item.thumbnailImage) {
          finalThumbnailUrl = `/api/videos/${item.id}/thumbnail`;
        } else if (item.thumbnailKey) {
          finalThumbnailUrl = await getSignedDownloadUrl(item.thumbnailKey);
        } else {
          finalThumbnailUrl = item.thumbnailUrl;
        }

        const { thumbnailImage, ...itemWithoutThumbnailImage } = item;

        return {
          ...itemWithoutThumbnailImage,
          s3Url: item.s3Key ? await getSignedDownloadUrl(item.s3Key) : item.s3Url,
          thumbnailUrl: finalThumbnailUrl,
          viewCount: viewCountsMap.get(item.id) ?? 0,
          channel: {
            username: item.userUsername ?? null,
            name: item.channelName ?? null,
            avatarUrl: normalizeAvatar(item.channelAvatar ?? null, item.userImageUrl ?? null),
          },
        };
      }));

      const lastItem = items[items.length - 1];
      const nextCursor = hasMore && lastItem
        ? { id: lastItem.id, likes: lastItem.likes }
        : null;

      return {
        items: normalized,
        nextCursor,
      };
    }),

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

      const whereConditions: any[] = [
        eq(videos.visibility, "public"),
      ];

      if (categoryId) {
        whereConditions.push(eq(videos.categoryId, categoryId));
      }

      if (cursor) {
        whereConditions.push(
          sql`(${videos.createdAt} < ${cursor.createdAt} OR (${videos.createdAt} = ${cursor.createdAt} AND ${videos.id} < ${cursor.id}))`
        );
      }

      // Ahora hacemos join con users y channels para devolver info de canal junto al video
      // Usamos leftJoin para channels porque no todos los usuarios pueden tener un canal creado
      const results = await db
        .select({
          id: videos.id,
          title: videos.title,
          description: videos.description,
          thumbnailUrl: videos.thumbnailUrl,
          thumbnailKey: videos.thumbnailKey,
          thumbnailImage: videos.thumbnailImage, // Para verificar si hay imagen en BD
          previewUrl: videos.previewUrl,
          s3Url: videos.s3Url,
          s3Key: videos.s3Key,
          duration: videos.duration,
          createdAt: videos.createdAt,
          likes: videos.likes,

          // Usuario (owner)
          userId: users.id,
          userName: users.name,
          userUsername: users.username,
          userImageUrl: users.imageUrl,

          // Channel (desde tabla channels) - puede ser null si el usuario no tiene canal
          channelName: channels.name,
          channelAvatar: channels.avatar,
        })
        .from(videos)
        .innerJoin(users, eq(videos.userId, users.id))
        .leftJoin(channels, eq(channels.userId, users.id))
        .where(and(...whereConditions))
        .orderBy(desc(videos.createdAt), desc(videos.id))
        .limit(limit + 1);

      const hasMore = results.length > limit;
      const items = hasMore ? results.slice(0, -1) : results;

      // Calculate view counts for all videos
      const videoIds = items.map(v => v.id);
      const viewCountsMap = new Map<string, number>();

      if (videoIds.length > 0) {
        try {
          const viewCounts = await db
            .select({
              videoId: views.videoId,
              count: sql<number>`count(*)::int`
            })
            .from(views)
            .where(inArray(views.videoId, videoIds))
            .groupBy(views.videoId);

          viewCounts.forEach(vc => viewCountsMap.set(vc.videoId, vc.count));
        } catch (error) {
          console.warn('[getMany] Error fetching view counts:', error);
        }
      }

      // Normalizar y construir objeto channel en cada item
      const normalized = await Promise.all(items.map(async (item) => {
        // Normalizar thumbnail URL: prioridad a thumbnailImage (ruta API), luego thumbnailKey (URL firmada), luego thumbnailUrl
        let finalThumbnailUrl: string | null = null;
        if (item.thumbnailImage) {
          finalThumbnailUrl = `/api/videos/${item.id}/thumbnail`;
        } else if (item.thumbnailKey) {
          finalThumbnailUrl = await getSignedDownloadUrl(item.thumbnailKey);
        } else {
          finalThumbnailUrl = item.thumbnailUrl;
        }

        // Eliminar thumbnailImage del objeto retornado (no debe exponerse)
        const { thumbnailImage, ...itemWithoutThumbnailImage } = item;

        return {
          ...itemWithoutThumbnailImage,
          s3Url: item.s3Key ? await getSignedDownloadUrl(item.s3Key) : item.s3Url,
          thumbnailUrl: finalThumbnailUrl,
          viewCount: viewCountsMap.get(item.id) ?? 0,
          channel: {
            username: item.userUsername ?? null, // username del owner (guardado en users.username)
            name: item.channelName ?? null,
            avatarUrl: normalizeAvatar(item.channelAvatar ?? null, item.userImageUrl ?? null),
          },
        };
      }));

      const lastItem = items[items.length - 1];
      const nextCursor = hasMore && lastItem
        ? { id: lastItem.id, createdAt: lastItem.createdAt }
        : null;

      return {
        items: normalized,
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
          thumbnailKey: videos.thumbnailKey,
          thumbnailImage: videos.thumbnailImage, // Para verificar si hay imagen en BD
          s3Url: videos.s3Url,
          s3Key: videos.s3Key,
          duration: videos.duration,
          visibility: videos.visibility,
          createdAt: videos.createdAt,
          updatedAt: videos.updatedAt,
          userId: videos.userId,
          categoryId: videos.categoryId,

          // User
          userName: users.name,
          userUsername: users.username,
          userImageUrl: users.imageUrl,
          userCanMonetize: users.canMonetize,

          // Channel
          channelName: channels.name,
          channelAvatar: channels.avatar,
        })
        .from(videos)
        .innerJoin(users, eq(videos.userId, users.id))
        .innerJoin(channels, eq(channels.userId, users.id))
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
        console.warn("Error getting view count (table may not exist):", error);
        viewCount = 0;
      }

      // Generar URL firmada si hay s3Key
      const signedS3Url = video.s3Key ? await getSignedDownloadUrl(video.s3Key) : video.s3Url;

      // Normalizar thumbnail URL: prioridad a thumbnailImage (ruta API), luego thumbnailKey (URL firmada), luego thumbnailUrl
      let finalThumbnailUrl: string | null = null;
      if (video.thumbnailImage) {
        finalThumbnailUrl = `/api/videos/${video.id}/thumbnail`;
      } else if (video.thumbnailKey) {
        finalThumbnailUrl = await getSignedDownloadUrl(video.thumbnailKey);
      } else {
        finalThumbnailUrl = video.thumbnailUrl;
      }

      // Eliminar thumbnailImage del objeto retornado (no debe exponerse)
      const { thumbnailImage, ...videoWithoutThumbnailImage } = video;

      return {
        ...videoWithoutThumbnailImage,
        s3Url: signedS3Url,
        thumbnailUrl: finalThumbnailUrl,
        viewCount,
        channel: {
          username: video.userUsername ?? null,
          name: video.channelName ?? null,
          avatarUrl: normalizeAvatar(video.channelAvatar ?? null, video.userImageUrl ?? null),
        },
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
          s3Url: videos.s3Url,
          s3Key: videos.s3Key,
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

  getHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        cursor: z
          .object({
            id: z.string().uuid(),
            viewedAt: z.date(),
          })
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { id: userId } = ctx.user;
      const { limit, cursor } = input;

      const whereConditions = [
        eq(views.userId, userId),
        cursor
          ? sql`(${views.createdAt} < ${cursor.viewedAt} OR (${views.createdAt} = ${cursor.viewedAt} AND ${views.id} < ${cursor.id}))`
          : undefined,
      ].filter(Boolean);

      const viewerHistory = await db
        .select({
          viewId: views.id,
          viewedAt: views.createdAt,
          video: {
            id: videos.id,
            title: videos.title,
            description: videos.description,
            thumbnailUrl: videos.thumbnailUrl,
            thumbnailKey: videos.thumbnailKey,
            thumbnailImage: videos.thumbnailImage,
            previewUrl: videos.previewUrl,
            s3Url: videos.s3Url,
            s3Key: videos.s3Key,
            duration: videos.duration,
            createdAt: videos.createdAt,
            likes: videos.likes,
            userId: users.id,
            userName: users.name,
            userUsername: users.username,
            userImageUrl: users.imageUrl,
            channelName: channels.name,
            channelAvatar: channels.avatar,
          },
        })
        .from(views)
        .innerJoin(videos, eq(views.videoId, videos.id))
        .innerJoin(users, eq(videos.userId, users.id))
        .leftJoin(channels, eq(channels.userId, users.id))
        .where(and(...whereConditions))
        .orderBy(desc(views.createdAt), desc(views.id))
        .limit(limit + 1);

      const hasMore = viewerHistory.length > limit;
      const items = hasMore ? viewerHistory.slice(0, -1) : viewerHistory;

      // Calculate view counts for the videos
      const videoIds = items.map(item => item.video.id);
      const viewCountsMap = new Map<string, number>();

      if (videoIds.length > 0) {
        try {
          const viewCounts = await db
            .select({
              videoId: views.videoId,
              count: sql<number>`count(*)::int`
            })
            .from(views)
            .where(inArray(views.videoId, videoIds))
            .groupBy(views.videoId);

          viewCounts.forEach(vc => viewCountsMap.set(vc.videoId, vc.count));
        } catch (error) {
          console.warn('[getHistory] Error fetching view counts:', error);
        }
      }

      const normalized = await Promise.all(items.map(async (item) => {
        const video = item.video;
        
        let finalThumbnailUrl: string | null = null;
        if (video.thumbnailImage) {
          finalThumbnailUrl = `/api/videos/${video.id}/thumbnail`;
        } else if (video.thumbnailKey) {
          finalThumbnailUrl = await getSignedDownloadUrl(video.thumbnailKey);
        } else {
          finalThumbnailUrl = video.thumbnailUrl;
        }

        const { thumbnailImage, ...videoWithoutThumbnailImage } = video;

        return {
          ...videoWithoutThumbnailImage,
          s3Url: video.s3Key ? await getSignedDownloadUrl(video.s3Key) : video.s3Url,
          thumbnailUrl: finalThumbnailUrl,
          viewCount: viewCountsMap.get(video.id) ?? 0,
          viewedAt: item.viewedAt, // Importante para el historial
          viewId: item.viewId,
          channel: {
            username: video.userUsername ?? null,
            name: video.channelName ?? null,
            avatarUrl: normalizeAvatar(video.channelAvatar ?? null, video.userImageUrl ?? null),
          },
        };
      }));

      const lastItem = items[items.length - 1];
      const nextCursor = hasMore && lastItem
        ? { id: lastItem.viewId, viewedAt: lastItem.viewedAt }
        : null;

      return {
        items: normalized,
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

        // Record the view (permitimos múltiples vistas por usuario)
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

  /**
   * Obtener feed personal (videos de canales suscritos)
   */
  getPersonalFeed: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        cursor: z
          .object({
            id: z.string().uuid(),
            createdAt: z.date(),
          })
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { id: userId } = ctx.user;
      const { limit, cursor } = input;

      // Obtener IDs de canales a los que el usuario está suscrito
      const userSubscriptions = await db
        .select({ channelId: subscriptions.channelId })
        .from(subscriptions)
        .where(eq(subscriptions.subscriberId, userId));

      const subscribedChannelIds = userSubscriptions.map((sub) => sub.channelId);

      // Si no está suscrito a ningún canal, retornar lista vacía
      if (subscribedChannelIds.length === 0) {
        return {
          items: [],
          nextCursor: null,
        };
      }

      // Obtener los user IDs de los canales suscritos
      const subscribedChannels = await db
        .select({ userId: channels.userId })
        .from(channels)
        .where(inArray(channels.id, subscribedChannelIds));

      const subscribedUserIds = subscribedChannels.map((ch) => ch.userId);

      // Si no hay user IDs, retornar lista vacía
      if (subscribedUserIds.length === 0) {
        return {
          items: [],
          nextCursor: null,
        };
      }

      const whereConditions = [
        eq(videos.visibility, "public"),
        inArray(videos.userId, subscribedUserIds),
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
          s3Url: videos.s3Url,
          s3Key: videos.s3Key,
          duration: videos.duration,
          createdAt: videos.createdAt,
          likes: videos.likes,
          userId: users.id,
          userName: users.name,
          userUsername: users.username,
          userImageUrl: users.imageUrl,
          channelName: channels.name,
          channelAvatar: channels.avatar,
        })
        .from(videos)
        .innerJoin(users, eq(videos.userId, users.id))
        .innerJoin(channels, eq(channels.userId, users.id))
        .where(and(...whereConditions))
        .orderBy(desc(videos.createdAt), desc(videos.id))
        .limit(limit + 1);

      const hasMore = results.length > limit;
      const items = hasMore ? results.slice(0, -1) : results;

      // Calculate view counts for all videos
      const videoIds = items.map(v => v.id);
      const viewCountsMap = new Map<string, number>();

      if (videoIds.length > 0) {
        try {
          const viewCounts = await db
            .select({
              videoId: views.videoId,
              count: sql<number>`count(*)::int`
            })
            .from(views)
            .where(inArray(views.videoId, videoIds))
            .groupBy(views.videoId);

          viewCounts.forEach(vc => viewCountsMap.set(vc.videoId, vc.count));
        } catch (error) {
          console.warn('[getPersonalFeed] Error fetching view counts:', error);
        }
      }

      const normalized = items.map((item) => ({
        ...item,
        viewCount: viewCountsMap.get(item.id) ?? 0,
        channel: {
          username: item.userUsername ?? null,
          name: item.channelName ?? null,
          avatarUrl: normalizeAvatar(item.channelAvatar ?? null, item.userImageUrl ?? null),
        },
      }));

      const lastItem = items[items.length - 1];
      const nextCursor = hasMore && lastItem
        ? { id: lastItem.id, createdAt: lastItem.createdAt }
        : null;

      return {
        items: normalized,
        nextCursor,
      };
    }),
});
