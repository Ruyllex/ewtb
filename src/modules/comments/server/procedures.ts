import { db } from "@/db";
import { comments, users } from "@/db/schema";
import { createTRPCRouter, protectedProcedure, baseProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { and, eq, desc, sql } from "drizzle-orm";
import z from "zod";
import { pusherServer } from "@/lib/pusher";

export const commentsRouter = createTRPCRouter({
  /**
   * Agregar un comentario a un video
   */
  add: protectedProcedure
    .input(
      z.object({
        videoId: z.string().uuid(),
        texto: z.string().min(1).max(5000),
        parentId: z.string().uuid().optional(), // ID del comentario padre si es una respuesta
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id: userId } = ctx.user;

      // Si es una respuesta, verificar que el comentario padre existe
      if (input.parentId) {
        const [parentComment] = await db
          .select({ id: comments.id, videoId: comments.videoId })
          .from(comments)
          .where(eq(comments.id, input.parentId))
          .limit(1);

        if (!parentComment) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "El comentario al que intentas responder no existe",
          });
        }

        // Verificar que el comentario padre pertenece al mismo video
        if (parentComment.videoId !== input.videoId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "El comentario padre no pertenece a este video",
          });
        }
      }

      const [newComment] = await db
        .insert(comments)
        .values({
          videoId: input.videoId,
          userId,
          texto: input.texto,
          fecha: new Date(),
          parentId: input.parentId || null,
        })
        .returning();

      if (!newComment) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al crear el comentario",
        });
      }

      // Obtener el comentario con información del usuario
      const [commentWithUser] = await db
        .select({
          id: comments.id,
          videoId: comments.videoId,
          userId: comments.userId,
          texto: comments.texto,
          fecha: comments.fecha,
          parentId: comments.parentId,
          createdAt: comments.createdAt,
          updatedAt: comments.updatedAt,
          user: {
            id: users.id,
            name: users.name,
            username: users.username,
            imageUrl: users.imageUrl,
          },
        })
        .from(comments)
        .innerJoin(users, eq(comments.userId, users.id))
        .where(eq(comments.id, newComment.id))
        .limit(1);

      if (!commentWithUser) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al obtener el comentario creado",
        });
      }

      // Emitir evento de Pusher para comentarios en tiempo real
      try {
        await pusherServer.trigger(`video-${input.videoId}`, "new-comment", commentWithUser);
      } catch (pusherError) {
        // Si Pusher no está configurado, continuar sin error (fallback a polling)
        console.warn("Error al emitir evento de Pusher:", pusherError);
      }

      return commentWithUser;
    }),

  /**
   * Listar comentarios de un video (solo comentarios principales, sin respuestas)
   */
  list: baseProcedure
    .input(
      z.object({
        videoId: z.string().uuid(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z
          .object({
            id: z.string().uuid(),
            fecha: z.date(),
          })
          .optional(),
      })
    )
    .query(async ({ input }) => {
      const { videoId, limit, cursor } = input;

      const whereConditions = [
        eq(comments.videoId, videoId),
        sql`${comments.parentId} IS NULL`, // Solo comentarios principales (sin parentId)
        cursor
          ? and(
              sql`(${comments.fecha} < ${cursor.fecha} OR (${comments.fecha} = ${cursor.fecha} AND ${comments.id} < ${cursor.id}))`
            )
          : undefined,
      ].filter(Boolean);

      const results = await db
        .select({
          id: comments.id,
          videoId: comments.videoId,
          userId: comments.userId,
          texto: comments.texto,
          fecha: comments.fecha,
          parentId: comments.parentId,
          createdAt: comments.createdAt,
          updatedAt: comments.updatedAt,
          user: {
            id: users.id,
            name: users.name,
            username: users.username,
            imageUrl: users.imageUrl,
          },
          replyCount: sql<number>`(
            SELECT COUNT(*)::int
            FROM comments replies
            WHERE replies.parent_id = ${comments.id}
          )`,
        })
        .from(comments)
        .innerJoin(users, eq(comments.userId, users.id))
        .where(and(...whereConditions))
        .orderBy(desc(comments.fecha), desc(comments.id))
        .limit(limit + 1);

      const hasMore = results.length > limit;
      const items = hasMore ? results.slice(0, -1) : results;

      const lastItem = items[items.length - 1];
      const nextCursor =
        hasMore && lastItem
          ? { id: lastItem.id, fecha: lastItem.fecha }
          : null;

      return {
        items,
        nextCursor,
      };
    }),

  /**
   * Listar respuestas de un comentario
   */
  getReplies: baseProcedure
    .input(
      z.object({
        parentId: z.string().uuid(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ input }) => {
      const { parentId, limit } = input;

      const results = await db
        .select({
          id: comments.id,
          videoId: comments.videoId,
          userId: comments.userId,
          texto: comments.texto,
          fecha: comments.fecha,
          parentId: comments.parentId,
          createdAt: comments.createdAt,
          updatedAt: comments.updatedAt,
          user: {
            id: users.id,
            name: users.name,
            username: users.username,
            imageUrl: users.imageUrl,
          },
        })
        .from(comments)
        .innerJoin(users, eq(comments.userId, users.id))
        .where(eq(comments.parentId, parentId))
        .orderBy(desc(comments.fecha), desc(comments.id))
        .limit(limit);

      return {
        items: results,
      };
    }),
});

