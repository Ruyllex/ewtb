/**
 * Script para verificar videos públicos en la base de datos
 */

import { config } from "dotenv";
import { resolve } from "path";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { videos, users, channels } from "@/db/schema";

// Cargar variables de entorno
const envPath = resolve(process.cwd(), ".env.local");
config({ path: envPath });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL no está definida en .env.local");
  process.exit(1);
}

async function verifyPublicVideos() {
  console.log("🔍 Verificando videos públicos en la base de datos...\n");

  // Crear conexión a la base de datos
  const sql = neon(DATABASE_URL);
  const db = drizzle(sql);

  try {
    // Contar todos los videos
    const allVideos = await db.select().from(videos);
    console.log(`📊 Total de videos en BD: ${allVideos.length}\n`);

    // Contar videos públicos
    const publicVideos = allVideos.filter((v) => v.visibility === "public");
    console.log(`✅ Videos públicos: ${publicVideos.length}`);
    console.log(`❌ Videos privados/otros: ${allVideos.length - publicVideos.length}\n`);

    if (publicVideos.length === 0) {
      console.log("⚠️  No hay videos públicos en la base de datos");
      console.log("   Los videos deben tener visibility = 'public' para aparecer en el feed global\n");
      return;
    }

    // Verificar si los videos tienen usuarios asociados
    console.log("🔍 Verificando usuarios asociados a videos públicos...\n");
    
    for (const video of publicVideos.slice(0, 5)) {
      const [user] = await db.select().from(users).where(eq(users.id, video.userId)).limit(1);
      const [channel] = await db.select().from(channels).where(eq(channels.userId, video.userId)).limit(1);
      
      console.log(`Video: ${video.title}`);
      console.log(`  ID: ${video.id}`);
      console.log(`  Visibility: ${video.visibility}`);
      console.log(`  Usuario: ${user?.name || "NO ENCONTRADO"} (${user?.id || "N/A"})`);
      console.log(`  Canal: ${channel ? "SÍ" : "NO"}`);
      console.log();
    }

    // Probar la consulta que usa getMany
    console.log("🔍 Probando consulta de getMany...\n");
    
    const testResults = await db
      .select({
        id: videos.id,
        title: videos.title,
        visibility: videos.visibility,
        userId: users.id,
        userName: users.name,
        userUsername: users.username,
        channelName: channels.name,
      })
      .from(videos)
      .innerJoin(users, eq(videos.userId, users.id))
      .leftJoin(channels, eq(channels.userId, users.id))
      .where(eq(videos.visibility, "public"))
      .limit(5);

    console.log(`✅ Videos encontrados con la consulta: ${testResults.length}\n`);
    
    if (testResults.length > 0) {
      console.log("📋 Primeros videos encontrados:");
      testResults.forEach((v, i) => {
        console.log(`  ${i + 1}. ${v.title}`);
        console.log(`     Usuario: ${v.userName} (@${v.userUsername || "sin username"})`);
        console.log(`     Canal: ${v.channelName || "sin canal"}`);
        console.log();
      });
    } else {
      console.log("❌ La consulta no retorna videos aunque hay videos públicos");
      console.log("   Esto puede indicar un problema con los joins\n");
    }

  } catch (error) {
    console.error("❌ Error al verificar:", error);
    process.exit(1);
  }
}

verifyPublicVideos();





