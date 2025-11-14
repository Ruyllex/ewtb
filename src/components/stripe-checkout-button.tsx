"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";

// Inicializar Stripe con la clave pública
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
);

interface StripeCheckoutButtonProps {
  priceId?: string;
  successUrl?: string;
  cancelUrl?: string;
  className?: string;
}

export function StripeCheckoutButton({
  priceId,
  successUrl,
  cancelUrl,
  className,
}: StripeCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    try {
      setLoading(true);

      // Verificar que la clave pública esté configurada
      if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
        alert(
          "Stripe no está configurado. Agrega NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY a .env.local"
        );
        return;
      }

      // Llamar al endpoint para crear la sesión de checkout
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId: priceId || undefined, // Si no se proporciona, el backend usará uno de prueba
          successUrl,
          cancelUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || "Error al crear la sesión de checkout";
        console.error("Error del servidor:", errorData);
        throw new Error(errorMessage);
      }

      const { sessionId, url } = await response.json();

      // Si tenemos la URL, redirigir directamente
      if (url) {
        window.location.href = url;
        return;
      }

      // Si no, usar Stripe.js para redirigir
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error("Stripe no se pudo inicializar");
      }

      const { error } = await stripe.redirectToCheckout({
        sessionId,
      });

      if (error) {
        throw new Error(error.message);
      }
    } catch (error) {
      console.error("Error en checkout:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Ocurrió un error al procesar el pago"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleCheckout}
      disabled={loading}
      className={className}
    >
      {loading ? "Procesando..." : "Probar pago"}
    </Button>
  );
}

