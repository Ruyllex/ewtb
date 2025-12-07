import { db } from "@/db";
import { channelMembershipOffers, memberships, membershipTiers, users, channels } from "@/db/schema";
import { createTRPCRouter, protectedProcedure, baseProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { and, eq, desc } from "drizzle-orm";
import { z } from "zod";
import { createPayPalOrder, capturePayPalOrder } from "@/lib/paypal";

export const membershipsRouter = createTRPCRouter({
  getTiers: baseProcedure.query(async () => {
    console.log("Fetching tiers...");
    const tiers = await db.select().from(membershipTiers).orderBy(membershipTiers.level);
    console.log("Tiers fetched:", tiers.length);
    return tiers;
  }),

  getOffers: baseProcedure
    .input(z.object({ channelId: z.string().uuid() })) // channelId here refers to the user_id of the creator (as per schema)
    .query(async ({ input }) => {
      const offers = await db
        .select()
        .from(channelMembershipOffers)
        .where(eq(channelMembershipOffers.userId, input.channelId))
        .orderBy(channelMembershipOffers.level);
      return offers;
    }),

  getMyOffers: protectedProcedure
    .query(async ({ ctx }) => {
        const { id: userId } = ctx.user;
        const offers = await db
            .select()
            .from(channelMembershipOffers)
            .where(eq(channelMembershipOffers.userId, userId))
            .orderBy(channelMembershipOffers.level);
        return offers;
    }),

  upsertOffer: protectedProcedure
    .input(
      z.object({
        level: z.number().int(),
        benefits: z.array(z.string()),
        price: z.number().min(0).optional(),
        title: z.string().optional(), // Custom title
        description: z.string().optional(), // Custom description
        videoUrl: z.string().optional(), // Welcome video URL
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id: userId } = ctx.user;

      // Check if channel exists for this user (they must be a creator)
      const [channel] = await db
        .select()
        .from(channels)
        .where(eq(channels.userId, userId))
        .limit(1);

      if (!channel) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You must have a channel to offer memberships." });
      }

      // Check if this level exists in system tiers
      const [tier] = await db
        .select()
        .from(membershipTiers)
        .where(eq(membershipTiers.level, input.level))
        .limit(1);

      if (!tier) {
         throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid membership level." });
      }

      // Upsert the offer
      const [offer] = await db
        .insert(channelMembershipOffers)
        .values({
            userId,
            level: input.level,
            benefits: input.benefits,
            price: input.price ? input.price.toString() : tier.price.toString(),
            title: input.title,
            description: input.description,
            videoUrl: input.videoUrl,
        })
        .onConflictDoUpdate({
            target: [channelMembershipOffers.userId, channelMembershipOffers.level],
            set: {
                benefits: input.benefits,
                price: input.price ? input.price.toString() : tier.price.toString(),
                title: input.title,
                description: input.description,
                videoUrl: input.videoUrl,
                updatedAt: new Date(),
            }
        })
        .returning();

        return offer;
    }),

    join: protectedProcedure
        .input(z.object({ channelId: z.string().uuid(), level: z.number().int() }))
        .mutation(async ({ ctx, input }) => {
            const { id: userId } = ctx.user;

            // Cannot join own channel
            if (userId === input.channelId) {
                throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot join your own channel." });
            }

            // Verify offer exists
            const [offer] = await db
                .select()
                .from(channelMembershipOffers)
                .where(and(eq(channelMembershipOffers.userId, input.channelId), eq(channelMembershipOffers.level, input.level)))
                .limit(1);
            
            if (!offer) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Membership offer not found." });
            }

            // Create PayPal Order
            const { id: orderId, links } = await createPayPalOrder({
                amount: offer.price || "0",
                description: `Membership - ${offer.title || `Level ${offer.level}`} for channel ${input.channelId}`,
                customId: `${userId}|${input.channelId}|${input.level}`, // Store metadata to verify later
                returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
                cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/channel/${input.channelId}`, // Redirect back to channel on cancel (approximate)
            });

            const approvalLink = links.find(link => link.rel === "approve")?.href;

            if (!approvalLink) {
                 throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to generate PayPal payment link" });
            }

            return { url: approvalLink };
        }),
    
    finalizeMembership: protectedProcedure
        .input(z.object({ orderId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const { id: userId } = ctx.user;
            
            // Capture Order
            // Note: In production we should verify the order details (amount, customId) match expectations
            // The customId contains userId|channelId|level
            const orderData = await capturePayPalOrder(input.orderId);
            
            const purchaseUnit = orderData.purchase_units?.[0];
            const customId = purchaseUnit?.custom_id;
            
            if (!customId) {
                 throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid order data: missing custom_id" });
            }
            
            const [orderUserId, channelId, levelStr] = customId.split("|");
            
            if (orderUserId !== userId) {
                 throw new TRPCError({ code: "FORBIDDEN", message: "Order does not belong to this user" });
            }
            
            const level = parseInt(levelStr, 10);
            
            // Upsert membership
            // We use upsert to handle upgrades or re-subscriptions
            await db
                .insert(memberships)
                .values({
                    userId,
                    channelId,
                    level,
                    status: "active",
                    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
                })
                .onConflictDoUpdate({
                    target: [memberships.userId, memberships.channelId],
                    set: {
                        level,
                        status: "active",
                        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                        updatedAt: new Date(),
                    }
                });
                
            return { success: true };
        }),

    getMembership: protectedProcedure
        .input(z.object({ channelId: z.string().uuid() }))
        .query(async ({ ctx, input }) => {
            const { id: userId } = ctx.user;
            
            const [membership] = await db
                .select()
                .from(memberships)
                .where(
                    and(
                        eq(memberships.userId, userId), 
                        eq(memberships.channelId, input.channelId),
                        eq(memberships.status, "active") // Check active status
                    )
                )
                .limit(1);
            
            return membership || null;
        })
});
