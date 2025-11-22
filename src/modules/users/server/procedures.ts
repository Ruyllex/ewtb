import { db } from "@/db";
import { users, videos } from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { eq, and, sql } from "drizzle-orm";
import z from "zod";

// Requisitos para monetización
const MIN_AGE_YEARS = 18;
const MIN_VIDEOS = 5;

/**
 * Verifica si un usuario puede monetizar
 */
async function canUserMonetize(userId: string): Promise<{ can: boolean; reasons: string[] }> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  if (!user) {
    return { can: false, reasons: ["Usuario no encontrado"] };
  }

  const reasons: string[] = [];

  // Verificar edad mínima
  if (!user.dateOfBirth) {
    reasons.push("Fecha de nacimiento no registrada");
  } else {
    const age = new Date().getFullYear() - new Date(user.dateOfBirth).getFullYear();
    if (age < MIN_AGE_YEARS) {
      reasons.push(`Debes tener al menos ${MIN_AGE_YEARS} años`);
    }
  }

  // Verificar cuenta de PayPal
  if (!user.paypalAccountId) {
    reasons.push("Cuenta de PayPal no vinculada");
  } else if (user.paypalAccountStatus !== "active") {
    reasons.push("Cuenta de PayPal no activa");
  }

  // Verificar contenido mínimo
  const videoCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(videos)
    .where(and(eq(videos.userId, userId), eq(videos.visibility, "public")));

  const count = Number(videoCount[0]?.count || 0);
  if (count < MIN_VIDEOS) {
    reasons.push(`Necesitas al menos ${MIN_VIDEOS} videos públicos`);
  }

  return {
    can: reasons.length === 0,
    reasons,
  };
}

/**
 * Verificar si un usuario es admin (helper function)
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

export const usersRouter = createTRPCRouter({
  /**
   * Verifica si el usuario actual es administrador
   */
  isAdmin: protectedProcedure.query(async ({ ctx }) => {
    const { id: userId } = ctx.user;
    try {
      console.log(`[isAdmin] Verificando admin para usuario: ${userId}, Clerk ID: ${ctx.clerkUserId}`);
      const result = await isUserAdmin(userId, ctx.clerkUserId || null);
      console.log(`[isAdmin] Resultado: ${result}`);
      return result;
    } catch (error) {
      console.error("[isAdmin] Error checking admin status:", error);
      return false;
    }
  }),

  /**
   * Obtiene el perfil del usuario actual
   */
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const { id: userId } = ctx.user;

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Usuario no encontrado" });
    }

    return {
      id: user.id,
      name: user.name,
      imageUrl: user.imageUrl,
      dateOfBirth: user.dateOfBirth,
      canMonetize: user.canMonetize,
      paypalAccountId: user.paypalAccountId,
      paypalAccountStatus: user.paypalAccountStatus,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }),

  /**
   * Actualiza la fecha de nacimiento del usuario
   */
  updateDateOfBirth: protectedProcedure
    .input(
      z.object({
        dateOfBirth: z.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id: userId } = ctx.user;

      // Verificar que el usuario tenga al menos 18 años
      const today = new Date();
      const eighteenYearsAgo = new Date();
      eighteenYearsAgo.setFullYear(today.getFullYear() - 18);

      if (input.dateOfBirth > eighteenYearsAgo) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Debes tener al menos 18 años para usar esta plataforma",
        });
      }

      const [updatedUser] = await db
        .update(users)
        .set({
          dateOfBirth: input.dateOfBirth,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Usuario no encontrado" });
      }

      // Verificar si ahora puede monetizar y actualizar el flag
      const monetizationCheck = await canUserMonetize(userId);
      if (updatedUser.canMonetize !== monetizationCheck.can) {
        await db
          .update(users)
          .set({
            canMonetize: monetizationCheck.can,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));
      }

      return {
        dateOfBirth: updatedUser.dateOfBirth,
        canMonetize: monetizationCheck.can,
      };
    }),

  /**
   * Actualiza el perfil del usuario
   */
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).optional(),
        dateOfBirth: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id: userId } = ctx.user;

      const updateData: { name?: string; dateOfBirth?: Date; updatedAt: Date } = {
        updatedAt: new Date(),
      };

      if (input.name) {
        updateData.name = input.name;
      }

      if (input.dateOfBirth) {
        // Verificar que el usuario tenga al menos 18 años
        const today = new Date();
        const eighteenYearsAgo = new Date();
        eighteenYearsAgo.setFullYear(today.getFullYear() - 18);

        if (input.dateOfBirth > eighteenYearsAgo) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Debes tener al menos 18 años para usar esta plataforma",
          });
        }

        updateData.dateOfBirth = input.dateOfBirth;
      }

      const [updatedUser] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Usuario no encontrado" });
      }

      return {
        id: updatedUser.id,
        name: updatedUser.name,
        dateOfBirth: updatedUser.dateOfBirth,
        updatedAt: updatedUser.updatedAt,
      };
    }),
});

