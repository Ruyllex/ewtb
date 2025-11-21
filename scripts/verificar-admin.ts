/**
 * Script para verificar el estado de administrador de un usuario
 */

import { config } from "dotenv";
import { resolve } from "path";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { users } from "@/db/schema";

// Cargar variables de entorno
const envPath = resolve(process.cwd(), ".env.local");
config({ path: envPath });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL no está definida en .env.local");
  process.exit(1);
}

const emailToCheck = "juansdeveloper@gmail.com";

async function verifyAdmin() {
  console.log(`🔍 Verificando estado de administrador para: ${emailToCheck}\n`);

  // Crear conexión a la base de datos
  const sql = neon(DATABASE_URL);
  const db = drizzle(sql);

  try {
    // Obtener todos los usuarios
    const allUsers = await db.select().from(users);

    console.log(`📊 Total de usuarios en BD: ${allUsers.length}\n`);

    // Importar Clerk client para verificar emails
    let clerkClient: any = null;
    try {
      const clerk = await import("@clerk/nextjs/server");
      clerkClient = clerk.clerkClient;
    } catch (error) {
      console.log("⚠️  No se pudo importar Clerk client.\n");
    }

    // Buscar usuario por email
    let foundUser: typeof users.$inferSelect | null = null;

    if (clerkClient) {
      console.log("🔍 Buscando usuario en Clerk por email...\n");
      
      // Obtener todos los usuarios de Clerk y buscar por email
      const clerkUsers = await clerkClient.users.getUserList({ limit: 500 });
      
      for (const clerkUser of clerkUsers.data) {
        const userEmail = clerkUser.emailAddresses?.[0]?.emailAddress;
        if (userEmail === emailToCheck) {
          console.log(`✅ Usuario encontrado en Clerk:`);
          console.log(`   Clerk ID: ${clerkUser.id}`);
          console.log(`   Email: ${userEmail}`);
          console.log(`   Nombre: ${clerkUser.fullName || clerkUser.firstName || "N/A"}\n`);

          // Buscar en la BD por Clerk ID
          foundUser = allUsers.find((u) => u.clerkId === clerkUser.id) || null;
          break;
        }
      }
    }

    if (!foundUser) {
      console.log("❌ Usuario no encontrado en la base de datos");
      console.log("   Asegúrate de que el usuario haya iniciado sesión al menos una vez\n");
      process.exit(1);
    }

    console.log(`📋 Información del usuario en BD:`);
    console.log(`   ID: ${foundUser.id}`);
    console.log(`   Clerk ID: ${foundUser.clerkId}`);
    console.log(`   Nombre: ${foundUser.name}`);
    console.log(`   isAdmin: ${foundUser.isAdmin}`);
    console.log(`   Username: ${foundUser.username || "N/A"}\n`);

    // Verificar ADMIN_USER_IDS
    const adminUserIds = process.env.ADMIN_USER_IDS?.split(",").map((id) => id.trim()).filter(Boolean) || [];
    console.log(`📝 ADMIN_USER_IDS en .env.local:`);
    adminUserIds.forEach((id, index) => {
      console.log(`   ${index + 1}. "${id}"`);
    });
    console.log();

    // Verificar si el email está en ADMIN_USER_IDS
    const emailInEnv = adminUserIds.includes(emailToCheck);
    console.log(`🔍 Verificaciones:`);
    console.log(`   ✅ isAdmin en BD: ${foundUser.isAdmin ? "SÍ" : "NO"}`);
    console.log(`   ${emailInEnv ? "✅" : "❌"} Email en ADMIN_USER_IDS: ${emailInEnv ? "SÍ" : "NO"}`);
    console.log(`   ${adminUserIds.includes(foundUser.id) ? "✅" : "❌"} UUID en ADMIN_USER_IDS: ${adminUserIds.includes(foundUser.id) ? "SÍ" : "NO"}`);
    console.log(`   ${adminUserIds.includes(foundUser.clerkId) ? "✅" : "❌"} Clerk ID en ADMIN_USER_IDS: ${adminUserIds.includes(foundUser.clerkId) ? "SÍ" : "NO"}\n`);

    if (foundUser.isAdmin) {
      console.log("✅ El usuario DEBERÍA tener acceso de administrador (isAdmin = true en BD)\n");
    } else if (emailInEnv || adminUserIds.includes(foundUser.id) || adminUserIds.includes(foundUser.clerkId)) {
      console.log("⚠️  El usuario está en ADMIN_USER_IDS pero NO tiene isAdmin = true en BD");
      console.log("   Ejecuta: npm run sync:admins para sincronizar\n");
    } else {
      console.log("❌ El usuario NO tiene acceso de administrador\n");
    }

  } catch (error) {
    console.error("❌ Error al verificar:", error);
    process.exit(1);
  }
}

verifyAdmin();





