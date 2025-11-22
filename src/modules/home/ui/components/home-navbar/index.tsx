"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { AuthButton } from "@/modules/auth/ui/components/auth-button";
import { StarsBalance } from "@/components/stars-balance";
import Image from "next/image";
import Link from "next/link";
import { Suspense, useState } from "react";
import { SearchInput } from "./search-input";
import { SignedIn } from "@clerk/nextjs";
import { SearchIcon, ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export const HomeNavbar = () => {
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-transparent backdrop-blur-sm flex items-center px-2 pr-5 z-50">
      <div className="flex items-center gap-4 w-full h-full">
        
        {/* Mobile Search View - Overlay */}
        {isMobileSearchOpen ? (
          <div className="flex w-full items-center gap-2 px-2 absolute inset-0 bg-[#0F1025] z-50 h-16 animate-in fade-in slide-in-from-top-2 duration-200">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsMobileSearchOpen(false)}
              className="shrink-0 text-white hover:bg-white/10"
            >
              <ArrowLeftIcon className="size-5" />
            </Button>
            <div className="flex-1 max-w-full">
               <Suspense fallback={<div className="w-full h-10" />}>
                 <SearchInput autoFocus />
               </Suspense>
            </div>
          </div>
        ) : null}

        {/* Desktop/Default View */}
        <div className={`flex items-center shrink-0 ${isMobileSearchOpen ? 'hidden' : 'flex'}`}>
          <SidebarTrigger />

          <Link href={"/"}>
            <div className="flex items-center gap-2 p-4">
              <Image src={"/logo.png"} alt={"Logo"} width={40} height={40} priority />
              <p className="text-xl font-semibold tracking-tight text-white hidden xl:block">FacuGo! Plus</p>
            </div>
          </Link>
        </div>

        {/* Search bar container */}
        <div className="flex-1 flex justify-center max-w-[720px] mx-auto">
          {/* Desktop Search */}
          <div className="hidden md:block w-full max-w-[600px]">
            <Suspense fallback={<div className="w-full h-10" />}>
              <SearchInput />
            </Suspense>
          </div>
          
          {/* Mobile Search Trigger - visible only when search is closed and on mobile */}
          {!isMobileSearchOpen && (
            <div className="md:hidden flex justify-end w-full">
               <Button 
                 variant="ghost" 
                 size="icon" 
                 onClick={() => setIsMobileSearchOpen(true)}
                 className="text-white hover:bg-white/10"
               >
                 <SearchIcon className="size-5" />
               </Button>
            </div>
          )}
        </div>

        <div className={`shrink-0 items-center flex gap-2 sm:gap-4 ${isMobileSearchOpen ? 'hidden' : 'flex'}`}>
          <SignedIn>
            <StarsBalance />
          </SignedIn>
          <div className="flex items-center justify-center">
            <AuthButton />
          </div>
        </div>
      </div>
    </nav>
  );
};
