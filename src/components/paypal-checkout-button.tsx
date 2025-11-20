"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

interface PayPalCheckoutButtonProps {
  orderId?: string;
  approvalUrl?: string;
  successUrl?: string;
  cancelUrl?: string;
  className?: string;
  amount?: number;
  onSuccess?: () => void;
}

export function PayPalCheckoutButton({
  orderId,
  approvalUrl,
  successUrl,
  cancelUrl,
  className,
  amount,
  onSuccess,
}: PayPalCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    try {
      setLoading(true);

      // Si tenemos una URL de aprobación, redirigir directamente
      if (approvalUrl) {
        window.location.href = approvalUrl;
        return;
      }

      // Si no, mostrar error
      alert("No se pudo crear la orden de pago. Por favor, intente nuevamente.");
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

  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "";

  if (!paypalClientId) {
    return (
      <Button disabled className={className}>
        PayPal no está configurado
      </Button>
    );
  }

  // Si tenemos un orderId, usar PayPalButtons
  if (orderId && amount) {
    return (
      <PayPalScriptProvider options={{ clientId: paypalClientId, currency: "USD" }}>
        <PayPalButtons
          createOrder={(data, actions) => {
            return Promise.resolve(orderId);
          }}
          onApprove={(data, actions) => {
            return actions.order?.capture().then((details) => {
              if (onSuccess) {
                onSuccess();
              }
              if (successUrl) {
                window.location.href = successUrl;
              }
            });
          }}
          onCancel={() => {
            if (cancelUrl) {
              window.location.href = cancelUrl;
            }
          }}
          style={{
            layout: "vertical",
            color: "blue",
            shape: "rect",
            label: "paypal",
          }}
        />
      </PayPalScriptProvider>
    );
  }

  // Si no, usar botón simple que redirige
  return (
    <Button
      onClick={handleCheckout}
      disabled={loading || !approvalUrl}
      className={className}
    >
      {loading ? "Procesando..." : "Pagar con PayPal"}
    </Button>
  );
}


