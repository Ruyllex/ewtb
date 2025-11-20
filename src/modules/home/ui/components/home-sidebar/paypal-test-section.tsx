"use client";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import { PayPalTestButton } from "@/components/paypal-test-button";

export const PayPalTestSection = () => {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-white/70">Pruebas</SidebarGroupLabel>
      <SidebarGroupContent>
        <div className="px-2 pb-2">
          <PayPalTestButton />
        </div>
      </SidebarGroupContent>
    </SidebarGroup>
  );
};

