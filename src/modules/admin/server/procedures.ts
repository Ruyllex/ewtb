import { db } from "@/db";
import { users, userActions, notifications, videos, comments, channels } from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { eq, like, or, sql } from "drizzle-orm";
import z from "zod";

/**
 * Verificar si un usuario es admin (helper function)
 * Mismo helper que en users/server/procedures.ts
 */
async function isUserAdmin(userId: string, clerkUserId: string | null): Promise<boolean> {
  const [user] = await db
    .select({ isAdmin: users.isAdmin })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  
  if (user?.isAdmin === true) return true;

  const adminUserIds = process.env.ADMIN_USER_IDS
    ?.split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0) || [];
  
  if (adminUserIds.length === 0) return false;
  if (adminUserIds.includes(userId)) return true;
  if (clerkUserId && adminUserIds.includes(clerkUserId)) return true;

  // Verificación por email omitida para simplificar, ya que requiere request extra a Clerk
  
  return false;
}

// Middleware para verificar admin
const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const isAdmin = await isUserAdmin(ctx.user.id, ctx.clerkUserId);
  if (!isAdmin) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Requiere permisos de administrador" });
  }
  return next({ ctx });
});

export const adminRouter = createTRPCRouter({
  /**
   * Obtener lista de usuarios con paginación y búsqueda
   */
  getUsers: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().nullish(), // Cursor para paginación (ID del último usuario)
        search: z.string().optional(), // Búsqueda por nombre o username
      })
    )
    .query(async ({ input }) => {
      const { limit, cursor, search } = input;

      const whereClause = search
        ? or(
            like(users.name, `%${search}%`),
            like(users.username, `%${search}%`),
            like(users.clerkId, `%${search}%`)
          )
        : undefined;

      // TODO: Implementar paginación real con cursor. Por ahora simple limit/search
      // Para paginación correcta con cursor, necesitaríamos comparar fechas o IDs ordenados
      
      const items = await db.query.users.findMany({
        where: whereClause,
        limit: limit + 1,
        orderBy: (users, { desc }) => [desc(users.createdAt)],
        with: {
          channel: true, // Incluir info del canal si existe
        }
      });

      let nextCursor: typeof cursor | undefined = undefined;
      if (items.length > limit) {
        const nextItem = items.pop();
        nextCursor = nextItem!.id;
      }

      return {
        items,
        nextCursor,
      };
    }),

  /**
   * Agregar un strike (advertencia) a un usuario
   */
  addStrike: adminProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        reason: z.string().min(3),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { userId, reason } = input;
      const adminId = ctx.user.id;

      // 1. Crear registro en userActions
      const [action] = await db
        .insert(userActions)
        .values({
          userId,
          actionType: "warning",
          reason,
          createdBy: adminId,
          isActive: true,
        })
        .returning();

      // 2. Crear notificación para el usuario
      await db.insert(notifications).values({
        userId,
        type: "warning_received",
        title: "Has recibido una advertencia",
        message: `Has recibido un strike por el siguiente motivo: ${reason}. Por favor revisa nuestras normas de comunidad.`,
        relatedUserId: adminId, // El admin que envió el strike (opcional mostrarlo)
        read: false,
      });

      return { success: true, actionId: action.id };
    }),

  /**
   * Eliminar un usuario (Hard Delete)
   */
  deleteUser: adminProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { userId } = input;
      
      // Verificar que el usuario a borrar no sea una self-deletion accidental o borrar otro admin (opcional)
      if (userId === ctx.user.id) {
         throw new TRPCError({ code: "BAD_REQUEST", message: "No puedes borrar tu propia cuenta desde aquí" });
      }

      // Hard Delete: El cascade en la BD debería encargarse de las relaciones,
      // pero el delete en `users` es la clave.
      
      const [deletedUser] = await db
        .delete(users)
        .where(eq(users.id, userId))
        .returning();

      if (!deletedUser) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Usuario no encontrado" });
      }
      
      // Opcional: Llamar a Clerk para borrar usuario de autenticación también?
      // Esto requeriría Clerk Backend SDK permission. Por ahora solo DB.

      return { success: true, deletedUserId: deletedUser.id };
    }),
});
