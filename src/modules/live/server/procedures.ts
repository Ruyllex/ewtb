import { db } from "@/db";
import { liveStreams, subscriptions, channels, users } from "@/db/schema";
import { livepeer } from "@/lib/livepeer";
import { createTRPCRouter, protectedProcedure, baseProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { and, eq, desc, sql, inArray } from "drizzle-orm";
import z from "zod";

export const liveRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(100),
        description: z.string().max(5000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id: userId } = ctx.user;

      try {
        const stream = await livepeer.stream.create({
          name: input.title,
        });

        if (!stream.stream?.id || !stream.stream?.streamKey || !stream.stream?.playbackId) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create Livepeer stream",
          });
        }

        const [savedStream] = await db
          .insert(liveStreams)
          .values({
            userId,
            title: input.title,
            description: input.description || null,
            livepeerId: stream.stream.id,
            livepeerStreamKey: stream.stream.streamKey,
            livepeerPlaybackId: stream.stream.playbackId,
            livepeerIngestUrl: "rtmp://rtmp.livepeer.com/live", // Default Livepeer ingest URL
            status: "idle",
          })
          .returning();

        return savedStream;
      } catch (error: any) {
        console.error("Failed to create live stream", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create live stream",
        });
      }
    }),

  getMany: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
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

      try {
        const whereConditions = [
          eq(liveStreams.userId, userId),
          cursor
            ? sql`(${liveStreams.createdAt} < ${cursor.createdAt} OR (${liveStreams.createdAt} = ${cursor.createdAt} AND ${liveStreams.id} < ${cursor.id}))`
            : undefined,
        ].filter(Boolean);

        const results = await db
          .select()
          .from(liveStreams)
          .where(and(...whereConditions))
          .orderBy(desc(liveStreams.createdAt), desc(liveStreams.id))
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
      } catch (error: any) {
        // Si la tabla no existe, retornar lista vacía
        if (error?.message?.includes("does not exist") || error?.code === "42P01") {
          console.warn("Table live_streams does not exist. Run: npm run drizzle:push");
          return {
            items: [],
            nextCursor: null,
          };
        }
        // Para otros errores, lanzar el error
        throw error;
      }
    }),

  getOne: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { id: userId } = ctx.user;

      const [result] = await db
        .select()
        .from(liveStreams)
        .innerJoin(users, eq(liveStreams.userId, users.id))
        .where(and(eq(liveStreams.id, input.id), eq(liveStreams.userId, userId)))
        .limit(1);

      if (!result) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Live stream not found" });
      }

      return {
        ...result.live_streams,
        user: result.users,
      };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { id: userId } = ctx.user;

      // Obtener el stream primero
      const [stream] = await db
        .select()
        .from(liveStreams)
        .where(and(eq(liveStreams.id, input.id), eq(liveStreams.userId, userId)))
        .limit(1);

      if (!stream) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Live stream not found" });
      }

      // Eliminar stream de Livepeer si existe
      if (stream.livepeerId) {
        try {
          await livepeer.stream.delete(stream.livepeerId);
        } catch (error) {
          console.error("Failed to delete Livepeer stream", error);
          // Continuar con la eliminación en BD aunque falle en Livepeer
        }
      } else if (stream.ivsChannelArn) {
         // Fallback para streams antiguos de IVS
         try {
            const { ensureAwsCredentials, deleteIVSChannel } = await import("@/lib/aws");
            ensureAwsCredentials();
            await deleteIVSChannel(stream.ivsChannelArn);
         } catch (error) {
            console.error("Failed to delete IVS channel", error);
         }
      }

      // Eliminar de BD
      await db.delete(liveStreams).where(eq(liveStreams.id, input.id));

      return { success: true };
    }),

  getStatus: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { id: userId } = ctx.user;

      const [stream] = await db
        .select()
        .from(liveStreams)
        .where(and(eq(liveStreams.id, input.id), eq(liveStreams.userId, userId)))
        .limit(1);

      if (!stream.livepeerId) {
          // Fallback para streams antiguos de IVS
          if (stream.ivsChannelArn) {
             try {
                const { ensureAwsCredentials, getIVSChannel } = await import("@/lib/aws");
                ensureAwsCredentials();
                const ivsChannel = await getIVSChannel(stream.ivsChannelArn);
                let status = "idle";
                if (ivsChannel.health === "Streaming") {
                  status = "active";
                } else if (ivsChannel.health === "Connected") {
                  status = "connected";
                }
                 await db
                  .update(liveStreams)
                  .set({
                    status,
                    updatedAt: new Date(),
                  })
                  .where(eq(liveStreams.id, input.id));

                return {
                  status,
                  streamKey: stream.ivsStreamKey,
                  playbackUrl: stream.ivsPlaybackUrl,
                  ingestUrl: stream.ivsIngestEndpoint,
                };
             } catch (error) {
                 console.error("Failed to get IVS status", error);
                 throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to get stream status" });
             }
          }
          throw new TRPCError({ code: "NOT_FOUND", message: "Live stream not found" });
      }

      try {
        const result = await livepeer.stream.get(stream.livepeerId);
        const livepeerStream = result.stream;

        if (!livepeerStream) {
             throw new TRPCError({ code: "NOT_FOUND", message: "Stream not found in Livepeer" });
        }

        const isActive = livepeerStream.isActive;
        const status = isActive ? "active" : "idle";

        // Actualizar estado en BD
        await db
          .update(liveStreams)
          .set({
            status,
            updatedAt: new Date(),
          })
          .where(eq(liveStreams.id, input.id));

        return {
          status,
          streamKey: stream.livepeerStreamKey,
          playbackUrl: stream.livepeerPlaybackId, // Note: This is just the ID, not the full URL usually, but we'll handle it in frontend or here
          ingestUrl: "rtmp://rtmp.livepeer.com/live",
        };
      } catch (error) {
        console.error("Failed to get live stream status", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to get live stream status",
        });
      }
    }),

  /**
   * Obtener un stream público individual
   */
  getPublicStream: baseProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const [result] = await db
        .select({
          id: liveStreams.id,
          title: liveStreams.title,
          description: liveStreams.description,
          playbackUrl: liveStreams.livepeerPlaybackId,
          ivsPlaybackUrl: liveStreams.ivsPlaybackUrl,
          status: liveStreams.status,
          createdAt: liveStreams.createdAt,
          userId: users.id,
          userName: users.name,
          userUsername: users.username,
          userImageUrl: users.imageUrl,
        })
        .from(liveStreams)
        .innerJoin(users, eq(liveStreams.userId, users.id))
        .where(eq(liveStreams.id, input.id))
        .limit(1);

      if (!result) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Stream not found" });
      }

      return result;
    }),

  /**
   * Obtener todos los streams públicos (feed global)
   */
  getPublicStreams: baseProcedure
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
    .query(async ({ input }) => {
      const { limit, cursor } = input;

      const whereConditions = [
        eq(liveStreams.status, "active"), // Solo streams activos
        cursor
          ? sql`(${liveStreams.createdAt} < ${cursor.createdAt} OR (${liveStreams.createdAt} = ${cursor.createdAt} AND ${liveStreams.id} < ${cursor.id}))`
          : undefined,
      ].filter(Boolean);

      const results = await db
        .select({
          id: liveStreams.id,
          title: liveStreams.title,
          description: liveStreams.description,
          playbackUrl: liveStreams.livepeerPlaybackId, // Prefer Livepeer
          ivsPlaybackUrl: liveStreams.ivsPlaybackUrl, // Fallback
          status: liveStreams.status,
          createdAt: liveStreams.createdAt,
          userId: users.id,
          userName: users.name,
          userUsername: users.username,
          userImageUrl: users.imageUrl,
        })
        .from(liveStreams)
        .innerJoin(users, eq(liveStreams.userId, users.id))
        .where(and(...whereConditions))
        .orderBy(desc(liveStreams.createdAt), desc(liveStreams.id))
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

  /**
   * Obtener streams de canales suscritos (feed personal)
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

      const whereConditions = [
        eq(liveStreams.status, "active"),
        inArray(liveStreams.userId, subscribedUserIds),
        cursor
          ? sql`(${liveStreams.createdAt} < ${cursor.createdAt} OR (${liveStreams.createdAt} = ${cursor.createdAt} AND ${liveStreams.id} < ${cursor.id}))`
          : undefined,
      ].filter(Boolean);

      const results = await db
        .select({
          id: liveStreams.id,
          title: liveStreams.title,
          description: liveStreams.description,
          playbackUrl: liveStreams.livepeerPlaybackId, // Prefer Livepeer
          ivsPlaybackUrl: liveStreams.ivsPlaybackUrl, // Fallback
          status: liveStreams.status,
          createdAt: liveStreams.createdAt,
          userId: users.id,
          userName: users.name,
          userUsername: users.username,
          userImageUrl: users.imageUrl,
        })
        .from(liveStreams)
        .innerJoin(users, eq(liveStreams.userId, users.id))
        .where(and(...whereConditions))
        .orderBy(desc(liveStreams.createdAt), desc(liveStreams.id))
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
});

