"use client";

import { useState } from "react";
import { ResponsiveModal } from "@/components/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2Icon, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/trpc/client";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

interface StarsPurchaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const StarsPurchaseModal = ({ open, onOpenChange, onSuccess }: StarsPurchaseModalProps) => {
  const [amount, setAmount] = useState("5");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [starsToAdd, setStarsToAdd] = useState<number>(0);

  const createOrder = api.monetization.createStarsPurchaseOrder.useMutation({
    onSuccess: (data) => {
      setOrderId(data.orderId);
      setStarsToAdd(data.starsToAdd);
    },
    onError: (error) => {
      toast.error(error.message || "Error al crear la orden");
    },
  });

  const handleAmountChange = (value: string) => {
    setAmount(value);
    setOrderId(null);
  };

  const handleCreateOrder = () => {
    if (!amount || parseFloat(amount) < 1) {
      toast.error("El monto mínimo es $1 USD");
      return;
    }

    createOrder.mutate({ amount: parseFloat(amount) });
  };

  const handleSuccess = () => {
    toast.success(`¡${starsToAdd.toLocaleString()} Stars agregadas a tu cuenta!`);
    setOrderId(null);
    setAmount("5");
    onOpenChange(false);
    onSuccess?.();
  };

  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "";

  return (
    <ResponsiveModal title="Recargar Stars" open={open} onOpenChange={onOpenChange}>
      <div className="space-y-4">
        {!orderId ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="amount">Monto a recargar (USD)</Label>
              <div className="flex gap-2">
                {[5, 10, 25, 50, 100].map((value) => (
                  <Button
                    key={value}
                    type="button"
                    variant={amount === value.toString() ? "default" : "outline"}
                    onClick={() => handleAmountChange(value.toString())}
                    className="flex-1"
                  >
                    ${value}
                  </Button>
                ))}
              </div>
              <Input
                id="amount"
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="Ingresa un monto"
              />
            </div>

            <div className="bg-white/20 p-4 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Stars a recibir:</span>
                <span className="text-lg font-bold flex items-center gap-1">
                  <Sparkles className="h-4 w-4" />
                  {(parseFloat(amount || "0") * 100).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                100 Stars = $1 USD
              </p>
            </div>

            {!paypalClientId ? (
              <div className="text-center text-red-500 text-sm">
                PayPal no está configurado. Por favor, contacta al administrador.
              </div>
            ) : (
              <Button
                onClick={handleCreateOrder}
                disabled={!amount || parseFloat(amount) < 1 || createOrder.isPending}
                className="w-full"
              >
                {createOrder.isPending ? (
                  <>
                    <Loader2Icon className="size-4 mr-2 animate-spin" />
                    Creando orden...
                  </>
                ) : (
                  "Continuar con PayPal"
                )}
              </Button>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-900 rounded-lg p-4">
              <p className="text-sm font-semibold text-green-800 dark:text-green-200 mb-2">
                Estás comprando:
              </p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold flex items-center gap-2">
                  <Sparkles className="h-6 w-6 text-yellow-500" />
                  {starsToAdd.toLocaleString()} Stars
                </span>
                <span className="text-sm text-muted-foreground">
                  por ${parseFloat(amount).toFixed(2)} USD
                </span>
              </div>
            </div>

            {paypalClientId && (
              <PayPalScriptProvider options={{ clientId: paypalClientId, currency: "USD" }}>
                <PayPalButtons
                  createOrder={() => Promise.resolve(orderId)}
                  onApprove={(data, actions) => {
                    return actions.order?.capture().then((details) => {
                      handleSuccess();
                    });
                  }}
                  onError={(err) => {
                    console.error("Error en PayPal:", err);
                    toast.error("Error al procesar el pago con PayPal");
                    setOrderId(null);
                  }}
                  onCancel={() => {
                    setOrderId(null);
                  }}
                  style={{
                    layout: "vertical",
                    color: "blue",
                    shape: "rect",
                    label: "paypal",
                  }}
                />
              </PayPalScriptProvider>
            )}
          </div>
        )}
      </div>
    </ResponsiveModal>
  );
};

