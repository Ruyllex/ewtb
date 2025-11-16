import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2024-12-18" });
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature") || "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err) {
    console.error("Webhook signature verification failed.", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "account.updated" || event.type === "capability.updated") {
    const account = event.data.object as Stripe.Account;
    const accountId = account.id;
    const status = account.charges_enabled && account.payouts_enabled ? "active" : "pending";

    // actualizar usuario por stripeAccountId
    await db.update(users).set({ stripeAccountStatus: status, updatedAt: new Date() }).where(eq(users.stripeAccountId, accountId));
  }

  return NextResponse.json({ received: true });
}
