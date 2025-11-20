// Script para agregar un video de prueba a la base de datos

// Cargar variables de entorno ANTES de importar db
import { config } from "dotenv";
import { resolve } from "path";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { videos, users, categories } from "@/db/schema";
import { eq } from "drizzle-orm";

// Cargar .env.local de forma síncrona
const envPath = resolve(process.cwd(), ".env.local");
config({ path: envPath });

// Verificar que DATABASE_URL esté definida
if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL no está definida en .env.local");
  process.exit(1);
}

// Crear conexión directamente para el script
const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

// URL de S3 de prueba (debe ser una URL pública de S3)
// IMPORTANTE: Reemplaza esto con una URL real de S3 de tu bucket
// Puedes obtener uno:
// 1. Subiendo un video desde la app (ir a /studio y crear un video)
// 2. O usando una URL directa de S3 de un video existente
// 3. O configurando AWS_S3_TEST_VIDEO_URL en .env.local
//
// Ejemplo de formato: https://tu-bucket.s3.us-east-1.amazonaws.com/videos/test-video.mp4
const TEST_S3_URL =
  process.env.AWS_S3_TEST_VIDEO_URL || "https://example.com/test-video.mp4";

async function main() {
  console.log("🎬 Agregando video de prueba...");

  try {
    // 1. Buscar o crear un usuario de prueba
    let testUser = await db.select().from(users).limit(1).then((rows) => rows[0]);

    if (!testUser) {
      console.log("⚠️  No se encontró ningún usuario. Creando usuario de prueba...");
      // Crear un usuario de prueba
      const [newUser] = await db
        .insert(users)
        .values({
          clerkId: `test_user_${Date.now()}`,
          name: "Usuario de Prueba",
          imageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=test",
        })
        .returning();
      testUser = newUser;
      console.log("✅ Usuario de prueba creado:", testUser.id);
    } else {
      console.log("✅ Usuario encontrado:", testUser.name);
    }

    // 2. Buscar una categoría (opcional)
    const category = await db.select().from(categories).limit(1).then((rows) => rows[0]);

    // 3. Verificar si ya existe un video de prueba
    const existingVideo = await db
      .select()
      .from(videos)
      .where(eq(videos.title, "Video de Prueba - Bienvenido a NewTube"))
      .limit(1)
      .then((rows) => rows[0]);

    if (existingVideo) {
      console.log("⚠️  Ya existe un video de prueba. Actualizando...");
      await db
        .update(videos)
        .set({
          visibility: "public",
          s3Url: TEST_S3_URL,
          s3Key: "videos/test-video.mp4", // Ejemplo de key
          thumbnailUrl: null, // El usuario debe subir un thumbnail manualmente
          duration: 60000, // 1 minuto
          updatedAt: new Date(),
        })
        .where(eq(videos.id, existingVideo.id));
      console.log("✅ Video de prueba actualizado:", existingVideo.id);
      console.log(`🔗 URL del video: http://localhost:3000/videos/${existingVideo.id}`);
      return;
    }

    // 4. Crear el video de prueba
    const [newVideo] = await db
      .insert(videos)
      .values({
        title: "Video de Prueba - Bienvenido a NewTube",
        description:
          "Este es un video de prueba para demostrar las funcionalidades de NewTube. Puedes usar este video para probar:\n\n" +
          "• Ver videos individuales\n" +
          "• Búsqueda de videos\n" +
          "• Sistema de visualizaciones\n" +
          "• Y más funcionalidades...\n\n" +
          "¡Disfruta explorando la plataforma!",
        userId: testUser.id,
        categoryId: category?.id || null,
        visibility: "public",
        s3Url: TEST_S3_URL,
        s3Key: "videos/test-video.mp4", // Ejemplo de key
        thumbnailUrl: null, // El usuario debe subir un thumbnail manualmente
        duration: 60000, // 1 minuto en milisegundos
      })
      .returning();

    console.log("✅ Video de prueba creado exitosamente!");
    console.log(`📹 Título: ${newVideo.title}`);
    console.log(`🆔 ID: ${newVideo.id}`);
    console.log(`🔗 URL: http://localhost:3000/videos/${newVideo.id}`);
    console.log(`\n💡 Puedes buscar este video usando: "prueba" o "bienvenido"`);
    console.log(`\n⚠️  NOTA: Si el video no se reproduce, asegúrate de tener una URL válida de S3.`);
    console.log(`   Puedes actualizar la URL editando este script o configurando AWS_S3_TEST_VIDEO_URL en .env.local`);
  } catch (error) {
    console.error("❌ Error al crear video de prueba:", error);
    process.exit(1);
  }
}

main();
