import { db } from "@/db";
import { liveStreams } from "@/db/schema";
import { mux } from "@/lib/mux";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { and, eq, desc, sql } from "drizzle-orm";
import z from "zod";

const ensureMuxCredentials = () => {
  if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Missing Mux credentials. Set MUX_TOKEN_ID and MUX_TOKEN_SECRET.",
    });
  }
};

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
        ensureMuxCredentials();

        // Crear live stream en Mux
        // Siguiendo las mejores prácticas de Mux para live streaming
        const liveStream = await mux.video.liveStreams.create({
          playback_policy: ["public"],
          new_asset_settings: {
            playback_policy: ["public"],
          },
          // Opciones adicionales recomendadas por Mux
          reduced_latency: true, // Reducir latencia para transmisiones en vivo
          reconnect_window: 60, // Ventana de reconexión en segundos
          passthrough: userId, // Metadata personalizada para identificar el usuario
        });

        if (!liveStream.stream_key || !liveStream.playback_ids?.[0]?.id) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create live stream. Missing stream key or playback ID.",
          });
        }

        // Guardar en BD - manejar errores si la tabla no existe
        try {
          const [savedStream] = await db
            .insert(liveStreams)
            .values({
              userId,
              title: input.title,
              description: input.description || null,
              streamKey: liveStream.stream_key,
              playbackId: liveStream.playback_ids[0].id,
              muxLiveStreamId: liveStream.id,
              status: "idle",
            })
            .returning();

          return savedStream;
        } catch (dbError: any) {
          // Si la tabla no existe, lanzar error más claro
          if (dbError?.message?.includes("does not exist") || dbError?.code === "42P01") {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "La tabla live_streams no existe. Ejecuta: npm run drizzle:push",
            });
          }
          throw dbError;
        }
      } catch (error: any) {
        // Logging con Logtail si está configurado, sino console
        const { logServer } = await import("@/lib/logtail");
        logServer.error("Failed to create live stream", error instanceof Error ? error : new Error(String(error)), {
          message: error?.message,
          status: error?.response?.status || error?.status,
          statusText: error?.response?.statusText,
          data: error?.response?.data,
          hasTokenId: !!process.env.MUX_TOKEN_ID,
          hasTokenSecret: !!process.env.MUX_TOKEN_SECRET,
          userId,
        });
        
        // Verificar si las credenciales están presentes
        if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Mux credentials are missing. Please set MUX_TOKEN_ID and MUX_TOKEN_SECRET in your .env.local file.",
          });
        }

        // Manejar errores específicos de Mux API
        const status = error?.response?.status || error?.status;
        const errorMessage = error?.response?.data?.error?.message || error?.message || "Unknown error";

        if (status === 401) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid Mux credentials. Please verify your MUX_TOKEN_ID and MUX_TOKEN_SECRET are correct.",
          });
        }

        if (status === 403) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Mux credentials don't have permission to create live streams. Check your Mux account permissions and plan.",
          });
        }

        if (status === 400 && (errorMessage?.includes("free plan") || errorMessage?.includes("unavailable"))) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Live Streaming no está habilitado en tu cuenta. El plan gratuito incluye $20 de créditos de prueba. Ve a https://dashboard.mux.com/settings/live-streaming para habilitar Live Streaming y activar tus créditos de prueba.",
          });
        }

        if (status === 429) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Rate limit exceeded. Please wait a moment and try again.",
          });
        }

        // Si el error tiene un mensaje específico de Mux, usarlo
        if (errorMessage && errorMessage !== "Unknown error") {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to create live stream: ${errorMessage}`,
          });
        }

        // Error genérico como último recurso
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Unable to create live stream. ${status ? `Status: ${status}. ` : ""}Check your Mux credentials, account status, and that Live Streaming is enabled in your Mux account.`,
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

      const [stream] = await db
        .select()
        .from(liveStreams)
        .where(and(eq(liveStreams.id, input.id), eq(liveStreams.userId, userId)))
        .limit(1);

      if (!stream) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Live stream not found" });
      }

      return stream;
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

      // Eliminar de Mux si existe
      if (stream.muxLiveStreamId) {
        try {
          ensureMuxCredentials();
          await mux.video.liveStreams.delete(stream.muxLiveStreamId);
        } catch (error) {
          console.error("Failed to delete live stream from Mux", error);
          // Continuar con la eliminación en BD aunque falle en Mux
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

      if (!stream || !stream.muxLiveStreamId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Live stream not found" });
      }

      try {
        ensureMuxCredentials();
        const muxStream = await mux.video.liveStreams.retrieve(stream.muxLiveStreamId);

        // Actualizar estado en BD
        await db
          .update(liveStreams)
          .set({
            status: muxStream.status || "idle",
            updatedAt: new Date(),
          })
          .where(eq(liveStreams.id, input.id));

        return {
          status: muxStream.status || "idle",
          streamKey: stream.streamKey,
          playbackId: stream.playbackId,
        };
      } catch (error) {
        console.error("Failed to get live stream status", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to get live stream status",
        });
      }
    }),
});

