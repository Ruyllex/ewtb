# 🚀 Guía Rápida - TAREA 1: Completar .env.local

## 📋 Variables que Necesitas Obtener

### 1. Mux (3 variables) - OBLIGATORIO

- `MUX_TOKEN_ID`
- `MUX_TOKEN_SECRET`
- `MUX_WEBHOOK_SECRET`

### 2. UploadThing (1 variable) - OBLIGATORIO

- `UPLOADTHING_TOKEN`

### 3. Upstash Redis (2 variables) - OBLIGATORIO

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

### 4. Mux Live (2 variables) - OPCIONAL (para después)

- `MUX_LIVE_STREAM_KEY`
- `MUX_LIVE_STREAM_SECRET`

---

## ⚡ Inicio Rápido

### Paso 1: Mux (5 minutos)

1. Ve a: https://dashboard.mux.com
2. Inicia sesión o crea cuenta
3. Ve a **Settings** > **API Access Tokens**
4. Crea un token o usa uno existente
5. Copia:
   - Token ID → `MUX_TOKEN_ID`
   - Token Secret → `MUX_TOKEN_SECRET`
6. Ve a **Settings** > **Webhooks**
7. Agrega webhook: `https://tu-url-ngrok/api/videos/webhook` (usa ngrok para desarrollo)
8. Copia Signing Secret → `MUX_WEBHOOK_SECRET`

**Agrega a .env.local:**

```env
MUX_TOKEN_ID=tu_token_id
MUX_TOKEN_SECRET=tu_token_secret
MUX_WEBHOOK_SECRET=tu_webhook_secret
```

---

### Paso 2: UploadThing (3 minutos)

1. Ve a: https://uploadthing.com
2. Inicia sesión o crea cuenta
3. Ve a **Dashboard** > **API Keys**
4. Copia tu Token → `UPLOADTHING_TOKEN`

**Agrega a .env.local:**

```env
UPLOADTHING_TOKEN=sk_live_... o sk_test_...
```

---

### Paso 3: Upstash Redis (5 minutos)

1. Ve a: https://console.upstash.com
2. Inicia sesión o crea cuenta
3. Haz clic en **Create Database**
4. Configura:
   - Name: `newtube-redis`
   - Type: Redis
   - Region: Elige la más cercana
5. Haz clic en **Create**
6. Ve a **Details**
7. Copia:
   - REST URL → `UPSTASH_REDIS_REST_URL`
   - REST Token → `UPSTASH_REDIS_REST_TOKEN`

**Agrega a .env.local:**

```env
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=tu_token
```

---

## ✅ Después de Agregar las Variables

1. **Reinicia el servidor:**

   ```bash
   # Detén (Ctrl+C) y reinicia
   npm run dev
   ```

2. **Verifica que no haya errores** en la consola

---

## 🎯 Estado Actual

- ✅ DATABASE_URL
- ✅ Stripe (3 variables)
- ✅ Clerk (2 variables)
- ⏳ Mux (3 variables) - **PENDIENTE**
- ⏳ UploadThing (1 variable) - **PENDIENTE**
- ⏳ Upstash Redis (2 variables) - **PENDIENTE**
- ⏳ Mux Live (2 variables) - **OPCIONAL**

---

## 💡 Tips

- **Para desarrollo local:** Usa ngrok para los webhooks de Mux
- **Claves de prueba:** Todas las claves deben ser de "test" o "development"
- **Reinicia siempre:** Después de cambiar .env.local, reinicia el servidor

---

¿Tienes las credenciales listas? Cuando las tengas, dímelo y las agrego al archivo.
