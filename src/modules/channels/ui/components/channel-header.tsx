"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Bell, BellOff } from "lucide-react";
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
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const router = useRouter();
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const [isUpdatingBanner, setIsUpdatingBanner] = useState(false);

  const { data: isSubscribed, isLoading: isLoadingSubscription } = useQuery({
    ...trpc.channels.isSubscribed.queryOptions({ channelId: channel.id }),
    enabled: isSignedIn && userId !== channel.user.id,
  });

  const toggleSubscription = useMutation(
    trpc.channels.toggleSubscription.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries();
        toast.success(data.subscribed ? "Te has suscrito al canal" : "Te has desuscrito del canal");
      },
      onError: (error) => {
        toast.error(error.message || "Error al suscribirse");
      },
    })
  );

  const isOwner = userId === channel.user.id;
  const avatarUrl = channel.avatar || channel.user.imageUrl;
  const bannerUrl = channel.banner || "/placeholder.svg";

  return (
    <div className="relative">
      {/* Banner */}
      <div className="relative h-64 w-full bg-muted">
        {isOwner && (
          <div className="absolute top-4 right-4 z-10">
            <UploadButton
              endpoint="channelBannerUploader"
              onUploadBegin={() => setIsUpdatingBanner(true)}
              onClientUploadComplete={() => {
                setIsUpdatingBanner(false);
                queryClient.invalidateQueries();
                toast.success("Banner actualizado");
              }}
              onUploadError={() => {
                setIsUpdatingBanner(false);
                toast.error("Error al subir el banner");
              }}
              className="ut-button:bg-primary ut-button:ut-readying:bg-primary/50"
            />
          </div>
        )}
        {bannerUrl && (
          <Image
            src={bannerUrl}
            alt={`Banner de ${channel.name}`}
            fill
            className="object-cover"
            priority
          />
        )}
      </div>

      {/* Channel Info */}
      <div className="px-8 pb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-16">
          {/* Avatar */}
          <div className="relative">
            {isOwner && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 hover:opacity-100 transition-opacity cursor-pointer z-10">
                <UploadButton
                  endpoint="channelAvatarUploader"
                  onUploadBegin={() => setIsUpdatingAvatar(true)}
                  onClientUploadComplete={() => {
                    setIsUpdatingAvatar(false);
                    queryClient.invalidateQueries();
                    toast.success("Avatar actualizado");
                  }}
                  onUploadError={() => {
                    setIsUpdatingAvatar(false);
                    toast.error("Error al subir el avatar");
                  }}
                  className="ut-button:bg-transparent ut-button:text-white ut-button:border-white ut-button:ut-readying:bg-transparent"
                />
              </div>
            )}
            <div className="relative h-32 w-32 rounded-full border-4 border-background overflow-hidden bg-muted">
              {isUpdatingAvatar ? (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
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
            </div>
          </div>

          {/* Channel Details */}
          <div className="flex-1 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pt-4 sm:pt-0">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{channel.name}</h1>
                {channel.isVerified && (
                  <CheckCircle2 className="h-6 w-6 text-blue-500 fill-blue-500" />
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
    </div>
  );
};

