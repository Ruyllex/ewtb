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
import { LogOutIcon, VideoIcon, RadioIcon, DollarSignIcon, SettingsIcon } from "lucide-react";
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
    <Sidebar className="pt-16 z-40" collapsible="icon">
      <SidebarContent className="bg-background">
        <SidebarGroup>
          <SidebarMenu>
            <StudioSidebarHeader />
            <SidebarMenuItem>
              <SidebarMenuButton isActive={mounted && pathname === "/studio"} tooltip={"Content"} asChild>
                <Link href={"/studio"} prefetch>
                  <VideoIcon className="size-5" />
                  <span className="text-sm">Content</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={mounted && pathname?.startsWith("/studio/live")}
                tooltip={"Live Streams"}
                asChild
              >
                <Link href={"/studio/live"} prefetch>
                  <RadioIcon className="size-5" />
                  <span className="text-sm">Live Streams</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={mounted && pathname?.startsWith("/studio/earnings")}
                tooltip={"Earnings"}
                asChild
              >
                <Link href={"/studio/earnings"} prefetch>
                  <DollarSignIcon className="size-5" />
                  <span className="text-sm">Earnings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={mounted && pathname?.startsWith("/studio/settings")}
                tooltip={"Settings"}
                asChild
              >
                <Link href={"/studio/settings"} prefetch>
                  <SettingsIcon className="size-5" />
                  <span className="text-sm">Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
                <Separator />
            <SidebarMenuItem>
              <SidebarMenuButton tooltip={"Exit studio"} asChild>
                <Link href={"/"} prefetch>
                  <LogOutIcon className="size-5" />
                  <span className="text-sm">Exit studio</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};
