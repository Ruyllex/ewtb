import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { pusherServer } from "@/lib/pusher";
import { TRPCError } from "@trpc/server";

export const chatRouter = createTRPCRouter({
  sendMessage: protectedProcedure
    .input(
      z.object({
        streamId: z.string().uuid(),
        message: z.string().min(1).max(500),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id: userId, name, imageUrl } = ctx.user;

      try {
        await pusherServer.trigger(`chat-${input.streamId}`, "new-message", {
          id: crypto.randomUUID(),
          userId,
          userName: name,
          userImage: imageUrl,
          message: input.message,
          timestamp: new Date().toISOString(),
        });

        return { success: true };
      } catch (error) {
        console.error("Failed to send message via Pusher", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send message",
        });
      }
    }),
});
