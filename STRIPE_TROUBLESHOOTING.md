# 🔧 Troubleshooting - Error de Stripe Checkout

## ❌ Error: "Error al crear la sesión de checkout"

Este error puede ocurrir por varias razones. Sigue estos pasos para solucionarlo:

---

## ✅ Soluciones Paso a Paso

### 1. Verificar Variables de Entorno

Asegúrate de que las variables estén en `.env.local` y tengan el formato correcto:

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

**Verificación:**
- ✅ La clave pública debe empezar con `pk_test_` o `pk_live_`
- ✅ La clave secreta debe empezar con `sk_test_` o `sk_live_`
- ✅ No debe haber espacios extra antes o después de las claves
- ✅ No debe haber comillas alrededor de los valores

### 2. Reiniciar el Servidor

**IMPORTANTE:** Después de cambiar variables de entorno, SIEMPRE reinicia el servidor:

```bash
# Detén el servidor (Ctrl+C)
# Luego reinícialo
npm run dev
```

### 3. Verificar las Claves en Stripe Dashboard

1. Ve a [https://dashboard.stripe.com](https://dashboard.stripe.com)
2. Asegúrate de estar en **Test mode** (modo de prueba)
3. Ve a **Developers** > **API keys**
4. Verifica que las claves sean correctas
5. Si es necesario, genera nuevas claves

### 4. Verificar los Logs del Servidor

Revisa la consola del servidor (donde ejecutaste `npm run dev`) para ver errores específicos:

```bash
# Busca mensajes como:
# - "STRIPE_SECRET_KEY no está configurada"
# - "Error creando precio: ..."
# - "Error de Stripe: ..."
```

### 5. Probar la Conexión con Stripe

Puedes probar si las claves funcionan creando un script de prueba:

```typescript
// test-stripe.ts (temporal, para probar)
import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-12-18.acacia",
});

async function test() {
  try {
    const price = await stripe.prices.create({
      unit_amount: 1000,
      currency: "usd",
      product_data: {
        name: "Test",
      },
    });
    console.log("✅ Stripe funciona! Price ID:", price.id);
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

test();
```

Ejecuta: `npx tsx test-stripe.ts`

---

## 🐛 Errores Comunes y Soluciones

### Error: "Stripe no está configurado"
**Causa:** `STRIPE_SECRET_KEY` no está en `.env.local` o el servidor no se reinició.

**Solución:**
1. Verifica que el archivo `.env.local` existe en la raíz del proyecto
2. Agrega `STRIPE_SECRET_KEY=sk_test_...`
3. Reinicia el servidor

### Error: "La clave secreta de Stripe tiene un formato inválido"
**Causa:** La clave no empieza con `sk_test_` o `sk_live_`.

**Solución:**
1. Verifica que copiaste la clave completa desde Stripe Dashboard
2. Asegúrate de no tener espacios extra
3. La clave debe empezar exactamente con `sk_test_` o `sk_live_`

### Error: "Error creando precio: ..."
**Causa:** Problema al crear el precio dinámico en Stripe.

**Solución:**
1. Verifica que la clave secreta sea válida
2. Asegúrate de estar en Test mode si usas claves de prueba
3. Revisa los logs del servidor para el error específico

### Error: "Error de Stripe: Invalid API Key"
**Causa:** La clave de API es inválida o está revocada.

**Solución:**
1. Ve a Stripe Dashboard > API keys
2. Genera nuevas claves si es necesario
3. Actualiza `.env.local` con las nuevas claves
4. Reinicia el servidor

---

## 🔍 Debugging Avanzado

### Habilitar Logs Detallados

El código ya incluye logs. Revisa la consola del servidor para ver:

```
✅ Precio creado: price_...
✅ Sesión de checkout creada: cs_...
```

O errores como:

```
❌ Error creando precio: ...
❌ Error de Stripe: ...
```

### Verificar la Respuesta del Endpoint

Abre las DevTools del navegador (F12) y ve a la pestaña **Network**:
1. Haz clic en "Probar pago"
2. Busca la petición a `/api/checkout`
3. Revisa la respuesta para ver el error específico

### Probar el Endpoint Directamente

Puedes probar el endpoint con curl:

```bash
curl -X POST http://localhost:3000/api/checkout \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## ✅ Checklist de Verificación

- [ ] Variables de entorno en `.env.local`
- [ ] Claves tienen el formato correcto (`pk_test_...`, `sk_test_...`)
- [ ] Servidor reiniciado después de cambiar variables
- [ ] Estás en Test mode en Stripe Dashboard
- [ ] Las claves son válidas (no revocadas)
- [ ] Revisaste los logs del servidor
- [ ] Revisaste la consola del navegador

---

## 📞 Obtener Ayuda

Si después de seguir estos pasos el problema persiste:

1. **Revisa los logs del servidor** y copia el error completo
2. **Revisa la consola del navegador** (F12 > Console)
3. **Verifica en Stripe Dashboard** que las claves sean válidas
4. **Comparte el error específico** que aparece en los logs

---

## 🔄 Reiniciar Todo

Si nada funciona, intenta:

1. **Detener el servidor completamente**
2. **Verificar `.env.local`** una vez más
3. **Limpiar caché de Next.js:**
   ```bash
   rm -rf .next
   npm run dev
   ```
4. **Probar de nuevo**

---

¿Sigue sin funcionar? Revisa los logs del servidor y comparte el error específico que aparece.

