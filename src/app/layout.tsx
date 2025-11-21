import { ourFileRouter } from "@/app/api/uploadthing/core";
import { Toaster } from "@/components/ui/sonner";
import { TRPCProviderClient } from "@/providers";
import { ClerkProvider } from "@clerk/nextjs";
import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { extractRouterConfig } from "uploadthing/server";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FacuGo! Plus | Your favorite videos, right here",
  description:
    "FacuGo! Plus is a video sharing platform that allows you to share your favorite videos with your friends and family.",
  icons: {
    icon: "/logo.svg",
  },
  category: "social",
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  // Si Clerk no está configurado, renderizar sin ClerkProvider
  if (!clerkPublishableKey || clerkPublishableKey.includes("...")) {
    return (
      <html lang="en" suppressHydrationWarning>
        <body className={`${inter.className} antialiased`}>
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-card border border-border rounded-lg p-6 space-y-4">
              <h1 className="text-2xl font-bold">⚠️ Clerk no configurado</h1>
              <p className="text-muted-foreground">
                Para usar la autenticación, necesitas configurar las variables de Clerk en tu archivo <code className="bg-white/20 px-1 rounded">.env.local</code>.
              </p>
              <div className="space-y-2 text-sm">
                <p><strong>Pasos:</strong></p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Ve a <a href="https://dashboard.clerk.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">dashboard.clerk.com</a></li>
                  <li>Crea una aplicación o selecciona una existente</li>
                  <li>Copia las claves desde API Keys</li>
                  <li>Agrégalas a <code className="bg-white/20 px-1 rounded">.env.local</code></li>
                  <li>Reinicia el servidor</li>
                </ol>
              </div>
              <p className="text-xs text-muted-foreground">
                Consulta <code className="bg-white/20 px-1 rounded">GUIA_CREDENCIALES.md</code> para más detalles.
              </p>
            </div>
          </div>
        </body>
      </html>
    );
  }

  return (
    <ClerkProvider afterSignOutUrl={"/"}>
      <html lang="en" suppressHydrationWarning>
        <body className={`${inter.className} antialiased`}>
          {/* Hydrate UploadThing config to avoid client handshake fallback */}
          <NextSSRPlugin routerConfig={extractRouterConfig(ourFileRouter)} />
          <Toaster richColors />
          <TRPCProviderClient>{children}</TRPCProviderClient>
        </body>
      </html>
    </ClerkProvider>
  );
}
