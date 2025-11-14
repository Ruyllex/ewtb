import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { headers } from "next/headers";

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

        // Aquí puedes:
        // - Actualizar la base de datos
        // - Enviar un email de confirmación
        // - Activar una suscripción
        // - Etc.

        // Ejemplo: Actualizar el estado del pago en la base de datos
        // await db.update(payments).set({ status: 'completed' }).where(eq(payments.sessionId, session.id));

        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log("✅ PaymentIntent exitoso:", {
          id: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
        });
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.error("❌ Pago fallido:", {
          id: paymentIntent.id,
          error: paymentIntent.last_payment_error,
        });
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

