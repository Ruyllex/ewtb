import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createPayPalOrder } from "@/lib/paypal";

// Configuración para Next.js 15
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const testOrderSchema = z.object({
  amount: z.number().positive().min(100), // Mínimo $1.00 (100 centavos)
});

/**
 * POST /api/paypal/test-order
 * Crea una orden de prueba de PayPal
 */
export async function POST(req: NextRequest) {
  try {
    // Verificar que PayPal esté configurado antes de procesar
    const clientId = (process.env.PAYPAL_CLIENT_ID || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "").trim();
    const clientSecret = (process.env.PAYPAL_CLIENT_SECRET || "").trim();

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        {
          error: "PayPal no está configurado",
          message: "Agrega PAYPAL_CLIENT_ID y PAYPAL_CLIENT_SECRET a tu archivo .env.local. Revisa GUIA_PAYPAL.md para más información."
        },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { amount } = testOrderSchema.parse(body);

    // Crear una orden de PayPal de prueba
    const order = await createPayPalOrder({
      amount: (amount / 100).toFixed(2), // Convertir centavos a dólares
      currency: "USD",
      description: "Orden de prueba de PayPal - FacuGo! Plus",
      customId: JSON.stringify({
        type: "test",
        test: true,
      }),
    });

    // Retornar el order ID para que el cliente pueda aprobar el pago
    return NextResponse.json({
      orderId: order.id,
      amount: amount / 100, // Retornar en dólares
    });
  } catch (error) {
    console.error("Error creando orden de prueba:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", details: error.errors }, { status: 400 });
    }

    // Mensaje de error más descriptivo
    const errorMessage = error instanceof Error ? error.message : "Error interno del servidor";
    return NextResponse.json(
      {
        error: errorMessage,
        hint: errorMessage.includes("invalid_client")
          ? "Verifica que tus credenciales de PayPal sean correctas y que ambas sean de Sandbox (o ambas de Producción)."
          : undefined
      },
      { status: 500 }
    );
  }
}

