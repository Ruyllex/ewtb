import { SidebarProvider } from "@/components/ui/sidebar";
import { JSX } from "react";
import { HomeNavbar } from "../components/home-navbar";
import { HomeSidebar } from "../components/home-sidebar";
import { GlobalFooter } from "@/components/global-footer";

interface HomeLayoutProps {
  children: JSX.Element;
}

export const HomeLayout = ({ children }: HomeLayoutProps) => {
  return (
    <SidebarProvider>
      <div className="w-full flex flex-col min-h-screen">
        <HomeNavbar />
        <div className="flex flex-1 pt-[4rem]">
          <HomeSidebar />
          <main className="flex-1 overflow-y-auto flex flex-col">
            <div className="flex-1">{children}</div>
            <GlobalFooter />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
