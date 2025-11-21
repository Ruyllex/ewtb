import { db } from "@/db";
import { videos, videoLikes, views, users, channels } from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { and, eq, desc, inArray, sql } from "drizzle-orm";
import z from "zod";
import { getSignedDownloadUrl } from "@/lib/aws";

// Función helper para normalizar avatares (reutilizada)
function normalizeAvatar(avatar?: string | null, fallback?: string | null): string | null {
  const src = (avatar ?? fallback) ?? null;
  if (!src) return null;
  if (/^https?:\/\//i.test(src)) return src;
  const keyRegex = /^[A-Za-z0-9_\-]{8,}$/;
  if (keyRegex.test(src)) return `https://utfs.io/f/${src}`;
  if (src.includes("utfs.io") || src.includes("img.clerk.com")) {
    return src.startsWith("http") ? src : `https://${src.replace(/^\/+/, "")}`;
  }
  return src;
}

export const playlistsRouter = createTRPCRouter({
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
      const { limit, cursor } = input;
      const { id: userId } = ctx.user;

      // Obtener historial desde la tabla 'views'
      // Nota: Idealmente usaríamos 'watch_history' para progreso, pero 'views' tiene los datos actuales.
      // Usamos una subquery o lógica para obtener solo la última vista por video si es necesario,
      // pero para simplificar y rendimiento, traemos las vistas recientes crudas.
      // Si queremos únicos, deberíamos usar DISTINCT ON (videoId) en Postgres.

      const viewerHistory = await db
        .selectDistinctOn([views.videoId], {
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
            user: {
              id: users.id,
              name: users.name,
              username: users.username,
              imageUrl: users.imageUrl,
            },
            channel: {
              name: channels.name,
              avatar: channels.avatar,
            }
          }
        })
        .from(views)
        .innerJoin(videos, eq(views.videoId, videos.id))
        .innerJoin(users, eq(videos.userId, users.id))
        .leftJoin(channels, eq(channels.userId, users.id))
        .where(
          and(
            eq(views.userId, userId),
            cursor
              ? sql`(${views.createdAt} < ${cursor.viewedAt} OR (${views.createdAt} = ${cursor.viewedAt} AND ${views.id} < ${cursor.id}))`
              : undefined
          )
        )
        .orderBy(desc(views.createdAt), desc(views.id)) // DISTINCT ON requiere que el primer order sea la columna distinct
        .limit(limit + 1);

        // Nota: DISTINCT ON en Drizzle requiere que el orderBy empiece con las columnas del distinct.
        // Si queremos ordenar por fecha (reciente), necesitamos: orderBy(views.videoId, desc(views.createdAt))
        // Pero eso agruparía por videoId arbitrariamente.
        // Para "Historial" real (últimos vistos), la query simple es:
        // SELECT * FROM views WHERE userId = ... ORDER BY createdAt DESC
        // Y filtrar duplicados en el cliente o aceptar que aparezca el mismo video varias veces si se vio varias veces.
        // YouTube muestra el mismo video varias veces si lo viste en días distintos.
        // Vamos a simplificar quitando el DISTINCT ON para permitir ver "lo que vi hoy, ayer, etc".

      const rawHistory = await db
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
            userId: videos.userId, // Necesario para lógica
          },
          user: {
            id: users.id,
            name: users.name,
            username: users.username,
            imageUrl: users.imageUrl,
          },
          channel: {
            name: channels.name,
            avatar: channels.avatar,
          }
        })
        .from(views)
        .innerJoin(videos, eq(views.videoId, videos.id))
        .innerJoin(users, eq(videos.userId, users.id))
        .leftJoin(channels, eq(channels.userId, users.id))
        .where(
          and(
            eq(views.userId, userId),
            cursor
              ? sql`(${views.createdAt} < ${cursor.viewedAt} OR (${views.createdAt} = ${cursor.viewedAt} AND ${views.id} < ${cursor.id}))`
              : undefined
          )
        )
        .orderBy(desc(views.createdAt), desc(views.id))
        .limit(limit + 1);

      const hasMore = rawHistory.length > limit;
      const items = hasMore ? rawHistory.slice(0, -1) : rawHistory;

      // Normalizar URLs
      const normalizedItems = await Promise.all(items.map(async (item) => {
        let finalThumbnailUrl: string | null = null;
        if (item.video.thumbnailImage) {
          finalThumbnailUrl = `/api/videos/${item.video.id}/thumbnail`;
        } else if (item.video.thumbnailKey) {
          finalThumbnailUrl = await getSignedDownloadUrl(item.video.thumbnailKey);
        } else {
          finalThumbnailUrl = item.video.thumbnailUrl;
        }

        // Eliminar campo binario
        const { thumbnailImage, ...videoRest } = item.video;

        return {
          ...videoRest,
          thumbnailUrl: finalThumbnailUrl,
          s3Url: item.video.s3Key ? await getSignedDownloadUrl(item.video.s3Key) : item.video.s3Url,
          viewedAt: item.viewedAt,
          // Estructura compatible con VideoCard
          channel: {
            username: item.user.username ?? null,
            name: item.channel.name ?? item.user.name ?? null,
            avatarUrl: normalizeAvatar(item.channel.avatar ?? null, item.user.imageUrl ?? null),
          },
          // Campos legacy por si acaso
          userName: item.user.name,
          userUsername: item.user.username,
          userImageUrl: item.user.imageUrl,
        };
      }));

      const lastItem = items[items.length - 1];
      const nextCursor = hasMore && lastItem
        ? { id: lastItem.viewId, viewedAt: lastItem.viewedAt }
        : null;

      return {
        items: normalizedItems,
        nextCursor,
      };
    }),

  getLiked: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        cursor: z
          .object({
            id: z.string().uuid(),
            likedAt: z.date(),
          })
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { limit, cursor } = input;
      const { id: userId } = ctx.user;

      const likedVideos = await db
        .select({
          likeId: videoLikes.id,
          likedAt: videoLikes.createdAt,
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
            userId: videos.userId,
          },
          user: {
            id: users.id,
            name: users.name,
            username: users.username,
            imageUrl: users.imageUrl,
          },
          channel: {
            name: channels.name,
            avatar: channels.avatar,
          }
        })
        .from(videoLikes)
        .innerJoin(videos, eq(videoLikes.videoId, videos.id))
        .innerJoin(users, eq(videos.userId, users.id))
        .leftJoin(channels, eq(channels.userId, users.id))
        .where(
          and(
            eq(videoLikes.userId, userId),
            cursor
              ? sql`(${videoLikes.createdAt} < ${cursor.likedAt} OR (${videoLikes.createdAt} = ${cursor.likedAt} AND ${videoLikes.id} < ${cursor.id}))`
              : undefined
          )
        )
        .orderBy(desc(videoLikes.createdAt), desc(videoLikes.id))
        .limit(limit + 1);

      const hasMore = likedVideos.length > limit;
      const items = hasMore ? likedVideos.slice(0, -1) : likedVideos;

      // Normalizar URLs
      const normalizedItems = await Promise.all(items.map(async (item) => {
        let finalThumbnailUrl: string | null = null;
        if (item.video.thumbnailImage) {
          finalThumbnailUrl = `/api/videos/${item.video.id}/thumbnail`;
        } else if (item.video.thumbnailKey) {
          finalThumbnailUrl = await getSignedDownloadUrl(item.video.thumbnailKey);
        } else {
          finalThumbnailUrl = item.video.thumbnailUrl;
        }

        const { thumbnailImage, ...videoRest } = item.video;

        return {
          ...videoRest,
          thumbnailUrl: finalThumbnailUrl,
          s3Url: item.video.s3Key ? await getSignedDownloadUrl(item.video.s3Key) : item.video.s3Url,
          likedAt: item.likedAt,
          channel: {
            username: item.user.username ?? null,
            name: item.channel.name ?? item.user.name ?? null,
            avatarUrl: normalizeAvatar(item.channel.avatar ?? null, item.user.imageUrl ?? null),
          },
          userName: item.user.name,
          userUsername: item.user.username,
          userImageUrl: item.user.imageUrl,
        };
      }));

      const lastItem = items[items.length - 1];
      const nextCursor = hasMore && lastItem
        ? { id: lastItem.likeId, likedAt: lastItem.likedAt }
        : null;

      return {
        items: normalizedItems,
        nextCursor,
      };
    }),
});

