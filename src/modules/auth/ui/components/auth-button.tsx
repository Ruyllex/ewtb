"use client";

import { Button } from "@/components/ui/button";
import { ClapperboardIcon, LoaderIcon, UserCircleIcon, ShieldCheckIcon } from "lucide-react";
import { useState, useEffect } from "react";

import { ClerkLoading, SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { api } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";

export const AuthButton = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Verificar si el usuario es admin
  const { data: isAdmin } = api.users.isAdmin.useQuery( // 🛑 CORRECCIÓN: Usamos .useQuery
      undefined, // Si no toma parámetros, pasamos 'undefined'
      {
        enabled: mounted,
      }
    );

  // Renderizar un placeholder durante SSR para evitar errores de hidratación
  if (!mounted) {
    return (
      <div className="w-full flex items-center justify-center">
        <LoaderIcon className="h-5 w-5 text-gray-500/80 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <ClerkLoading>
        <div className="w-full flex items-center justify-center">
          <LoaderIcon className="h-5 w-5 text-gray-500/80 animate-spin" />
        </div>
      </ClerkLoading>
      <SignedIn>
        <UserButton>
          <UserButton.MenuItems>
            {/* Todo: Add user profile menu button */}
            <UserButton.Link href="/studio" label="Studio" labelIcon={<ClapperboardIcon className="size-4" />} />
            {isAdmin && (
              <UserButton.Link 
                href="/admin" 
                label="Dashboard Admin" 
                labelIcon={<ShieldCheckIcon className="size-4" />} 
              />
            )}
            <UserButton.Action label="manageAccount" />
          </UserButton.MenuItems>
        </UserButton>

        {/* Add menu items here for studio and User profile */}
      </SignedIn>
      <SignedOut>
        <SignInButton mode="modal">
          <Button
            variant={"outline"}
            className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-500 border-blue-500/20 rounded-full shadow-none"
          >
            <UserCircleIcon className="h-5 w-5" />
            Sign in
          </Button>
        </SignInButton>
      </SignedOut>
    </>
  );
};
