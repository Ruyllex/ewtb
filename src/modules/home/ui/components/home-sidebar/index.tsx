import { Separator } from "@/components/ui/separator";
import { Sidebar, SidebarContent } from "@/components/ui/sidebar";
import { MainSection } from "./main-section";
import { PersonalSection } from "./personal-section";
import { LiveChannelsSection } from "./live-channels-section";

export const HomeSidebar = () => {
  return (
    <Sidebar className="pt-16 z-40 border-none" collapsible="icon">
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
