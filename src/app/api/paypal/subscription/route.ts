import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users, transactions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { createPayPalOrder } from "@/lib/paypal";

// Configuración para Next.js 15
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Fee de la plataforma (2.9% + $0.30 por transacción)
const PLATFORM_FEE_PERCENTAGE = 0.029;
const PLATFORM_FEE_FIXED = 30; // en centavos

const subscriptionSchema = z.object({
  creatorId: z.string().uuid(),
  amount: z.number().positive().min(100), // Monto mensual en centavos
});

/**
 * POST /api/paypal/subscription
 * Crea una suscripción mensual a un creador usando PayPal
 */
export async function POST(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { creatorId, amount } = subscriptionSchema.parse(body);

    // Obtener el creador
    const [creator] = await db
      .select({
        id: users.id,
        name: users.name,
        paypalAccountId: users.paypalAccountId,
        paypalAccountStatus: users.paypalAccountStatus,
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

    // Verificar si el creador tiene cuenta de PayPal verificada
    const hasPayPalAccount = creator.paypalAccountId && creator.paypalAccountStatus === "active";

    // Calcular el fee de la plataforma
    const platformFee = Math.round(amount * PLATFORM_FEE_PERCENTAGE + PLATFORM_FEE_FIXED);

    // Crear una orden de PayPal para la suscripción (primer pago)
    const order = await createPayPalOrder({
      amount: (amount / 100).toFixed(2), // Convertir centavos a dólares
      currency: "USD",
      description: `Suscripción mensual a ${creator.name}`,
      customId: JSON.stringify({
        type: "subscription",
        creatorId: creator.id,
        subscriberId: subscriber.id,
        hasPayPalAccount: String(hasPayPalAccount),
        monthlyAmount: String(amount),
      }),
    });

    // Crear la transacción en la base de datos
    await db.insert(transactions).values({
      userId: creator.id,
      payerId: subscriber.id,
      type: "subscription",
      status: "pending",
      amount: (amount / 100).toFixed(2), // Convertir centavos a dólares
      currency: "usd",
      paypalOrderId: order.id,
      description: `Suscripción mensual a ${creator.name}`,
      metadata: JSON.stringify({
        monthlyAmount: amount,
        platformFee: platformFee,
      }),
    });

    // Retornar el order ID para que el cliente pueda aprobar el pago
    const approvalUrl = order.links?.find((link: any) => link.rel === "approve")?.href;

    return NextResponse.json({
      orderId: order.id,
      approvalUrl: approvalUrl,
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
 * DELETE /api/paypal/subscription
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

    // Actualizar la transacción en la base de datos
    await db
      .update(transactions)
      .set({
        status: "refunded",
        updatedAt: new Date(),
      })
      .where(eq(transactions.paypalSubscriptionId, subscriptionId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error cancelando suscripción:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno del servidor" },
      { status: 500 }
    );
  }
}

