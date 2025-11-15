/**
 * Script de verificación para Logtail
 * 
 * Este script verifica:
 * 1. Que las dependencias de Logtail estén instaladas
 * 2. Que la variable de entorno esté configurada
 * 3. Que el token tenga el formato correcto
 * 
 * Ejecutar con: npm run verify:logtail
 * o: tsx scripts/verify-logtail-config.ts
 */

import * as dotenv from "dotenv";
import { resolve } from "path";

// Cargar variables de entorno
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const logtailToken = process.env.NEXT_PUBLIC_LOGTALL_SOURCE_TOKEN;

console.log("🔍 Verificando configuración de Logtail...\n");

let hasErrors = false;

// Verificar que las dependencias estén instaladas
console.log("1️⃣ Verificando dependencias...");
try {
  require("@logtail/node");
  require("@logtail/browser");
  console.log("✅ Dependencias de Logtail instaladas");
} catch (error) {
  console.error("❌ Dependencias de Logtail no instaladas");
  console.error("   Ejecuta: npm install @logtail/node @logtail/browser");
  hasErrors = true;
}

// Verificar NEXT_PUBLIC_LOGTALL_SOURCE_TOKEN
console.log("\n2️⃣ Verificando NEXT_PUBLIC_LOGTALL_SOURCE_TOKEN...");
if (!logtailToken) {
  console.warn("⚠️  NEXT_PUBLIC_LOGTALL_SOURCE_TOKEN no está configurado");
  console.warn("   Sin esto, los logs se enviarán solo a console");
  console.warn("\n   Para configurar Logtail:");
  console.warn("   1. Ve a https://logtail.com");
  console.warn("   2. Crea un proyecto");
  console.warn("   3. Copia el Source Token");
  console.warn("   4. Agrégalo a .env.local como NEXT_PUBLIC_LOGTALL_SOURCE_TOKEN");
} else {
  // Verificar formato del token (los tokens de Logtail suelen tener un formato específico)
  if (logtailToken.length < 20) {
    console.error("❌ NEXT_PUBLIC_LOGTALL_SOURCE_TOKEN parece ser demasiado corto");
    console.error("   Los tokens de Logtail suelen tener al menos 20 caracteres");
    hasErrors = true;
  } else {
    console.log("✅ NEXT_PUBLIC_LOGTALL_SOURCE_TOKEN está configurado");
    console.log(`   Token: ${logtailToken.substring(0, 10)}... (${logtailToken.length} caracteres)`);
  }
}

// Resumen
console.log("\n" + "=".repeat(50));
if (hasErrors) {
  console.error("\n❌ Hay errores en la configuración de Logtail");
  console.error("\n📝 Pasos para solucionar:");
  console.error("   1. Instala dependencias: npm install @logtail/node @logtail/browser");
  console.error("   2. Ve a https://logtail.com");
  console.error("   3. Crea un proyecto");
  console.error("   4. Copia el Source Token");
  console.error("   5. Agrégalo a .env.local como NEXT_PUBLIC_LOGTALL_SOURCE_TOKEN");
  console.error("\n   Consulta PASO_A_PASO_LOGTAIL.md para más detalles");
  process.exit(1);
} else if (!logtailToken) {
  console.warn("\n⚠️  Logtail no está configurado");
  console.warn("\n📝 Para configurar Logtail:");
  console.warn("   1. Ve a https://logtail.com");
  console.warn("   2. Crea un proyecto");
  console.warn("   3. Copia el Source Token");
  console.warn("   4. Agrégalo a .env.local como NEXT_PUBLIC_LOGTALL_SOURCE_TOKEN");
  console.warn("\n   Consulta PASO_A_PASO_LOGTAIL.md para más detalles");
  process.exit(0);
} else {
  console.log("\n✅ Configuración de Logtail verificada correctamente");
  console.log("\n📝 Próximos pasos:");
  console.log("   1. Reinicia el servidor: npm run dev");
  console.log("   2. Los logs se enviarán automáticamente a Logtail");
  console.log("   3. Ve a tu dashboard de Logtail para ver los logs");
  console.log("\n💡 Tip: Usa logServer.info(), logServer.error(), etc. en tu código");
  console.log("   para enviar logs estructurados a Logtail");
}

