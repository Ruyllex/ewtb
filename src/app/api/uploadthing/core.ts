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
      try {
        // En UploadThing v7, la propiedad es 'url'
        const fileUrl = file.url;
        
        if (!fileUrl) {
          console.error("File URL not found. File object keys:", Object.keys(file));
          throw new UploadThingError("File URL not available");
        }

        await db
          .update(videos)
          .set({
            thumbnailUrl: fileUrl,
            thumbnailKey: file.key,
          })
          .where(and(eq(videos.id, metadata.videoId), eq(videos.userId, metadata.user.id)));

        return { uploadedBy: String(metadata.user.id) };
      } catch (error) {
        console.error("Error updating video thumbnail:", error);
        if (error instanceof UploadThingError) {
          throw error;
        }
        throw new UploadThingError("Failed to update video thumbnail");
      }
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
        try {
          const utapi = new UTApi();
          await utapi.deleteFiles(channel.avatarKey);
        } catch (error) {
          // Si falla la eliminación, continuar de todas formas
          console.error("Error deleting old avatar:", error);
        }
      }

      return { 
        userId: user.id,
        channelId: channel.id
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // UploadThing v7 puede usar 'url' o 'ufsUrl'
      const fileUrl = (file as any).url || (file as any).ufsUrl;
      
      if (!fileUrl) {
        console.error("File URL not found. File object:", JSON.stringify(file, null, 2));
        throw new UploadThingError("File URL not available");
      }

      if (!file.key) {
        console.error("File key not found. File object:", JSON.stringify(file, null, 2));
        throw new UploadThingError("File key not available");
      }

      try {
        await db
          .update(channels)
          .set({
            avatar: fileUrl,
            avatarKey: file.key,
            updatedAt: new Date(),
          })
          .where(eq(channels.id, metadata.channelId));
      } catch (dbError) {
        console.error("Database error updating channel avatar:", dbError);
        throw new UploadThingError("Failed to update channel avatar in database");
      }

      // Devolver un objeto simple y serializable
      return { 
        uploadedBy: String(metadata.userId)
      };
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
        try {
          const utapi = new UTApi();
          await utapi.deleteFiles(channel.bannerKey);
        } catch (error) {
          // Si falla la eliminación, continuar de todas formas
          console.error("Error deleting old banner:", error);
        }
      }

      return { 
        userId: user.id,
        channelId: channel.id
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // UploadThing v7 puede usar 'url' o 'ufsUrl'
      const fileUrl = (file as any).url || (file as any).ufsUrl;
      
      if (!fileUrl) {
        console.error("File URL not found. File object:", JSON.stringify(file, null, 2));
        throw new UploadThingError("File URL not available");
      }

      if (!file.key) {
        console.error("File key not found. File object:", JSON.stringify(file, null, 2));
        throw new UploadThingError("File key not available");
      }

      try {
        await db
          .update(channels)
          .set({
            banner: fileUrl,
            bannerKey: file.key,
            updatedAt: new Date(),
          })
          .where(eq(channels.id, metadata.channelId));
      } catch (dbError) {
        console.error("Database error updating channel banner:", dbError);
        throw new UploadThingError("Failed to update channel banner in database");
      }

      // Devolver un objeto simple y serializable
      return { 
        uploadedBy: String(metadata.userId)
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
