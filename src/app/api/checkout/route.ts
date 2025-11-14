import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  try {
    // Verificar que STRIPE_SECRET_KEY esté configurada
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("STRIPE_SECRET_KEY no está configurada");
      return NextResponse.json(
        { error: "Stripe no está configurado. Agrega STRIPE_SECRET_KEY a .env.local" },
        { status: 500 }
      );
    }

    // Verificar que la clave tenga el formato correcto
    if (!process.env.STRIPE_SECRET_KEY.startsWith("sk_test_") && !process.env.STRIPE_SECRET_KEY.startsWith("sk_live_")) {
      console.error("STRIPE_SECRET_KEY tiene un formato inválido");
      return NextResponse.json(
        { error: "La clave secreta de Stripe tiene un formato inválido. Debe empezar con 'sk_test_' o 'sk_live_'" },
        { status: 500 }
      );
    }

    // Inicializar Stripe (usar la versión más reciente)
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia",
      typescript: true,
    });

    // Obtener el cuerpo de la petición
    const body = await req.json();
    const { priceId, successUrl, cancelUrl } = body;

    // Si no se proporciona un priceId, crear un precio de prueba dinámicamente
    let finalPriceId = priceId;
    
    if (!finalPriceId) {
      try {
        // Crear un precio de prueba temporal ($10.00 USD)
        const price = await stripe.prices.create({
          unit_amount: 1000, // $10.00 en centavos
          currency: "usd",
          product_data: {
            name: "Pago de Prueba",
          },
        });
        finalPriceId = price.id;
        console.log("✅ Precio creado:", finalPriceId);
      } catch (priceError) {
        console.error("Error creando precio:", priceError);
        if (priceError instanceof Stripe.errors.StripeError) {
          return NextResponse.json(
            { error: `Error creando precio: ${priceError.message}` },
            { status: 500 }
          );
        }
        throw priceError;
      }
    }

    // Crear la sesión de checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: finalPriceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl || `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/cancel`,
      metadata: {
        // Puedes agregar metadata adicional aquí
        // Por ejemplo: userId, orderId, etc.
      },
    });

    console.log("✅ Sesión de checkout creada:", session.id);
    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error("Error creando sesión de checkout:", error);
    
    // Manejar errores específicos de Stripe
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { 
          error: `Error de Stripe: ${error.message}`,
          type: error.type,
          code: error.code,
        },
        { status: 500 }
      );
    }

    // Error genérico
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(
      { error: `Error al crear la sesión de checkout: ${errorMessage}` },
      { status: 500 }
    );
  }
}

