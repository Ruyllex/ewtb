import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, transactions, balances, payouts } from "@/db/schema";
import { eq } from "drizzle-orm";

// Configuración para Next.js 15
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/webhooks/paypal
 * Maneja los webhooks de PayPal
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const eventType = body.event_type;
    const resource = body.resource;

    console.log("Webhook de PayPal recibido:", eventType);

    switch (eventType) {
      case "PAYMENT.CAPTURE.COMPLETED":
        // Pago completado
        await handlePaymentCaptureCompleted(resource);
        break;

      case "PAYMENT.CAPTURE.DENIED":
      case "PAYMENT.CAPTURE.REFUNDED":
        // Pago denegado o reembolsado
        await handlePaymentCaptureDenied(resource);
        break;

      case "PAYOUTS.PAYOUT.COMPLETED":
        // Payout completado
        await handlePayoutCompleted(resource);
        break;

      case "PAYOUTS.PAYOUT.DENIED":
      case "PAYOUTS.PAYOUT.FAILED":
        // Payout fallido
        await handlePayoutFailed(resource);
        break;

      default:
        console.log("Evento de PayPal no manejado:", eventType);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error procesando webhook de PayPal:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno del servidor" },
      { status: 500 }
    );
  }
}

/**
 * Maneja cuando un pago es capturado exitosamente
 */
async function handlePaymentCaptureCompleted(capture: any) {
  try {
    const orderId = capture.supplementary_data?.related_ids?.order_id;
    if (!orderId) {
      console.error("No se encontró orderId en el webhook");
      return;
    }

    // Buscar la transacción por orderId
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.paypalOrderId, orderId))
      .limit(1);

    if (!transaction) {
      console.error("Transacción no encontrada para orderId:", orderId);
      return;
    }

    // Actualizar la transacción
    await db
      .update(transactions)
      .set({
        status: "completed",
        paypalCaptureId: capture.id,
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, transaction.id));

    // Si es una compra de Stars, actualizar el saldo de Stars del usuario
    if (transaction.type === "stars_purchase" && transaction.starsAmount) {
      const [user] = await db.select({ starsBalance: users.starsBalance }).from(users).where(eq(users.id, transaction.userId)).limit(1);
      
      if (user) {
        const currentStars = parseFloat(user.starsBalance || "0");
        const starsToAdd = parseFloat(transaction.starsAmount || "0");
        
        await db
          .update(users)
          .set({
            starsBalance: (currentStars + starsToAdd).toFixed(2),
            updatedAt: new Date(),
          })
          .where(eq(users.id, transaction.userId));
        
        console.log(`Stars agregadas al usuario ${transaction.userId}: ${starsToAdd}`);
        return; // Salir temprano para compras de Stars
      }
    }

    // Actualizar el balance del creador (para tips normales)
    const amount = parseFloat(transaction.amount);
    const [balance] = await db
      .select()
      .from(balances)
      .where(eq(balances.userId, transaction.userId))
      .limit(1);

    if (balance) {
      const currentAvailable = parseFloat(balance.availableBalance);
      const currentTotal = parseFloat(balance.totalEarned);

      await db
        .update(balances)
        .set({
          availableBalance: (currentAvailable + amount).toFixed(2),
          totalEarned: (currentTotal + amount).toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(balances.id, balance.id));
    } else {
      // Crear balance si no existe
      await db.insert(balances).values({
        userId: transaction.userId,
        availableBalance: amount.toFixed(2),
        pendingBalance: "0",
        totalEarned: amount.toFixed(2),
        currency: "usd",
      });
    }

    console.log("Pago completado exitosamente:", capture.id);
  } catch (error) {
    console.error("Error manejando PAYMENT.CAPTURE.COMPLETED:", error);
  }
}

/**
 * Maneja cuando un pago es denegado o reembolsado
 */
async function handlePaymentCaptureDenied(capture: any) {
  try {
    const orderId = capture.supplementary_data?.related_ids?.order_id;
    if (!orderId) return;

    await db
      .update(transactions)
      .set({
        status: "failed",
        updatedAt: new Date(),
      })
      .where(eq(transactions.paypalOrderId, orderId));

    console.log("Pago denegado/reembolsado:", capture.id);
  } catch (error) {
    console.error("Error manejando PAYMENT.CAPTURE.DENIED:", error);
  }
}

/**
 * Maneja cuando un payout es completado
 */
async function handlePayoutCompleted(payout: any) {
  try {
    const payoutId = payout.batch_header?.payout_batch_id;
    if (!payoutId) return;

    const [payoutRecord] = await db
      .select()
      .from(payouts)
      .where(eq(payouts.paypalPayoutId, payoutId))
      .limit(1);

    if (!payoutRecord) {
      console.error("Payout no encontrado:", payoutId);
      return;
    }

    await db
      .update(payouts)
      .set({
        status: "completed",
        processedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(payouts.id, payoutRecord.id));

    // Actualizar balance pendiente
    const [balance] = await db
      .select()
      .from(balances)
      .where(eq(balances.userId, payoutRecord.userId))
      .limit(1);

    if (balance) {
      const currentPending = parseFloat(balance.pendingBalance);
      const payoutAmount = parseFloat(payoutRecord.amount);

      await db
        .update(balances)
        .set({
          pendingBalance: (currentPending - payoutAmount).toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(balances.id, balance.id));
    }

    console.log("Payout completado:", payoutId);
  } catch (error) {
    console.error("Error manejando PAYOUTS.PAYOUT.COMPLETED:", error);
  }
}

/**
 * Maneja cuando un payout falla
 */
async function handlePayoutFailed(payout: any) {
  try {
    const payoutId = payout.batch_header?.payout_batch_id;
    if (!payoutId) return;

    await db
      .update(payouts)
      .set({
        status: "failed",
        failureReason: payout.reason || "Payout fallido",
        updatedAt: new Date(),
      })
      .where(eq(payouts.paypalPayoutId, payoutId));

    // Revertir el balance pendiente al disponible
    const [payoutRecord] = await db
      .select()
      .from(payouts)
      .where(eq(payouts.paypalPayoutId, payoutId))
      .limit(1);

    if (payoutRecord) {
      const [balance] = await db
        .select()
        .from(balances)
        .where(eq(balances.userId, payoutRecord.userId))
        .limit(1);

      if (balance) {
        const currentPending = parseFloat(balance.pendingBalance);
        const currentAvailable = parseFloat(balance.availableBalance);
        const payoutAmount = parseFloat(payoutRecord.amount);

        await db
          .update(balances)
          .set({
            pendingBalance: (currentPending - payoutAmount).toFixed(2),
            availableBalance: (currentAvailable + payoutAmount).toFixed(2),
            updatedAt: new Date(),
          })
          .where(eq(balances.id, balance.id));
      }
    }

    console.log("Payout fallido:", payoutId);
  } catch (error) {
    console.error("Error manejando PAYOUTS.PAYOUT.FAILED:", error);
  }
}


