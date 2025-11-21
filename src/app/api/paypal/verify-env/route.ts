import { NextRequest, NextResponse } from "next/server";

// Configuración para Next.js 15
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/paypal/verify-env
 * Endpoint de diagnóstico para verificar que las variables de entorno se están leyendo correctamente
 */
export async function GET(req: NextRequest) {
  const clientId = (process.env.PAYPAL_CLIENT_ID || "").trim();
  const clientSecret = (process.env.PAYPAL_CLIENT_SECRET || "").trim();
  const publicClientId = (process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "").trim();
  const environment = process.env.PAYPAL_ENVIRONMENT || "sandbox";

  return NextResponse.json({
    server: {
      PAYPAL_CLIENT_ID: {
        exists: !!process.env.PAYPAL_CLIENT_ID,
        hasValue: !!clientId,
        length: clientId.length,
        preview: clientId ? `${clientId.substring(0, 10)}...` : "vacío",
      },
      PAYPAL_CLIENT_SECRET: {
        exists: !!process.env.PAYPAL_CLIENT_SECRET,
        hasValue: !!clientSecret,
        length: clientSecret.length,
        preview: clientSecret ? `${clientSecret.substring(0, 10)}...` : "vacío",
      },
      PAYPAL_ENVIRONMENT: environment,
    },
    client: {
      NEXT_PUBLIC_PAYPAL_CLIENT_ID: {
        exists: !!process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID,
        hasValue: !!publicClientId,
        length: publicClientId.length,
        preview: publicClientId ? `${publicClientId.substring(0, 10)}...` : "vacío",
      },
    },
    allEnvKeys: Object.keys(process.env)
      .filter(key => key.includes("PAYPAL"))
      .map(key => ({
        key,
        hasValue: !!process.env[key],
        length: (process.env[key] || "").length,
      })),
  });
}





