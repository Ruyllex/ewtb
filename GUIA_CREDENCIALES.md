# 🔑 Guía Completa para Obtener Credenciales

Esta guía te ayudará a obtener todas las credenciales necesarias para configurar tu archivo `.env.local`.

---

## 📋 Checklist de Credenciales

- [x] **DATABASE_URL** - ✅ Ya configurado
- [ ] **Clerk** - Autenticación (3 variables)
- [ ] **Mux** - Procesamiento de videos (3 variables)
- [ ] **Mux Live** - Streaming en vivo (2 variables, opcional)
- [ ] **UploadThing** - Gestión de archivos (1 variable)
- [ ] **Upstash Redis** - Caching (2 variables)
- [ ] **Stripe** - Pagos (3 variables, opcional)

---

## 1. 🔐 Clerk - Autenticación

### Pasos:
1. Ve a [https://dashboard.clerk.com](https://dashboard.clerk.com)
2. Inicia sesión o crea una cuenta
3. Crea una nueva aplicación o selecciona una existente
4. Ve a **API Keys** en el menú lateral

### Variables a copiar:

#### `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- Ubicación: API Keys > **Publishable key**
- Formato: `pk_test_...` o `pk_live_...`
- ✅ Se usa en el frontend (puede ser pública)

#### `CLERK_SECRET_KEY`
- Ubicación: API Keys > **Secret key**
- Formato: `sk_test_...` o `sk_live_...`
- 🔒 Solo servidor (NUNCA la compartas)

#### `CLERK_SIGNING_SECRET`
- Ubicación: **Settings** > **Webhooks** > **Signing Secret**
- Si no tienes webhooks configurados:
  1. Ve a **Webhooks** en el menú lateral
  2. Haz clic en **Add Endpoint**
  3. URL: `https://tu-dominio.com/api/users/webhook` (o usa ngrok para desarrollo)
  4. Selecciona eventos: `user.created`, `user.updated`, `user.deleted`
  5. Copia el **Signing Secret** que aparece

---

## 2. 🎬 Mux - Procesamiento de Videos

### Pasos:
1. Ve a [https://dashboard.mux.com](https://dashboard.mux.com)
2. Inicia sesión o crea una cuenta
3. Ve a **Settings** > **API Access Tokens**
4. Crea un nuevo token o usa uno existente

### Variables a copiar:

#### `MUX_TOKEN_ID`
- Ubicación: API Access Tokens > **Token ID**
- Formato: Algo como `abc123...`

#### `MUX_TOKEN_SECRET`
- Ubicación: API Access Tokens > **Token Secret**
- Formato: Algo como `xyz789...`
- 🔒 Solo servidor

#### `MUX_WEBHOOK_SECRET`
- Ubicación: **Settings** > **Webhooks** > **Signing Secret**
- Si no tienes webhooks configurados:
  1. Ve a **Settings** > **Webhooks**
  2. Haz clic en **Add Webhook**
  3. URL: `https://tu-dominio.com/api/videos/webhook` (o usa ngrok para desarrollo)
  4. Selecciona eventos:
     - `video.asset.created`
     - `video.asset.ready`
     - `video.asset.errored`
     - `video.asset.deleted`
     - `video.asset.track.ready`
  5. Copia el **Signing Secret**

### Mux Live - Streaming en Vivo (Opcional)

#### `MUX_LIVE_STREAM_KEY` y `MUX_LIVE_STREAM_SECRET`
- Ubicación: **Settings** > **Live Streaming**
- Crea credenciales para streaming en vivo si planeas implementar esta funcionalidad

---

## 3. 📤 UploadThing - Gestión de Archivos

### Pasos:
1. Ve a [https://uploadthing.com](https://uploadthing.com)
2. Inicia sesión o crea una cuenta
3. Ve a **Dashboard** > **API Keys**

### Variables a copiar:

#### `UPLOADTHING_TOKEN`
- Ubicación: API Keys > **Token**
- Formato: `sk_live_...` o `sk_test_...`
- 🔒 Solo servidor

---

## 4. ⚡ Upstash Redis - Caching y Rate Limiting

### Pasos:
1. Ve a [https://console.upstash.com](https://console.upstash.com)
2. Inicia sesión o crea una cuenta
3. Crea una nueva base de datos Redis:
   - Haz clic en **Create Database**
   - Elige un nombre
   - Selecciona la región más cercana
   - Haz clic en **Create**

### Variables a copiar:

#### `UPSTASH_REDIS_REST_URL`
- Ubicación: Database Details > **REST URL**
- Formato: `https://...upstash.io`

#### `UPSTASH_REDIS_REST_TOKEN`
- Ubicación: Database Details > **REST Token**
- Formato: Una cadena larga de caracteres
- 🔒 Solo servidor

---

## 5. 💳 Stripe - Pagos (Opcional)

### Pasos:
1. Ve a [https://dashboard.stripe.com](https://dashboard.stripe.com)
2. Inicia sesión o crea una cuenta
3. Asegúrate de estar en **Test mode** para desarrollo
4. Ve a **Developers** > **API keys**

### Variables a copiar:

#### `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- Ubicación: API keys > **Publishable key**
- Formato: `pk_test_...` o `pk_live_...`
- ✅ Se usa en el frontend

#### `STRIPE_SECRET_KEY`
- Ubicación: API keys > **Secret key**
- Formato: `sk_test_...` o `sk_live_...`
- 🔒 Solo servidor

#### `STRIPE_WEBHOOK_SECRET`
- Ubicación: **Developers** > **Webhooks** > **Add endpoint**
- Pasos:
  1. Haz clic en **Add endpoint**
  2. URL: `https://tu-dominio.com/api/stripe/webhook` (o usa ngrok)
  3. Selecciona los eventos que necesites
  4. Copia el **Signing secret**

---

## 🚀 Configuración para Desarrollo Local

### Usando ngrok para Webhooks

Para desarrollo local, necesitas exponer tu servidor local para que los webhooks funcionen:

```bash
# Instala ngrok si no lo tienes
# https://ngrok.com/download

# Inicia tu servidor Next.js
npm run dev

# En otra terminal, expone el puerto 3000
ngrok http 3000
```

Copia la URL de ngrok (ej: `https://abc123.ngrok.io`) y úsala para configurar los webhooks en:
- Clerk: `https://abc123.ngrok.io/api/users/webhook`
- Mux: `https://abc123.ngrok.io/api/videos/webhook`
- Stripe: `https://abc123.ngrok.io/api/stripe/webhook`

---

## ✅ Verificación

Después de configurar todas las variables, verifica que todo esté correcto:

1. **Reinicia el servidor**:
   ```bash
   # Detén el servidor (Ctrl+C) y vuelve a iniciarlo
   npm run dev
   ```

2. **Verifica que no haya errores** en la consola del servidor

3. **Prueba las funcionalidades**:
   - Autenticación (Clerk)
   - Subida de videos (Mux)
   - Carga de thumbnails (UploadThing)

---

## 🔒 Seguridad

- ✅ **NUNCA** commitees el archivo `.env.local` al repositorio
- ✅ Usa claves de **test/development** para desarrollo
- ✅ Usa claves de **live/production** solo en producción
- ✅ No compartas tus claves secretas públicamente
- ✅ Rota tus claves periódicamente

---

## 📝 Notas

- Algunas variables son **opcionales** y solo necesitas configurarlas si planeas usar esas funcionalidades
- Para desarrollo, puedes dejar algunas variables vacías si no las necesitas inmediatamente
- El proyecto funcionará parcialmente sin todas las variables, pero algunas funcionalidades no estarán disponibles

---

¿Necesitas ayuda con alguna configuración específica? Consulta la documentación oficial de cada servicio.

