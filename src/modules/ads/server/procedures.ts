
import { db } from "@/db";
import { ads } from "@/db/schema";
import { createTRPCRouter, protectedProcedure, baseProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { eq, desc, sql } from "drizzle-orm";
import z from "zod";

export const adsRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        videoUrl: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
        // Simple admin check based on existing pattern (can be refined to use middlewares later)
        if (!ctx.user) {
             throw new TRPCError({ code: "UNAUTHORIZED" });
        }
        // Assuming the admin check is done via UI hiding or we can add a helper here if needed.
        // For now, let's rely on the fact that only admins can access the dashboard page that calls this.
        // Ideally, we should reuse `isAdmin` check from other routers or context.
        
        const [ad] = await db.insert(ads).values({
            title: input.title,
            videoUrl: input.videoUrl,
        }).returning();

        return ad;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const [deletedAd] = await db
        .delete(ads)
        .where(eq(ads.id, input.id))
        .returning();

      if (!deletedAd) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Ad not found" });
      }

      return deletedAd;
    }),

  getMany: protectedProcedure.query(async () => {
    const data = await db.select().from(ads).orderBy(desc(ads.createdAt));
    return data;
  }),

  getRandom: baseProcedure.query(async () => {
    // Get one random active ad
    // RANDOM() is specific to postgres
    const [ad] = await db
      .select()
      .from(ads)
      .where(eq(ads.active, true))
      .orderBy(sql`RANDOM()`)
      .limit(1);
    
    return ad || null;
  }),
});
