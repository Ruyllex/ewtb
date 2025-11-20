"use client";

import { api as trpc } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircleIcon, AlertCircleIcon, XCircleIcon, ExternalLinkIcon, DollarSignIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export const MonetizationStatusCard = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: connectStatus, isLoading } = trpc.monetization.getConnectStatus.useQuery();

  if (!mounted || isLoading) {
    return null;
  }

  if (!connectStatus) {
    return null;
  }

  const getStatusBadge = () => {
    if (connectStatus.canMonetize) {
      return (
        <Badge variant="default" className="bg-green-500">
          <CheckCircleIcon className="size-3 mr-1" />
          Monetización Habilitada
        </Badge>
      );
    }

    if (connectStatus.connected && connectStatus.accountStatus?.status === "active") {
      return (
        <Badge variant="secondary">
          <AlertCircleIcon className="size-3 mr-1" />
          Pendiente de Verificación
        </Badge>
      );
    }

    if (connectStatus.connected) {
      return (
        <Badge variant="secondary">
          <AlertCircleIcon className="size-3 mr-1" />
          Cuenta Pendiente
        </Badge>
      );
    }

    return (
      <Badge variant="outline">
        <XCircleIcon className="size-3 mr-1" />
        No Configurado
      </Badge>
    );
  };

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSignIcon className="size-5 text-primary" />
            <CardTitle className="text-lg">Estado de Monetización</CardTitle>
          </div>
          {getStatusBadge()}
        </div>
        <CardDescription>
          {connectStatus.canMonetize
            ? "Tu cuenta está lista para recibir pagos de tips y suscripciones."
            : connectStatus.connected
              ? "Completa la verificación para habilitar la monetización."
              : "Conecta tu cuenta de PayPal para comenzar a monetizar tu contenido."}
        </CardDescription>
      </CardHeader>
      {!connectStatus.canMonetize && (
        <CardContent>
          <div className="flex gap-2">
            {!connectStatus.connected ? (
              <Button
                onClick={async () => {
                  try {
                    const response = await fetch("/api/paypal/connect", {
                      method: "POST",
                    });

                    if (!response.ok) {
                      const error = await response.json();
                      throw new Error(error.error || "Error al conectar PayPal");
                    }

                    const data = await response.json();
                    window.location.href = data.url;
                  } catch (error) {
                    console.error("Error conectando PayPal:", error);
                  }
                }}
                size="sm"
              >
                <ExternalLinkIcon className="size-4 mr-2" />
                Conectar PayPal
              </Button>
            ) : (
              <Button asChild size="sm" variant="outline">
                <Link href="/studio/earnings">
                  <DollarSignIcon className="size-4 mr-2" />
                  Ver Detalles
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

