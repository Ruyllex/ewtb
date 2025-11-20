"use client";

import { useState, useEffect } from "react";
import { ResponsiveModal } from "@/components/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2Icon, HeartIcon, CrownIcon, Sparkles } from "lucide-react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { toast } from "sonner";
import { api } from "@/trpc/client";
import { useQueryClient } from "@tanstack/react-query";

interface MonetizationModalProps {
  videoId?: string;
  creatorId: string;
  creatorName: string;
  liveStreamId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type MonetizationType = "tip" | "subscription" | null;

// Componente interno para el formulario de tip que usa PayPal
function TipPaymentForm({ 
  videoId, 
  creatorId, 
  creatorName, 
  amount, 
  message, 
  orderId, 
  onSuccess 
}: { 
  videoId: string; 
  creatorId: string; 
  creatorName: string; 
  amount: string; 
  message: string; 
  orderId: string; 
  onSuccess: () => void;
}) {
  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "";

  if (!paypalClientId) {
    return (
      <div className="text-center text-red-500">
        PayPal no está configurado. Por favor, contacta al administrador.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PayPalScriptProvider options={{ clientId: paypalClientId, currency: "USD" }}>
        <PayPalButtons
          createOrder={(data, actions) => {
            return Promise.resolve(orderId);
          }}
          onApprove={(data, actions) => {
            return actions.order?.capture().then((details) => {
              toast.success(`¡Tip de $${amount} enviado a ${creatorName}!`);
              onSuccess();
            });
          }}
          onError={(err) => {
            console.error("Error en PayPal:", err);
            toast.error("Error al procesar el pago con PayPal");
          }}
          style={{
            layout: "vertical",
            color: "blue",
            shape: "rect",
            label: "paypal",
          }}
        />
      </PayPalScriptProvider>
    </div>
  );
}

// Componente interno para el formulario de suscripción que usa PayPal
function SubscriptionPaymentForm({ 
  creatorId, 
  creatorName, 
  orderId, 
  onSuccess 
}: { 
  creatorId: string; 
  creatorName: string; 
  orderId: string; 
  onSuccess: () => void;
}) {
  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "";

  if (!paypalClientId) {
    return (
      <div className="text-center text-red-500">
        PayPal no está configurado. Por favor, contacta al administrador.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PayPalScriptProvider options={{ clientId: paypalClientId, currency: "USD" }}>
        <PayPalButtons
          createOrder={(data, actions) => {
            return Promise.resolve(orderId);
          }}
          onApprove={(data, actions) => {
            return actions.order?.capture().then((details) => {
              toast.success(`¡Suscripción a ${creatorName} activada!`);
              onSuccess();
            });
          }}
          onError={(err) => {
            console.error("Error en PayPal:", err);
            toast.error("Error al procesar la suscripción con PayPal");
          }}
          style={{
            layout: "vertical",
            color: "blue",
            shape: "rect",
            label: "paypal",
          }}
        />
      </PayPalScriptProvider>
    </div>
  );
}

// Formulario para donar Stars
function StarsTipForm({ videoId, creatorId, creatorName, liveStreamId, onSuccess }: { 
  videoId?: string; 
  creatorId: string; 
  creatorName: string;
  liveStreamId?: string;
  onSuccess: () => void;
}) {
  const [starsAmount, setStarsAmount] = useState("100");
  const [message, setMessage] = useState("");
  const queryClient = useQueryClient();
  const { data: starsBalance } = api.monetization.getStarsBalance.useQuery();
  const donateStars = api.monetization.donateStars.useMutation({
    onSuccess: (data) => {
      toast.success(`¡${data.starsDonated} Stars donadas a ${creatorName}!`);
      // Invalidar queries para actualizar el balance de Stars
      queryClient.invalidateQueries({ queryKey: [["monetization", "getStarsBalance"]] });
      // Forzar refetch del balance de Stars inmediatamente
      queryClient.refetchQueries({ queryKey: [["monetization", "getStarsBalance"]] });
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message || "Error al donar Stars");
    },
  });

  const handleDonate = () => {
    const stars = parseInt(starsAmount);
    
    if (!stars || stars < 1) {
      toast.error("Debes donar al menos 1 Star");
      return;
    }

    const availableStars = Math.floor(starsBalance?.stars || 0);
    if (stars > availableStars) {
      toast.error(`No tienes suficientes Stars. Disponibles: ${availableStars}`);
      return;
    }

    donateStars.mutate({
      creatorId,
      starsAmount: stars,
      videoId,
      liveStreamId,
      message: message || undefined,
    });
  };

  const availableStars = Math.floor(starsBalance?.stars || 0);
  const usdEquivalent = (parseInt(starsAmount || "0") / 100).toFixed(2);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="stars-amount">
          Cantidad de Stars
          <span className="ml-2 text-xs text-muted-foreground">
            (Disponibles: {availableStars.toLocaleString()})
          </span>
        </Label>
        <div className="flex gap-2">
          {[100, 500, 1000, 2500, 5000].map((value) => (
            <Button
              key={value}
              type="button"
              variant={starsAmount === value.toString() ? "default" : "outline"}
              onClick={() => setStarsAmount(value.toString())}
              className="flex-1"
              disabled={value > availableStars}
            >
              <Sparkles className="h-3 w-3 mr-1" />
              {value.toLocaleString()}
            </Button>
          ))}
        </div>
        <Input
          id="stars-amount"
          type="number"
          min="1"
          step="1"
          value={starsAmount}
          onChange={(e) => setStarsAmount(e.target.value)}
          placeholder="Ingresa cantidad de Stars"
          disabled={availableStars === 0}
        />
        <p className="text-xs text-muted-foreground">
          Equivalente: ${usdEquivalent} USD (100 Stars = $1 USD)
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Mensaje (opcional)</Label>
        <Textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Deja un mensaje de apoyo..."
          rows={3}
        />
      </div>

      {availableStars === 0 ? (
        <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-900 rounded-lg p-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200 text-center">
            No tienes Stars disponibles. Recarga Stars desde el navbar para poder donar.
          </p>
        </div>
      ) : (
        <Button 
          type="button" 
          onClick={handleDonate} 
          disabled={!starsAmount || parseInt(starsAmount) < 1 || parseInt(starsAmount) > availableStars || donateStars.isPending} 
          className="w-full"
        >
          {donateStars.isPending ? (
            <>
              <Loader2Icon className="size-4 mr-2 animate-spin" />
              Donando...
            </>
          ) : (
            <>
              <Sparkles className="size-4 mr-2" />
              Donar {parseInt(starsAmount || "0").toLocaleString()} Stars
            </>
          )}
        </Button>
      )}
    </div>
  );
}

// Formulario inicial para suscripción (crea orden de PayPal)
function SubscriptionForm({ creatorId, creatorName, onOrderId }: { 
  creatorId: string; 
  creatorName: string; 
  onOrderId: (orderId: string) => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const subscriptionAmount = 3; // Monto fijo de $3

  const handleCreateSubscription = async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/paypal/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorId,
          amount: Math.round(subscriptionAmount * 100), // $3 en centavos
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al crear la suscripción");
      }

      const data = await response.json();
      onOrderId(data.orderId);
    } catch (error) {
      console.error("Error creando suscripción:", error);
      toast.error(error instanceof Error ? error.message : "Error al crear la suscripción");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-muted p-4 rounded-lg">
        <p className="text-sm text-muted-foreground">
          Con tu suscripción mensual de <strong>$3</strong>, estarás apoyando directamente a {creatorName} y obtendrás acceso a contenido exclusivo.
        </p>
      </div>

      <Button 
        type="button" 
        onClick={handleCreateSubscription} 
        disabled={isLoading} 
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2Icon className="size-4 mr-2 animate-spin" />
            Creando suscripción...
          </>
        ) : (
          `Suscribirse por $${subscriptionAmount}/mes`
        )}
      </Button>
    </div>
  );
}

