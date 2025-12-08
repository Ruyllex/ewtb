import { db } from "@/db";
import { channels, subscriptions, users, videos, liveStreams, comments, videoLikes, userActions } from "@/db/schema";
import { createTRPCRouter, protectedProcedure, baseProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { and, eq, sql, desc, count, inArray } from "drizzle-orm";
import z from "zod";

/**
 * Verificar si un usuario es admin
 * Primero verifica la columna isAdmin en la base de datos, luego la variable de entorno
 */
/**
 * Verificar si un usuario es admin
 * Primero verifica la columna isAdmin en la base de datos, luego la variable de entorno
 */
async function isUserAdmin(userId: string, clerkUserId: string | null): Promise<boolean> {
  // Primero verificar la columna isAdmin en la base de datos
  const [user] = await db
    .select({ isAdmin: users.isAdmin, clerkId: users.clerkId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  
  // Si el usuario tiene isAdmin = true en la BD, retornar true inmediatamente
  if (user?.isAdmin === true) {
    console.log(`[isUserAdmin] Usuario ${userId} es admin según BD (isAdmin=true)`);
    return true;
  }

  // Si no está marcado como admin en la BD, verificar variable de entorno (retrocompatibilidad)
  // Limpiar espacios y filtrar valores vacíos
  const adminUserIds = process.env.ADMIN_USER_IDS
    ?.split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0) || [];
  
  if (adminUserIds.length === 0) {
    console.log(`[isUserAdmin] No hay ADMIN_USER_IDS configurados`);
    return false;
  }

  // Verificar por ID de usuario (UUID de la BD)
  if (adminUserIds.includes(userId)) {
    console.log(`[isUserAdmin] Usuario ${userId} encontrado en ADMIN_USER_IDS por UUID`);
    return true;
  }

  // Verificar por Clerk ID
  if (clerkUserId && adminUserIds.includes(clerkUserId)) {
    console.log(`[isUserAdmin] Usuario ${clerkUserId} encontrado en ADMIN_USER_IDS por Clerk ID`);
    return true;
  }

  // Si no se encontró por ID, verificar por email (si está en la lista)
  if (clerkUserId) {
    try {
      const { clerkClient } = await import("@clerk/nextjs/server");
      const client = await clerkClient();
      const clerkUser = await client.users.getUser(clerkUserId);
      if (clerkUser?.emailAddresses?.[0]?.emailAddress) {
        const userEmail = clerkUser.emailAddresses[0].emailAddress;
        if (adminUserIds.includes(userEmail)) {
          console.log(`[isUserAdmin] Usuario ${userEmail} encontrado en ADMIN_USER_IDS por email`);
          return true;
        }
      }
    } catch (error) {
      console.error(`[isUserAdmin] Error obteniendo email de Clerk:`, error);
      // Si no se puede obtener el email, continuar sin él
    }
  }

  console.log(`[isUserAdmin] Usuario ${userId} (Clerk: ${clerkUserId}) NO es admin`);
  return false;
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
          canMonetize: user.canMonetize,
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
    // obtener usuario (owner del canal)
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, input.username))
      .limit(1);

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Canal no encontrado" });
    }

    // determinar si el requester es el owner (para visibilidad)
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

    // condiciones (paginación + visibilidad)
    const whereConditions: any[] = [
      eq(videos.userId, user.id),
    ];

    // Si no es el owner, solo mostrar videos públicos
    if (!isOwner) {
      whereConditions.push(eq(videos.visibility, "public"));
    }

    // Agregar condición de cursor para paginación
    if (input.cursor) {
      whereConditions.push(
        sql`(${videos.createdAt} < ${input.cursor.createdAt} OR (${videos.createdAt} = ${input.cursor.createdAt} AND ${videos.id} < ${input.cursor.id}))`
      );
    }

    // SELECT: traemos campos del video + campos del canal y del usuario (para fallback)
    const results = await db
      .select({
        id: videos.id,
        title: videos.title,
        description: videos.description,
        thumbnailUrl: videos.thumbnailUrl,
        previewUrl: videos.previewUrl,
        duration: videos.duration,
        visibility: videos.visibility,
        userId: videos.userId,
        createdAt: videos.createdAt,
        updatedAt: videos.updatedAt,
        // channel fields (pueden ser null si no hay fila en channels)
        channelId: channels.id,
        channelName: channels.name,
        channelAvatar: channels.avatar,
        // username / user fallback (from users table)
        channelUsername: users.username,
        channelUserImageUrl: users.imageUrl,
      })
      .from(videos)
      .innerJoin(users, eq(videos.userId, users.id))
      .leftJoin(channels, eq(channels.userId, users.id))
      .where(and(...whereConditions))
      .orderBy(desc(videos.createdAt), desc(videos.id))
      .limit(input.limit + 1);

    const hasMore = results.length > input.limit;
    const itemsRaw = hasMore ? results.slice(0, -1) : results;

    // Mapear a la forma que espera el frontend: agregar channel object
    const items = itemsRaw.map((r) => {
      return {
        id: r.id,
        title: r.title,
        description: r.description,
        thumbnailUrl: r.thumbnailUrl,
        previewUrl: r.previewUrl,
        duration: r.duration,
        visibility: r.visibility,
        userId: r.userId,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        channel: {
          username: r.channelUsername ?? "", // username from users table
          name: r.channelName ?? r.channelUsername ?? "", // prefer channels.name, fallback to username
          avatarUrl: r.channelAvatar ?? r.channelUserImageUrl ?? null, // prefer channels.avatar, fallback users.imageUrl
        },
      };
    });

    const lastItem = items[items.length - 1];
    const nextCursor =
      hasMore && lastItem ? { id: lastItem.id, createdAt: lastItem.createdAt } : null;

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
        .select({
          id: liveStreams.id,
          title: liveStreams.title,
          description: liveStreams.description,
          playbackUrl: liveStreams.muxPlaybackId,
          status: liveStreams.status,
          createdAt: liveStreams.createdAt,
        })
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
   * Alternar estado de monetización de un usuario (solo admin)
   */
  toggleMonetization: protectedProcedure
    .input(z.object({ channelId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { id: userId } = ctx.user;

      // Verificar si el usuario es admin
      const isAdmin = await isUserAdmin(userId, ctx.clerkUserId || null);

      if (!isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo los administradores pueden cambiar el estado de monetización",
        });
      }

      // Obtener el canal y el usuario asociado
      const [channel] = await db
        .select({
            userId: channels.userId,
            userCanMonetize: users.canMonetize
        })
        .from(channels)
        .innerJoin(users, eq(channels.userId, users.id))
        .where(eq(channels.id, input.channelId))
        .limit(1);

      if (!channel) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Canal no encontrado" });
      }

      // Alternar estado
      const newStatus = !channel.userCanMonetize;

      // Actualizar usuario
      await db
        .update(users)
        .set({
          canMonetize: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(users.id, channel.userId));

      return { canMonetize: newStatus };
    }),

  /**
   * Eliminar un canal (solo admin)
   */
  deleteChannel: protectedProcedure
    .input(z.object({ channelId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { id: userId } = ctx.user;

      // Verificar si el usuario es admin
      const isAdmin = await isUserAdmin(userId, ctx.clerkUserId || null);
      
      if (!isAdmin) {
        throw new Error("No tienes permisos para eliminar canales");
      }

      // Verificar si el canal existe
      const [channel] = await db
        .select()
        .from(channels)
        .where(eq(channels.id, input.channelId))
        .limit(1);

      if (!channel) {
        throw new Error("El canal no existe");
      }

      try {
        // Eliminar en orden para evitar errores de foreign key constraints
        // 1. Eliminar comentarios de los videos del canal
        await db
          .delete(comments)
          .where(inArray(comments.videoId, (
            db.select({ id: videos.id })
              .from(videos)
              .where(eq(videos.userId, channel.userId))
          )));

        // 2. Eliminar likes de los videos del canal
        await db
          .delete(videoLikes)
          .where(inArray(videoLikes.videoId, (
            db.select({ id: videos.id })
              .from(videos)
              .where(eq(videos.userId, channel.userId))
          )));

        // 3. Eliminar videos del canal
        await db
          .delete(videos)
          .where(eq(videos.userId, channel.userId));

        // 4. Eliminar el canal
        await db
          .delete(channels)
          .where(eq(channels.id, input.channelId));

        return { success: true, message: "Canal eliminado exitosamente" };
      } catch (error) {
        console.error("Error al eliminar canal:", error);
        throw new Error("Error al eliminar el canal. Por favor intenta nuevamente.");
      }
    }),

  /**
   * Agregar un strike a un canal (solo admin)
   */
  addChannelStrike: protectedProcedure
    .input(z.object({ 
      channelId: z.string().uuid(),
      reason: z.string().min(1).max(500)
    }))
    .mutation(async ({ ctx, input }) => {
      const { id: userId } = ctx.user;

      // Verificar si el usuario es admin
      const isAdmin = await isUserAdmin(userId, ctx.clerkUserId || null);
      
      if (!isAdmin) {
        throw new Error("No tienes permisos para agregar strikes a canales");
      }

      // Verificar si el canal existe
      const [channel] = await db
        .select()
        .from(channels)
        .where(eq(channels.id, input.channelId))
        .limit(1);

      if (!channel) {
        throw new Error("El canal no existe");
      }

      try {
        // Crear el strike en la tabla userActions
        await db.insert(userActions).values({
          userId: channel.userId, // El strike se asocia al dueño del canal
          actionType: "warning", // Usamos el mismo tipo que para usuarios
          reason: input.reason,
          createdBy: userId, // El admin que está creando el strike
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        return { success: true, message: "Strike agregado exitosamente al canal" };
      } catch (error) {
        console.error("Error al agregar strike al canal:", error);
        throw new Error("Error al agregar strike al canal. Por favor intenta nuevamente.");
      }
    }),

  /**
   * Obtener todos los canales con paginación (solo admin)
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

      console.log(`[getAll] Querying channels... Limit: ${input.limit}`);

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
          userCanMonetize: users.canMonetize,
        })
        .from(channels)
        .innerJoin(users, eq(channels.userId, users.id))
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(desc(channels.createdAt), desc(channels.id))
        .limit(input.limit + 1);

      const hasMore = results.length > input.limit;
      const items = hasMore ? results.slice(0, -1) : results;
      
      console.log(`[getAll] Found ${results.length} raw results. returning ${items.length} items.`);

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

