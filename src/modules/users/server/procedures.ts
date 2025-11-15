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

  // Verificar cuenta de Stripe
  if (!user.stripeAccountId) {
    reasons.push("Cuenta de Stripe Connect no vinculada");
  } else if (user.stripeAccountStatus !== "active") {
    reasons.push("Cuenta de Stripe Connect no activa");
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

export const usersRouter = createTRPCRouter({
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
      stripeAccountId: user.stripeAccountId,
      stripeAccountStatus: user.stripeAccountStatus,
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