export const MonetizationModal = ({ videoId, creatorId, creatorName, liveStreamId, open, onOpenChange }: MonetizationModalProps) => {
  const [type, setType] = useState<MonetizationType>(null);
  const [mounted, setMounted] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [tipData, setTipData] = useState<{ amount: string; message: string } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setType(null);
      setOrderId(null);
      setTipData(null);
    }
  }, [open]);

  if (!mounted) {
    return null;
  }

  const handleTipOrderId = (id: string, amount: string, message: string) => {
    setOrderId(id);
    setTipData({ amount, message });
  };

  const handleSubscriptionOrderId = (id: string) => {
    setOrderId(id);
  };

  return (
    <ResponsiveModal
      title={type === "tip" ? "⭐ Donar Stars" : type === "subscription" ? "👑 Suscribirse" : "Apoyar Creador"}
      open={open}
      onOpenChange={onOpenChange}
    >
      <div className="space-y-4">
        {!type ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Elige cómo quieres apoyar a {creatorName}</p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-auto py-6 flex flex-col items-center gap-2"
                onClick={() => setType("tip")}
              >
                <Sparkles className="size-8 text-yellow-500" />
                <div className="text-center">
                  <div className="font-semibold">Donar Stars</div>
                  <div className="text-xs text-muted-foreground">Apoyo único con Stars</div>
                </div>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-auto py-6 flex flex-col items-center gap-2"
                onClick={() => setType("subscription")}
              >
                <CrownIcon className="size-8 text-yellow-500" />
                <div className="text-center">
                  <div className="font-semibold">Suscribirse</div>
                  <div className="text-xs text-muted-foreground">$3/mes</div>
                </div>
              </Button>
            </div>
          </div>
        ) : type === "tip" ? (
          <StarsTipForm
            videoId={videoId}
            creatorId={creatorId}
            creatorName={creatorName}
            liveStreamId={liveStreamId}
            onSuccess={() => onOpenChange(false)}
          />
        ) : orderId ? (
          <>
            {type === "subscription" ? (
              <SubscriptionPaymentForm
                creatorId={creatorId}
                creatorName={creatorName}
                orderId={orderId}
                onSuccess={() => onOpenChange(false)}
              />
            ) : null}
          </>
        ) : (
          <div>
            {type === "subscription" ? (
              <SubscriptionForm 
                creatorId={creatorId} 
                creatorName={creatorName} 
                onOrderId={handleSubscriptionOrderId}
              />
            ) : null}
          </div>
        )}
      </div>
    </ResponsiveModal>
  );
};
