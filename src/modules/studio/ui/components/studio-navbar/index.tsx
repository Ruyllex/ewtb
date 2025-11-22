import { SidebarTrigger } from "@/components/ui/sidebar";
import { AuthButton } from "@/modules/auth/ui/components/auth-button";
import { StarsBalance } from "@/components/stars-balance";
import Image from "next/image";
import Link from "next/link";
import { StudioUploadModal } from "../studio-upload-modal";
import { SignedIn } from "@clerk/nextjs";

export const StudioNavbar = () => {
  return (
    <nav className=" fixed top-0 left-0 right-0 h-16 bg-transparent backdrop-blur-sm flex items-center px-2 pr-5 z-50 border-b border-white/10 shadow-md">
      <div className="flex items-center gap-4 w-full">
        {/* Menu and Logo */}
        <div className="flex items-center shrink-0">
          <SidebarTrigger />

          <Link href={"/studio"}>
            <div className="flex items-center gap-2 p-4">
              <Image src={"/logo.png"} alt={"Logo"} width={40} height={40} priority />
              <p className="text-xl font-semibold tracking-tight text-white hidden md:block">FacuGo! Plus</p>
            </div>
          </Link>
        </div>

        {/* Spacer */}
        <div className="flex-1" />
        <div className="flex-shrink-0 items-center flex gap-4 ">
          <SignedIn>
            <StarsBalance />
          </SignedIn>
          <StudioUploadModal />
          <div className="size-8">
            <AuthButton />
          </div>
        </div>
      </div>
    </nav>
  );
};
