/**
 * Script para verificar que las variables de entorno de PayPal estén configuradas correctamente
 * Ejecuta: node scripts/verificar-paypal-env.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando configuración de PayPal...\n');

// Verificar que .env.local existe
const envPath = path.join(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('❌ ERROR: El archivo .env.local NO existe en la raíz del proyecto');
  console.log('\n📝 Solución:');
  console.log('1. Crea un archivo llamado .env.local en la raíz del proyecto');
  console.log('2. Agrega las siguientes líneas:');
  console.log('   NEXT_PUBLIC_PAYPAL_CLIENT_ID=tu_client_id_aqui');
  console.log('   PAYPAL_CLIENT_SECRET=tu_client_secret_aqui');
  console.log('   PAYPAL_ENVIRONMENT=sandbox');
  process.exit(1);
}

console.log('✅ El archivo .env.local existe\n');

// Leer el contenido del archivo
const envContent = fs.readFileSync(envPath, 'utf-8');
const lines = envContent.split('\n');

// Buscar las variables
let hasClientId = false;
let hasClientSecret = false;
let hasEnvironment = false;
let clientIdValue = '';
let clientSecretValue = '';
let environmentValue = '';

lines.forEach((line, index) => {
  const trimmedLine = line.trim();
  
  // Ignorar comentarios y líneas vacías
  if (trimmedLine.startsWith('#') || trimmedLine === '') {
    return;
  }
  
  // Buscar NEXT_PUBLIC_PAYPAL_CLIENT_ID
  if (trimmedLine.startsWith('NEXT_PUBLIC_PAYPAL_CLIENT_ID=')) {
    hasClientId = true;
    clientIdValue = trimmedLine.split('=')[1]?.trim() || '';
    console.log(`✅ NEXT_PUBLIC_PAYPAL_CLIENT_ID encontrado (línea ${index + 1})`);
    if (clientIdValue) {
      console.log(`   Valor: ${clientIdValue.substring(0, 20)}... (${clientIdValue.length} caracteres)`);
    } else {
      console.log(`   ⚠️  ADVERTENCIA: El valor está vacío`);
    }
  }
  
  // Buscar PAYPAL_CLIENT_SECRET
  if (trimmedLine.startsWith('PAYPAL_CLIENT_SECRET=')) {
    hasClientSecret = true;
    clientSecretValue = trimmedLine.split('=')[1]?.trim() || '';
    console.log(`✅ PAYPAL_CLIENT_SECRET encontrado (línea ${index + 1})`);
    if (clientSecretValue) {
      console.log(`   Valor: ${clientSecretValue.substring(0, 20)}... (${clientSecretValue.length} caracteres)`);
    } else {
      console.log(`   ⚠️  ADVERTENCIA: El valor está vacío`);
    }
  }
  
  // Buscar PAYPAL_ENVIRONMENT
  if (trimmedLine.startsWith('PAYPAL_ENVIRONMENT=')) {
    hasEnvironment = true;
    environmentValue = trimmedLine.split('=')[1]?.trim() || '';
    console.log(`✅ PAYPAL_ENVIRONMENT encontrado (línea ${index + 1})`);
    console.log(`   Valor: ${environmentValue}`);
  }
});

console.log('\n📊 Resumen:');
console.log(`   NEXT_PUBLIC_PAYPAL_CLIENT_ID: ${hasClientId ? '✅' : '❌'}`);
console.log(`   PAYPAL_CLIENT_SECRET: ${hasClientSecret ? '✅' : '❌'}`);
console.log(`   PAYPAL_ENVIRONMENT: ${hasEnvironment ? '✅' : '❌'}`);

// Verificar problemas comunes
let hasErrors = false;

if (!hasClientId) {
  console.error('\n❌ ERROR: NEXT_PUBLIC_PAYPAL_CLIENT_ID no está definido');
  hasErrors = true;
} else if (!clientIdValue) {
  console.error('\n❌ ERROR: NEXT_PUBLIC_PAYPAL_CLIENT_ID está vacío');
  hasErrors = true;
} else if (clientIdValue.length < 10) {
  console.error('\n❌ ERROR: NEXT_PUBLIC_PAYPAL_CLIENT_ID parece muy corto (menos de 10 caracteres)');
  hasErrors = true;
}

if (!hasClientSecret) {
  console.error('\n❌ ERROR: PAYPAL_CLIENT_SECRET no está definido');
  hasErrors = true;
} else if (!clientSecretValue) {
  console.error('\n❌ ERROR: PAYPAL_CLIENT_SECRET está vacío');
  hasErrors = true;
} else if (clientSecretValue.length < 10) {
  console.error('\n❌ ERROR: PAYPAL_CLIENT_SECRET parece muy corto (menos de 10 caracteres)');
  hasErrors = true;
}

if (!hasEnvironment) {
  console.warn('\n⚠️  ADVERTENCIA: PAYPAL_ENVIRONMENT no está definido (usará sandbox por defecto)');
}

// Verificar si hay comillas o espacios
if (hasClientId && clientIdValue) {
  if (clientIdValue.startsWith('"') || clientIdValue.startsWith("'")) {
    console.error('\n❌ ERROR: NEXT_PUBLIC_PAYPAL_CLIENT_ID tiene comillas. Elimínalas.');
    hasErrors = true;
  }
  if (clientIdValue.startsWith(' ') || clientIdValue.endsWith(' ')) {
    console.error('\n❌ ERROR: NEXT_PUBLIC_PAYPAL_CLIENT_ID tiene espacios al inicio o final. Elimínalos.');
    hasErrors = true;
  }
}

if (hasClientSecret && clientSecretValue) {
  if (clientSecretValue.startsWith('"') || clientSecretValue.startsWith("'")) {
    console.error('\n❌ ERROR: PAYPAL_CLIENT_SECRET tiene comillas. Elimínalas.');
    hasErrors = true;
  }
  if (clientSecretValue.startsWith(' ') || clientSecretValue.endsWith(' ')) {
    console.error('\n❌ ERROR: PAYPAL_CLIENT_SECRET tiene espacios al inicio o final. Elimínalos.');
    hasErrors = true;
  }
}

if (hasErrors) {
  console.log('\n📝 Solución:');
  console.log('1. Abre el archivo .env.local');
  console.log('2. Asegúrate de que las líneas sean exactamente así (sin comillas, sin espacios extra):');
  console.log('   NEXT_PUBLIC_PAYPAL_CLIENT_ID=tu_client_id_aqui');
  console.log('   PAYPAL_CLIENT_SECRET=tu_client_secret_aqui');
  console.log('   PAYPAL_ENVIRONMENT=sandbox');
  console.log('3. Guarda el archivo');
  console.log('4. Reinicia el servidor de desarrollo (Ctrl+C y luego npm run dev)');
  process.exit(1);
}

console.log('\n✅ ¡Todo parece estar configurado correctamente!');
console.log('\n⚠️  IMPORTANTE: Si aún tienes errores, asegúrate de haber reiniciado el servidor después de cambiar .env.local');
console.log('   Detén el servidor (Ctrl+C) y reinícialo con: npm run dev');




