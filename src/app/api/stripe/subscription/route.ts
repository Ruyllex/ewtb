import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users, transactions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-12-18.acacia",
});

// Configuración para Next.js 15
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Fee de la plataforma (2.9% + $0.30 por transacción)
const PLATFORM_FEE_PERCENTAGE = 0.029;
const PLATFORM_FEE_FIXED = 30; // en centavos

const subscriptionSchema = z.object({
  creatorId: z.string().uuid(),
  priceId: z.string().optional(), // ID del precio de Stripe (price_xxx) - opcional
  amount: z.number().positive().min(100), // Monto mensual en centavos
});

/**
 * POST /api/stripe/subscription
 * Crea una suscripción mensual a un creador
 */
export async function POST(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { creatorId, priceId, amount } = subscriptionSchema.parse(body);
    
    // Si no se proporciona priceId, se creará uno nuevo

    // Obtener el creador
    const [creator] = await db
      .select({
        id: users.id,
        name: users.name,
        stripeAccountId: users.stripeAccountId,
        stripeAccountStatus: users.stripeAccountStatus,
        canMonetize: users.canMonetize,
      })
      .from(users)
      .where(eq(users.id, creatorId))
      .limit(1);

    if (!creator) {
      return NextResponse.json({ error: "Creador no encontrado" }, { status: 404 });
    }

    // Verificar que el creador tiene monetización habilitada
    if (!creator.canMonetize) {
      return NextResponse.json(
        { error: "Este creador no tiene la monetización habilitada" },
        { status: 403 }
      );
    }

    // Obtener el usuario que está suscribiéndose
    const [subscriber] = await db.select().from(users).where(eq(users.clerkId, clerkUserId)).limit(1);

    if (!subscriber) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Verificar si el creador tiene cuenta de Stripe verificada
    const hasStripeAccount = creator.stripeAccountId && creator.stripeAccountStatus === "active";

    // Crear o obtener el customer de Stripe usando metadata
    // Buscar customer existente por metadata (Stripe no permite búsqueda directa por metadata)
    let customerId: string;
    let existingCustomer: Stripe.Customer | undefined;
    
    // Intentar buscar en los primeros 100 customers (en producción, considerar usar un índice o cache)
    const customers = await stripe.customers.list({
      limit: 100,
    });

    // Buscar customer por metadata
    existingCustomer = customers.data.find(
      (c) => c.metadata?.clerkId === clerkUserId || c.metadata?.userId === subscriber.id
    );

    // Si no se encuentra, crear uno nuevo
    if (!existingCustomer) {
      const customer = await stripe.customers.create({
        metadata: {
          userId: subscriber.id,
          clerkId: clerkUserId,
        },
      });
      customerId = customer.id;
    } else {
      customerId = existingCustomer.id;
    }

    // Crear el precio si no existe (o usar el priceId proporcionado)
    let finalPriceId = priceId;
    if (!priceId || !priceId.startsWith("price_")) {
      // Crear un precio nuevo
      const price = await stripe.prices.create({
        unit_amount: amount,
        currency: "usd",
        recurring: {
          interval: "month",
        },
        product_data: {
          name: `Suscripción a ${creator.name}`,
          metadata: {
            creatorId: creator.id,
          },
        },
      });
      finalPriceId = price.id;
    }

    // Calcular el fee de la plataforma
    const platformFee = Math.round(amount * PLATFORM_FEE_PERCENTAGE + PLATFORM_FEE_FIXED);

    let paymentIntent: Stripe.PaymentIntent;
    let subscriptionId: string | null = null;

    // Si tiene cuenta de Stripe Connect, crear suscripción con transfer_data
    if (hasStripeAccount) {
      const subscriptionData: Stripe.SubscriptionCreateParams = {
        customer: customerId,
        items: [
          {
            price: finalPriceId,
          },
        ],
        payment_behavior: "default_incomplete",
        payment_settings: { save_default_payment_method: "on_subscription" },
        expand: ["latest_invoice.payment_intent"],
        application_fee_percent: PLATFORM_FEE_PERCENTAGE * 100,
        transfer_data: {
          destination: creator.stripeAccountId!,
        },
        metadata: {
          creatorId: creator.id,
          subscriberId: subscriber.id,
          type: "subscription",
          hasStripeAccount: "true",
        },
      };

      const subscription = await stripe.subscriptions.create(subscriptionData);
      subscriptionId = subscription.id;
      const invoice = subscription.latest_invoice as Stripe.Invoice;
      paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;
    } else {
      // Si no tiene cuenta Connect, crear un PaymentIntent simple para el primer pago
      // La recurrencia se manejará manualmente o el usuario deberá pagar mensualmente
      paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        customer: customerId,
        setup_future_usage: "off_session", // Permitir pagos futuros
        metadata: {
          type: "subscription",
          creatorId: creator.id,
          subscriberId: subscriber.id,
          hasStripeAccount: "false",
          priceId: finalPriceId,
          amount: String(amount),
        },
        description: `Suscripción mensual a ${creator.name}`,
      });
    }

    // Crear la transacción en la base de datos
    await db.insert(transactions).values({
      userId: creator.id,
      payerId: subscriber.id,
      type: "subscription",
      status: "pending",
      amount: (amount / 100).toFixed(2), // Convertir centavos a dólares
      currency: "usd",
      stripePaymentIntentId: paymentIntent.id,
      stripeSubscriptionId: subscriptionId,
      description: `Suscripción mensual a ${creator.name}`,
    });

    return NextResponse.json({
      subscriptionId: subscriptionId,
      clientSecret: paymentIntent.client_secret,
      amount: amount / 100, // Retornar en dólares
      platformFee: platformFee / 100,
    });
  } catch (error) {
    console.error("Error creando suscripción:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", details: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno del servidor" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/stripe/subscription
 * Cancela una suscripción
 */
export async function DELETE(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const subscriptionId = searchParams.get("subscriptionId");

    if (!subscriptionId) {
      return NextResponse.json({ error: "subscriptionId es requerido" }, { status: 400 });
    }

    // Cancelar la suscripción en Stripe
    const subscription = await stripe.subscriptions.cancel(subscriptionId);

    // Actualizar la transacción en la base de datos
    await db
      .update(transactions)
      .set({
        status: "refunded",
        updatedAt: new Date(),
      })
      .where(eq(transactions.stripeSubscriptionId, subscriptionId));

    return NextResponse.json({ success: true, subscription });
  } catch (error) {
    console.error("Error cancelando suscripción:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno del servidor" },
      { status: 500 }
    );
  }
}

