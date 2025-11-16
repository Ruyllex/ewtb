/**
 * Script para sincronizar usuarios administradores desde ADMIN_USER_IDS a la columna isAdmin
 * 
 * Ejecutar con: npm run sync:admins
 * o: tsx ./src/scripts/sync-admin-users.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, or, inArray } from "drizzle-orm";
import { users } from "@/db/schema";

// Cargar variables de entorno
const envPath = resolve(process.cwd(), ".env.local");
config({ path: envPath });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL no está definida en .env.local");
  process.exit(1);
}

const adminUserIds = process.env.ADMIN_USER_IDS?.split(",").map((id) => id.trim()).filter(Boolean) || [];

if (adminUserIds.length === 0) {
  console.log("⚠️  No hay ADMIN_USER_IDS configurados en .env.local");
  console.log("   Agrega ADMIN_USER_IDS con IDs de usuario, Clerk IDs o emails separados por comas");
  process.exit(0);
}

async function syncAdminUsers() {
  console.log("🔄 Sincronizando usuarios administradores...\n");

  // Crear conexión a la base de datos
  const sql = neon(DATABASE_URL);
  const db = drizzle(sql);

  try {
    // Obtener todos los usuarios que coinciden con ADMIN_USER_IDS
    // Buscar por ID de usuario, Clerk ID o email
    const allUsers = await db.select().from(users);

    // Importar Clerk client para verificar emails
    let clerkClient: any = null;
    try {
      const clerk = await import("@clerk/nextjs/server");
      clerkClient = clerk.clerkClient;
    } catch {
      console.log("⚠️  No se pudo importar Clerk client. Solo se verificarán IDs directos.\n");
    }

    const adminUserIdsToUpdate: string[] = [];
    const emailsToCheck: { userId: string; clerkId: string }[] = [];

    // Primero, verificar IDs directos (UUID o Clerk ID)
    for (const adminId of adminUserIds) {
      // Verificar si es un UUID (formato de ID de usuario)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(adminId);
      
      if (isUUID) {
        // Buscar por ID de usuario
        const user = allUsers.find((u) => u.id === adminId);
        if (user) {
          adminUserIdsToUpdate.push(user.id);
          continue;
        }
      }

      // Buscar por Clerk ID
      const userByClerkId = allUsers.find((u) => u.clerkId === adminId);
      if (userByClerkId) {
        adminUserIdsToUpdate.push(userByClerkId.id);
        continue;
      }

      // Si parece un email, guardarlo para verificar después
      if (adminId.includes("@")) {
        // Buscar usuarios que podrían tener este email
        for (const user of allUsers) {
          emailsToCheck.push({ userId: user.id, clerkId: user.clerkId });
        }
      }
    }

    // Verificar emails si Clerk está disponible
    if (clerkClient && emailsToCheck.length > 0) {
      console.log("📧 Verificando emails en Clerk...\n");
      for (const { userId, clerkId } of emailsToCheck) {
        try {
          const clerkUser = await clerkClient.users.getUser(clerkId);
          const userEmail = clerkUser?.emailAddresses?.[0]?.emailAddress;
          
          if (userEmail && adminUserIds.includes(userEmail)) {
            if (!adminUserIdsToUpdate.includes(userId)) {
              adminUserIdsToUpdate.push(userId);
            }
          }
        } catch (error) {
          // Si no se puede obtener el usuario de Clerk, continuar
          console.log(`   ⚠️  No se pudo verificar email para usuario ${userId}`);
        }
      }
    }

    if (adminUserIdsToUpdate.length === 0) {
      console.log("❌ No se encontraron usuarios que coincidan con ADMIN_USER_IDS");
      console.log("   Verifica que los IDs, Clerk IDs o emails estén correctos\n");
      process.exit(0);
    }

    // Actualizar usuarios a isAdmin = true
    console.log(`✅ Encontrados ${adminUserIdsToUpdate.length} usuario(s) administrador(es):\n`);
    
    for (const userId of adminUserIdsToUpdate) {
      const user = allUsers.find((u) => u.id === userId);
      if (user) {
        console.log(`   - ${user.name} (${user.id})`);
      }
    }

    console.log("\n🔄 Actualizando columna isAdmin...\n");

    // Primero, establecer todos los usuarios a isAdmin = false
    await db.update(users).set({ isAdmin: false });

    // Luego, establecer los admins a isAdmin = true
    if (adminUserIdsToUpdate.length > 0) {
      await db
        .update(users)
        .set({ isAdmin: true, updatedAt: new Date() })
        .where(inArray(users.id, adminUserIdsToUpdate));
    }

    console.log("✅ Sincronización completada exitosamente!\n");
    console.log(`   ${adminUserIdsToUpdate.length} usuario(s) marcado(s) como administrador(es)\n`);
  } catch (error) {
    console.error("❌ Error al sincronizar usuarios administradores:", error);
    process.exit(1);
  }
}

syncAdminUsers();

