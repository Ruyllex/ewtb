import { NextRequest } from "next/server";

// Configuración necesaria para Next.js 15
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Webhook de Mux - DESHABILITADO
 * 
 * Este webhook ha sido deshabilitado debido a la migración de Mux a Amazon IVS y S3.
 * Los videos ahora se suben directamente a S3 y se reproducen desde allí.
 * 
 * Si necesitas procesar videos en el futuro, considera usar AWS MediaConvert
 * para transcodificación, generación de thumbnails, etc.
 */
export const POST = async (request: NextRequest) => {
  // Retornar 410 Gone para indicar que este endpoint ya no está disponible
  return new Response(
    JSON.stringify({
      error: "Este webhook ha sido deshabilitado",
      message: "La plataforma ha migrado de Mux a Amazon IVS y S3. Este endpoint ya no está disponible.",
    }),
    {
      status: 410,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
};
