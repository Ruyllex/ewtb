import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher(["/studio(.*)"]);
const isPublicRoute = createRouteMatcher([
  "/api/videos/webhook",
  "/api/users/webhook",
  "/api/uploadthing",
  "/api/webhooks/stripe",
]);

// Verificar si Clerk está configurado
const isClerkConfigured = () => {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  return publishableKey && !publishableKey.includes("...");
};

export default clerkMiddleware(async (auth, request) => {
  // Si Clerk no está configurado, permitir acceso a todas las rutas excepto /studio
  if (!isClerkConfigured()) {
    if (isProtectedRoute(request)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // Skip authentication for webhook routes
  if (isPublicRoute(request)) return;

  if (isProtectedRoute(request)) await auth.protect();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
