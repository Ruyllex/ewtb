"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";

export function PayPalTestButton() {
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [amount] = useState(5); // Monto de prueba: $5

  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "";

  const handleCreateTestOrder = async () => {
    try {
      setLoading(true);

      // Crear una orden de prueba
      const response = await fetch("/api/paypal/test-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amount * 100, // Convertir a centavos
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        const errorMessage = error.error || "Error al crear la orden de prueba";
        const hint = error.hint || error.message || "";
        throw new Error(hint ? `${errorMessage}\n\n${hint}` : errorMessage);
      }

      const data = await response.json();
      setOrderId(data.orderId);
      toast.success("Orden de prueba creada. Completa el pago con PayPal.");
    } catch (error) {
      console.error("Error creando orden de prueba:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Error al crear la orden de prueba"
      );
    } finally {
      setLoading(false);
    }
  };

  if (!paypalClientId) {
    return (
      <div className="p-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg">
        <p className="text-white/70 text-xs">
          PayPal no configurado
        </p>
      </div>
    );
  }

  // Si ya tenemos un orderId, mostrar los botones de PayPal
  if (orderId) {
    return (
      <div className="p-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg space-y-3">
        <div className="text-center">
          <p className="text-white font-semibold mb-1 text-sm">Completar Pago</p>
          <p className="text-white/70 text-xs">${amount}.00 USD</p>
        </div>
        <PayPalScriptProvider options={{ clientId: paypalClientId, currency: "USD" }}>
          <PayPalButtons
            createOrder={(data, actions) => {
              return Promise.resolve(orderId);
            }}
            onApprove={(data, actions) => {
              return actions.order?.capture().then((details) => {
                toast.success("¡Pago de prueba completado exitosamente!");
                setOrderId(null); // Resetear para permitir otra prueba
                console.log("Detalles del pago:", details);
              });
            }}
            onError={(err) => {
              console.error("Error en PayPal:", err);
              toast.error("Error al procesar el pago con PayPal");
            }}
            onCancel={() => {
              toast.info("Pago cancelado");
              setOrderId(null); // Resetear para permitir otra prueba
            }}
            style={{
              layout: "vertical",
              color: "blue",
              shape: "rect",
              label: "paypal",
            }}
          />
        </PayPalScriptProvider>
        <Button
          variant="outline"
          onClick={() => setOrderId(null)}
          className="w-full border-white/20 text-white hover:bg-white/10 text-sm h-8"
          size="sm"
        >
          Cancelar
        </Button>
      </div>
    );
  }

  // Mostrar botón para iniciar la prueba
  return (
    <div className="p-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg">
      <div className="text-center space-y-2">
        <div>
          <p className="text-white font-semibold mb-1 text-sm">Prueba PayPal</p>
          <p className="text-white/70 text-xs">
            ${amount}.00 USD
          </p>
        </div>
        <Button
          onClick={handleCreateTestOrder}
          disabled={loading}
          className="w-full bg-[#5ADBFD] text-black hover:bg-[#4AD0F0] font-medium text-sm h-9"
          size="sm"
        >
          {loading ? (
            <>
              <Loader2Icon className="size-3 mr-2 animate-spin" />
              Creando...
            </>
          ) : (
            "Iniciar Prueba"
          )}
        </Button>
      </div>
    </div>
  );
}

