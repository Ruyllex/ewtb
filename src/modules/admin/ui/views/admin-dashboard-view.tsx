"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, ShieldCheckIcon, Users, Video, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { InfiniteScroll } from "@/components/infinite-scroll";

export const AdminDashboardView = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();

  // Verificar si el usuario es admin
  const { data: isAdmin, isLoading: isLoadingAdmin } = useQuery({
    ...trpc.users.isAdmin.queryOptions(),
  });

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
  } = useInfiniteQuery(
    trpc.channels.getAll.infiniteQueryOptions(
      { limit: 20 },
      {
        getNextPageParam(lastPage) {
          return lastPage.nextCursor;
        },
      }
    )
  );

  const verifyChannel = useMutation(
    trpc.channels.verifyChannel.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries();
        toast.success("Canal verificado exitosamente");
      },
      onError: (error) => {
        toast.error(error.message || "Error al verificar el canal");
      },
    })
  );

  const unverifyChannel = useMutation(
    trpc.channels.unverifyChannel.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries();
        toast.success("Canal desverificado exitosamente");
      },
      onError: (error) => {
        toast.error(error.message || "Error al desverificar el canal");
      },
    })
  );

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
    return null; // El useEffect redirigirá
  }

  const channels = channelsData?.pages.flatMap((page) => page.items) || [];

  return (
    <div className="max-w-[2400px] mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <ShieldCheckIcon className="h-8 w-8 text-blue-500" />
        <h1 className="text-3xl font-bold">Dashboard Administrativo</h1>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Gestión de Canales</h2>
        <p className="text-muted-foreground mb-6">
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
          <>
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
                            <CheckCircle2 className="h-5 w-5 text-blue-500 fill-blue-500 shrink-0" />
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
                        className="flex-1"
                      >
                        <Link href={`/channel/${channel.userUsername || ""}`}>
                          Ver Canal
                        </Link>
                      </Button>
                      {channel.isVerified ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => unverifyChannel.mutate({ channelId: channel.id })}
                          disabled={unverifyChannel.isPending}
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
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Verificar
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
          </>
        )}
      </div>
    </div>
  );
};

