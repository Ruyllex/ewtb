
"use client"
import { api as trpc } from "@/trpc/client";
import { ChannelHeader } from "../components/channel-header";
import { ChannelContent } from "../components/channel-content";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@clerk/nextjs";
// ELIMINADO: import { useQuery } from "@tanstack/react-query";

interface ChannelViewProps {
  username: string;
}

export const ChannelView = ({ username }: ChannelViewProps) => {
  // ELIMINADO: const trpc = useTRPC();
  const { isSignedIn } = useAuth();

  // 🛑 CORREGIDO: Uso de trpc.procedimiento.useQuery(input)
  const { data: channel, isLoading, error } = trpc.channels.getByUsername.useQuery({ username });

  if (isLoading) {
    return (
      <div className="flex flex-col">
        <div className="relative h-64 w-full bg-muted">
          <Skeleton className="absolute bottom-0 left-8 -mb-16 h-32 w-32 rounded-full border-4 border-background" />
        </div>
        <div className="mt-20 px-8 pb-8">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-4 w-96 mb-2" />
          <Skeleton className="h-4 w-80" />
        </div>
      </div>
    );
  }

  if (error || !channel) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Canal no encontrado</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <ChannelHeader channel={channel} isSignedIn={isSignedIn} />
      <ChannelContent username={username} channelId={channel.id} />
    </div>
  );
};