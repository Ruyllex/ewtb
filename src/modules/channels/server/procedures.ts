import { db } from "@/db";
import { channels, subscriptions, users, videos, liveStreams } from "@/db/schema";
import { createTRPCRouter, protectedProcedure, baseProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { and, eq, sql, desc, count } from "drizzle-orm";
import z from "zod";

/**
 * Verificar si un usuario es admin
 * Primero verifica la columna isAdmin en la base de datos, luego la variable de entorno
 */
async function isUserAdmin(userId: string, clerkUserId: string | null): Promise<boolean> {
  // Primero verificar la columna isAdmin en la base de datos
  const [user] = await db.select({ isAdmin: users.isAdmin }).from(users).where(eq(users.id, userId)).limit(1);
  
  if (user?.isAdmin) {
    return true;
  }

  // Si no está marcado como admin en la BD, verificar variable de entorno (retrocompatibilidad)
  const adminUserIds = process.env.ADMIN_USER_IDS?.split(",").map((id) => id.trim()) || [];
  
  // Verificar por ID de usuario o Clerk ID
  const isAdmin = 
    adminUserIds.includes(userId) || 
    (clerkUserId && adminUserIds.includes(clerkUserId));

  // Si no se encontró por ID, verificar por email (si está en la lista)
  if (!isAdmin && clerkUserId) {
    try {
      const { clerkClient } = await import("@clerk/nextjs/server");
      const clerkUser = await clerkClient.users.getUser(clerkUserId);
      if (clerkUser?.emailAddresses?.[0]?.emailAddress) {
        const userEmail = clerkUser.emailAddresses[0].emailAddress;
        if (adminUserIds.includes(userEmail)) {
          return true;
        }
      }
    } catch {
      // Si no se puede obtener el email, continuar sin él
    }
  }

  return isAdmin;
}

export const channelsRouter = createTRPCRouter({
  /**
   * Obtiene un canal por username
   */
  getByUsername: baseProcedure
    .input(z.object({ username: z.string().min(1) }))
    .query(async ({ input }) => {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, input.username))
        .limit(1);

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Canal no encontrado" });
      }

      const [channel] = await db
        .select()
        .from(channels)
        .where(eq(channels.userId, user.id))
        .limit(1);

      if (!channel) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Canal no encontrado" });
      }

      // Obtener contador de suscriptores
      const [subscriberCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(subscriptions)
        .where(eq(subscriptions.channelId, channel.id));

      // Obtener contador de videos públicos
      const [videoCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(videos)
        .where(and(eq(videos.userId, user.id), eq(videos.visibility, "public")));

      return {
        ...channel,
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          imageUrl: user.imageUrl,
        },
        subscriberCount: Number(subscriberCount?.count || 0),
        videoCount: Number(videoCount?.count || 0),
      };
    }),

  /**
   * Obtiene el canal del usuario actual
   */
  getMyChannel: protectedProcedure.query(async ({ ctx }) => {
    const { id: userId } = ctx.user;

    const [channel] = await db
      .select()
      .from(channels)
      .where(eq(channels.userId, userId))
      .limit(1);

    if (!channel) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Canal no encontrado" });
    }

    // Obtener información del usuario (incluyendo username)
    const [user] = await db
      .select({
        username: users.username,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    // Obtener contador de suscriptores
    const [subscriberCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(subscriptions)
      .where(eq(subscriptions.channelId, channel.id));

    return {
      ...channel,
      username: user?.username || null,
      subscriberCount: Number(subscriberCount?.count || 0),
    };
  }),

  /**
   * Crea o inicializa un canal para el usuario actual
   */
  createOrGet: protectedProcedure.mutation(async ({ ctx }) => {
    const { id: userId } = ctx.user;

    // Verificar si ya existe un canal
    const [existingChannel] = await db
      .select()
      .from(channels)
      .where(eq(channels.userId, userId))
      .limit(1);

    if (existingChannel) {
      return existingChannel;
    }

    // Obtener información del usuario
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Usuario no encontrado" });
    }

    // Generar username si no existe
    let username = user.username;
    if (!username) {
      // Generar username basado en el nombre
      const baseUsername = user.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .substring(0, 20);
      username = baseUsername || `user${user.id.substring(0, 8)}`;

      // Verificar que el username sea único
      let finalUsername = username;
      let counter = 1;
      while (true) {
        const [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.username, finalUsername))
          .limit(1);

        if (!existingUser) {
          break;
        }
        finalUsername = `${username}${counter}`;
        counter++;
      }

      // Actualizar el username del usuario
      await db
        .update(users)
        .set({ username: finalUsername })
        .where(eq(users.id, userId));

      username = finalUsername;
    }

    // Crear el canal
    const [newChannel] = await db
      .insert(channels)
      .values({
        userId,
        name: user.name,
        description: null,
        avatar: user.imageUrl,
        banner: null,
        isVerified: false,
      })
      .returning();

    return newChannel;
  }),

  /**
   * Actualiza la información del canal
   */
  update: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(5000).optional(),
        username: z.string().min(3).max(30).regex(/^[a-z0-9_]+$/).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id: userId } = ctx.user;

      const [channel] = await db
        .select()
        .from(channels)
        .where(eq(channels.userId, userId))
        .limit(1);

      if (!channel) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Canal no encontrado" });
      }

      const updateData: {
        name?: string;
        description?: string | null;
        updatedAt: Date;
      } = {
        updatedAt: new Date(),
      };

      if (input.name) {
        updateData.name = input.name;
      }

      if (input.description !== undefined) {
        updateData.description = input.description || null;
      }

      // Actualizar username si se proporciona
      if (input.username) {
        // Verificar que el username no esté en uso
        const [existingUser] = await db
          .select()
          .from(users)
          .where(and(eq(users.username, input.username), sql`${users.id} != ${userId}`))
          .limit(1);

        if (existingUser) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Este username ya está en uso",
          });
        }

        await db
          .update(users)
          .set({ 
            username: input.username,
            updatedAt: new Date()
          })
          .where(eq(users.id, userId));
      }

      const [updatedChannel] = await db
        .update(channels)
        .set(updateData)
        .where(eq(channels.id, channel.id))
        .returning();

      return updatedChannel;
    }),

  /**
   * Suscribirse o desuscribirse de un canal
   */
  toggleSubscription: protectedProcedure
    .input(z.object({ channelId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { id: userId } = ctx.user;

      // Verificar que el canal existe
      const [channel] = await db
        .select()
        .from(channels)
        .where(eq(channels.id, input.channelId))
        .limit(1);

      if (!channel) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Canal no encontrado" });
      }

      // No permitir suscribirse a tu propio canal
      if (channel.userId === userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No puedes suscribirte a tu propio canal",
        });
      }

      // Verificar si ya está suscrito
      const [existingSubscription] = await db
        .select()
        .from(subscriptions)
        .where(and(eq(subscriptions.subscriberId, userId), eq(subscriptions.channelId, input.channelId)))
        .limit(1);

      if (existingSubscription) {
        // Desuscribirse
        await db
          .delete(subscriptions)
          .where(and(eq(subscriptions.subscriberId, userId), eq(subscriptions.channelId, input.channelId)));

        return { subscribed: false };
      } else {
        // Suscribirse
        await db.insert(subscriptions).values({
          subscriberId: userId,
          channelId: input.channelId,
        });

        return { subscribed: true };
      }
    }),

  /**
   * Verifica si el usuario actual está suscrito a un canal
   */
  isSubscribed: protectedProcedure
    .input(z.object({ channelId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { id: userId } = ctx.user;

      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(and(eq(subscriptions.subscriberId, userId), eq(subscriptions.channelId, input.channelId)))
        .limit(1);

      return { subscribed: !!subscription };
    }),

  /**
   * Obtiene los videos de un canal
   * Si el usuario actual es el dueño del canal, muestra todos los videos (públicos, privados, etc.)
   * Si es otro usuario, solo muestra los videos públicos
   */
  getVideos: baseProcedure
    .input(
      z.object({
        username: z.string().min(1),
        limit: z.number().min(1).max(50).default(20),
        cursor: z
          .object({
            id: z.string().uuid(),
            createdAt: z.date(),
          })
          .optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, input.username))
        .limit(1);

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Canal no encontrado" });
      }

      // Verificar si el usuario actual es el dueño del canal
      let isOwner = false;
      if (ctx.clerkUserId) {
        const [currentUser] = await db
          .select()
          .from(users)
          .where(eq(users.clerkId, ctx.clerkUserId))
          .limit(1);
        
        if (currentUser && currentUser.id === user.id) {
          isOwner = true;
        }
      }

      // Si es el dueño, mostrar todos los videos; si no, solo públicos
      // Todos los usuarios (incluido el dueño) ven todos los videos públicos del canal
      const whereConditions = [
        eq(videos.userId, user.id),
        // Si no es el dueño, solo mostrar públicos; si es el dueño, mostrar todos
        !isOwner ? eq(videos.visibility, "public") : undefined,
        input.cursor
          ? sql`(${videos.createdAt} < ${input.cursor.createdAt} OR (${videos.createdAt} = ${input.cursor.createdAt} AND ${videos.id} < ${input.cursor.id}))`
          : undefined,
      ].filter(Boolean);

      const results = await db
        .select()
        .from(videos)
        .where(and(...whereConditions))
        .orderBy(desc(videos.createdAt), desc(videos.id))
        .limit(input.limit + 1);

      const hasMore = results.length > input.limit;
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
   * Obtiene los streams activos de un canal
   */
  getLiveStreams: baseProcedure
    .input(
      z.object({
        username: z.string().min(1),
      })
    )
    .query(async ({ input }) => {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, input.username))
        .limit(1);

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Canal no encontrado" });
      }

      const streams = await db
        .select()
        .from(liveStreams)
        .where(and(eq(liveStreams.userId, user.id), eq(liveStreams.status, "active")))
        .orderBy(desc(liveStreams.createdAt));

      return streams;
    }),

  /**
   * Verificar un canal (solo admin)
   */
  verifyChannel: protectedProcedure
    .input(z.object({ channelId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { id: userId } = ctx.user;

      // Verificar si el usuario es admin
      const isAdmin = await isUserAdmin(userId, ctx.clerkUserId || null);

      if (!isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo los administradores pueden verificar canales",
        });
      }

      // Verificar que el canal existe
      const [channel] = await db
        .select()
        .from(channels)
        .where(eq(channels.id, input.channelId))
        .limit(1);

      if (!channel) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Canal no encontrado" });
      }

      // Actualizar el canal a verificado
      const [updatedChannel] = await db
        .update(channels)
        .set({
          isVerified: true,
          updatedAt: new Date(),
        })
        .where(eq(channels.id, input.channelId))
        .returning();

      return updatedChannel;
    }),

  /**
   * Desverificar un canal (solo admin)
   */
  unverifyChannel: protectedProcedure
    .input(z.object({ channelId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { id: userId } = ctx.user;

      // Verificar si el usuario es admin
      const isAdmin = await isUserAdmin(userId, ctx.clerkUserId || null);

      if (!isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo los administradores pueden desverificar canales",
        });
      }

      // Verificar que el canal existe
      const [channel] = await db
        .select()
        .from(channels)
        .where(eq(channels.id, input.channelId))
        .limit(1);

      if (!channel) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Canal no encontrado" });
      }

      // Actualizar el canal a no verificado
      const [updatedChannel] = await db
        .update(channels)
        .set({
          isVerified: false,
          updatedAt: new Date(),
        })
        .where(eq(channels.id, input.channelId))
        .returning();

      return updatedChannel;
    }),

  /**
   * Obtiene todos los canales (solo admin) - Para dashboard administrativo
   */
  getAll: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
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

      // Verificar si el usuario es admin
      const isAdmin = await isUserAdmin(userId, ctx.clerkUserId || null);

      if (!isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo los administradores pueden acceder a esta información",
        });
      }

      const whereConditions = [
        input.cursor
          ? sql`(${channels.createdAt} < ${input.cursor.createdAt} OR (${channels.createdAt} = ${input.cursor.createdAt} AND ${channels.id} < ${input.cursor.id}))`
          : undefined,
      ].filter(Boolean);

      const results = await db
        .select({
          id: channels.id,
          name: channels.name,
          description: channels.description,
          avatar: channels.avatar,
          banner: channels.banner,
          isVerified: channels.isVerified,
          createdAt: channels.createdAt,
          updatedAt: channels.updatedAt,
          userId: channels.userId,
          userName: users.name,
          userUsername: users.username,
          userImageUrl: users.imageUrl,
        })
        .from(channels)
        .innerJoin(users, eq(channels.userId, users.id))
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(desc(channels.createdAt), desc(channels.id))
        .limit(input.limit + 1);

      const hasMore = results.length > input.limit;
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

