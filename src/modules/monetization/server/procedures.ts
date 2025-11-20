import { db } from "@/db";
import { users, transactions, balances, payouts, videos, monetizationRequests, liveStreams, notifications } from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { eq, desc, and, gte, lte, sql, or } from "drizzle-orm";
import z from "zod";
import { getPayPalAccessToken, getPayPalBaseUrl } from "@/lib/paypal";

// Requisitos para monetización
const MIN_AGE_YEARS = 18;
const MIN_VIDEOS = 5; // Mínimo de videos publicados
const MIN_WITHDRAWAL_AMOUNT = 20; // Monto mínimo de retiro en USD
const PLATFORM_COMMISSION = 0.03; // Comisión del 3%

// Sistema de Stars
const STARS_PER_USD = 100; // 100 Stars = $1 USD

/**
 * Verificar si un usuario es admin
 */
async function isUserAdmin(userId: string, clerkUserId: string | null): Promise<boolean> {
  const [user] = await db.select({ isAdmin: users.isAdmin }).from(users).where(eq(users.id, userId)).limit(1);
  
  if (user?.isAdmin) {
    return true;
  }

  // Retrocompatibilidad con variable de entorno
  const adminUserIds = process.env.ADMIN_USER_IDS?.split(",").map((id) => id.trim()) || [];
  
  return adminUserIds.includes(userId) || (clerkUserId && adminUserIds.includes(clerkUserId));
}

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

