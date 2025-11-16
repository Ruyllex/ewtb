/**
 * Script para asegurar que todos los usuarios existentes tengan un canal
 * Ejecutar con: npm run ensure:channels
 */

// Cargar variables de entorno ANTES de importar db
import { config } from "dotenv";
import { resolve } from "path";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { users, channels } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

// Cargar .env.local de forma síncrona
const envPath = resolve(process.cwd(), ".env.local");
config({ path: envPath });

// Verificar que DATABASE_URL esté definida
if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL no está definida en .env.local");
  console.error("\nEjemplo:");
  console.error("DATABASE_URL=postgresql://usuario:password@host:puerto/database");
  process.exit(1);
}

// Crear conexión directamente para el script
const sqlClient = neon(process.env.DATABASE_URL);
const db = drizzle(sqlClient);

async function ensureChannels() {
  console.log("🔍 Buscando usuarios sin canal...");

  // Obtener todos los usuarios que no tienen canal
  const usersWithoutChannels = await db
    .select({
      id: users.id,
      clerkId: users.clerkId,
      name: users.name,
      username: users.username,
      imageUrl: users.imageUrl,
    })
    .from(users)
    .leftJoin(channels, eq(users.id, channels.userId))
    .where(sql`${channels.id} IS NULL`);

  if (usersWithoutChannels.length === 0) {
    console.log("✅ Todos los usuarios ya tienen canales");
    return;
  }

  console.log(`📝 Encontrados ${usersWithoutChannels.length} usuarios sin canal`);

  let created = 0;
  let errors = 0;

  for (const user of usersWithoutChannels) {
    try {
      // Generar username si no existe
      let username = user.username;
      if (!username) {
        const baseName = user.name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "")
          .substring(0, 20) || `user${user.id.substring(0, 8)}`;

        let finalUsername = baseName;
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
          finalUsername = `${baseName}${counter}`;
          counter++;
        }

        // Actualizar el username del usuario
        await db
          .update(users)
          .set({ username: finalUsername })
          .where(eq(users.id, user.id));

        username = finalUsername;
      }

      // Crear el canal
      await db.insert(channels).values({
        userId: user.id,
        name: user.name,
        avatar: user.imageUrl,
        isVerified: false,
      });

      created++;
      console.log(`✅ Canal creado para: ${user.name} (@${username})`);
    } catch (error) {
      errors++;
      console.error(`❌ Error creando canal para ${user.name}:`, error);
    }
  }

  console.log(`\n📊 Resumen:`);
  console.log(`   ✅ Canales creados: ${created}`);
  console.log(`   ❌ Errores: ${errors}`);
  console.log(`\n✨ Proceso completado`);
}

ensureChannels()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error fatal:", error);
    process.exit(1);
  });

