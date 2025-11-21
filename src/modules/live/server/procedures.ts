import { db } from "@/db";
import { liveStreams, subscriptions, channels, users } from "@/db/schema";
import { ensureAwsCredentials, createIVSChannel, deleteIVSChannel, getIVSChannel } from "@/lib/aws";
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
        ensureAwsCredentials();

        // Crear canal IVS para transmisión en vivo
        const channelName = `${input.title}-${Date.now()}`;
        const ivsChannel = await createIVSChannel(channelName);

        if (!ivsChannel.streamKey || !ivsChannel.playbackUrl || !ivsChannel.ingestEndpoint) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create IVS channel. Missing stream key, playback URL, or ingest endpoint.",
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
              ivsChannelArn: ivsChannel.channelArn || null,
              ivsStreamKey: ivsChannel.streamKey,
              ivsPlaybackUrl: ivsChannel.playbackUrl,
              ivsIngestEndpoint: ivsChannel.ingestEndpoint,
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
          status: error?.$metadata?.httpStatusCode,
          data: error?.$metadata,
          hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
          hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
          hasBucket: !!process.env.AWS_S3_BUCKET_NAME,
          userId,
        });
        
        // Verificar si las credenciales están presentes
        if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "AWS credentials are missing. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in your .env.local file.",
          });
        }

        // Manejar errores específicos de AWS IVS
        const status = error?.$metadata?.httpStatusCode;
        const errorMessage = error?.message || "Unknown error";
        const errorCode = error?.name || error?.code;
        const requestId = error?.$metadata?.requestId;

        // Detectar errores específicos de autenticación/autorización
        if (status === 401 || status === 403 || errorCode === "UnrecognizedClientException" || errorCode === "InvalidSignatureException" || errorCode === "AccessDeniedException") {
          let detailedMessage = "Credenciales de AWS inválidas o sin permisos para IVS.\n\n";
          
          // Verificar si las credenciales están presentes
          const hasAccessKey = !!process.env.AWS_ACCESS_KEY_ID;
          const hasSecretKey = !!process.env.AWS_SECRET_ACCESS_KEY;
          const region = process.env.AWS_REGION || "us-east-1";
          
          if (!hasAccessKey || !hasSecretKey) {
            detailedMessage += "❌ Las credenciales no están configuradas en las variables de entorno.\n";
            detailedMessage += "   Asegúrate de tener AWS_ACCESS_KEY_ID y AWS_SECRET_ACCESS_KEY en tu .env.local\n\n";
          } else {
            detailedMessage += "✅ Las credenciales están configuradas, pero pueden ser incorrectas o no tener permisos.\n\n";
          }
          
          detailedMessage += "Pasos para resolver:\n";
          detailedMessage += "1. Verifica que tus credenciales AWS sean correctas en .env.local\n";
          detailedMessage += "2. Asegúrate de que el usuario IAM tenga estos permisos:\n";
          detailedMessage += "   - ivs:CreateChannel\n";
          detailedMessage += "   - ivs:DeleteChannel\n";
          detailedMessage += "   - ivs:GetChannel\n";
          detailedMessage += "   - ivs:ListChannels\n";
          detailedMessage += "   - ivs:GetStreamKey\n";
          detailedMessage += "3. Verifica que AWS IVS esté habilitado en tu cuenta AWS\n";
          detailedMessage += `4. Asegúrate de que la región "${region}" sea compatible con IVS\n\n`;
          detailedMessage += "Regiones compatibles con IVS: us-east-1, us-west-2, eu-west-1, ap-southeast-1, ap-northeast-1";

          if (requestId) {
            detailedMessage += `\n\nRequest ID: ${requestId}`;
          }

          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: detailedMessage,
          });
        }

        if (status === 429) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Rate limit exceeded. Please wait a moment and try again.",
          });
        }

        // Si el error tiene un mensaje específico, usarlo
        if (errorMessage && errorMessage !== "Unknown error") {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to create live stream: ${errorMessage}`,
          });
        }

        // Error genérico como último recurso
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Unable to create live stream. ${status ? `Status: ${status}. ` : ""}Check your AWS credentials, account status, and that IVS is enabled in your AWS account.`,
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

      // Eliminar canal IVS si existe
      if (stream.ivsChannelArn) {
        try {
          ensureAwsCredentials();
          await deleteIVSChannel(stream.ivsChannelArn);
        } catch (error) {
          console.error("Failed to delete IVS channel", error);
          // Continuar con la eliminación en BD aunque falle en IVS
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

      if (!stream || !stream.ivsChannelArn) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Live stream not found" });
      }

      try {
        ensureAwsCredentials();
        const ivsChannel = await getIVSChannel(stream.ivsChannelArn);

        // Mapear el estado de IVS al estado interno
        // IVS tiene: "Idle", "Connected", "Streaming"
        let status = "idle";
        if (ivsChannel.health === "Streaming") {
          status = "active";
        } else if (ivsChannel.health === "Connected") {
          status = "connected";
        }

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
          streamKey: stream.ivsStreamKey,
          playbackUrl: stream.ivsPlaybackUrl,
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
          playbackUrl: liveStreams.ivsPlaybackUrl,
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
          playbackUrl: liveStreams.ivsPlaybackUrl,
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