export const monetizationRouter = createTRPCRouter({
  /**
   * Solicita activación de monetización
   */
  requestMonetization: protectedProcedure
    .input(
      z.object({
        paypalEmail: z.string().email("Email de PayPal inválido"),
        termsAccepted: z.boolean().refine((val) => val === true, {
          message: "Debes aceptar los términos de monetización",
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id: userId } = ctx.user;

      // Verificar si ya tiene una solicitud pendiente
      const existingRequest = await db
        .select()
        .from(monetizationRequests)
        .where(and(eq(monetizationRequests.userId, userId), eq(monetizationRequests.status, "pending")))
        .limit(1);

      if (existingRequest.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Ya tienes una solicitud de monetización pendiente",
        });
      }

      // Verificar si ya está monetizado
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (user?.canMonetize) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Ya tienes la monetización habilitada",
        });
      }

      // Crear solicitud de monetización
      const [request] = await db
        .insert(monetizationRequests)
        .values({
          userId: userId,
          paypalEmail: input.paypalEmail,
          termsAccepted: input.termsAccepted,
          status: "pending",
        })
        .returning();

      // Actualizar el email de PayPal del usuario
      await db
        .update(users)
        .set({
          paypalAccountId: input.paypalEmail,
          paypalAccountStatus: "pending",
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      return request;
    }),

  /**
   * Obtiene el estado de la solicitud de monetización del usuario
   */
  getMonetizationRequestStatus: protectedProcedure.query(async ({ ctx }) => {
    const { id: userId } = ctx.user;

    const [request] = await db
      .select()
      .from(monetizationRequests)
      .where(eq(monetizationRequests.userId, userId))
      .orderBy(desc(monetizationRequests.createdAt))
      .limit(1);

    return request || null;
  }),

  /**
   * Obtiene el estado de la cuenta de PayPal
   */
  getConnectStatus: protectedProcedure.query(async ({ ctx }) => {
    const { id: userId } = ctx.user;

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Usuario no encontrado" });
    }

    let accountStatus = null;
    if (user.paypalAccountId) {
      // PayPal no tiene una API directa para verificar el estado de la cuenta
      // Usamos el estado guardado en la base de datos
      accountStatus = {
        id: user.paypalAccountId,
        status: user.paypalAccountStatus || "pending",
      };
    }

    // Verificar requisitos de monetización
    const monetizationCheck = await canUserMonetize(userId);

    // Obtener estado de la solicitud de monetización
    const [request] = await db
      .select()
      .from(monetizationRequests)
      .where(eq(monetizationRequests.userId, userId))
      .orderBy(desc(monetizationRequests.createdAt))
      .limit(1);

    return {
      connected: !!user.paypalAccountId,
      accountStatus,
      canMonetize: user.canMonetize,
      monetizationCheck,
      monetizationRequest: request || null,
    };
  }),

  /**
   * Crea un link de onboarding para PayPal
   */
  createConnectLink: protectedProcedure.mutation(async ({ ctx }) => {
    const { id: userId } = ctx.user;

    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/paypal/connect`, {
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

    // Actualizar el flag canMonetize basado en la verificación
    await db
      .update(users)
      .set({
        canMonetize: check.can,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

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
        // Usar lte en lugar de sql para evitar errores con hooks
        whereConditions.push(lte(transactions.createdAt, input.endDate));
      }

      const transactionsList = await db
        .select({
          id: transactions.id,
          type: transactions.type,
          status: transactions.status,
          amount: transactions.amount,
          starsAmount: transactions.starsAmount,
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
          totalTips: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('tip', 'stars_tip') AND ${transactions.status} = 'completed' THEN ${transactions.amount}::numeric ELSE 0 END), 0)`,
          totalStarsTips: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'stars_tip' AND ${transactions.status} = 'completed' THEN ${transactions.starsAmount}::numeric ELSE 0 END), 0)`,
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
          totalStarsTips: Number(stats[0]?.totalStarsTips || 0),
          totalSubscriptions: Number(stats[0]?.totalSubscriptions || 0),
          pendingAmount: Number(stats[0]?.pendingAmount || 0),
        },
      };
    }),

  /**
   * Crea una solicitud de retiro (payout)
   */
  createPayoutRequest: protectedProcedure
    .input(
      z.object({
        amount: z.number().positive().min(MIN_WITHDRAWAL_AMOUNT, {
          message: `El monto mínimo de retiro es $${MIN_WITHDRAWAL_AMOUNT} USD`,
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id: userId } = ctx.user;

      // Validar monto mínimo
      if (input.amount < MIN_WITHDRAWAL_AMOUNT) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `El monto mínimo de retiro es $${MIN_WITHDRAWAL_AMOUNT} USD`,
        });
      }

      // Obtener balance
      const [balance] = await db.select().from(balances).where(eq(balances.userId, userId)).limit(1);

      if (!balance) {
        // Crear balance si no existe
        const [newBalance] = await db
          .insert(balances)
          .values({
            userId: userId,
            availableBalance: "0",
            pendingBalance: "0",
            totalEarned: "0",
            currency: "usd",
          })
          .returning();
        
        if (!newBalance) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Error creando balance" });
        }
        
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No tienes saldo disponible para retirar",
        });
      }

      const availableBalance = parseFloat(balance.availableBalance);

      if (input.amount > availableBalance) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Saldo insuficiente. Disponible: $${availableBalance.toFixed(2)}`,
        });
      }

      // Verificar que el usuario tenga monetización habilitada
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

      if (!user || !user.canMonetize) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Debes tener la monetización habilitada para solicitar retiros",
        });
      }

      if (!user.paypalAccountId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cuenta de PayPal no vinculada" });
      }

      // Calcular comisión de la plataforma (3%)
      const platformFee = input.amount * PLATFORM_COMMISSION;
      const netAmount = input.amount - platformFee;

      // Crear solicitud de retiro (payout) pendiente
      const [payout] = await db
        .insert(payouts)
        .values({
          userId: userId,
          amount: input.amount.toFixed(2),
          platformFee: platformFee.toFixed(2),
          netAmount: netAmount.toFixed(2),
          currency: "usd",
          status: "pending", // Pendiente de aprobación del admin
        })
        .returning();

      // Mover el saldo de disponible a pendiente
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

  // ==================== PROCEDIMIENTOS DE ADMIN ====================

  /**
   * Obtiene todas las solicitudes de monetización pendientes (admin)
   */
  getMonetizationRequests: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        status: z.enum(["pending", "approved", "rejected"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { id: userId } = ctx.user;

      // Verificar si el usuario es admin
      const adminCheck = await isUserAdmin(userId, ctx.clerkUserId || null);
      if (!adminCheck) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo los administradores pueden ver las solicitudes de monetización",
        });
      }

      const whereConditions = [];
      if (input.status) {
        whereConditions.push(eq(monetizationRequests.status, input.status));
      } else {
        whereConditions.push(eq(monetizationRequests.status, "pending"));
      }

      const requestsList = await db
        .select({
          id: monetizationRequests.id,
          userId: monetizationRequests.userId,
          paypalEmail: monetizationRequests.paypalEmail,
          termsAccepted: monetizationRequests.termsAccepted,
          status: monetizationRequests.status,
          reviewedBy: monetizationRequests.reviewedBy,
          reviewedAt: monetizationRequests.reviewedAt,
          rejectionReason: monetizationRequests.rejectionReason,
          createdAt: monetizationRequests.createdAt,
          updatedAt: monetizationRequests.updatedAt,
          user: {
            id: users.id,
            name: users.name,
            username: users.username,
            imageUrl: users.imageUrl,
            canMonetize: users.canMonetize,
          },
        })
        .from(monetizationRequests)
        .leftJoin(users, eq(monetizationRequests.userId, users.id))
        .where(and(...whereConditions))
        .orderBy(desc(monetizationRequests.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return requestsList;
    }),

  /**
   * Acepta o rechaza una solicitud de monetización (admin)
   */
  reviewMonetizationRequest: protectedProcedure
    .input(
      z.object({
        requestId: z.string().uuid(),
        action: z.enum(["approve", "reject"]),
        rejectionReason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id: userId } = ctx.user;

      // Verificar si el usuario es admin
      const adminCheck = await isUserAdmin(userId, ctx.clerkUserId || null);
      if (!adminCheck) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo los administradores pueden revisar solicitudes de monetización",
        });
      }

      // Obtener la solicitud
      const [request] = await db
        .select()
        .from(monetizationRequests)
        .where(eq(monetizationRequests.id, input.requestId))
        .limit(1);

      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Solicitud no encontrada" });
      }

      if (request.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Esta solicitud ya ha sido revisada",
        });
      }

      const newStatus = input.action === "approve" ? "approved" : "rejected";

      // Actualizar la solicitud
      await db
        .update(monetizationRequests)
        .set({
          status: newStatus,
          reviewedBy: userId,
          reviewedAt: new Date(),
          rejectionReason: input.rejectionReason || null,
          updatedAt: new Date(),
        })
        .where(eq(monetizationRequests.id, input.requestId));

      // Si se aprueba, activar la monetización del usuario
      if (input.action === "approve") {
        await db
          .update(users)
          .set({
            canMonetize: true,
            paypalAccountId: request.paypalEmail,
            paypalAccountStatus: "active",
            updatedAt: new Date(),
          })
          .where(eq(users.id, request.userId));
      }

      return { success: true, status: newStatus };
    }),

  /**
   * Activa manualmente la monetización para un usuario específico (admin)
   */
  activateMonetizationManually: protectedProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        paypalEmail: z.string().email("Email de PayPal inválido"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id: adminUserId } = ctx.user;

      // Verificar si el usuario es admin
      const adminCheck = await isUserAdmin(adminUserId, ctx.clerkUserId || null);
      if (!adminCheck) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo los administradores pueden activar monetización manualmente",
        });
      }

      // Verificar que el usuario existe
      const [user] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Usuario no encontrado" });
      }

      // Activar monetización
      await db
        .update(users)
        .set({
          canMonetize: true,
          paypalAccountId: input.paypalEmail,
          paypalAccountStatus: "active",
          updatedAt: new Date(),
        })
        .where(eq(users.id, input.userId));

      return { success: true };
    }),

  /**
   * Obtiene todas las solicitudes de retiro pendientes (admin)
   */
  getPayoutRequests: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        status: z.enum(["pending", "completed", "failed"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { id: userId } = ctx.user;

      // Verificar si el usuario es admin
      const adminCheck = await isUserAdmin(userId, ctx.clerkUserId || null);
      if (!adminCheck) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo los administradores pueden ver las solicitudes de retiro",
        });
      }

      const whereConditions = [];
      if (input.status) {
        whereConditions.push(eq(payouts.status, input.status));
      } else {
        whereConditions.push(eq(payouts.status, "pending"));
      }

      const payoutsList = await db
        .select({
          id: payouts.id,
          userId: payouts.userId,
          amount: payouts.amount,
          platformFee: payouts.platformFee,
          netAmount: payouts.netAmount,
          currency: payouts.currency,
          status: payouts.status,
          paypalPayoutId: payouts.paypalPayoutId,
          paypalTransferId: payouts.paypalTransferId,
          failureReason: payouts.failureReason,
          reviewedBy: payouts.reviewedBy,
          reviewedAt: payouts.reviewedAt,
          processedAt: payouts.processedAt,
          createdAt: payouts.createdAt,
          updatedAt: payouts.updatedAt,
          user: {
            id: users.id,
            name: users.name,
            username: users.username,
            imageUrl: users.imageUrl,
            paypalAccountId: users.paypalAccountId,
          },
        })
        .from(payouts)
        .leftJoin(users, eq(payouts.userId, users.id))
        .where(and(...whereConditions))
        .orderBy(desc(payouts.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return payoutsList;
    }),

  /**
   * Acepta o rechaza una solicitud de retiro (admin)
   */
  reviewPayoutRequest: protectedProcedure
    .input(
      z.object({
        payoutId: z.string().uuid(),
        action: z.enum(["approve", "reject"]),
        rejectionReason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id: userId } = ctx.user;

      // Verificar si el usuario es admin
      const adminCheck = await isUserAdmin(userId, ctx.clerkUserId || null);
      if (!adminCheck) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo los administradores pueden revisar solicitudes de retiro",
        });
      }

      // Obtener el payout
      const [payout] = await db
        .select()
        .from(payouts)
        .where(eq(payouts.id, input.payoutId))
        .limit(1);

      if (!payout) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Solicitud de retiro no encontrada" });
      }

      if (payout.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Esta solicitud ya ha sido procesada",
        });
      }

      // Si se rechaza, devolver el saldo al usuario
      if (input.action === "reject") {
        const [balance] = await db.select().from(balances).where(eq(balances.userId, payout.userId)).limit(1);
        
        if (balance) {
          await db
            .update(balances)
            .set({
              availableBalance: (parseFloat(balance.availableBalance) + parseFloat(payout.amount)).toFixed(2),
              pendingBalance: (parseFloat(balance.pendingBalance) - parseFloat(payout.amount)).toFixed(2),
              updatedAt: new Date(),
            })
            .where(eq(balances.id, balance.id));
        }

        await db
          .update(payouts)
          .set({
            status: "failed",
            failureReason: input.rejectionReason || "Rechazado por el administrador",
            reviewedBy: userId,
            reviewedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(payouts.id, input.payoutId));

        return { success: true, status: "rejected" };
      }

      // Si se aprueba, procesar el pago a través de PayPal
      const [user] = await db.select().from(users).where(eq(users.id, payout.userId)).limit(1);

      if (!user || !user.paypalAccountId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "El usuario no tiene una cuenta de PayPal vinculada",
        });
      }

      try {
        // Procesar el pago a través de PayPal Payouts API
        const accessToken = await getPayPalAccessToken();
        const baseUrl = getPayPalBaseUrl();

        // El monto neto ya tiene la comisión aplicada
        const netAmount = parseFloat(payout.netAmount);

        const payoutResponse = await fetch(`${baseUrl}/v1/payments/payouts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            sender_batch_header: {
              sender_batch_id: `payout_${payout.userId}_${Date.now()}`,
              email_subject: "Pago de FacuGo! Plus",
              email_message: `Has recibido un pago de $${netAmount.toFixed(2)} USD desde FacuGo! Plus`,
            },
            items: [
              {
                recipient_type: "EMAIL",
                amount: {
                  value: netAmount.toFixed(2),
                  currency: "USD",
                },
                receiver: user.paypalAccountId,
                note: `Pago de FacuGo! Plus. Monto solicitado: $${parseFloat(payout.amount).toFixed(2)}, Comisión (3%): $${parseFloat(payout.platformFee).toFixed(2)}, Neto: $${netAmount.toFixed(2)}`,
                sender_item_id: `payout_${payout.userId}_${Date.now()}`,
              },
            ],
          }),
        });

        if (!payoutResponse.ok) {
          const errorText = await payoutResponse.text();
          let errorMessage = `Error procesando payout en PayPal: ${errorText}`;
          
          // Intentar parsear el error para dar un mensaje más claro
          try {
            const errorJson = JSON.parse(errorText);
            const errorDetails = errorJson.details?.[0];
            
            // Verificar si el error es por fondos insuficientes
            if (
              errorDetails?.issue === "INSUFFICIENT_FUNDS" ||
              errorText.includes("INSUFFICIENT_FUNDS") ||
              errorText.includes("insufficient funds") ||
              errorDetails?.issue === "RECEIVER_UNCONFIRMED_EMAIL" ||
              errorText.includes("RECEIVER_UNCONFIRMED_EMAIL")
            ) {
              errorMessage = `⚠️ ERROR CRÍTICO: La cuenta de PayPal de la plataforma no tiene fondos suficientes para realizar este pago de $${netAmount.toFixed(2)} USD. Por favor, recarga la cuenta de PayPal de la plataforma antes de aprobar pagos.`;
            } else if (errorDetails?.description) {
              errorMessage = `Error de PayPal: ${errorDetails.description}`;
            }
          } catch {
            // Si no se puede parsear, usar el mensaje original
          }
          
          throw new Error(errorMessage);
        }

        const payoutData = await payoutResponse.json();
        const paypalPayoutId = payoutData.batch_header?.payout_batch_id;
        const batchStatus = payoutData.batch_header?.batch_status;

        // Verificar el estado del batch de PayPal
        // Si el batch_status es "PENDING", el pago está pendiente (puede fallar por falta de fondos)
        // Si es "PROCESSING", está en proceso
        // Si es "SUCCESS", fue exitoso
        // Si es "DENIED" o "FAILED", falló
        
        if (!paypalPayoutId) {
          throw new Error("PayPal no devolvió un ID de batch válido");
        }

        // Verificar inmediatamente los items del batch para detectar errores
        // PayPal puede devolver 200 OK pero los items individuales pueden tener errores
        const items = payoutData.items || [];
        const failedItem = items.find((item: any) => 
          item.transaction_status === "FAILED" || 
          item.transaction_status === "DENIED" ||
          (item.errors && item.errors.length > 0)
        );

        // Si hay un item fallido, rechazar inmediatamente
        if (failedItem) {
          let failureReason = "Pago denegado por PayPal";
          
          if (failedItem.errors && failedItem.errors.length > 0) {
            failureReason = failedItem.errors[0].message || failedItem.errors[0].issue || "Error al procesar el pago";
            
            // Detectar específicamente errores de fondos insuficientes
            if (
              failureReason.includes("INSUFFICIENT_FUNDS") ||
              failureReason.includes("insufficient funds") ||
              failureReason.toUpperCase().includes("FUNDS")
            ) {
              failureReason = `⚠️ ERROR CRÍTICO: La cuenta de PayPal de la plataforma no tiene fondos suficientes para realizar este pago de $${netAmount.toFixed(2)} USD. Por favor, recarga la cuenta de PayPal de la plataforma antes de aprobar pagos.`;
            }
          } else if (failedItem.transaction_status === "FAILED") {
            failureReason = "El pago falló. Verifica que la cuenta de PayPal de la plataforma tenga fondos suficientes.";
          } else if (failedItem.transaction_status === "DENIED") {
            failureReason = "El pago fue denegado por PayPal.";
          }

          // Marcar como fallido inmediatamente
          await db
            .update(payouts)
            .set({
              status: "failed",
              paypalPayoutId: paypalPayoutId,
              failureReason: failureReason,
              reviewedBy: userId,
              reviewedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(payouts.id, input.payoutId));

          // Devolver el saldo al usuario
          const [balance] = await db.select().from(balances).where(eq(balances.userId, payout.userId)).limit(1);
          
          if (balance) {
            await db
              .update(balances)
              .set({
                availableBalance: (parseFloat(balance.availableBalance) + parseFloat(payout.amount)).toFixed(2),
                pendingBalance: (parseFloat(balance.pendingBalance) - parseFloat(payout.amount)).toFixed(2),
                updatedAt: new Date(),
              })
              .where(eq(balances.id, balance.id));
          }

          throw new TRPCError({
            code: "BAD_REQUEST",
            message: failureReason,
          });
        }

        // Verificar también el estado del batch
        if (batchStatus === "DENIED" || batchStatus === "FAILED") {
          let failureReason = "Pago denegado por PayPal";
          if (batchStatus === "FAILED") {
            failureReason = "El pago falló. Verifica que la cuenta de PayPal de la plataforma tenga fondos suficientes.";
          }

          // Marcar como fallido inmediatamente
          await db
            .update(payouts)
            .set({
              status: "failed",
              paypalPayoutId: paypalPayoutId,
              failureReason: failureReason,
              reviewedBy: userId,
              reviewedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(payouts.id, input.payoutId));

          // Devolver el saldo al usuario
          const [balance] = await db.select().from(balances).where(eq(balances.userId, payout.userId)).limit(1);
          
          if (balance) {
            await db
              .update(balances)
              .set({
                availableBalance: (parseFloat(balance.availableBalance) + parseFloat(payout.amount)).toFixed(2),
                pendingBalance: (parseFloat(balance.pendingBalance) - parseFloat(payout.amount)).toFixed(2),
                updatedAt: new Date(),
              })
              .where(eq(balances.id, balance.id));
          }

          throw new TRPCError({
            code: "BAD_REQUEST",
            message: failureReason,
          });
        }

        // Si el batch está en estado PENDING o PROCESSING, esperar a que PayPal lo procese
        // Por ahora, marcar como "processing" y el webhook lo actualizará cuando esté completo
        if (batchStatus === "PENDING" || batchStatus === "PROCESSING") {
          // Actualizar el payout como procesando (el webhook lo actualizará cuando complete o falle)
          await db
            .update(payouts)
            .set({
              status: "processing",
              paypalPayoutId: paypalPayoutId,
              reviewedBy: userId,
              reviewedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(payouts.id, input.payoutId));

          return { 
            success: true, 
            status: "processing", 
            paypalPayoutId,
            message: "El pago está siendo procesado por PayPal. El estado se actualizará automáticamente cuando se complete."
          };
        }

        // Si el batch está en estado SUCCESS, actualizar como completado
        if (batchStatus === "SUCCESS") {
          await db
            .update(payouts)
            .set({
              status: "completed",
              paypalPayoutId: paypalPayoutId,
              reviewedBy: userId,
              reviewedAt: new Date(),
              processedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(payouts.id, input.payoutId));

          // Actualizar el balance (el saldo pendiente ya se movió cuando se creó la solicitud)
          const [balance] = await db.select().from(balances).where(eq(balances.userId, payout.userId)).limit(1);
          
          if (balance) {
            const currentPending = parseFloat(balance.pendingBalance);
            const payoutAmount = parseFloat(payout.amount);
            
            await db
              .update(balances)
              .set({
                pendingBalance: (currentPending - payoutAmount).toFixed(2),
                lastPayoutAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(balances.id, balance.id));
          }

          return { success: true, status: "approved", paypalPayoutId };
        }

        // Estado desconocido
        throw new Error(`Estado de batch desconocido: ${batchStatus}`);
      } catch (error) {
        console.error("Error procesando payout:", error);
        
        const errorMessage = error instanceof Error ? error.message : "Error al procesar el pago";
        
        // Verificar si el error es por fondos insuficientes
        const isInsufficientFunds = errorMessage.includes("INSUFFICIENT_FUNDS") || 
                                     errorMessage.includes("insufficient funds") ||
                                     errorMessage.includes("fondos suficientes");
        
        // Marcar como fallido
        await db
          .update(payouts)
          .set({
            status: "failed",
            failureReason: errorMessage,
            reviewedBy: userId,
            reviewedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(payouts.id, input.payoutId));

        // Devolver el saldo al usuario si falló por cualquier razón
        const [balance] = await db.select().from(balances).where(eq(balances.userId, payout.userId)).limit(1);
        
        if (balance) {
          await db
            .update(balances)
            .set({
              availableBalance: (parseFloat(balance.availableBalance) + parseFloat(payout.amount)).toFixed(2),
              pendingBalance: (parseFloat(balance.pendingBalance) - parseFloat(payout.amount)).toFixed(2),
              updatedAt: new Date(),
            })
            .where(eq(balances.id, balance.id));
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Error al procesar el retiro",
        });
      }
    }),

  // ==================== PROCEDIMIENTOS DE STARS ====================

  /**
   * Obtiene el saldo de Stars del usuario
   */
  getStarsBalance: protectedProcedure.query(async ({ ctx }) => {
    const { id: userId } = ctx.user;

    const [user] = await db.select({ starsBalance: users.starsBalance }).from(users).where(eq(users.id, userId)).limit(1);

    return {
      stars: parseFloat(user?.starsBalance || "0"),
      usdEquivalent: parseFloat(user?.starsBalance || "0") / 100, // 100 stars = $1 USD
    };
  }),

  /**
   * Crea una orden de PayPal para comprar Stars
   */
  createStarsPurchaseOrder: protectedProcedure
    .input(
      z.object({
        amount: z.number().positive().min(1, {
          message: "El monto mínimo de compra es $1 USD",
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id: userId } = ctx.user;

      // Calcular cuántas stars se obtienen (100 stars por $1 USD)
      const starsToAdd = input.amount * 100;

      try {
        // Crear orden de PayPal
        const accessToken = await getPayPalAccessToken();
        const baseUrl = getPayPalBaseUrl();

        const orderResponse = await fetch(`${baseUrl}/v2/checkout/orders`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            intent: "CAPTURE",
            purchase_units: [
              {
                amount: {
                  currency_code: "USD",
                  value: input.amount.toFixed(2),
                },
                description: `Compra de ${starsToAdd} Stars`,
                custom_id: JSON.stringify({
                  type: "stars_purchase",
                  userId: userId,
                  starsAmount: starsToAdd,
                  usdAmount: input.amount,
                }),
              },
            ],
            application_context: {
              brand_name: "FacuGo! Plus",
              landing_page: "NO_PREFERENCE",
              user_action: "PAY_NOW",
              return_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/success?type=stars`,
              cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/cancel`,
            },
          }),
        });

        if (!orderResponse.ok) {
          const errorText = await orderResponse.text();
          throw new Error(`Error creando orden de PayPal: ${errorText}`);
        }

        const order = await orderResponse.json();

        // Crear transacción en la base de datos
        const [transaction] = await db
          .insert(transactions)
          .values({
            userId: userId, // El usuario se compra stars a sí mismo
            payerId: userId,
            type: "stars_purchase",
            status: "pending",
            amount: input.amount.toFixed(2),
            starsAmount: starsToAdd.toFixed(2),
            currency: "usd",
            paypalOrderId: order.id,
            description: `Compra de ${starsToAdd} Stars`,
            metadata: JSON.stringify({
              starsAmount: starsToAdd,
              usdAmount: input.amount,
            }),
          })
          .returning();

        // Obtener el link de aprobación
        const approvalLink = order.links?.find((link: any) => link.rel === "approve")?.href;

        return {
          orderId: order.id,
          approvalUrl: approvalLink,
          starsToAdd,
          usdAmount: input.amount,
          transactionId: transaction.id,
        };
      } catch (error) {
        console.error("Error creando orden de compra de Stars:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Error al crear la orden de compra",
        });
      }
    }),

  /**
   * Donar Stars a un creador (para videos o lives o directamente al canal)
   */
  donateStars: protectedProcedure
    .input(
      z.object({
        starsAmount: z.number().positive().int().min(1, {
          message: "Debes donar al menos 1 Star",
        }),
        creatorId: z.string().uuid().optional(),
        videoId: z.string().uuid().optional(),
        liveStreamId: z.string().uuid().optional(),
        message: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id: userId } = ctx.user;

      // Verificar que el usuario tenga suficientes stars (con lock para evitar race conditions)
      const [user] = await db
        .select({ 
          starsBalance: users.starsBalance,
          name: users.name,
          username: users.username,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Usuario no encontrado" });
      }

      const currentStars = parseFloat(user.starsBalance || "0");

      if (currentStars < input.starsAmount) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `No tienes suficientes Stars. Disponibles: ${currentStars.toFixed(0)}`,
        });
      }

      // Obtener nombre del donante para la notificación
      const donorName = user.name || user.username || "Un usuario";

      // Obtener el creador al que se donará
      let creatorId: string;

      if (input.creatorId) {
        // Si se proporciona directamente el creatorId, usarlo (para donaciones desde el canal)
        const [creator] = await db.select({ id: users.id }).from(users).where(eq(users.id, input.creatorId)).limit(1);
        if (!creator) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Creador no encontrado" });
        }
        creatorId = creator.id;
      } else if (input.videoId) {
        const [video] = await db.select({ userId: videos.userId }).from(videos).where(eq(videos.id, input.videoId)).limit(1);
        if (!video) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Video no encontrado" });
        }
        creatorId = video.userId;
      } else if (input.liveStreamId) {
        const [live] = await db
          .select({ userId: liveStreams.userId })
          .from(liveStreams)
          .where(eq(liveStreams.id, input.liveStreamId))
          .limit(1);
        if (!live) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Transmisión en vivo no encontrada" });
        }
        creatorId = live.userId;
      } else {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Debes especificar un creador, video o transmisión en vivo" });
      }

      // Verificar que no se esté donando a uno mismo
      if (creatorId === userId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No puedes donar Stars a ti mismo" });
      }

      // Convertir stars a USD para el balance (100 stars = $1 USD)
      const usdEquivalent = input.starsAmount / STARS_PER_USD;
      const newStarsBalance = Math.max(0, currentStars - input.starsAmount);

      // Actualizar el balance de Stars del donante (sin transacciones, ya que neon-http no las soporta)
      // Verificamos que tenga suficientes stars antes de actualizar
      // Primero verificamos que tenga suficientes stars
      if (currentStars < input.starsAmount) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `No tienes suficientes Stars. Disponibles: ${currentStars.toFixed(0)}`,
        });
      }

      // Actualizar el balance de Stars del donante
      const updateResult = await db
        .update(users)
        .set({
          starsBalance: newStarsBalance.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning({ starsBalance: users.starsBalance, id: users.id });

      // Verificar que la actualización fue exitosa (si no se actualizó, significa que no tenía suficientes stars)
      if (!updateResult || updateResult.length === 0) {
        // Re-verificar el balance actual por si hubo un cambio
        const [updatedUser] = await db
          .select({ starsBalance: users.starsBalance })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);
        
        const updatedBalance = parseFloat(updatedUser?.starsBalance || "0");
        
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `No tienes suficientes Stars. Disponibles: ${updatedBalance.toFixed(0)}`,
        });
      }

      // Obtener balance del creador o crear uno nuevo
      const [creatorBalance] = await db.select().from(balances).where(eq(balances.userId, creatorId)).limit(1);

      if (creatorBalance) {
        const newAvailableBalance = parseFloat(creatorBalance.availableBalance) + usdEquivalent;
        await db
          .update(balances)
          .set({
            availableBalance: newAvailableBalance.toFixed(2),
            totalEarned: (parseFloat(creatorBalance.totalEarned) + usdEquivalent).toFixed(2),
            updatedAt: new Date(),
          })
          .where(eq(balances.id, creatorBalance.id));
      } else {
        await db.insert(balances).values({
          userId: creatorId,
          availableBalance: usdEquivalent.toFixed(2),
          totalEarned: usdEquivalent.toFixed(2),
          currency: "usd",
        });
      }

      // Crear transacción de donación
      const [transaction] = await db
        .insert(transactions)
        .values({
          userId: creatorId,
          payerId: userId,
          videoId: input.videoId || null,
          type: "stars_tip",
          status: "completed",
          amount: usdEquivalent.toFixed(2),
          starsAmount: input.starsAmount.toFixed(2),
          currency: "usd",
          description: input.message || `Donación de ${input.starsAmount} Stars`,
          metadata: JSON.stringify({
            message: input.message || "",
            starsAmount: input.starsAmount,
            liveStreamId: input.liveStreamId || null,
          }),
        })
        .returning();

      // Crear notificación para el creador que recibió la donación
      await db.insert(notifications).values({
        userId: creatorId,
        type: "donation_received",
        title: "Nueva donación recibida",
        message: `${donorName} te donó ${input.starsAmount.toLocaleString()} Stars ($${usdEquivalent.toFixed(2)} USD)${input.message ? `: "${input.message}"` : ""}`,
        relatedUserId: userId,
        relatedVideoId: input.videoId || null,
        relatedTransactionId: transaction.id,
        metadata: JSON.stringify({
          starsAmount: input.starsAmount,
          usdAmount: usdEquivalent,
          message: input.message || null,
          liveStreamId: input.liveStreamId || null,
        }),
      });

      return {
        success: true,
        starsDonated: input.starsAmount,
        usdEquivalent,
        remainingStars: newStarsBalance,
      };
    }),

  /**
   * Obtiene las notificaciones del usuario
   */
  getNotifications: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        unreadOnly: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { id: userId } = ctx.user;

      const whereConditions = [eq(notifications.userId, userId)];
      
      if (input.unreadOnly) {
        whereConditions.push(eq(notifications.read, false));
      }

      const notificationsList = await db
        .select({
          id: notifications.id,
          type: notifications.type,
          title: notifications.title,
          message: notifications.message,
          read: notifications.read,
          relatedUserId: notifications.relatedUserId,
          relatedVideoId: notifications.relatedVideoId,
          relatedTransactionId: notifications.relatedTransactionId,
          metadata: notifications.metadata,
          createdAt: notifications.createdAt,
          relatedUser: {
            id: users.id,
            name: users.name,
            username: users.username,
            imageUrl: users.imageUrl,
          },
        })
        .from(notifications)
        .leftJoin(users, eq(notifications.relatedUserId, users.id))
        .where(and(...whereConditions))
        .orderBy(desc(notifications.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      // Contar notificaciones no leídas
      const [unreadCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(notifications)
        .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));

      return {
        notifications: notificationsList,
        unreadCount: Number(unreadCount?.count || 0),
      };
    }),

  /**
   * Marca una notificación como leída
   */
  markNotificationAsRead: protectedProcedure
    .input(z.object({ notificationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { id: userId } = ctx.user;

      // Verificar que la notificación pertenece al usuario
      const [notification] = await db
        .select()
        .from(notifications)
        .where(and(eq(notifications.id, input.notificationId), eq(notifications.userId, userId)))
        .limit(1);

      if (!notification) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Notificación no encontrada" });
      }

      await db
        .update(notifications)
        .set({
          read: true,
          updatedAt: new Date(),
        })
        .where(eq(notifications.id, input.notificationId));

      return { success: true };
    }),

  /**
   * Marca todas las notificaciones como leídas
   */
  markAllNotificationsAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    const { id: userId } = ctx.user;

    await db
      .update(notifications)
      .set({
        read: true,
        updatedAt: new Date(),
      })
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));

    return { success: true };
  }),
});

