
"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/trpc/client";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token"); // PayPal returns orderID as 'token' parameter
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  const finalizeMembership = api.memberships.finalizeMembership.useMutation({
    onSuccess: () => {
      setStatus("success");
      toast.success("Membresía activada correctamente");
      // Optional: Redirect after a few seconds
      setTimeout(() => {
          router.push("/"); 
      }, 3000);
    },
    onError: (error) => {
      console.error("Payment error:", error);
      setStatus("error");
      toast.error(error.message || "Error al finalizar la membresía");
    }
  });

  useEffect(() => {
    if (token) {
        // Prevent double execution in strict mode or re-renders
        if (finalizeMembership.status === "idle") {
             finalizeMembership.mutate({ orderId: token });
        }
    } else {
        setStatus("error");
    }
  }, [token, finalizeMembership]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center px-4">
      {status === "loading" && (
        <>
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
          <h1 className="text-2xl font-bold">Procesando tu pago...</h1>
          <p className="text-muted-foreground">Por favor no cierres esta ventana.</p>
        </>
      )}

      {status === "success" && (
        <>
          <CheckCircle className="h-16 w-16 text-green-500" />
          <h1 className="text-2xl font-bold">¡Pago Completado!</h1>
          <p className="text-muted-foreground">Tu membresía ha sido activada.</p>
          <Button asChild className="mt-4">
            <Link href="/">Volver al Inicio</Link>
          </Button>
        </>
      )}

      {status === "error" && (
        <>
          <XCircle className="h-16 w-16 text-red-500" />
          <h1 className="text-2xl font-bold">Error en el Pago</h1>
          <p className="text-muted-foreground">
            No pudimos procesar tu pago. Si el dinero fue descontado, por favor contáctanos.
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/">Volver al Inicio</Link>
          </Button>
        </>
      )}
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
       <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center px-4">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
          <h1 className="text-2xl font-bold">Cargando...</h1>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
