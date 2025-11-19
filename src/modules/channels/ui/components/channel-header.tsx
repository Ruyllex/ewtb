// src/modules/channels/ui/components/channel-header.tsx
"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
// 🛑 CORREGIDO: Importamos 'api' como 'trpc'
import { api as trpc } from "@/trpc/client"; 
// 🛑 ELIMINADO: Ya no necesitamos importar useQuery ni useMutation de React Query
import { useQueryClient } from "@tanstack/react-query";
import { Check, Bell, BellOff } from "lucide-react"; 
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { UploadButton } from "@/lib/uploadthing";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface ChannelHeaderProps {
  channel: {
    id: string;
    name: string;
    description: string | null;
    avatar: string | null;
    banner: string | null;
    isVerified: boolean;
    user: {
      id: string;
      name: string;
      username: string | null;
      imageUrl: string;
    };
    subscriberCount: number;
    videoCount: number;
  };
  isSignedIn: boolean;
}

export const ChannelHeader = ({ channel, isSignedIn }: ChannelHeaderProps) => {
  // 🛑 ELIMINADO: const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const router = useRouter();
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const [isUpdatingBanner, setIsUpdatingBanner] = useState(false);

  // 🛑 CORREGIDO: Uso de trpc.channels.isSubscribed.useQuery
  const { data: isSubscribed, isLoading: isLoadingSubscription } = trpc.channels.isSubscribed.useQuery(
    { channelId: channel.id },
    { 
      enabled: isSignedIn && userId !== channel.user.id,
    }
  );

  // 🛑 CORREGIDO: Uso de trpc.channels.toggleSubscription.useMutation
  const toggleSubscription = trpc.channels.toggleSubscription.useMutation({
    onSuccess: (data) => {
      // Corregido: invalidar queries
      queryClient.invalidateQueries(); 
      toast.success(data.subscribed ? "Te has suscrito al canal" : "Te has desuscrito del canal");
    },
    onError: (error) => {
      toast.error(error.message || "Error al suscribirse");
    },
  });

  const isOwner = userId === channel.user.id;
  const avatarUrl = channel.avatar || channel.user.imageUrl;
  const bannerUrl = channel.banner || "/placeholder.svg";

  return (
    <div className="relative">
      {/* Banner */}
      <div className="relative h-64 w-full bg-muted group">
        {bannerUrl && (
          <Image
            src={bannerUrl}
            alt={`Banner de ${channel.name}`}
            fill
            className="object-cover"
            priority
          />
        )}
        {isOwner && (
          <>
            {/* Overlay con botón de subir al hacer hover */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
              <UploadButton
                endpoint="channelBannerUploader"
                onUploadBegin={() => setIsUpdatingBanner(true)}
                onClientUploadComplete={(res) => {
                  setIsUpdatingBanner(false);
                  toast.success("Banner actualizado correctamente");
                  // Invalidar queries después de un breve delay
                  setTimeout(() => {
                    queryClient.invalidateQueries();
                  }, 500);
                }}
                onUploadError={(error) => {
                  setIsUpdatingBanner(false);
                  console.error("Upload error details:", {
                    error,
                    message: error?.message,
                    code: (error as any)?.code,
                    data: (error as any)?.data,
                    stack: error?.stack,
                  });
                  const errorMessage = error?.message || (error as any)?.data?.message || error?.toString() || "Error desconocido";
                  toast.error(`Error al subir el banner: ${errorMessage}`);
                }}
                className="ut-button:bg-primary ut-button:text-white ut-button:border-white ut-button:ut-readying:bg-primary/50"
              />
            </div>
            {/* Indicador de carga */}
            {isUpdatingBanner && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent" />
              </div>
            )}
          </>
        )}
      </div>

      {/* Channel Info */}
      <div className="px-8 pb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-16">
          {/* Avatar */}
          {isOwner ? (
            <div className="relative group">
              <div className="relative h-32 w-32 rounded-full border-4 border-background overflow-hidden bg-muted">
                {isUpdatingAvatar ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted z-30">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  </div>
                ) : (
                  <Image
                    src={avatarUrl}
                    alt={channel.name}
                    fill
                    className="object-cover"
                    priority
                  />
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-20">
                  <UploadButton
                    endpoint="channelAvatarUploader"
                    onUploadBegin={() => setIsUpdatingAvatar(true)}
                    onClientUploadComplete={(res) => {
                      setIsUpdatingAvatar(false);
                      toast.success("Avatar actualizado correctamente");
                      // Invalidar queries después de un breve delay
                      setTimeout(() => {
                        queryClient.invalidateQueries();
                      }, 500);
                    }}
                    onUploadError={(error) => {
                      setIsUpdatingAvatar(false);
                      const errorMessage = error?.message || error?.toString() || "Error desconocido";
                      toast.error(`Error al subir el avatar: ${errorMessage}`);
                      console.error("Upload error:", error);
                    }}
                    className="ut-button:bg-transparent ut-button:text-white ut-button:border-white ut-button:ut-readying:bg-transparent"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="relative h-32 w-32 rounded-full border-4 border-background overflow-hidden bg-muted">
              <Image
                src={avatarUrl}
                alt={channel.name}
                fill
                className="object-cover"
                priority
              />
            </div>
          )}

          {/* Channel Details */}
          <div className="flex-1 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pt-4 sm:pt-0">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{channel.name}</h1>
                {channel.isVerified && (
                  // 👇 CAMBIO: Usando Check
                  <div className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center">
                    <Check className="h-3.5 w-3.5 text-white stroke-[3]" />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>@{channel.user.username || "sin-username"}</span>
                <span>{channel.subscriberCount.toLocaleString()} suscriptores</span>
                <span>{channel.videoCount} videos</span>
              </div>
              {channel.description && (
                <p className="text-sm text-muted-foreground max-w-2xl mt-2">{channel.description}</p>
              )}
            </div>
            {/* Subscribe Button */}
            {isSignedIn && !isOwner && (
              <Button
                onClick={() => toggleSubscription.mutate({ channelId: channel.id })}
                disabled={isLoadingSubscription || toggleSubscription.isPending}
                variant={isSubscribed?.subscribed ? "outline" : "default"}
                className="shrink-0"
              >
                {isLoadingSubscription ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : isSubscribed?.subscribed ? (
                  <>
                    <BellOff className="h-4 w-4 mr-2" />
                    Suscrito
                  </>
                ) : (
                  <>
                    <Bell className="h-4 w-4 mr-2" />
                    Suscribirse
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
      <div className="absolute top-0 right-0 p-4">
        {/* Solo para fines de depuración, mantener o remover según necesidad */}
        {process.env.NODE_ENV !== 'production' && <span className="text-xs text-white bg-black/50 p-1 rounded">Debug: Tkn ID: {process.env.NEXT_PUBLIC_MUX_TOKEN_ID ? 'Sí' : 'No'}</span>}
      </div>
    </div>
  );
};
