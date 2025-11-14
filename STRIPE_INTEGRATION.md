# 💳 Integración de Stripe - Guía Completa

Esta guía explica cómo está configurada la integración de Stripe en la aplicación y cómo usarla.

---

## 📋 Archivos Creados

### Backend (API Routes)

1. **`/src/app/api/checkout/route.ts`**
   - Endpoint POST para crear sesiones de checkout
   - Crea una sesión de pago con Stripe
   - Retorna la URL de checkout para redirigir al usuario

2. **`/src/app/api/webhooks/stripe/route.ts`**
   - Endpoint POST para recibir webhooks de Stripe
   - Verifica la firma del webhook
   - Maneja eventos como `checkout.session.completed`, `payment_intent.succeeded`, etc.

### Frontend (Componentes)

3. **`/src/components/stripe-checkout-button.tsx`**
   - Componente reutilizable del botón de checkout
   - Maneja la lógica de redirección a Stripe
   - Muestra estados de carga

4. **`/src/app/(home)/success/page.tsx`**
   - Página de éxito después del pago

5. **`/src/app/(home)/cancel/page.tsx`**
   - Página de cancelación del pago

---

## 🔧 Configuración

### 1. Variables de Entorno

Asegúrate de tener estas variables en tu `.env.local`:

```env
# Stripe - Claves de Prueba
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 2. Obtener Credenciales de Stripe

1. Ve a [https://dashboard.stripe.com](https://dashboard.stripe.com)
2. Asegúrate de estar en **Test mode** (modo de prueba)
3. Ve a **Developers** > **API keys**
4. Copia:
   - **Publishable key** → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - **Secret key** → `STRIPE_SECRET_KEY`

### 3. Configurar Webhook (Para Desarrollo Local)

Para desarrollo local, necesitas exponer tu servidor con ngrok:

```bash
# Instala ngrok si no lo tienes
# https://ngrok.com/download

# Inicia tu servidor Next.js
npm run dev

# En otra terminal, expone el puerto 3000
ngrok http 3000
```

Luego:

1. Ve a **Developers** > **Webhooks** en Stripe Dashboard
2. Haz clic en **Add endpoint**
3. URL: `https://tu-url-ngrok.ngrok.io/api/webhooks/stripe`
4. Selecciona los eventos:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copia el **Signing secret** → `STRIPE_WEBHOOK_SECRET`

---

## 🚀 Uso

### Uso Básico del Botón

El botón ya está agregado en la página principal (`/`). Simplemente haz clic en "Probar pago" para iniciar el checkout.

### Uso Personalizado

```tsx
import { StripeCheckoutButton } from "@/components/stripe-checkout-button";

// Uso básico
<StripeCheckoutButton />

// Con opciones personalizadas
<StripeCheckoutButton
  priceId="price_1234567890" // ID de precio de Stripe
  successUrl="/custom-success"
  cancelUrl="/custom-cancel"
  className="mi-clase-personalizada"
/>
```

### Crear un Price en Stripe

Para usar un precio real en lugar del de prueba:

1. Ve a **Products** en Stripe Dashboard
2. Crea un nuevo producto
3. Agrega un precio (puede ser único o recurrente)
4. Copia el **Price ID** (empieza con `price_`)
5. Úsalo en el componente:

```tsx
<StripeCheckoutButton priceId="price_tu_id_real" />
```

---

## 🧪 Probar el Pago

### Tarjetas de Prueba de Stripe

Usa estas tarjetas para probar diferentes escenarios:

**Pago exitoso:**
- Número: `4242 4242 4242 4242`
- Fecha: Cualquier fecha futura (ej: `12/34`)
- CVC: Cualquier 3 dígitos (ej: `123`)
- ZIP: Cualquier código postal (ej: `12345`)

**Pago rechazado:**
- Número: `4000 0000 0000 0002`

**Requiere autenticación 3D Secure:**
- Número: `4000 0027 6000 3184`

Más tarjetas de prueba: [https://stripe.com/docs/testing](https://stripe.com/docs/testing)

---

## 📝 Flujo Completo

1. **Usuario hace clic en "Probar pago"**
   - El componente llama a `/api/checkout`
   - El endpoint crea una sesión de checkout en Stripe
   - Retorna la URL de checkout

2. **Redirección a Stripe**
   - El usuario es redirigido a la página de checkout de Stripe
   - Ingresa los datos de la tarjeta
   - Completa el pago

3. **Redirección de vuelta**
   - Si el pago es exitoso → `/success`
   - Si se cancela → `/cancel`

4. **Webhook**
   - Stripe envía un webhook a `/api/webhooks/stripe`
   - El endpoint verifica la firma
   - Procesa el evento (actualiza BD, envía email, etc.)

---

## 🔒 Seguridad

- ✅ **Nunca** expongas `STRIPE_SECRET_KEY` en el frontend
- ✅ **Siempre** verifica la firma del webhook
- ✅ Usa **claves de prueba** para desarrollo
- ✅ Usa **claves de producción** solo en producción
- ✅ El webhook está excluido del middleware de autenticación

---

## 🐛 Troubleshooting

### Error: "Stripe no está configurado"
- Verifica que las variables de entorno estén en `.env.local`
- Reinicia el servidor después de agregar las variables

### Error: "Publishable key not valid"
- Verifica que la clave empiece con `pk_test_` o `pk_live_`
- Asegúrate de no tener espacios extra en la variable

### Webhook no funciona
- Verifica que ngrok esté corriendo
- Verifica que la URL del webhook en Stripe sea correcta
- Verifica que `STRIPE_WEBHOOK_SECRET` sea el correcto
- Revisa los logs del servidor para ver errores

### El botón no redirige
- Abre la consola del navegador para ver errores
- Verifica que `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` esté configurada
- Verifica que el endpoint `/api/checkout` esté funcionando

---

## 📚 Recursos

- [Documentación de Stripe](https://stripe.com/docs)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Tarjetas de Prueba](https://stripe.com/docs/testing)

---

## ✅ Checklist de Implementación

- [x] Instalar Stripe SDK
- [x] Crear endpoint `/api/checkout`
- [x] Crear endpoint `/api/webhooks/stripe`
- [x] Crear componente de botón
- [x] Agregar botón a la página principal
- [x] Crear páginas de éxito y cancelación
- [x] Configurar middleware para webhook
- [x] Documentación completa

---

¿Necesitas ayuda? Consulta la documentación oficial de Stripe o revisa los logs del servidor.

