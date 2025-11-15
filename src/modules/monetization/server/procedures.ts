import { db } from "@/db";
import { users, transactions, balances, payouts, videos } from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import z from "zod";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-12-18.acacia",
});

// Requisitos para monetización
const MIN_AGE_YEARS = 18;
const MIN_VIDEOS = 5; // Mínimo de videos publicados

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

export const monetizationRouter = createTRPCRouter({
  /**
   * Obtiene el estado de la cuenta de Stripe Connect
   */
  getConnectStatus: protectedProcedure.query(async ({ ctx }) => {
    const { id: userId } = ctx.user;

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Usuario no encontrado" });
    }

    let accountStatus = null;
    if (user.stripeAccountId) {
      try {
        const account = await stripe.accounts.retrieve(user.stripeAccountId);
        accountStatus = {
          id: account.id,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted,
          status: account.charges_enabled && account.payouts_enabled ? "active" : "pending",
        };
      } catch (error) {
        console.error("Error obteniendo cuenta de Stripe:", error);
      }
    }

    // Verificar requisitos de monetización
    const monetizationCheck = await canUserMonetize(userId);

    return {
      connected: !!user.stripeAccountId,
      accountStatus,
      canMonetize: user.canMonetize,
      monetizationCheck,
    };
  }),

  /**
   * Crea un link de onboarding para Stripe Connect
   */
  createConnectLink: protectedProcedure.mutation(async ({ ctx }) => {
    const { id: userId } = ctx.user;

    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/stripe/connect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.error || "Error creando link de conexión" });
    }

    const data = await response.json();
    return { url: data.url };
  }),

  /**
   * Verifica y habilita la monetización si se cumplen los requisitos
   */
  verifyMonetization: protectedProcedure.mutation(async ({ ctx }) => {
    const { id: userId } = ctx.user;

    const check = await canUserMonetize(userId);

    if (check.can) {
      await db
        .update(users)
        .set({
          canMonetize: true,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    }

    return check;
  }),

  /**
   * Obtiene las ganancias del usuario
   */
  getEarnings: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const { id: userId } = ctx.user;

      // Obtener balance
      const [balance] = await db.select().from(balances).where(eq(balances.userId, userId)).limit(1);

      // Obtener transacciones
      const whereConditions = [eq(transactions.userId, userId)];
      if (input.startDate) {
        whereConditions.push(gte(transactions.createdAt, input.startDate));
      }
      if (input.endDate) {
        whereConditions.push(sql`${transactions.createdAt} <= ${input.endDate}`);
      }

      const transactionsList = await db
        .select({
          id: transactions.id,
          type: transactions.type,
          status: transactions.status,
          amount: transactions.amount,
          currency: transactions.currency,
          description: transactions.description,
          createdAt: transactions.createdAt,
          video: {
            id: videos.id,
            title: videos.title,
            thumbnailUrl: videos.thumbnailUrl,
          },
        })
        .from(transactions)
        .leftJoin(videos, eq(transactions.videoId, videos.id))
        .where(and(...whereConditions))
        .orderBy(desc(transactions.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      // Calcular estadísticas
      const stats = await db
        .select({
          totalEarned: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.status} = 'completed' THEN ${transactions.amount}::numeric ELSE 0 END), 0)`,
          totalTips: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'tip' AND ${transactions.status} = 'completed' THEN ${transactions.amount}::numeric ELSE 0 END), 0)`,
          totalSubscriptions: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'subscription' AND ${transactions.status} = 'completed' THEN ${transactions.amount}::numeric ELSE 0 END), 0)`,
          pendingAmount: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.status} = 'pending' THEN ${transactions.amount}::numeric ELSE 0 END), 0)`,
        })
        .from(transactions)
        .where(eq(transactions.userId, userId));

      return {
        balance: balance || {
          availableBalance: "0",
          pendingBalance: "0",
          totalEarned: "0",
          currency: "usd",
        },
        transactions: transactionsList,
        stats: {
          totalEarned: Number(stats[0]?.totalEarned || 0),
          totalTips: Number(stats[0]?.totalTips || 0),
          totalSubscriptions: Number(stats[0]?.totalSubscriptions || 0),
          pendingAmount: Number(stats[0]?.pendingAmount || 0),
        },
      };
    }),

  /**
   * Crea un payout (retiro)
   */
  createPayout: protectedProcedure
    .input(
      z.object({
        amount: z.number().positive().min(1), // Monto en dólares
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id: userId } = ctx.user;

      // Obtener balance
      const [balance] = await db.select().from(balances).where(eq(balances.userId, userId)).limit(1);

      if (!balance) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Balance no encontrado" });
      }

      const availableBalance = parseFloat(balance.availableBalance);

      if (input.amount > availableBalance) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Saldo insuficiente. Disponible: $${availableBalance.toFixed(2)}`,
        });
      }

      // Obtener usuario y cuenta de Stripe
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

      if (!user || !user.stripeAccountId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cuenta de Stripe Connect no vinculada" });
      }

      // Crear transfer a la cuenta del creador
      const amountInCents = Math.round(input.amount * 100);

      try {
        const transfer = await stripe.transfers.create({
          amount: amountInCents,
          currency: "usd",
          destination: user.stripeAccountId,
          metadata: {
            userId: userId,
            type: "payout",
          },
        });

        // Crear payout en la base de datos
        const [payout] = await db
          .insert(payouts)
          .values({
            userId: userId,
            amount: input.amount.toFixed(2),
            currency: "usd",
            status: "pending",
            stripeTransferId: transfer.id,
          })
          .returning();

        // Actualizar balance
        await db
          .update(balances)
          .set({
            availableBalance: (availableBalance - input.amount).toFixed(2),
            pendingBalance: (parseFloat(balance.pendingBalance) + input.amount).toFixed(2),
            lastPayoutAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(balances.id, balance.id));

        return payout;
      } catch (error) {
        console.error("Error creando payout:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Error creando payout",
        });
      }
    }),

  /**
   * Obtiene los payouts del usuario
   */
  getPayouts: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const { id: userId } = ctx.user;

      const payoutsList = await db
        .select()
        .from(payouts)
        .where(eq(payouts.userId, userId))
        .orderBy(desc(payouts.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return payoutsList;
    }),
});

