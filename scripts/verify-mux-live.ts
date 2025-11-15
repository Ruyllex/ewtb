/**
 * Script de verificación para Mux Live Streaming
 * 
 * Este script verifica:
 * 1. Que las credenciales de Mux estén configuradas
 * 2. Que las credenciales sean válidas
 * 3. Que Live Streaming esté habilitado en la cuenta
 * 
 * Ejecutar con: npm run verify:mux-live
 * o: tsx scripts/verify-mux-live.ts
 */

import Mux from "@mux/mux-node";
import * as dotenv from "dotenv";
import { resolve } from "path";

// Función principal async para evitar problemas con top-level await
async function main() {
  // Cargar variables de entorno
  dotenv.config({ path: resolve(process.cwd(), ".env.local") });

  const tokenId = process.env.MUX_TOKEN_ID;
  const tokenSecret = process.env.MUX_TOKEN_SECRET;

  console.log("🔍 Verificando configuración de Mux Live Streaming...\n");

  // Paso 1: Verificar que las credenciales estén presentes
  console.log("1️⃣ Verificando credenciales...");
  if (!tokenId || !tokenSecret) {
    console.error("❌ ERROR: Las credenciales de Mux no están configuradas.");
    console.error("\nPor favor, agrega a tu archivo .env.local:");
    console.error("MUX_TOKEN_ID=tu_token_id");
    console.error("MUX_TOKEN_SECRET=tu_token_secret");
    process.exit(1);
  }

  console.log("✅ MUX_TOKEN_ID está configurado (longitud:", tokenId.length, ")");
  console.log("✅ MUX_TOKEN_SECRET está configurado (longitud:", tokenSecret.length, ")");

  // Paso 2: Intentar inicializar Mux
  console.log("\n2️⃣ Inicializando cliente de Mux...");
  let mux: Mux;
  try {
    mux = new Mux({
      tokenId,
      tokenSecret,
    });
    console.log("✅ Cliente de Mux inicializado correctamente");
  } catch (error: any) {
    console.error("❌ ERROR al inicializar Mux:", error.message);
    process.exit(1);
  }

  // Paso 3: Verificar credenciales intentando crear un live stream de prueba
  // (Esto verifica tanto las credenciales como los permisos de Live Streaming)
  console.log("\n3️⃣ Verificando credenciales y permisos para Live Streaming...");
  try {
    const testStream = await mux.video.liveStreams.create({
      playback_policy: ["public"],
      new_asset_settings: {
        playback_policy: ["public"],
      },
    });

    console.log("✅ Live Streaming está habilitado y funcionando");
    console.log("   - Stream ID:", testStream.id);
    console.log("   - Stream Key:", testStream.stream_key ? "✅ Presente" : "❌ Faltante");
    console.log("   - Playback ID:", testStream.playback_ids?.[0]?.id || "❌ Faltante");

    // Limpiar: eliminar el stream de prueba
    console.log("\n🧹 Eliminando stream de prueba...");
    try {
      await mux.video.liveStreams.delete(testStream.id);
      console.log("✅ Stream de prueba eliminado");
    } catch (deleteError: any) {
      console.warn("⚠️ No se pudo eliminar el stream de prueba:", deleteError.message);
      console.warn("   Puedes eliminarlo manualmente desde el dashboard de Mux");
    }
  } catch (error: any) {
    const status = error?.response?.status || error?.status;
    const errorMessage = error?.response?.data?.error?.message || error?.message;

    if (status === 401) {
      console.error("❌ ERROR: Credenciales inválidas (401 Unauthorized)");
      console.error("\nSoluciones:");
      console.error("   - Verifica que MUX_TOKEN_ID y MUX_TOKEN_SECRET sean correctos");
      console.error("   - Obtén nuevas credenciales en: https://dashboard.mux.com/settings/api-access-tokens");
      console.error("   - Asegúrate de copiar los valores completos sin espacios extra");
    } else if (status === 400 && errorMessage?.includes("free plan")) {
      console.error("❌ ERROR: Live Streaming no está habilitado en tu cuenta");
      console.error("\nℹ️  El plan gratuito de Mux incluye $20 de créditos de prueba para Live Streaming");
      console.error("\nSolución:");
      console.error("   1. Ve a https://dashboard.mux.com/settings/live-streaming");
      console.error("   2. Habilita Live Streaming en tu cuenta");
      console.error("   3. Esto activará tus $20 de créditos de prueba");
      console.error("   4. Una vez habilitado, podrás crear live streams hasta agotar los créditos");
      console.error("\n💡 Nota: Después de agotar los $20, necesitarás actualizar a un plan de pago");
    } else if (status === 403) {
      console.error("❌ ERROR: No tienes permisos para crear Live Streams (403 Forbidden)");
      console.error("\nPosibles causas:");
      console.error("   1. Live Streaming no está habilitado en tu cuenta de Mux");
      console.error("   2. Tu plan de Mux no incluye Live Streaming");
      console.error("   3. El token no tiene permisos para Live Streaming");
      console.error("\nSoluciones:");
      console.error("   - Ve a https://dashboard.mux.com/settings/live-streaming");
      console.error("   - Verifica que Live Streaming esté habilitado");
      console.error("   - Si no está disponible, contacta a soporte de Mux");
      console.error("   - Crea un nuevo token con permisos para Live Streaming");
    } else {
      console.error("❌ ERROR al crear live stream:", errorMessage || error.message);
      console.error("   Status:", status || "N/A");
      if (error?.response?.data) {
        console.error("   Detalles:", JSON.stringify(error.response.data, null, 2));
      }
    }
    process.exit(1);
  }

  console.log("\n✅ ¡Todo está configurado correctamente!");
  console.log("\n📝 Próximos pasos:");
  console.log("   1. Asegúrate de que la tabla live_streams existe:");
  console.log("      npm run drizzle:push");
  console.log("   2. Reinicia tu servidor de desarrollo:");
  console.log("      npm run dev");
  console.log("   3. Intenta crear un live stream desde la aplicación");
}

// Ejecutar la función principal
main().catch((error) => {
  console.error("❌ Error inesperado:", error);
  process.exit(1);
});

