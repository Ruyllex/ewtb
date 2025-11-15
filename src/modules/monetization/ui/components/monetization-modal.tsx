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

// Componente interno para el formulario de tip que usa los hooks de Stripe
function TipPaymentForm({ 
  videoId, 
  creatorId, 
  creatorName, 
  amount, 
  message, 
  clientSecret, 
  onSuccess 
}: { 
  videoId: string; 
  creatorId: string; 
  creatorName: string; 
  amount: string; 
  message: string; 
  clientSecret: string; 
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !clientSecret) return;

    setIsProcessing(true);

    try {
      // Primero validar y enviar los elementos del formulario
      const { error: submitError } = await elements.submit();
      if (submitError) {
        throw submitError;
      }

      // Luego confirmar el pago
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

// Componente interno para el formulario de suscripción que usa los hooks de Stripe
function SubscriptionPaymentForm({ 
  creatorId, 
  creatorName, 
  clientSecret, 
  onSuccess 
}: { 
  creatorId: string; 
  creatorName: string; 
  clientSecret: string; 
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !clientSecret) return;

    setIsProcessing(true);

    try {
      // Primero validar y enviar los elementos del formulario
      const { error: submitError } = await elements.submit();
      if (submitError) {
        throw submitError;
      }

      // Luego confirmar el pago
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
          `Suscribirse por $3/mes`
        )}
      </Button>
    </form>
  );
}

// Formulario inicial para tip (sin hooks de Stripe)
function TipForm({ videoId, creatorId, creatorName, onClientSecret }: { 
  videoId: string; 
  creatorId: string; 
  creatorName: string; 
  onClientSecret: (clientSecret: string, amount: string, message: string) => void;
}) {
  const [amount, setAmount] = useState("5");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateTip = async () => {
    if (!amount || parseFloat(amount) < 1) {
      toast.error("Ingresa un monto válido (mínimo $1)");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/stripe/tip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId,
          amount: Math.round(parseFloat(amount) * 100), // Convertir a centavos
          message,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al crear el tip");
      }

      const data = await response.json();
      onClientSecret(data.clientSecret, amount, message);
    } catch (error) {
      console.error("Error creando tip:", error);
      toast.error(error instanceof Error ? error.message : "Error al crear el tip");
    } finally {
      setIsLoading(false);
    }
  };

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
        disabled={!amount || parseFloat(amount) < 1 || isLoading} 
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2Icon className="size-4 mr-2 animate-spin" />
            Creando pago...
          </>
        ) : (
          "Continuar con el pago"
        )}
      </Button>
    </div>
  );
}

// Formulario inicial para suscripción (sin hooks de Stripe)
function SubscriptionForm({ creatorId, creatorName, onClientSecret }: { 
  creatorId: string; 
  creatorName: string; 
  onClientSecret: (clientSecret: string) => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const subscriptionAmount = 3; // Monto fijo de $3

  const handleCreateSubscription = async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/stripe/subscription", {
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
      onClientSecret(data.clientSecret);
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

export const MonetizationModal = ({ videoId, creatorId, creatorName, open, onOpenChange }: MonetizationModalProps) => {
  const [type, setType] = useState<MonetizationType>(null);
  const [mounted, setMounted] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [tipData, setTipData] = useState<{ amount: string; message: string } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setType(null);
      setClientSecret(null);
      setTipData(null);
    }
  }, [open]);

  if (!mounted) {
    return null;
  }

  const handleTipClientSecret = (secret: string, amount: string, message: string) => {
    setClientSecret(secret);
    setTipData({ amount, message });
  };

  const handleSubscriptionClientSecret = (secret: string) => {
    setClientSecret(secret);
  };

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
                  <div className="text-xs text-muted-foreground">$3/mes</div>
                </div>
              </Button>
            </div>
          </div>
        ) : clientSecret && stripePromise ? (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: "stripe",
              },
            }}
          >
            {type === "tip" && tipData ? (
              <TipPaymentForm
                videoId={videoId}
                creatorId={creatorId}
                creatorName={creatorName}
                amount={tipData.amount}
                message={tipData.message}
                clientSecret={clientSecret}
                onSuccess={() => onOpenChange(false)}
              />
            ) : type === "subscription" ? (
              <SubscriptionPaymentForm
                creatorId={creatorId}
                creatorName={creatorName}
                clientSecret={clientSecret}
                onSuccess={() => onOpenChange(false)}
              />
            ) : null}
          </Elements>
        ) : (
          <div>
            {type === "tip" ? (
              <TipForm 
                videoId={videoId} 
                creatorId={creatorId} 
                creatorName={creatorName} 
                onClientSecret={handleTipClientSecret}
              />
            ) : (
              <SubscriptionForm 
                creatorId={creatorId} 
                creatorName={creatorName} 
                onClientSecret={handleSubscriptionClientSecret}
              />
            )}
          </div>
        )}
      </div>
    </ResponsiveModal>
  );
};
