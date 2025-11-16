import { db } from "@/db";
import { users, videos, channels } from "@/db/schema";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError, UTApi } from "uploadthing/server";
import z from "zod";

const f = createUploadthing();

export const ourFileRouter = {
  thumbnailUploader: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  })
    .input(z.object({ videoId: z.uuid() }))
    .middleware(async ({ input }) => {
      const { userId: clerkUserId } = await auth();

      if (!clerkUserId) throw new UploadThingError("Unauthorized");
      // Id del usuario de Clerk
      const [user] = await db.select().from(users).where(eq(users.clerkId, clerkUserId));
      if (!user) throw new UploadThingError("Unauthorized");

      // Revisar el video
      const [existingVideo] = await db
        .select({
          thumbnailKey: videos.thumbnailKey,
        })
        .from(videos)
        .where(and(eq(videos.id, input.videoId), eq(videos.userId, user.id)));

      if (!existingVideo) throw new UploadThingError("Video not found");

      if (existingVideo.thumbnailKey) {
        const utapi = new UTApi();
        await utapi.deleteFiles(existingVideo.thumbnailKey);

        await db
          .update(videos)
          .set({
            thumbnailUrl: null,
            thumbnailKey: null,
          })
          .where(and(eq(videos.id, input.videoId), eq(videos.userId, user.id)));
      }

      return { user, ...input };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      await db
        .update(videos)
        .set({
          thumbnailUrl: file.ufsUrl,
          thumbnailKey: file.key,
        })
        .where(and(eq(videos.id, metadata.videoId), eq(videos.userId, metadata.user.id)));

      return { uploadedBy: metadata.user.id };
    }),

  channelAvatarUploader: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  })
    .middleware(async () => {
      const { userId: clerkUserId } = await auth();

      if (!clerkUserId) throw new UploadThingError("Unauthorized");

      const [user] = await db.select().from(users).where(eq(users.clerkId, clerkUserId));
      if (!user) throw new UploadThingError("Unauthorized");

      // Verificar que el usuario tenga un canal
      const [channel] = await db
        .select()
        .from(channels)
        .where(eq(channels.userId, user.id))
        .limit(1);

      if (!channel) throw new UploadThingError("Channel not found");

      // Si hay un avatar anterior, eliminarlo
      if (channel.avatarKey) {
        const utapi = new UTApi();
        await utapi.deleteFiles(channel.avatarKey);
      }

      return { user, channel };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      await db
        .update(channels)
        .set({
          avatar: file.ufsUrl,
          avatarKey: file.key,
          updatedAt: new Date(),
        })
        .where(eq(channels.id, metadata.channel.id));

      return { uploadedBy: metadata.user.id };
    }),

  channelBannerUploader: f({
    image: {
      maxFileSize: "8MB",
      maxFileCount: 1,
    },
  })
    .middleware(async () => {
      const { userId: clerkUserId } = await auth();

      if (!clerkUserId) throw new UploadThingError("Unauthorized");

      const [user] = await db.select().from(users).where(eq(users.clerkId, clerkUserId));
      if (!user) throw new UploadThingError("Unauthorized");

      // Verificar que el usuario tenga un canal
      const [channel] = await db
        .select()
        .from(channels)
        .where(eq(channels.userId, user.id))
        .limit(1);

      if (!channel) throw new UploadThingError("Channel not found");

      // Si hay un banner anterior, eliminarlo
      if (channel.bannerKey) {
        const utapi = new UTApi();
        await utapi.deleteFiles(channel.bannerKey);
      }

      return { user, channel };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      await db
        .update(channels)
        .set({
          banner: file.ufsUrl,
          bannerKey: file.key,
          updatedAt: new Date(),
        })
        .where(eq(channels.id, metadata.channel.id));

      return { uploadedBy: metadata.user.id };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
