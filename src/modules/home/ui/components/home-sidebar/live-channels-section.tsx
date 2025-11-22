"use client";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { api } from "@/trpc/client";
import { RadioIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { THUMBNAIL_FALLBACK } from "@/modules/videos/constants";

export const LiveChannelsSection = () => {
  const { data } = api.live.getPublicStreams.useQuery(
    { limit: 5 },
    { 
      refetchInterval: 30000 // Refetch every 30s
    }
  );

  if (!data || data.items.length === 0) {
    return null;
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>En Vivo</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {data.items.map((stream) => (
            <SidebarMenuItem key={stream.id}>
              <SidebarMenuButton
                tooltip={stream.userName || "Usuario"}
                asChild
                className="text-white hover:bg-white/10"
              >
                <Link href={`/live/${stream.id}`} className="flex items-center gap-3">
                  <div className="relative size-6 shrink-0 rounded-full overflow-hidden">
                    <Image
                      src={stream.userImageUrl || THUMBNAIL_FALLBACK}
                      alt={stream.userName || "Avatar"}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="truncate text-sm font-medium">
                      {stream.userName}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {stream.title}
                    </span>
                  </div>
                  <div className="ml-auto flex items-center">
                    <RadioIcon className="size-3 text-red-500 animate-pulse" />
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
};

