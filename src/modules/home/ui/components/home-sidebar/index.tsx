import { Separator } from "@/components/ui/separator";
import { Sidebar, SidebarContent, SidebarHeader } from "@/components/ui/sidebar";
import { MainSection } from "./main-section";
import { PersonalSection } from "./personal-section";
import { LiveChannelsSection } from "./live-channels-section";
import Link from "next/link";
import Image from "next/image";

export const HomeSidebar = () => {
  return (
    <Sidebar className="pt-16 z-40 border-none" collapsible="icon">
      <SidebarHeader className="flex items-center justify-start py-4 pl-2 md:hidden">
        <Link href="/" className="flex items-center gap-2 w-full pl-2">
          <Image src="/logo.png" alt="Logo" width={32} height={32} />
          <p className="text-lg font-semibold tracking-tight text-white">
            FacuGo! Plus
          </p>
        </Link>
      </SidebarHeader>
      <SidebarContent className="bg-transparent">
        <MainSection />
        <Separator />
        <PersonalSection />
        <Separator />
        <LiveChannelsSection />
      </SidebarContent>
    </Sidebar>
  );
};
