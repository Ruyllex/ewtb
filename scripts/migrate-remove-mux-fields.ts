/**
 * Script de migración: Eliminar campos de Mux de la base de datos
 * 
 * Este script elimina las columnas relacionadas con Mux de las tablas de la base de datos
 * después de la migración a Amazon IVS y S3.
 * 
 * Ejecutar con: tsx scripts/migrate-remove-mux-fields.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
import { neon } from "@neondatabase/serverless";

// Cargar .env.local de forma síncrona
const envPath = resolve(process.cwd(), ".env.local");
config({ path: envPath });

// Verificar que DATABASE_URL esté definida
if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL no está definida en .env.local");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

// Columnas de Mux que deben ser eliminadas de la tabla videos
const MUX_COLUMNS_TO_REMOVE = [
  "mux_asset_id",
  "mux_playback_id",
  "mux_upload_id",
  "mux_status",
  "mux_track_id",
  "mux_track_status",
];

// Columnas de Mux que deben ser eliminadas de la tabla live_streams
const LIVE_STREAM_MUX_COLUMNS_TO_REMOVE = [
  "mux_live_stream_id",
  "mux_stream_key",
  "mux_playback_id",
];

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  try {
    const result = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = ${tableName} 
      AND column_name = ${columnName};
    `;
    return result.length > 0;
  } catch (error) {
    console.error(`Error verificando columna ${columnName} en ${tableName}:`, error);
    return false;
  }
}

async function dropColumn(tableName: string, columnName: string): Promise<void> {
  try {
    await sql.unsafe(`ALTER TABLE ${tableName} DROP COLUMN IF EXISTS ${columnName};`);
    console.log(`  ✅ Columna ${columnName} eliminada de ${tableName}`);
  } catch (error: any) {
    if (error?.message?.includes("does not exist")) {
      console.log(`  ℹ️  Columna ${columnName} no existe en ${tableName} (ya eliminada)`);
    } else {
      console.error(`  ❌ Error eliminando columna ${columnName} de ${tableName}:`, error.message);
    }
  }
}

async function main() {
  console.log("🚀 Iniciando migración para eliminar campos de Mux...\n");

  try {
    // Verificar conexión
    await sql`SELECT 1`;
    console.log("✅ Conexión a la base de datos establecida\n");

    // Eliminar columnas de la tabla videos
    console.log("📹 Eliminando columnas de Mux de la tabla 'videos'...");
    for (const column of MUX_COLUMNS_TO_REMOVE) {
      const exists = await columnExists("videos", column);
      if (exists) {
        console.log(`  Eliminando columna: ${column}`);
        await dropColumn("videos", column);
      } else {
        console.log(`  ℹ️  Columna ${column} no existe en videos (ya eliminada)`);
      }
    }

    console.log("\n📡 Eliminando columnas de Mux de la tabla 'live_streams'...");
    for (const column of LIVE_STREAM_MUX_COLUMNS_TO_REMOVE) {
      const exists = await columnExists("live_streams", column);
      if (exists) {
        console.log(`  Eliminando columna: ${column}`);
        await dropColumn("live_streams", column);
      } else {
        console.log(`  ℹ️  Columna ${column} no existe en live_streams (ya eliminada)`);
      }
    }

    console.log("\n✅ Migración completada exitosamente!");
    console.log("\n📝 Próximos pasos:");
    console.log("   1. Ejecuta 'npm run drizzle:push' para sincronizar el esquema");
    console.log("   2. Verifica que todos los campos de Mux hayan sido eliminados");
    console.log("   3. Realiza una copia de seguridad de la base de datos si es necesario");
  } catch (error) {
    console.error("\n❌ Error durante la migración:", error);
    process.exit(1);
  }
}

main();

