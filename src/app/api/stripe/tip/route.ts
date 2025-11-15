import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users, videos, transactions, balances } from "@/db/schema";
import { eq, and } from "drizzle-orm";
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

const tipSchema = z.object({
  videoId: z.string().uuid(),
  amount: z.number().positive().min(100), // Mínimo $1.00 (100 centavos)
  message: z.string().optional(),
});

/**
 * POST /api/stripe/tip
 * Crea un PaymentIntent para enviar un tip a un creador
 */
export async function POST(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { videoId, amount, message } = tipSchema.parse(body);

    // Obtener el video y su creador
    const [video] = await db
      .select({
        id: videos.id,
        title: videos.title,
        userId: videos.userId,
        user: {
          id: users.id,
          name: users.name,
          stripeAccountId: users.stripeAccountId,
          stripeAccountStatus: users.stripeAccountStatus,
          canMonetize: users.canMonetize,
        },
      })
      .from(videos)
      .innerJoin(users, eq(videos.userId, users.id))
      .where(eq(videos.id, videoId))
      .limit(1);

    if (!video) {
      return NextResponse.json({ error: "Video no encontrado" }, { status: 404 });
    }

    // Verificar que el creador tiene monetización habilitada
    if (!video.user.canMonetize) {
      return NextResponse.json(
        { error: "Este creador no tiene la monetización habilitada" },
        { status: 403 }
      );
    }

    // Obtener el usuario que está haciendo el tip
    const [payer] = await db.select().from(users).where(eq(users.clerkId, clerkUserId)).limit(1);

    if (!payer) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Calcular el fee de la plataforma
    const platformFee = Math.round(amount * PLATFORM_FEE_PERCENTAGE + PLATFORM_FEE_FIXED);
    const creatorAmount = amount - platformFee;

    // Si el creador tiene cuenta de Stripe verificada, transferir directamente
    // Si no, guardar en el balance para retirar después
    const hasStripeAccount = video.user.stripeAccountId && video.user.stripeAccountStatus === "active";

    // Crear un PaymentIntent
    const paymentIntentData: Stripe.PaymentIntentCreateParams = {
      amount: amount,
      currency: "usd",
      metadata: {
        type: "tip",
        videoId: videoId,
        creatorId: video.user.id,
        payerId: payer.id,
        message: message || "",
        hasStripeAccount: String(hasStripeAccount),
      },
      description: `Tip para ${video.user.name} - ${video.title}`,
    };

    // Si tiene cuenta de Stripe, transferir directamente
    if (hasStripeAccount) {
      paymentIntentData.application_fee_amount = platformFee;
      paymentIntentData.transfer_data = {
        destination: video.user.stripeAccountId!,
      };
    }
    // Si no tiene cuenta, el pago va a la cuenta de la plataforma y se guarda en el balance

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);

    // Crear la transacción en la base de datos
    const [transaction] = await db
      .insert(transactions)
      .values({
        userId: video.user.id,
        payerId: payer.id,
        videoId: videoId,
        type: "tip",
        status: "pending",
        amount: (amount / 100).toFixed(2), // Convertir centavos a dólares
        currency: "usd",
        stripePaymentIntentId: paymentIntent.id,
        description: message || `Tip para ${video.title}`,
        metadata: JSON.stringify({ message }),
      })
      .returning();

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      transactionId: transaction.id,
      amount: amount / 100, // Retornar en dólares
      creatorAmount: creatorAmount / 100,
      platformFee: platformFee / 100,
    });
  } catch (error) {
    console.error("Error creando tip:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", details: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno del servidor" },
      { status: 500 }
    );
  }
}

