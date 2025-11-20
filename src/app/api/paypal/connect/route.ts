import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
// Configuración para Next.js 15
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/paypal/connect
 * Crea o actualiza una cuenta de PayPal para el creador
 */
export async function POST(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Obtener el usuario de la base de datos
    const [user] = await db.select().from(users).where(eq(users.clerkId, clerkUserId)).limit(1);

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Obtener información del usuario de Clerk
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Usuario de Clerk no encontrado" }, { status: 404 });
    }

    // Si ya tiene una cuenta de PayPal, retornar URL de dashboard
    if (user.paypalAccountId) {
      // PayPal no tiene un dashboard directo como Stripe, pero podemos retornar el estado
      return NextResponse.json({ 
        url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/studio/earnings?paypal=connected`,
        accountStatus: "active" 
      });
    }

    // Para PayPal, necesitamos que el usuario se registre manualmente
    // Retornamos una URL de onboarding o instrucciones
    const onboardingUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/studio/earnings?paypal=onboarding`;

    // Guardar un placeholder en la base de datos (el usuario completará el proceso manualmente)
    await db
      .update(users)
      .set({
        paypalAccountId: `pending_${clerkUserId}`, // Placeholder hasta que se complete
        paypalAccountStatus: "pending",
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return NextResponse.json({ url: onboardingUrl });
  } catch (error) {
    console.error("Error creando cuenta de PayPal:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno del servidor" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/paypal/connect
 * Obtiene el estado de la cuenta de PayPal del usuario
 */
export async function GET(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const [user] = await db.select().from(users).where(eq(users.clerkId, clerkUserId)).limit(1);

    if (!user || !user.paypalAccountId) {
      return NextResponse.json({ connected: false });
    }

    return NextResponse.json({
      connected: true,
      accountId: user.paypalAccountId,
      status: user.paypalAccountStatus || "pending",
    });
  } catch (error) {
    console.error("Error obteniendo cuenta de PayPal:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno del servidor" },
      { status: 500 }
    );
  }
}

