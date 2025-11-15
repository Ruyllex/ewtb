import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { headers } from "next/headers";
import { db } from "@/db";
import { users, transactions, balances, payouts } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-12-18.acacia",
});

// Configuración necesaria para Next.js 15
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // Verificar que STRIPE_SECRET_KEY y STRIPE_WEBHOOK_SECRET estén configuradas
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("STRIPE_SECRET_KEY no está configurada");
      return new Response("Stripe no está configurado", { status: 500 });
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error("STRIPE_WEBHOOK_SECRET no está configurada");
      return new Response("Webhook secret no configurado", { status: 500 });
    }

    // Obtener el cuerpo de la petición y la firma
    const body = await req.text();
    const headersPayload = await headers();
    const signature = headersPayload.get("stripe-signature");

    if (!signature) {
      console.error("Falta la firma de Stripe");
      return new Response("Falta la firma de Stripe", { status: 400 });
    }

    // Verificar la firma del webhook
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("Error verificando webhook de Stripe:", err);
      return new Response(`Error de verificación: ${err instanceof Error ? err.message : "Unknown error"}`, {
        status: 400,
      });
    }

    // Manejar diferentes tipos de eventos
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("✅ Pago completado:", {
          sessionId: session.id,
          customerEmail: session.customer_email,
          amountTotal: session.amount_total,
          currency: session.currency,
        });
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log("✅ PaymentIntent exitoso:", {
          id: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
        });

        // Actualizar la transacción en la base de datos
        if (paymentIntent.metadata?.type === "tip" || paymentIntent.metadata?.type === "subscription") {
          const [transaction] = await db
            .select()
            .from(transactions)
            .where(eq(transactions.stripePaymentIntentId, paymentIntent.id))
            .limit(1);

          if (transaction) {
            // Actualizar el estado de la transacción
            await db
              .update(transactions)
              .set({
                status: "completed",
                stripeChargeId: paymentIntent.latest_charge as string,
                updatedAt: new Date(),
              })
              .where(eq(transactions.id, transaction.id));

            // Actualizar el balance del creador
            const amount = parseFloat(transaction.amount);
            const [balance] = await db
              .select()
              .from(balances)
              .where(eq(balances.userId, transaction.userId))
              .limit(1);

            if (balance) {
              // Calcular el monto que recibe el creador (después de fees)
              const platformFee = amount * 0.029 + 0.3; // 2.9% + $0.30
              const creatorAmount = amount - platformFee;

              await db
                .update(balances)
                .set({
                  availableBalance: (parseFloat(balance.availableBalance) + creatorAmount).toFixed(2),
                  totalEarned: (parseFloat(balance.totalEarned) + creatorAmount).toFixed(2),
                  updatedAt: new Date(),
                })
                .where(eq(balances.id, balance.id));
            } else {
              // Crear un nuevo balance si no existe
              const platformFee = amount * 0.029 + 0.3;
              const creatorAmount = amount - platformFee;

              await db.insert(balances).values({
                userId: transaction.userId,
                availableBalance: creatorAmount.toFixed(2),
                totalEarned: creatorAmount.toFixed(2),
                currency: "usd",
              });
            }
          }
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.error("❌ Pago fallido:", {
          id: paymentIntent.id,
          error: paymentIntent.last_payment_error,
        });

        // Actualizar la transacción como fallida
        await db
          .update(transactions)
          .set({
            status: "failed",
            updatedAt: new Date(),
          })
          .where(eq(transactions.stripePaymentIntentId, paymentIntent.id));
        break;
      }

      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        console.log("📝 Cuenta de Stripe actualizada:", {
          accountId: account.id,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
        });

        // Actualizar el estado de la cuenta en la base de datos
        const accountStatus = account.charges_enabled && account.payouts_enabled ? "active" : "pending";
        await db
          .update(users)
          .set({
            stripeAccountStatus: accountStatus,
            updatedAt: new Date(),
          })
          .where(eq(users.stripeAccountId, account.id));

        // Si la cuenta está activa, verificar si puede monetizar
        if (accountStatus === "active") {
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.stripeAccountId, account.id))
            .limit(1);

          if (user) {
            // Verificar requisitos de monetización (edad, contenido mínimo, etc.)
            // Esto se puede hacer en un procedimiento separado
            // Por ahora, solo actualizamos el estado
          }
        }
        break;
      }

      case "transfer.created": {
        const transfer = event.data.object as Stripe.Transfer;
        console.log("💸 Transfer creado:", {
          transferId: transfer.id,
          amount: transfer.amount,
          destination: transfer.destination,
        });
        break;
      }

      case "payout.paid": {
        const payout = event.data.object as Stripe.Payout;
        console.log("💰 Payout pagado:", {
          payoutId: payout.id,
          amount: payout.amount,
        });

        // Actualizar el payout en la base de datos
        await db
          .update(payouts)
          .set({
            status: "completed",
            processedAt: new Date(payout.created * 1000),
            updatedAt: new Date(),
          })
          .where(eq(payouts.stripePayoutId, payout.id));
        break;
      }

      case "payout.failed": {
        const payout = event.data.object as Stripe.Payout;
        console.error("❌ Payout fallido:", {
          payoutId: payout.id,
          failureCode: payout.failure_code,
          failureMessage: payout.failure_message,
        });

        // Actualizar el payout como fallido
        await db
          .update(payouts)
          .set({
            status: "failed",
            failureReason: payout.failure_message || payout.failure_code || "Unknown error",
            updatedAt: new Date(),
          })
          .where(eq(payouts.stripePayoutId, payout.id));
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log("📅 Suscripción actualizada:", {
          subscriptionId: subscription.id,
          status: subscription.status,
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log("🗑️ Suscripción cancelada:", {
          subscriptionId: subscription.id,
        });

        // Actualizar la transacción
        await db
          .update(transactions)
          .set({
            status: "refunded",
            updatedAt: new Date(),
          })
          .where(eq(transactions.stripeSubscriptionId, subscription.id));
        break;
      }

      default:
        console.log(`ℹ️  Evento no manejado: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error procesando webhook de Stripe:", error);
    return new Response("Error interno del servidor", { status: 500 });
  }
}

