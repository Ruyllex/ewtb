import { db } from "@/db";
import { videoLikes, users, videos } from "@/db/schema";
import { createTRPCRouter, protectedProcedure, baseProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { and, eq, sql } from "drizzle-orm";
import z from "zod";

export const likesRouter = createTRPCRouter({
  // Toggle like (protected)
  toggle: protectedProcedure
    .input(z.object({ videoId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      try {
        // Check if like exists
        const existing = await db
          .select()
          .from(videoLikes)
          .where(and(eq(videoLikes.videoId, input.videoId), eq(videoLikes.userId, userId)))
          .limit(1);

        if (existing.length > 0) {
          // Remove like
          await db
            .delete(videoLikes)
            .where(and(eq(videoLikes.videoId, input.videoId), eq(videoLikes.userId, userId)));

          // Decrement like count
          await db
            .update(videos)
            .set({ likes: sql<number>`GREATEST(${videos.likes} - 1, 0)` })
            .where(eq(videos.id, input.videoId));

          return { liked: false };
        } else {
          // Add like
          await db.insert(videoLikes).values({
            videoId: input.videoId,
            userId,
          });

          // Increment like count
          await db
            .update(videos)
            .set({ likes: sql<number>`${videos.likes} + 1` })
            .where(eq(videos.id, input.videoId));

          return { liked: true };
        }
      } catch (error) {
        console.error("Error toggling like:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to toggle like",
        });
      }
    }),

  // ¿Lo marcó el usuario actual? (puede ser anónimo -> false)
  isLikedByMe: baseProcedure
    .input(z.object({ videoId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Si no está autenticado devuelvo false
      if (!ctx.clerkUserId) return { liked: false };

      // Resolver userId a partir de clerkId
      const [user] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.clerkId, ctx.clerkUserId))
        .limit(1);

      if (!user) return { liked: false };

      const [like] = await db
        .select()
        .from(videoLikes)
        .where(and(eq(videoLikes.videoId, input.videoId), eq(videoLikes.userId, user.id)))
        .limit(1);

      return { liked: !!like };
    }),

  // Contador total de likes
  getCount: baseProcedure
    .input(z.object({ videoId: z.string().uuid() }))
    .query(async ({ input }) => {
      const [res] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(videoLikes)
        .where(eq(videoLikes.videoId, input.videoId));
      return { count: res?.count ?? 0 };
    }),
});
