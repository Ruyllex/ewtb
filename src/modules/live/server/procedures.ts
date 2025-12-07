import { db } from "@/db";
import { liveStreams, subscriptions, channels, users } from "@/db/schema";
import { mux } from "@/lib/mux";
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
        const stream = await mux.video.liveStreams.create({
          playback_policy: ["public"],
          new_asset_settings: {
            playback_policy: ["public"],
          },
        });

        if (!stream.id || !stream.stream_key || !stream.playback_ids?.[0]?.id) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create Mux stream",
          });
        }

        const [savedStream] = await db
          .insert(liveStreams)
          .values({
            userId,
            title: input.title,
            description: input.description || null,
            muxStreamId: stream.id,
            muxStreamKey: stream.stream_key,
            muxPlaybackId: stream.playback_ids[0].id,
            muxIngestUrl: "rtmps://global-live.mux.com:443/app",
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

      // Eliminar stream de Mux si existe
      if (stream.muxStreamId) {
        try {
          await mux.video.liveStreams.delete(stream.muxStreamId);
        } catch (error) {
          console.error("Failed to delete Mux stream", error);
          // Continuar con la eliminación en BD aunque falle en Mux
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

      if (!stream.muxStreamId) {
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
        const streamInfo = await mux.video.liveStreams.retrieve(stream.muxStreamId);
        
        const isActive = streamInfo.status === "active";
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
          streamKey: stream.muxStreamKey,
          playbackUrl: stream.muxPlaybackId,
          ingestUrl: "rtmps://global-live.mux.com:443/app",
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
          playbackUrl: liveStreams.muxPlaybackId,
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
          playbackUrl: liveStreams.muxPlaybackId, // Prefer Mux
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
          playbackUrl: liveStreams.muxPlaybackId, // Prefer Mux
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
   * Join a live stream (track viewer)
   */
  joinStream: baseProcedure
    .input(z.object({ 
      streamId: z.string().uuid(),
      sessionId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get userId if authenticated
      let userId: string | null = null;
      if (ctx.clerkUserId) {
        const [user] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.clerkId, ctx.clerkUserId))
          .limit(1);
        userId = user?.id || null;
      }

      // Note: This will fail until liveStreamViewers table is added to schema
      // Uncomment after adding the table to schema.ts
      /*
      // Insert or update viewer record
      await db
        .insert(liveStreamViewers)
        .values({
          streamId: input.streamId,
          userId,
          sessionId: input.sessionId,
          joinedAt: new Date(),
          lastHeartbeat: new Date(),
        })
        .onConflictDoUpdate({
          target: [liveStreamViewers.streamId, liveStreamViewers.sessionId],
          set: {
            lastHeartbeat: new Date(),
          },
        });

      // Clean up stale viewers (no heartbeat in last 30 seconds)
      const thirtySecondsAgo = new Date(Date.now() - 30000);
      await db
        .delete(liveStreamViewers)
        .where(
          and(
            eq(liveStreamViewers.streamId, input.streamId),
            sql`${liveStreamViewers.lastHeartbeat} < ${thirtySecondsAgo}`
          )
        );

      // Get current viewer count
      const [result] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(liveStreamViewers)
        .where(
          and(
            eq(liveStreamViewers.streamId, input.streamId),
            sql`${liveStreamViewers.lastHeartbeat} >= ${thirtySecondsAgo}`
          )
        );

      return { viewerCount: result?.count ?? 0 };
      */

      // Temporary return until table is added
      return { viewerCount: 0 };
    }),

  /**
   * Leave a live stream (remove viewer)
   */
  leaveStream: baseProcedure
    .input(z.object({ 
      streamId: z.string().uuid(),
      sessionId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Note: This will fail until liveStreamViewers table is added to schema
      // Uncomment after adding the table to schema.ts
      /*
      await db
        .delete(liveStreamViewers)
        .where(
          and(
            eq(liveStreamViewers.streamId, input.streamId),
            eq(liveStreamViewers.sessionId, input.sessionId)
          )
        );

      // Clean up stale viewers
      const thirtySecondsAgo = new Date(Date.now() - 30000);
      await db
        .delete(liveStreamViewers)
        .where(
          and(
            eq(liveStreamViewers.streamId, input.streamId),
            sql`${liveStreamViewers.lastHeartbeat} < ${thirtySecondsAgo}`
          )
        );

      // Get updated viewer count
      const [result] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(liveStreamViewers)
        .where(
          and(
            eq(liveStreamViewers.streamId, input.streamId),
            sql`${liveStreamViewers.lastHeartbeat} >= ${thirtySecondsAgo}`
          )
        );

      return { viewerCount: result?.count ?? 0 };
      */

      // Temporary return until table is added
      return { viewerCount: 0 };
    }),

  /**
   * Send heartbeat to keep viewer session alive
   */
  heartbeat: baseProcedure
    .input(z.object({ 
      streamId: z.string().uuid(),
      sessionId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Note: This will fail until liveStreamViewers table is added to schema
      // Uncomment after adding the table to schema.ts
      /*
      await db
        .update(liveStreamViewers)
        .set({ lastHeartbeat: new Date() })
        .where(
          and(
            eq(liveStreamViewers.streamId, input.streamId),
            eq(liveStreamViewers.sessionId, input.sessionId)
          )
        );

      // Clean up stale viewers
      const thirtySecondsAgo = new Date(Date.now() - 30000);
      await db
        .delete(liveStreamViewers)
        .where(
          and(
            eq(liveStreamViewers.streamId, input.streamId),
            sql`${liveStreamViewers.lastHeartbeat} < ${thirtySecondsAgo}`
          )
        );
      */

      return { success: true };
    }),

  /**
   * Get current viewer count for a stream
   */
  getViewerCount: baseProcedure
    .input(z.object({ streamId: z.string().uuid() }))
    .query(async ({ input }) => {
      // Note: This will fail until liveStreamViewers table is added to schema
      // Uncomment after adding the table to schema.ts
      /*
      const thirtySecondsAgo = new Date(Date.now() - 30000);
      
      // Clean up stale viewers first
      await db
        .delete(liveStreamViewers)
        .where(
          and(
            eq(liveStreamViewers.streamId, input.streamId),
            sql`${liveStreamViewers.lastHeartbeat} < ${thirtySecondsAgo}`
          )
        );

      const [result] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(liveStreamViewers)
        .where(
          and(
            eq(liveStreamViewers.streamId, input.streamId),
            sql`${liveStreamViewers.lastHeartbeat} >= ${thirtySecondsAgo}`
          )
        );

      return { viewerCount: result?.count ?? 0 };
      */

      // Temporary return until table is added
      return { viewerCount: 0 };
    }),
});

