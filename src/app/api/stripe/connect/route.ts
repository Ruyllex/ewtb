import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-12-18.acacia",
});

// Configuración para Next.js 15
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/stripe/connect
 * Crea o actualiza una cuenta de Stripe Connect para el creador
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

    // Si ya tiene una cuenta de Stripe Connect, retornar la URL de onboarding o dashboard
    if (user.stripeAccountId) {
      const account = await stripe.accounts.retrieve(user.stripeAccountId);

      // Actualizar el estado de la cuenta en la base de datos
      const accountStatus = account.charges_enabled && account.payouts_enabled ? "active" : "pending";
      await db
        .update(users)
        .set({
          stripeAccountStatus: accountStatus,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      // Si la cuenta no está completamente activa, crear un nuevo link de onboarding
      if (!account.details_submitted || !account.charges_enabled || !account.payouts_enabled) {
        const accountLink = await stripe.accountLinks.create({
          account: user.stripeAccountId,
          refresh_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/studio/earnings?refresh=true`,
          return_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/studio/earnings?success=true`,
          type: "account_onboarding",
        });

        return NextResponse.json({ url: accountLink.url });
      }

      // Si la cuenta está activa, retornar el dashboard de Stripe
      const loginLink = await stripe.accounts.createLoginLink(user.stripeAccountId);
      return NextResponse.json({ url: loginLink.url, accountStatus: "active" });
    }

    // Crear una nueva cuenta de Stripe Connect
    const account = await stripe.accounts.create({
      type: "express", // Express accounts son más simples para creadores
      country: "US", // Puedes hacer esto dinámico basado en la ubicación del usuario
      email: clerkUser.emailAddresses[0]?.emailAddress,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: {
        userId: user.id,
        clerkId: clerkUserId,
      },
    });

    // Crear link de onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/studio/earnings?refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/studio/earnings?success=true`,
      type: "account_onboarding",
    });

    // Guardar el account ID en la base de datos
    await db
      .update(users)
      .set({
        stripeAccountId: account.id,
        stripeAccountStatus: "pending",
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    console.error("Error creando cuenta de Stripe Connect:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno del servidor" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/stripe/connect
 * Obtiene el estado de la cuenta de Stripe Connect del usuario
 */
export async function GET(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const [user] = await db.select().from(users).where(eq(users.clerkId, clerkUserId)).limit(1);

    if (!user || !user.stripeAccountId) {
      return NextResponse.json({ connected: false });
    }

    // Obtener información actualizada de la cuenta
    const account = await stripe.accounts.retrieve(user.stripeAccountId);

    // Actualizar el estado en la base de datos
    const accountStatus = account.charges_enabled && account.payouts_enabled ? "active" : "pending";
    await db
      .update(users)
      .set({
        stripeAccountStatus: accountStatus,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return NextResponse.json({
      connected: true,
      accountId: user.stripeAccountId,
      status: accountStatus,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
    });
  } catch (error) {
    console.error("Error obteniendo cuenta de Stripe Connect:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno del servidor" },
      { status: 500 }
    );
  }
}

