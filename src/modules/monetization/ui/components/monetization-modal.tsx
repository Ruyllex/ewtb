"use client";

import { useState, useEffect } from "react";
import { ResponsiveModal } from "@/components/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2Icon, HeartIcon, CrownIcon } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { toast } from "sonner";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

interface MonetizationModalProps {
  videoId: string;
  creatorId: string;
  creatorName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type MonetizationType = "tip" | "subscription" | null;

function TipForm({ videoId, creatorId, creatorName, onSuccess }: { videoId: string; creatorId: string; creatorName: string; onSuccess: () => void }) {
  const [amount, setAmount] = useState("5");
  const [message, setMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const stripe = useStripe();
  const elements = useElements();

  const handleCreateTip = async () => {
    try {
      const response = await fetch("/api/stripe/tip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId,
          amount: Math.round(parseFloat(amount) * 100),
          message,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al crear el tip");
      }

      const data = await response.json();
      setClientSecret(data.clientSecret);
    } catch (error) {
      console.error("Error creando tip:", error);
      toast.error(error instanceof Error ? error.message : "Error al crear el tip");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !clientSecret) return;

    setIsProcessing(true);

    try {
      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/video/${videoId}?tip=success`,
        },
        redirect: "if_required",
      });

      if (confirmError) {
        throw confirmError;
      }

      toast.success(`¡Tip de $${amount} enviado a ${creatorName}!`);
      onSuccess();
    } catch (error) {
      console.error("Error procesando tip:", error);
      toast.error(error instanceof Error ? error.message : "Error al procesar el tip");
    } finally {
      setIsProcessing(false);
    }
  };

  if (clientSecret) {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <PaymentElement />
        <Button type="submit" disabled={!stripe || isProcessing} className="w-full">
          {isProcessing ? (
            <>
              <Loader2Icon className="size-4 mr-2 animate-spin" />
              Procesando...
            </>
          ) : (
            `Enviar $${amount}`
          )}
        </Button>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="amount">Monto (USD)</Label>
        <div className="flex gap-2">
          {[1, 5, 10, 25, 50].map((value) => (
            <Button
              key={value}
              type="button"
              variant={amount === value.toString() ? "default" : "outline"}
              onClick={() => setAmount(value.toString())}
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
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Ingresa un monto"
        />
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

      <Button 
        type="button" 
        onClick={handleCreateTip} 
        disabled={!amount || parseFloat(amount) < 1} 
        className="w-full"
      >
        Continuar con el pago
      </Button>
    </div>
  );
}

function SubscriptionForm({ creatorId, creatorName, onSuccess }: { creatorId: string; creatorName: string; onSuccess: () => void }) {
  const [amount, setAmount] = useState("9.99");
  const [isProcessing, setIsProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const stripe = useStripe();
  const elements = useElements();

  const handleCreateSubscription = async () => {
    try {
      const response = await fetch("/api/stripe/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorId,
          amount: Math.round(parseFloat(amount) * 100),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al crear la suscripción");
      }

      const data = await response.json();
      setClientSecret(data.clientSecret);
    } catch (error) {
      console.error("Error creando suscripción:", error);
      toast.error(error instanceof Error ? error.message : "Error al crear la suscripción");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !clientSecret) return;

    setIsProcessing(true);

    try {
      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/studio/earnings?subscription=success`,
        },
        redirect: "if_required",
      });

      if (confirmError) {
        throw confirmError;
      }

      toast.success(`¡Suscripción a ${creatorName} activada!`);
      onSuccess();
    } catch (error) {
      console.error("Error procesando suscripción:", error);
      toast.error(error instanceof Error ? error.message : "Error al procesar la suscripción");
    } finally {
      setIsProcessing(false);
    }
  };

  if (clientSecret) {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <PaymentElement />
        <Button type="submit" disabled={!stripe || isProcessing} className="w-full">
          {isProcessing ? (
            <>
              <Loader2Icon className="size-4 mr-2 animate-spin" />
              Procesando...
            </>
          ) : (
            `Suscribirse por $${amount}/mes`
          )}
        </Button>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="subscription-amount">Monto mensual (USD)</Label>
        <div className="flex gap-2">
          {[4.99, 9.99, 19.99, 49.99].map((value) => (
            <Button
              key={value}
              type="button"
              variant={amount === value.toFixed(2) ? "default" : "outline"}
              onClick={() => setAmount(value.toFixed(2))}
              className="flex-1"
            >
              ${value}
            </Button>
          ))}
        </div>
        <Input
          id="subscription-amount"
          type="number"
          min="1"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Ingresa un monto mensual"
        />
      </div>

      <div className="bg-muted p-4 rounded-lg">
        <p className="text-sm text-muted-foreground">
          Con tu suscripción mensual, estarás apoyando directamente a {creatorName} y obtendrás acceso a contenido
          exclusivo.
        </p>
      </div>

      <Button 
        type="button" 
        onClick={handleCreateSubscription} 
        disabled={!amount || parseFloat(amount) < 1} 
        className="w-full"
      >
        Continuar con el pago
      </Button>
    </div>
  );
}

export const MonetizationModal = ({ videoId, creatorId, creatorName, open, onOpenChange }: MonetizationModalProps) => {
  const [type, setType] = useState<MonetizationType>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setType(null);
    }
  }, [open]);

  if (!mounted) {
    return null;
  }

  return (
    <ResponsiveModal
      title={type === "tip" ? "💸 Enviar Donación" : type === "subscription" ? "👑 Suscribirse" : "Apoyar Creador"}
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
                <HeartIcon className="size-8 text-red-500" />
                <div className="text-center">
                  <div className="font-semibold">Donar</div>
                  <div className="text-xs text-muted-foreground">Apoyo único</div>
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
                  <div className="text-xs text-muted-foreground">Mensual</div>
                </div>
              </Button>
            </div>
          </div>
        ) : (
          <Elements
            stripe={stripePromise}
            options={{
              mode: type === "subscription" ? "subscription" : "payment",
              currency: "usd",
            }}
          >
            {type === "tip" ? (
              <TipForm videoId={videoId} creatorId={creatorId} creatorName={creatorName} onSuccess={() => onOpenChange(false)} />
            ) : (
              <SubscriptionForm creatorId={creatorId} creatorName={creatorName} onSuccess={() => onOpenChange(false)} />
            )}
          </Elements>
        )}
      </div>
    </ResponsiveModal>
  );
};
