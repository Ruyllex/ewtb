"use client";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth, useClerk } from "@clerk/nextjs";
import { FlameIcon, HomeIcon, PlaySquareIcon, RadioIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  {
    title: "Home",
    url: "/",
    icon: HomeIcon,
  },
  {
    title: "Live",
    url: "/feed/live",
    icon: RadioIcon,
  },
  {
    title: "Subscriptions",
    url: "/feed/subscriptions",
    icon: PlaySquareIcon,
    auth: true,
  },
  {
    title: "Trending",
    url: "/feed/trending",
    icon: FlameIcon,
    auth: true,
  },
];

export const MainSection = () => {
  const clerk = useClerk();
  const { isSignedIn } = useAuth();
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const isActive = pathname === item.url;
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  asChild
                  isActive={isActive}
                  onClick={(e) => {
                    if (!isSignedIn && item.auth) {
                      e.preventDefault();
                      return clerk.openSignIn({ redirectUrl: item.url });
                    }
                  }}
                  className={cn(
                    "h-10 px-3 rounded-xl transition-all duration-200",
                    isActive 
                      ? "bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary" 
                      : "text-white hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Link href={item.url} prefetch className="flex items-center gap-4 font-medium">
                    <item.icon
                      className={cn(
                        "size-5",
                        isActive ? "fill-current" : ""
                      )}
                    />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
};
