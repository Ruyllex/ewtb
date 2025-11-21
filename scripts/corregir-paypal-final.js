/**
 * Script final para corregir las variables de PayPal en .env.local
 * Separa correctamente las variables que están juntas
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env.local');

if (!fs.existsSync(envPath)) {
  console.error('❌ El archivo .env.local no existe');
  process.exit(1);
}

console.log('🔧 Corrigiendo variables de PayPal en .env.local...\n');

// Leer el archivo completo
let content = fs.readFileSync(envPath, 'utf-8');

// Valores conocidos de las variables (del output anterior)
const CLIENT_ID = 'AaTddNEdmr0G5vsSPbfes6lQ773nKPGoua8sfDJ0QVWw3Fpkv90pLbN2rWoGYgcZV8VeiJw3LNIXkHa-';
const CLIENT_SECRET = 'EKNARlxBd6e2J7Hez9u4WWftL1rYrdutfa5bUsC0lb3CdgZP3RNvWjT2XRHZqewiFOuyKYvSJ6vgiIPx';

// Buscar y reemplazar cualquier línea que contenga las variables de PayPal
// Patrón: buscar líneas que contengan NEXT_PUBLIC_PAYPAL_CLIENT_ID o PAYPAL_CLIENT_SECRET
const lines = content.split(/\r?\n/);
const correctedLines = [];
let foundPaypalSection = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Si encontramos el comentario #PAYPAL, marcar que estamos en la sección
  if (line.trim() === '#PAYPAL' || line.trim().includes('#PAYPAL')) {
    foundPaypalSection = true;
    correctedLines.push('#PAYPAL');
    continue;
  }
  
  // Si la línea contiene las variables de PayPal juntas, separarlas
  if (line.includes('NEXT_PUBLIC_PAYPAL_CLIENT_ID') || line.includes('PAYPAL_CLIENT_SECRET') || line.includes('PAYPAL_ENVIRONMENT')) {
    // Si la línea contiene múltiples variables, separarlas
    if (line.includes('NEXT_PUBLIC_PAYPAL_CLIENT_ID') && line.includes('PAYPAL_CLIENT_SECRET')) {
      // Están juntas, separarlas
      const clientIdMatch = line.match(/NEXT_PUBLIC_PAYPAL_CLIENT_ID=([^=]+?)(?=PAYPAL_CLIENT_SECRET|$)/);
      const secretMatch = line.match(/PAYPAL_CLIENT_SECRET=([^=]+?)(?=PAYPAL_ENVIRONMENT|$)/);
      const envMatch = line.match(/PAYPAL_ENVIRONMENT=([^\s]+)/);
      
      if (clientIdMatch) {
        let clientId = clientIdMatch[1].trim().replace(/\s+/g, '');
        // Si no tiene el valor completo, usar el conocido
        if (clientId.length < 50) {
          clientId = CLIENT_ID;
        }
        correctedLines.push(`NEXT_PUBLIC_PAYPAL_CLIENT_ID=${clientId}`);
        console.log('✅ Corregido NEXT_PUBLIC_PAYPAL_CLIENT_ID');
      }
      
      if (secretMatch) {
        let secret = secretMatch[1].trim().replace(/\s+/g, '');
        // Si no tiene el valor completo, usar el conocido
        if (secret.length < 50) {
          secret = CLIENT_SECRET;
        }
        correctedLines.push(`PAYPAL_CLIENT_SECRET=${secret}`);
        console.log('✅ Corregido PAYPAL_CLIENT_SECRET');
      }
      
      if (envMatch) {
        correctedLines.push(`PAYPAL_ENVIRONMENT=${envMatch[1].trim()}`);
        console.log('✅ PAYPAL_ENVIRONMENT encontrado');
      } else {
        correctedLines.push('PAYPAL_ENVIRONMENT=sandbox');
        console.log('✅ Agregado PAYPAL_ENVIRONMENT=sandbox');
      }
    } else {
      // Solo una variable, limpiarla
      if (line.includes('NEXT_PUBLIC_PAYPAL_CLIENT_ID=')) {
        let value = line.split('=')[1] || '';
        value = value.replace(/\s+/g, '').split('PAYPAL_CLIENT_SECRET')[0].split('PAYPAL_ENVIRONMENT')[0];
        if (value.length < 50) value = CLIENT_ID;
        correctedLines.push(`NEXT_PUBLIC_PAYPAL_CLIENT_ID=${value}`);
        console.log('✅ Corregido NEXT_PUBLIC_PAYPAL_CLIENT_ID');
      } else if (line.includes('PAYPAL_CLIENT_SECRET=')) {
        let value = line.split('=')[1] || '';
        value = value.replace(/\s+/g, '').split('PAYPAL_ENVIRONMENT')[0];
        if (value.length < 50) value = CLIENT_SECRET;
        correctedLines.push(`PAYPAL_CLIENT_SECRET=${value}`);
        console.log('✅ Corregido PAYPAL_CLIENT_SECRET');
      } else if (line.includes('PAYPAL_ENVIRONMENT=')) {
        correctedLines.push(line.trim());
      } else {
        correctedLines.push(line);
      }
    }
  } else {
    correctedLines.push(line);
  }
}

// Si no encontramos las variables, agregarlas después del comentario #PAYPAL
if (foundPaypalSection) {
  const paypalIndex = correctedLines.findIndex(line => line.includes('#PAYPAL'));
  if (paypalIndex >= 0) {
    // Verificar si ya están las variables después del comentario
    const hasClientId = correctedLines.slice(paypalIndex + 1, paypalIndex + 5).some(line => line.includes('NEXT_PUBLIC_PAYPAL_CLIENT_ID'));
    const hasSecret = correctedLines.slice(paypalIndex + 1, paypalIndex + 5).some(line => line.includes('PAYPAL_CLIENT_SECRET'));
    
    if (!hasClientId || !hasSecret) {
      // Insertar las variables después del comentario
      const insertIndex = paypalIndex + 1;
      if (!hasClientId) {
        correctedLines.splice(insertIndex, 0, `NEXT_PUBLIC_PAYPAL_CLIENT_ID=${CLIENT_ID}`);
        console.log('✅ Agregado NEXT_PUBLIC_PAYPAL_CLIENT_ID');
      }
      if (!hasSecret) {
        correctedLines.splice(insertIndex + 1, 0, `PAYPAL_CLIENT_SECRET=${CLIENT_SECRET}`);
        console.log('✅ Agregado PAYPAL_CLIENT_SECRET');
      }
      const hasEnv = correctedLines.slice(insertIndex, insertIndex + 3).some(line => line.includes('PAYPAL_ENVIRONMENT'));
      if (!hasEnv) {
        correctedLines.splice(insertIndex + 2, 0, 'PAYPAL_ENVIRONMENT=sandbox');
        console.log('✅ Agregado PAYPAL_ENVIRONMENT');
      }
    }
  }
}

// Guardar el archivo corregido
fs.writeFileSync(envPath, correctedLines.join('\n'), 'utf-8');

console.log('\n✅ Archivo .env.local corregido exitosamente!');
console.log('\n⚠️  IMPORTANTE: Ahora debes reiniciar el servidor:');
console.log('   1. Detén el servidor (Ctrl+C)');
console.log('   2. Reinícialo con: npm run dev');




