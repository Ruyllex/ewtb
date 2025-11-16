import { db } from "@/db";
import { users, channels } from "@/db/schema";
import { WebhookEvent } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { Webhook } from "svix";
import { sql } from "drizzle-orm";

export async function POST(req: Request) {
  const CLERK_SIGNING_SECRET = process.env.CLERK_SIGNING_SECRET;

  if (!CLERK_SIGNING_SECRET) {
    throw new Error("Error: Please add CLERK_SIGNING_SECRET from Clerk Dashboard to .env or .env");
  }

  // Create new Svix instance with secret
  const wh = new Webhook(CLERK_SIGNING_SECRET);

  // Get headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error: Missing Svix headers", {
      status: 400,
    });
  }

  // Get body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  let evt: WebhookEvent;

  // Verify payload with headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error: Could not verify webhook:", err);
    return new Response("Error: Verification error", {
      status: 400,
    });
  }

  // Do something with payload
  // For this guide, log payload to console
  // Events with Type Webhook Type Description
  const eventType = evt.type;

  if (eventType === "user.created") {
    const { data } = evt;
    
    // Generar username único
    const baseName = `${data.first_name || ""} ${data.last_name || ""}`.trim() || "user";
    const baseUsername = baseName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .substring(0, 20) || `user${data.id.substring(0, 8)}`;
    
    let finalUsername = baseUsername;
    let counter = 1;
    
    // Verificar que el username sea único
    while (true) {
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, finalUsername))
        .limit(1);
      
      if (!existingUser) {
        break;
      }
      finalUsername = `${baseUsername}${counter}`;
      counter++;
    }
    
    // Crear usuario
    const [newUser] = await db
      .insert(users)
      .values({
        clerkId: data.id,
        name: baseName,
        username: finalUsername,
        imageUrl: data.image_url,
      })
      .returning();
    
    // Crear canal para el usuario
    if (newUser) {
      await db.insert(channels).values({
        userId: newUser.id,
        name: newUser.name,
        avatar: newUser.imageUrl,
        isVerified: false,
      });
    }
  }

  if (eventType === "user.deleted") {
    const { data } = evt;
    if (!data.id) {
      return new Response("Error: Missing user id", { status: 400 });
    }
    await db.delete(users).where(eq(users.clerkId, data.id));
  }

  if (eventType === "user.updated") {
    const { data } = evt;
    if (!data.id) {
      return new Response("Error: Missing user id", { status: 400 });
    }
    
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, data.id))
      .limit(1);
    
    if (user) {
      await db
        .update(users)
        .set({
          name: `${data.first_name} ${data.last_name}`,
          imageUrl: data.image_url,
        })
        .where(eq(users.clerkId, data.id));
      
      // Actualizar el nombre del canal si existe
      const [channel] = await db
        .select()
        .from(channels)
        .where(eq(channels.userId, user.id))
        .limit(1);
      
      if (channel) {
        await db
          .update(channels)
          .set({
            name: `${data.first_name} ${data.last_name}`,
            avatar: data.image_url,
            updatedAt: new Date(),
          })
          .where(eq(channels.id, channel.id));
      }
    }
  }

  

  return new Response("Webhook received", { status: 200 });
}
