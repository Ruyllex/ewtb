"use client";

import { useState, useEffect } from "react";
import { api as trpc } from "@/trpc/client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DollarSignIcon,
  TrendingUpIcon,
  WalletIcon,
  CreditCardIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertCircleIcon,
  Loader2Icon,
  ExternalLinkIcon,
  Sparkles,
} from "lucide-react";
import { TimeAgo } from "@/components/time-ago";
import { toast } from "sonner";
import { ResponsiveModal } from "@/components/responsive-dialog";
import Image from "next/image";

export const EarningsView = () => {
  const [payoutAmount, setPayoutAmount] = useState("");
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: connectStatus, isLoading: isLoadingStatus } = trpc.monetization.getConnectStatus.useQuery();

  const { data: earnings, isLoading: isLoadingEarnings, refetch: refetchEarnings } = trpc.monetization.getEarnings.useQuery({
    limit: 50,
    offset: 0,
  });

  const verifyMonetization = trpc.monetization.verifyMonetization.useMutation({
      onSuccess: (data) => {
        if (data.can) {
          toast.success("¡Monetización habilitada exitosamente!");
        } else {
          toast.error(`No puedes monetizar aún: ${data.reasons.join(", ")}`);
        }
      },
      onError: (error) => {
        toast.error(error.message || "Error al verificar monetización");
      },
    });

  const createPayout = trpc.monetization.createPayoutRequest.useMutation({
      onSuccess: () => {
        toast.success("Retiro solicitado exitosamente");
        setShowPayoutModal(false);
        setPayoutAmount("");
        refetchEarnings();
      },
      onError: (error) => {
        toast.error(error.message || "Error al crear retiro");
      },
    });

  const handleConnectPayPal = async () => {
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
      toast.error(error instanceof Error ? error.message : "Error al conectar PayPal");
    }
  };

  if (!mounted || isLoadingStatus) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2Icon className="size-8 animate-spin" />
      </div>
    );
  }

  const balance = earnings?.balance || {
    availableBalance: "0",
    pendingBalance: "0",
    totalEarned: "0",
    currency: "usd",
  };

  const stats = earnings?.stats || {
    totalEarned: 0,
    totalTips: 0,
    totalStarsTips: 0,
    totalSubscriptions: 0,
    pendingAmount: 0,
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Ganancias</h1>
            <p className="text-muted-foreground mt-1">Gestiona tus ganancias y retiros</p>
          </div>
          <Button 
            onClick={() => setShowPayoutModal(true)} 
            disabled={parseFloat(balance.availableBalance) < 20 || !connectStatus?.canMonetize || !connectStatus?.connected || connectStatus.accountStatus?.status !== "active"}
            variant={parseFloat(balance.availableBalance) >= 20 && connectStatus?.canMonetize && connectStatus?.connected && connectStatus.accountStatus?.status === "active" ? "default" : "outline"}
          >
            <WalletIcon className="size-4 mr-2" />
            Solicitar Retiro
            {parseFloat(balance.availableBalance) < 20 && parseFloat(balance.availableBalance) > 0 && (
              <span className="ml-2 text-xs opacity-70">
                (${(20 - parseFloat(balance.availableBalance)).toFixed(2)} faltantes)
              </span>
            )}
          </Button>
        </div>

        {/* Monetization Status */}
        {!connectStatus?.connected ? (
          <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircleIcon className="size-5 text-yellow-600" />
                Conecta tu cuenta de PayPal
              </CardTitle>
              <CardDescription>
                Puedes recibir donaciones y suscripciones, pero necesitas vincular tu cuenta de PayPal para retirar tus ganancias. Es rápido y seguro.
                {parseFloat(balance.availableBalance) > 0 && (
                  <span className="block mt-2 font-semibold text-yellow-800 dark:text-yellow-200">
                    Tienes ${parseFloat(balance.availableBalance).toFixed(2)} esperando para retirar.
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleConnectPayPal}>
                <CreditCardIcon className="size-4 mr-2" />
                Conectar PayPal
              </Button>
            </CardContent>
          </Card>
        ) : connectStatus.accountStatus?.status !== "active" ? (
          <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircleIcon className="size-5 text-yellow-600" />
                Cuenta pendiente de verificación
              </CardTitle>
              <CardDescription>
                Tu cuenta de PayPal está siendo verificada. Completa el proceso de onboarding para activar los pagos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleConnectPayPal} variant="outline">
                <ExternalLinkIcon className="size-4 mr-2" />
                Completar verificación
              </Button>
            </CardContent>
          </Card>
        ) : !connectStatus.canMonetize ? (
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircleIcon className="size-5 text-blue-600" />
                Verificar monetización
              </CardTitle>
              <CardDescription>
                Verifica que cumples con los requisitos para habilitar la monetización.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {connectStatus.monetizationCheck?.reasons && connectStatus.monetizationCheck.reasons.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Requisitos pendientes:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {connectStatus.monetizationCheck.reasons.map((reason, index) => (
                        <li key={index}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <Button
                  onClick={() => verifyMonetization.mutate()}
                  disabled={verifyMonetization.isPending}
                >
                  {verifyMonetization.isPending ? (
                    <>
                      <Loader2Icon className="size-4 mr-2 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="size-4 mr-2" />
                      Verificar monetización
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircleIcon className="size-5 text-green-600" />
                Monetización habilitada
              </CardTitle>
              <CardDescription>Tu cuenta está lista para recibir pagos de tips y suscripciones.</CardDescription>
            </CardHeader>
            {parseFloat(balance.availableBalance) < 20 && parseFloat(balance.availableBalance) > 0 && (
              <CardContent>
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <AlertCircleIcon className="size-4 inline mr-1" />
                  Tienes ${parseFloat(balance.availableBalance).toFixed(2)} disponibles. Necesitas alcanzar $20.00 USD para solicitar un retiro.
                </p>
              </CardContent>
            )}
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo Disponible</CardTitle>
              <WalletIcon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${parseFloat(balance.availableBalance).toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                {parseFloat(balance.availableBalance) >= 20 
                  ? "Listo para retirar" 
                  : `Necesitas $${(20 - parseFloat(balance.availableBalance)).toFixed(2)} más para solicitar retiro`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Ganado</CardTitle>
              <TrendingUpIcon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalEarned.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Histórico</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tips Recibidos</CardTitle>
              <DollarSignIcon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalTips.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Total en tips</p>
              {stats.totalStarsTips > 0 && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  {stats.totalStarsTips.toLocaleString()} Stars recibidas
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Suscripciones</CardTitle>
              <CreditCardIcon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalSubscriptions.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Total en suscripciones</p>
            </CardContent>
          </Card>
        </div>

        {/* Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Transacciones Recientes</CardTitle>
            <CardDescription>Historial de tus ganancias</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingEarnings ? (
              <div className="flex items-center justify-center py-8">
                <Loader2Icon className="size-8 animate-spin" />
              </div>
            ) : earnings?.transactions && earnings.transactions.length > 0 ? (
              <div className="space-y-4">
                {earnings.transactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4 flex-1">
                      {transaction.video && (
                        <div className="relative w-16 h-9 rounded overflow-hidden bg-muted">
                          {transaction.video.thumbnailUrl && (
                            <Image
                              src={transaction.video.thumbnailUrl}
                              alt={transaction.video.title}
                              fill
                              className="object-cover"
                            />
                          )}
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{transaction.description || "Transacción"}</p>
                          <Badge variant={transaction.type === "stars_tip" || transaction.type === "tip" ? "default" : "secondary"}>
                            {transaction.type === "stars_tip" ? (
                              <span className="flex items-center gap-1">
                                <Sparkles className="h-3 w-3" />
                                Stars Tip
                              </span>
                            ) : transaction.type === "tip" ? "Tip" : "Suscripción"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          <TimeAgo date={transaction.createdAt} />
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {transaction.type === "stars_tip" && transaction.starsAmount && parseFloat(transaction.starsAmount) > 0 ? (
                        <div className="flex flex-col items-end gap-1">
                          <p className="font-semibold text-yellow-600 flex items-center gap-1">
                            <Sparkles className="h-4 w-4 fill-yellow-600" />
                            {parseFloat(transaction.starsAmount).toLocaleString()} Stars
                          </p>
                          <p className="text-sm text-muted-foreground">
                            (${parseFloat(transaction.amount || "0").toFixed(2)} USD)
                          </p>
                        </div>
                      ) : (
                        <p className="font-semibold text-green-600">
                          +${parseFloat(transaction.amount || "0").toFixed(2)}
                        </p>
                      )}
                      <Badge
                        variant={
                          transaction.status === "completed"
                            ? "default"
                            : transaction.status === "pending"
                              ? "secondary"
                              : "destructive"
                        }
                        className="text-xs"
                      >
                        {transaction.status === "completed" ? (
                          <CheckCircleIcon className="size-3 mr-1" />
                        ) : transaction.status === "pending" ? (
                          <Loader2Icon className="size-3 mr-1 animate-spin" />
                        ) : (
                          <XCircleIcon className="size-3 mr-1" />
                        )}
                        {transaction.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No hay transacciones aún</p>
                <p className="text-sm mt-1">Las transacciones aparecerán aquí cuando recibas pagos</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payout Modal */}
      <ResponsiveModal
        title="Solicitar Retiro de Fondos"
        open={showPayoutModal}
        onOpenChange={setShowPayoutModal}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="payout-amount">Monto a retirar (USD)</Label>
              <Input
              id="payout-amount"
              type="number"
              min="20"
              step="0.01"
              max={parseFloat(balance.availableBalance)}
              value={payoutAmount}
              onChange={(e) => setPayoutAmount(e.target.value)}
              placeholder={`Mínimo: $20.00 - Máximo: $${parseFloat(balance.availableBalance).toFixed(2)}`}
            />
            <p className="text-sm text-muted-foreground">
              Saldo disponible: ${parseFloat(balance.availableBalance).toFixed(2)}
            </p>
            <p className="text-xs text-yellow-600 dark:text-yellow-400">
              Monto mínimo de retiro: $20.00 USD
            </p>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Tu solicitud de retiro será enviada a los administradores para su revisión. Una vez aprobada, el pago se procesará automáticamente a tu cuenta de PayPal. Puede tomar 2-5 días
              hábiles. La plataforma retiene una comisión del 3% sobre el monto solicitado.
            </p>
          </div>

          {!connectStatus?.connected || connectStatus.accountStatus?.status !== "active" ? (
            <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-900 rounded-lg p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                Necesitas conectar y verificar tu cuenta de PayPal para retirar fondos.
              </p>
              <Button onClick={handleConnectPayPal} className="w-full">
                <CreditCardIcon className="size-4 mr-2" />
                Conectar PayPal
              </Button>
            </div>
          ) : (
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowPayoutModal(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (!payoutAmount || parseFloat(payoutAmount) < 20) {
                    toast.error("El monto mínimo de retiro es $20.00 USD");
                    return;
                  }
                  if (parseFloat(payoutAmount) > parseFloat(balance.availableBalance)) {
                    toast.error("El monto excede tu saldo disponible");
                    return;
                  }
                  createPayout.mutate({ amount: parseFloat(payoutAmount) });
                }}
                disabled={createPayout.isPending || parseFloat(payoutAmount || "0") < 20}
              >
                {createPayout.isPending ? (
                  <>
                    <Loader2Icon className="size-4 mr-2 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  "Solicitar Retiro"
                )}
              </Button>
            </div>
          )}
        </div>
      </ResponsiveModal>
    </div>
  );
};

