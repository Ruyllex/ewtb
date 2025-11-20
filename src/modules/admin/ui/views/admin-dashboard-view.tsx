// src/modules/admin/ui/views/admin-dashboard-view.tsx
"use client";

import { api } from "@/trpc/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

// Componentes de UI consolidados
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { InfiniteScroll } from "@/components/infinite-scroll";

// Utilidades e Iconos
import { toast } from "sonner";
import Image from "next/image";
import Link from "next/link";
import { Check, XCircle, ShieldCheckIcon, AlertTriangle, DollarSignIcon, WalletIcon, Loader2Icon, X, CheckCircle, Bell } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveModal } from "@/components/responsive-dialog";
import { TimeAgo } from "@/components/time-ago";


export const AdminDashboardView = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("channels");
  const [showManualActivationModal, setShowManualActivationModal] = useState(false);
  const [manualActivationUserId, setManualActivationUserId] = useState("");
  const [manualActivationEmail, setManualActivationEmail] = useState("");

  // Verificar si el usuario es admin
  const { data: isAdmin, isLoading: isLoadingAdmin } = api.users.isAdmin.useQuery();

  // Si no es admin, redirigir
  useEffect(() => {
    if (!isLoadingAdmin && !isAdmin) {
      toast.error("No tienes permisos para acceder a esta página");
      router.push("/");
    }
  }, [isAdmin, isLoadingAdmin, router]);

  // Obtener todos los canales
  const {
    data: channelsData,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isLoading: isLoadingChannels,
  } = api.channels.getAll.useInfiniteQuery({ limit: 20 }, {
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const verifyChannel = api.channels.verifyChannel.useMutation({
    onSuccess: () => {
      // Invalidación específica para mejor rendimiento
      queryClient.invalidateQueries({ queryKey: [["channels"], "getAll"] }); 
      toast.success("Canal verificado exitosamente");
    },
    onError: (error) => {
      toast.error(error.message || "Error al verificar el canal");
    },
  });

  const unverifyChannel = api.channels.unverifyChannel.useMutation({
    onSuccess: () => {
      // Invalidación específica para mejor rendimiento
      queryClient.invalidateQueries({ queryKey: [["channels"], "getAll"] }); 
      toast.success("Canal desverificado exitosamente");
    },
    onError: (error) => {
      toast.error(error.message || "Error al desverificar el canal");
    },
  });

  // Obtener solicitudes de monetización
  const { data: monetizationRequests, isLoading: isLoadingMonetizationRequests, refetch: refetchMonetizationRequests } = api.monetization.getMonetizationRequests.useQuery({
    limit: 50,
    offset: 0,
    status: "pending",
  });

  // Obtener solicitudes de retiro
  const { data: payoutRequests, isLoading: isLoadingPayoutRequests, refetch: refetchPayoutRequests } = api.monetization.getPayoutRequests.useQuery({
    limit: 50,
    offset: 0,
    status: "pending",
  });

  // Mutaciones para revisar solicitudes de monetización
  const reviewMonetizationRequest = api.monetization.reviewMonetizationRequest.useMutation({
    onSuccess: () => {
      toast.success("Solicitud de monetización revisada exitosamente");
      refetchMonetizationRequests();
      queryClient.invalidateQueries({ queryKey: api.monetization.getMonetizationRequests.queryKey() });
    },
    onError: (error) => {
      toast.error(error.message || "Error al revisar la solicitud");
    },
  });

  // Mutaciones para revisar solicitudes de retiro
  const reviewPayoutRequest = api.monetization.reviewPayoutRequest.useMutation({
    onSuccess: () => {
      toast.success("Solicitud de retiro procesada exitosamente");
      refetchPayoutRequests();
      queryClient.invalidateQueries({ queryKey: api.monetization.getPayoutRequests.queryKey() });
    },
    onError: (error) => {
      toast.error(error.message || "Error al procesar la solicitud de retiro");
    },
  });

  // Mutación para activación manual
  const activateMonetizationManually = api.monetization.activateMonetizationManually.useMutation({
    onSuccess: () => {
      toast.success("Monetización activada manualmente exitosamente");
      setShowManualActivationModal(false);
      setManualActivationUserId("");
      setManualActivationEmail("");
      refetchMonetizationRequests();
    },
    onError: (error) => {
      toast.error(error.message || "Error al activar la monetización");
    },
  });

  if (isLoadingAdmin) {
    return (
      <div className="max-w-[2400px] mx-auto px-4 py-6">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return <div></div>; // El useEffect redirigirá, pero necesitamos retornar un elemento válido
  }

  const channels = channelsData?.pages.flatMap((page) => page.items) || [];
  
  // Calcular total de solicitudes pendientes
  const pendingMonetizationCount = monetizationRequests?.length || 0;
  const pendingPayoutCount = payoutRequests?.length || 0;
  const totalPendingRequests = pendingMonetizationCount + pendingPayoutCount;

  return (
    <div className="max-w-[2400px] mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <ShieldCheckIcon className="h-8 w-8 text-[#5ADBFD]" />
            {totalPendingRequests > 0 && (
              <div className="absolute -top-2 -right-2 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-white">{totalPendingRequests}</span>
              </div>
            )}
          </div>
          <h1 className="text-3xl font-bold text-white">Dashboard Administrativo</h1>
          {totalPendingRequests > 0 && (
            <Badge variant="destructive" className="ml-2 animate-pulse">
              <Bell className="h-3 w-3 mr-1" />
              {totalPendingRequests} solicitud{totalPendingRequests > 1 ? "es" : ""} pendiente{totalPendingRequests > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowManualActivationModal(true)}
            variant="outline"
            className="gap-2 border-[#5ADBFD] text-[#5ADBFD] hover:bg-[#5ADBFD] hover:text-black transition-colors"
          >
            <DollarSignIcon className="h-4 w-4" />
            Activar Monetización
          </Button>
          <Button asChild variant="outline" className="gap-2 border-[#5ADBFD] text-[#5ADBFD] hover:bg-[#5ADBFD] hover:text-black transition-colors">
            <Link href="/admin/reports">
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Ver Reportes
              </span>
            </Link>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="channels">Canales</TabsTrigger>
          <TabsTrigger value="monetization" className="relative">
            Solicitudes de Monetización
            {pendingMonetizationCount > 0 && (
              <span className="ml-2 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                {pendingMonetizationCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="payouts" className="relative">
            Solicitudes de Retiro
            {pendingPayoutCount > 0 && (
              <span className="ml-2 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                {pendingPayoutCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="channels" className="mt-6">

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-white">Gestión de Canales</h2>
        <p className="text-white/70 mb-6">
          Verifica o desverifica canales. Los canales verificados mostrarán un check azul.
        </p>

        {isLoadingChannels ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : channels.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No hay canales registrados</p>
            </CardContent>
          </Card>
        ) : (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {channels.map((channel) => (
                <Card key={channel.id}>
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <div className="relative w-16 h-16 rounded-full overflow-hidden bg-muted shrink-0">
                        <Image
                          src={channel.avatar || channel.userImageUrl || "/placeholder.svg"}
                          alt={channel.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-lg line-clamp-1">{channel.name}</CardTitle>
                          {channel.isVerified && (
                          <div className="h-5 w-5 rounded-full bg-[#5ADBFD] flex items-center justify-center">
                            <Check className="h-3.5 w-3.5 text-white stroke-[3]" />
                          </div>
                          )}
                        </div>
                        {channel.userUsername && (
                          <CardDescription>@{channel.userUsername}</CardDescription>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {channel.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                        {channel.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mb-4">
                      <Badge variant={channel.isVerified ? "default" : "secondary"}>
                        {channel.isVerified ? "Verificado" : "No verificado"}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="flex-1 border-[#5ADBFD] text-[#5ADBFD] hover:bg-[#5ADBFD] hover:text-black transition-colors"
                      >
                        <Link href={`/channel/${channel.userUsername || ""}`}>
                          Ver Canal
                        </Link>
                      </Button>
                      {channel.isVerified ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => unverifyChannel.mutate({ channelId: channel.id })}
                          disabled={unverifyChannel.isPending}
                          className="border-red-500/70 text-red-400 hover:bg-red-500/20 hover:border-red-500 hover:text-red-300 transition-colors disabled:opacity-50"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Desverificar
                        </Button>
                      ) : (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => verifyChannel.mutate({ channelId: channel.id })}
                          disabled={verifyChannel.isPending}
                          className="bg-[#5ADBFD] text-black hover:bg-[#4AD0F0] transition-colors disabled:opacity-50 font-medium"
                        >
                         {/* Contenido agrupado en un span para prevenir errores de múltiples hijos */}
                          <span className="flex items-center gap-2"> 
                            <div className="h-5 w-5 rounded-full bg-black/10 flex items-center justify-center shrink-0">
                              <Check className="h-3.5 w-3.5 text-black stroke-[3]" />
                            </div>
                            Verificar
                          </span>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <InfiniteScroll
              isManual
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              fetchNextPage={fetchNextPage}
            />
          </div>
        )}
      </div>
        </TabsContent>

        <TabsContent value="monetization" className="mt-6">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-white">Solicitudes de Monetización</h2>
            <p className="text-white/70 mb-6">
              Revisa y aprueba o rechaza las solicitudes de monetización de los usuarios.
            </p>

            {isLoadingMonetizationRequests ? (
              <div className="grid grid-cols-1 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            ) : monetizationRequests && monetizationRequests.length > 0 ? (
              <div className="space-y-4">
                {monetizationRequests.map((request) => (
                  <Card key={request.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="relative w-12 h-12 rounded-full overflow-hidden bg-muted shrink-0">
                            <Image
                              src={request.user?.imageUrl || "/user-placeholder.svg"}
                              alt={request.user?.name || "Usuario"}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg">{request.user?.name || "Usuario desconocido"}</CardTitle>
                            <CardDescription>
                              @{request.user?.username || "sin-usuario"} • {request.paypalEmail}
                            </CardDescription>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant={request.status === "pending" ? "secondary" : request.status === "approved" ? "default" : "destructive"}>
                                {request.status === "pending" ? "Pendiente" : request.status === "approved" ? "Aprobado" : "Rechazado"}
                              </Badge>
                              {request.user?.canMonetize && (
                                <Badge variant="default" className="bg-green-500">
                                  Monetización Activa
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">
                              <TimeAgo date={request.createdAt} />
                            </p>
                          </div>
                        </div>
                        {request.status === "pending" && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                reviewMonetizationRequest.mutate({
                                  requestId: request.id,
                                  action: "approve",
                                });
                              }}
                              disabled={reviewMonetizationRequest.isPending}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Aprobar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                const reason = prompt("Razón del rechazo (opcional):");
                                reviewMonetizationRequest.mutate({
                                  requestId: request.id,
                                  action: "reject",
                                  rejectionReason: reason || undefined,
                                });
                              }}
                              disabled={reviewMonetizationRequest.isPending}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Rechazar
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-sm">
                          <strong>Email PayPal:</strong> {request.paypalEmail}
                        </p>
                        <p className="text-sm">
                          <strong>Términos aceptados:</strong> {request.termsAccepted ? "Sí" : "No"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">No hay solicitudes de monetización pendientes</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="payouts" className="mt-6">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-white">Solicitudes de Retiro</h2>
            <p className="text-white/70 mb-6">
              Revisa y procesa las solicitudes de retiro de fondos de los usuarios. La comisión del 3% se aplica automáticamente.
            </p>

            {isLoadingPayoutRequests ? (
              <div className="grid grid-cols-1 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            ) : payoutRequests && payoutRequests.length > 0 ? (
              <div className="space-y-4">
                {payoutRequests.map((payout) => (
                  <Card key={payout.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="relative w-12 h-12 rounded-full overflow-hidden bg-muted shrink-0">
                            <Image
                              src={payout.user?.imageUrl || "/user-placeholder.svg"}
                              alt={payout.user?.name || "Usuario"}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg">{payout.user?.name || "Usuario desconocido"}</CardTitle>
                            <CardDescription>
                              @{payout.user?.username || "sin-usuario"} • {payout.user?.paypalAccountId || "Sin email PayPal"}
                            </CardDescription>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant={payout.status === "pending" ? "secondary" : payout.status === "completed" ? "default" : "destructive"}>
                                {payout.status === "pending" ? "Pendiente" : payout.status === "completed" ? "Completado" : "Fallido"}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">
                              <TimeAgo date={payout.createdAt} />
                            </p>
                          </div>
                        </div>
                        {payout.status === "pending" && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                reviewPayoutRequest.mutate({
                                  payoutId: payout.id,
                                  action: "approve",
                                });
                              }}
                              disabled={reviewPayoutRequest.isPending}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Procesar Pago
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                const reason = prompt("Razón del rechazo (opcional):");
                                reviewPayoutRequest.mutate({
                                  payoutId: payout.id,
                                  action: "reject",
                                  rejectionReason: reason || undefined,
                                });
                              }}
                              disabled={reviewPayoutRequest.isPending}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Rechazar
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Monto Solicitado</p>
                            <p className="text-lg font-semibold">${parseFloat(payout.amount).toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Comisión (3%)</p>
                            <p className="text-lg font-semibold text-yellow-600">-${parseFloat(payout.platformFee).toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Monto Neto</p>
                            <p className="text-lg font-semibold text-green-600">${parseFloat(payout.netAmount).toFixed(2)}</p>
                          </div>
                        </div>
                        {payout.failureReason && (
                          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-lg p-3 mt-2">
                            <p className="text-sm text-red-800 dark:text-red-200">
                              <strong>Razón del fallo:</strong> {payout.failureReason}
                            </p>
                          </div>
                        )}
                        {payout.paypalPayoutId && (
                          <p className="text-xs text-muted-foreground mt-2">
                            PayPal Payout ID: {payout.paypalPayoutId}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">No hay solicitudes de retiro pendientes</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal de Activación Manual */}
      <ResponsiveModal
        title="Activar Monetización Manualmente"
        open={showManualActivationModal}
        onOpenChange={setShowManualActivationModal}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="manual-user-id">ID del Usuario</Label>
            <Input
              id="manual-user-id"
              type="text"
              placeholder="UUID del usuario"
              value={manualActivationUserId}
              onChange={(e) => setManualActivationUserId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Ingresa el ID (UUID) del usuario al que quieres activar la monetización.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="manual-email">Email de PayPal</Label>
            <Input
              id="manual-email"
              type="email"
              placeholder="email@paypal.com"
              value={manualActivationEmail}
              onChange={(e) => setManualActivationEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              El email debe estar asociado a una cuenta de PayPal válida.
            </p>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-900 rounded-lg p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              ⚠️ Esta acción activará la monetización sin necesidad de que el usuario la solicite primero.
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowManualActivationModal(false);
                setManualActivationUserId("");
                setManualActivationEmail("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!manualActivationUserId || !manualActivationUserId.trim()) {
                  toast.error("Por favor, ingresa el ID del usuario");
                  return;
                }
                if (!manualActivationEmail || !manualActivationEmail.includes("@")) {
                  toast.error("Por favor, ingresa un email de PayPal válido");
                  return;
                }
                activateMonetizationManually.mutate({
                  userId: manualActivationUserId.trim(),
                  paypalEmail: manualActivationEmail.trim(),
                });
              }}
              disabled={activateMonetizationManually.isPending || !manualActivationUserId || !manualActivationEmail}
            >
              {activateMonetizationManually.isPending ? (
                <>
                  <Loader2Icon className="size-4 mr-2 animate-spin" />
                  Activando...
                </>
              ) : (
                "Activar Monetización"
              )}
            </Button>
          </div>
        </div>
      </ResponsiveModal>
    </div>
  );
};