/**
 * Script de verificación para Sentry
 * 
 * Este script verifica:
 * 1. Que las variables de entorno de Sentry estén configuradas
 * 2. Que los valores tengan el formato correcto
 * 
 * Ejecutar con: npm run verify:sentry
 * o: tsx scripts/verify-sentry-config.ts
 */

import * as dotenv from "dotenv";
import { resolve } from "path";

// Cargar variables de entorno
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const sentryOrg = process.env.SENTRY_ORG;
const sentryProject = process.env.SENTRY_PROJECT;
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;

console.log("🔍 Verificando configuración de Sentry...\n");

let hasErrors = false;

// Verificar NEXT_PUBLIC_SENTRY_DSN
console.log("1️⃣ Verificando NEXT_PUBLIC_SENTRY_DSN...");
if (!sentryDsn) {
  console.error("❌ NEXT_PUBLIC_SENTRY_DSN no está configurado");
  hasErrors = true;
} else {
  // Verificar formato del DSN (acepta regiones como .us., .eu., etc.)
  const dsnPattern = /^https:\/\/[a-zA-Z0-9]+@[a-zA-Z0-9.]+\.ingest\.(us\.|eu\.)?sentry\.io\/[0-9]+$/;
  if (!dsnPattern.test(sentryDsn)) {
    console.error("❌ NEXT_PUBLIC_SENTRY_DSN tiene un formato incorrecto");
    console.error("   Formato esperado: https://xxxxx@xxxxx.ingest.sentry.io/xxxxx");
    console.error("   O con región: https://xxxxx@xxxxx.ingest.us.sentry.io/xxxxx");
    console.error(`   Valor actual: ${sentryDsn}`);
    hasErrors = true;
  } else {
    console.log("✅ NEXT_PUBLIC_SENTRY_DSN está configurado correctamente");
    console.log(`   DSN: ${sentryDsn.substring(0, 50)}...`);
  }
}

// Verificar SENTRY_ORG
console.log("\n2️⃣ Verificando SENTRY_ORG...");
if (!sentryOrg) {
  console.warn("⚠️  SENTRY_ORG no está configurado (opcional para source maps)");
  console.warn("   Sin esto, los source maps no se subirán automáticamente");
} else {
  if (sentryOrg.includes(" ") || sentryOrg.includes("@")) {
    console.error("❌ SENTRY_ORG tiene un formato incorrecto");
    console.error("   No debe contener espacios ni @");
    hasErrors = true;
  } else {
    console.log("✅ SENTRY_ORG está configurado");
    console.log(`   Org: ${sentryOrg}`);
  }
}

// Verificar SENTRY_PROJECT
console.log("\n3️⃣ Verificando SENTRY_PROJECT...");
if (!sentryProject) {
  console.warn("⚠️  SENTRY_PROJECT no está configurado (opcional para source maps)");
  console.warn("   Sin esto, los source maps no se subirán automáticamente");
} else {
  if (sentryProject.includes(" ") || sentryProject.includes("@")) {
    console.error("❌ SENTRY_PROJECT tiene un formato incorrecto");
    console.error("   No debe contener espacios ni @");
    hasErrors = true;
  } else {
    console.log("✅ SENTRY_PROJECT está configurado");
    console.log(`   Project: ${sentryProject}`);
  }
}

// Verificar SENTRY_AUTH_TOKEN
console.log("\n4️⃣ Verificando SENTRY_AUTH_TOKEN...");
if (!sentryAuthToken) {
  console.warn("⚠️  SENTRY_AUTH_TOKEN no está configurado (opcional para source maps)");
  console.warn("   Sin esto, los source maps no se subirán automáticamente");
} else {
  // Verificar formato del token (puede empezar con sntrys_ o sntryu_)
  if (sentryAuthToken.length < 20) {
    console.error("❌ SENTRY_AUTH_TOKEN parece ser demasiado corto");
    console.error("   Los tokens de Sentry suelen tener al menos 20 caracteres");
    hasErrors = true;
  } else if (!sentryAuthToken.startsWith("sntrys_") && !sentryAuthToken.startsWith("sntryu_")) {
    console.warn("⚠️  SENTRY_AUTH_TOKEN no tiene el formato esperado");
    console.warn("   Los tokens suelen empezar con 'sntrys_' (API token) o 'sntryu_' (User token)");
    console.warn("   Si es un token válido, puedes ignorar esta advertencia");
    console.log("✅ SENTRY_AUTH_TOKEN está configurado");
    console.log(`   Token: ${sentryAuthToken.substring(0, 10)}... (${sentryAuthToken.length} caracteres)`);
  } else {
    console.log("✅ SENTRY_AUTH_TOKEN está configurado");
    const tokenType = sentryAuthToken.startsWith("sntrys_") ? "API Token" : "User Token";
    console.log(`   Token: ${sentryAuthToken.substring(0, 10)}... (${sentryAuthToken.length} caracteres, ${tokenType})`);
  }
}

// Resumen
console.log("\n" + "=".repeat(50));
if (hasErrors) {
  console.error("\n❌ Hay errores en la configuración de Sentry");
  console.error("\n📝 Pasos para solucionar:");
  console.error("   1. Ve a https://sentry.io");
  console.error("   2. Crea un proyecto Next.js");
  console.error("   3. Copia el DSN");
  console.error("   4. Crea un Auth Token (Settings → Auth Tokens)");
  console.error("   5. Obtén el Org Slug y Project Slug");
  console.error("   6. Agrega las variables a .env.local");
  console.error("\n   Consulta PASO_A_PASO_SENTRY.md para más detalles");
  process.exit(1);
} else if (!sentryDsn) {
  console.warn("\n⚠️  Sentry no está configurado");
  console.warn("\n📝 Para configurar Sentry:");
  console.warn("   1. Ve a https://sentry.io");
  console.warn("   2. Crea un proyecto Next.js");
  console.warn("   3. Copia el DSN y agrégalo a .env.local como NEXT_PUBLIC_SENTRY_DSN");
  console.warn("\n   Consulta PASO_A_PASO_SENTRY.md para más detalles");
  process.exit(0);
} else {
  console.log("\n✅ Configuración de Sentry verificada correctamente");
  
  if (!sentryOrg || !sentryProject || !sentryAuthToken) {
    console.warn("\n⚠️  Nota: Algunas variables opcionales no están configuradas");
    console.warn("   Sin SENTRY_ORG, SENTRY_PROJECT y SENTRY_AUTH_TOKEN:");
    console.warn("   - Los source maps NO se subirán automáticamente");
    console.warn("   - Los errores funcionarán, pero con stack traces menos detallados");
    console.warn("\n   Para habilitar source maps, agrega estas variables a .env.local");
  } else {
    console.log("\n✅ Todas las variables están configuradas");
    console.log("   Los source maps se subirán automáticamente en producción");
  }
  
  console.log("\n📝 Próximos pasos:");
  console.log("   1. Reinicia el servidor: npm run dev");
  console.log("   2. Los errores se capturarán automáticamente");
  console.log("   3. En desarrollo, los errores se muestran en consola");
  console.log("   4. En producción, los errores se envían a Sentry");
}

