"use client";

import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { LogOutIcon, VideoIcon, RadioIcon, DollarSignIcon, SettingsIcon, BarChart3Icon, SparklesIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { StudioSidebarHeader } from "./studio-sidebar-header";
import { useState, useEffect } from "react";

export const StudioSidebar = () => {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Sidebar className="pt-16 z-40 border-none" collapsible="icon">
      <SidebarContent className="bg-transparent">
        <SidebarGroup>
          <SidebarMenu>
            <StudioSidebarHeader />
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={mounted && pathname === "/studio"}
                tooltip={"Content"}
                className="transition-colors hover:bg-white/10 hover:backdrop-blur"
                asChild
              >
                <Link href={"/studio"} prefetch className="text-white">
                  <VideoIcon className="size-5 text-white" />
                  <span className="text-sm text-white">Content</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={mounted && pathname?.startsWith("/studio/live")}
                tooltip={"Live Streams"}
                className="transition-colors hover:bg-white/10 hover:backdrop-blur"
                asChild
              >
                <Link href={"/studio/live"} prefetch className="text-white">
                  <RadioIcon className="size-5 text-white" />
                  <span className="text-sm text-white">Live Streams</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={mounted && pathname?.startsWith("/studio/earnings")}
                tooltip={"Earnings"}
                className="transition-colors hover:bg-white/10 hover:backdrop-blur"
                asChild
              >
                <Link href={"/studio/earnings"} prefetch className="text-white">
                  <DollarSignIcon className="size-5 text-white" />
                  <span className="text-sm text-white">Earnings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={mounted && pathname?.startsWith("/studio/settings")}
                tooltip={"Settings"}
                className="transition-colors hover:bg-white/10 hover:backdrop-blur"
                asChild
              >
                <Link href={"/studio/settings"} prefetch className="text-white">
                  <SettingsIcon className="size-5 text-white" />
                  <span className="text-sm text-white">Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={mounted && pathname?.startsWith("/studio/analytics")}
                tooltip={"Analytics"}
                className="transition-colors hover:bg-white/10 hover:backdrop-blur"
                asChild
              >
                <Link href={"/studio/analytics"} prefetch className="text-white">
                  <BarChart3Icon className="size-5 text-white" />
                  <span className="text-sm text-white">Analytics</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={mounted && pathname?.startsWith("/studio/community")}
                tooltip={"Community"}
                className="transition-colors hover:bg-white/10 hover:backdrop-blur"
                asChild
              >
                <Link href={"/studio/community"} prefetch className="text-white">
                  <SparklesIcon className="size-5 text-white" />
                  <span className="text-sm text-white">Community</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <Separator />
            <SidebarMenuItem>
              <SidebarMenuButton tooltip={"Exit studio"} className="transition-colors hover:bg-white/10 hover:backdrop-blur" asChild>
                <Link href={"/"} prefetch className="text-white">
                  <LogOutIcon className="size-5 text-white" />
                  <span className="text-sm text-white">Exit studio</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};
