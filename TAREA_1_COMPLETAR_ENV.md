# 📝 TAREA 1: Completar Configuración de .env.local

## 🎯 Objetivo
Completar todas las variables de entorno faltantes en `.env.local` para que la aplicación funcione completamente.

---

## ✅ Variables Ya Configuradas
- `DATABASE_URL` - NeonDB ✅
- `STRIPE_SECRET_KEY` - Stripe ✅
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe ✅
- `STRIPE_WEBHOOK_SECRET` - Stripe ✅
- `CLERK_SECRET_KEY` - Clerk ✅
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk ✅

---

## ❌ Variables Faltantes

### 1. Mux (Procesamiento de Videos)
- `MUX_TOKEN_ID`
- `MUX_TOKEN_SECRET`
- `MUX_WEBHOOK_SECRET`

### 2. Mux Live (Streaming en Vivo)
- `MUX_LIVE_STREAM_KEY`
- `MUX_LIVE_STREAM_SECRET`

### 3. UploadThing (Gestión de Archivos)
- `UPLOADTHING_TOKEN`

### 4. Upstash Redis (Caching)
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

---

## 📋 Pasos Detallados

### Paso 1: Configurar Mux

#### 1.1 Obtener Credenciales de Mux

1. Ve a [https://dashboard.mux.com](https://dashboard.mux.com)
2. Inicia sesión o crea una cuenta
3. Ve a **Settings** > **API Access Tokens**
4. Si no tienes un token, haz clic en **Create Token**
5. Copia:
   - **Token ID** → `MUX_TOKEN_ID`
   - **Token Secret** → `MUX_TOKEN_SECRET`

#### 1.2 Configurar Webhook de Mux

1. Ve a **Settings** > **Webhooks**
2. Haz clic en **Add Webhook**
3. Para desarrollo local, usa ngrok:
   ```bash
   ngrok http 3000
   ```
4. URL del webhook: `https://tu-url-ngrok.ngrok.io/api/videos/webhook`
5. Selecciona los eventos:
   - `video.asset.created`
   - `video.asset.ready`
   - `video.asset.errored`
   - `video.asset.deleted`
   - `video.asset.track.ready`
6. Copia el **Signing Secret** → `MUX_WEBHOOK_SECRET`

#### 1.3 Agregar a .env.local

```env
MUX_TOKEN_ID=tu_token_id_aqui
MUX_TOKEN_SECRET=tu_token_secret_aqui
MUX_WEBHOOK_SECRET=tu_webhook_secret_aqui
```

---

### Paso 2: Configurar Mux Live (Opcional - para streaming)

#### 2.1 Habilitar Live Streaming en Mux

1. Ve a **Settings** > **Live Streaming** en Mux Dashboard
2. Si no está habilitado, actívalo
3. Crea credenciales de streaming o usa las existentes
4. Copia:
   - **Stream Key** → `MUX_LIVE_STREAM_KEY`
   - **Stream Secret** → `MUX_LIVE_STREAM_SECRET`

#### 2.2 Agregar a .env.local

```env
MUX_LIVE_STREAM_KEY=tu_stream_key_aqui
MUX_LIVE_STREAM_SECRET=tu_stream_secret_aqui
```

**Nota:** Estas variables son opcionales si no vas a usar streaming en vivo todavía.

---

### Paso 3: Configurar UploadThing

#### 3.1 Obtener Token de UploadThing

1. Ve a [https://uploadthing.com](https://uploadthing.com)
2. Inicia sesión o crea una cuenta
3. Ve a **Dashboard** > **API Keys**
4. Copia tu **Token** → `UPLOADTHING_TOKEN`

#### 3.2 Agregar a .env.local

```env
UPLOADTHING_TOKEN=sk_live_... o sk_test_...
```

---

### Paso 4: Configurar Upstash Redis

#### 4.1 Crear Base de Datos Redis

1. Ve a [https://console.upstash.com](https://console.upstash.com)
2. Inicia sesión o crea una cuenta
3. Haz clic en **Create Database**
4. Configura:
   - **Name:** `newtube-redis` (o el que prefieras)
   - **Type:** Redis
   - **Region:** Elige la más cercana a ti
5. Haz clic en **Create**

#### 4.2 Obtener Credenciales

1. Una vez creada, haz clic en tu base de datos
2. Ve a la pestaña **Details**
3. Copia:
   - **REST URL** → `UPSTASH_REDIS_REST_URL`
   - **REST Token** → `UPSTASH_REDIS_REST_TOKEN`

#### 4.3 Agregar a .env.local

```env
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=tu_token_aqui
```

---

### Paso 5: Verificar y Reiniciar

#### 5.1 Verificar .env.local

Abre `.env.local` y verifica que todas las variables estén presentes:

```env
# Base de Datos
DATABASE_URL=postgresql://...

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_SIGNING_SECRET=whsec_...

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Mux
MUX_TOKEN_ID=...
MUX_TOKEN_SECRET=...
MUX_WEBHOOK_SECRET=...

# Mux Live (Opcional)
MUX_LIVE_STREAM_KEY=...
MUX_LIVE_STREAM_SECRET=...

# UploadThing
UPLOADTHING_TOKEN=sk_live_...

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

#### 5.2 Reiniciar el Servidor

```bash
# Detén el servidor (Ctrl+C)
# Luego reinícialo
npm run dev
```

---

## ✅ Checklist de Verificación

- [ ] MUX_TOKEN_ID configurado
- [ ] MUX_TOKEN_SECRET configurado
- [ ] MUX_WEBHOOK_SECRET configurado
- [ ] MUX_LIVE_STREAM_KEY configurado (opcional)
- [ ] MUX_LIVE_STREAM_SECRET configurado (opcional)
- [ ] UPLOADTHING_TOKEN configurado
- [ ] UPSTASH_REDIS_REST_URL configurado
- [ ] UPSTASH_REDIS_REST_TOKEN configurado
- [ ] Servidor reiniciado
- [ ] No hay errores en la consola

---

## 🐛 Troubleshooting

### Error: "Mux no está configurado"
- Verifica que las variables de Mux estén en `.env.local`
- Reinicia el servidor

### Error: "UploadThing no está configurado"
- Verifica que `UPLOADTHING_TOKEN` esté en `.env.local`
- Reinicia el servidor

### Error: "Redis no está configurado"
- Verifica que las variables de Upstash estén en `.env.local`
- Reinicia el servidor

---

## 🎉 Siguiente Paso

Una vez completada esta tarea, pasaremos a la **TAREA 4: Configurar Mux Live Streams**.

---

¿Tienes todas las credenciales listas? Si necesitas ayuda para obtener alguna, avísame.

