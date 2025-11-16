# 🎯 PLAN DE ACCIÓN - Qué Hacer Paso a Paso

**Versión ejecutiva para saber exactamente qué hacer hoy y mañana**

---

## 📍 DONDE ESTAMOS

✅ **Terminado:**

- Estructura del proyecto completa
- UI / Frontend 90% listo
- Autenticación funcionando
- Base de datos funcionando
- tRPC APIs funcionando
- Stripe funcionando

❌ **Bloqueado por:** Variables de entorno incompletas
🟡 **Faltan:** Varias features importantes

---

## 🚨 PRIORIDAD 1: DESBLOQUEARTE (Hoy - 1 hora máximo)

### EL PROBLEMA

Actualmente, el servidor inicia con errores porque faltan variables de entorno críticas:

- Mux (procesamiento de videos)
- UploadThing (subida de archivos)
- Upstash Redis (caching)

**SIN ESTO:** No puedes probar uploads de video, rate limiting, etc.

---

### LA SOLUCIÓN - PASO A PASO

#### PASO 1: Obtener Credenciales de Mux (5 minutos)

1. Ve a: https://dashboard.mux.com
2. **Busca:** Settings → API Access Tokens
3. **Copia:**
   - `Token ID` → Guardar en un archivo temporal
   - `Token Secret` → Guardar en un archivo temporal

**Ejemplo:**

```
MUX_TOKEN_ID = [algo como: abc123def456]
MUX_TOKEN_SECRET = [algo como: xyz789uvw234]
```

---

#### PASO 2: Crear Webhook en Mux (10 minutos)

1. Inicia el servidor:

   ```powershell
   npm run dev
   ```

   (Deja esto corriendo en una terminal)

2. En **OTRA terminal**, inicia ngrok:

   ```powershell
   ngrok http 3000
   ```

   (Copia la URL que genera, algo como: `https://abc123-free.ngrok.io`)

3. Ve a Mux Dashboard: https://dashboard.mux.com
4. **Busca:** Settings → Webhooks
5. **Haz clic:** "Add Webhook"
6. **Completa:**
   - URL: `https://tu-url-ngrok-libre.ngrok-free.app/api/videos/webhook`
   - Eventos a seleccionar:
     ☑️ video.asset.created
     ☑️ video.asset.ready
     ☑️ video.asset.errored
     ☑️ video.asset.deleted
     ☑️ video.asset.track.ready
7. **Guarda** y **Copia:**
   - `Signing Secret` → Guardar como `MUX_WEBHOOK_SECRET`

**Ejemplo:**

```
MUX_WEBHOOK_SECRET = [algo como: whsec_abc123...]
```

---

#### PASO 3: Obtener Token de UploadThing (3 minutos)

1. Ve a: https://uploadthing.com
2. **Busca:** Dashboard → API Keys
3. **Copia:**
   - Token → `UPLOADTHING_TOKEN`

**Ejemplo:**

```
UPLOADTHING_TOKEN = sk_test_abc123... o sk_live_...
```

---

#### PASO 4: Crear Base de Datos en Upstash Redis (5 minutos)

1. Ve a: https://console.upstash.com
2. **Haz clic:** "Create Database"
3. **Configura:**
   - Name: `newtube-redis`
   - Type: Redis
   - Region: La más cercana a ti
4. **Crea** (espera 1-2 minutos)
5. **Abre** la BD que se creó
6. **Ve a:** Details
7. **Copia:**
   - `REST URL` → `UPSTASH_REDIS_REST_URL`
   - `REST Token` → `UPSTASH_REDIS_REST_TOKEN`

**Ejemplo:**

```
UPSTASH_REDIS_REST_URL = https://...upstash.io
UPSTASH_REDIS_REST_TOKEN = [token largo]
```

---

#### PASO 5: Agregar TODAS las Variables a .env.local

1. **Abre** el archivo: `c:\Users\Admin\Documents\proyectos\TRABAJO\newtb\.env.local`

2. **Añade estas líneas** (ya deberían estar, pero completa si falta algo):

```env
# Variables Existentes - VERIFICAR QUE ESTÉN
DATABASE_URL=postgresql://...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_SIGNING_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Variables NUEVAS - AGREGAR
MUX_TOKEN_ID=abc123def456
MUX_TOKEN_SECRET=xyz789uvw234
MUX_WEBHOOK_SECRET=whsec_abc123...
UPLOADTHING_TOKEN=sk_test_abc123...
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=token-largo-aqui
```

3. **Guarda** el archivo (Ctrl+S)

---

#### PASO 6: Reiniciar el Servidor

1. **En la terminal donde corre `npm run dev`**, presiona: **Ctrl+C**
2. **Espera** a que se detenga completamente
3. **Reinicia:**
   ```powershell
   npm run dev
   ```

---

#### ✅ VERIFICACIÓN

Después de reiniciar, verifica:

1. **No hay errores rojos** en la consola
2. **Dice:** "ready - started server on 0.0.0.0:3000, url: http://localhost:3000"
3. **Abre:** http://localhost:3000 en el navegador
4. **Debe cargar** sin errores

**Si todo está bien:** ✅ **¡FASE 1 COMPLETADA!**

---

---

## 🎬 PRIORIDAD 2: PROBAR QUE FUNCIONA (Hoy + Mañana - 1.5 horas)

### Ahora que todo está configurado, prueba que funciona

#### PASO 1: Prueba de Autenticación

1. Abre: http://localhost:3000
2. **Haz clic** en: "Sign In" (arriba a la derecha)
3. **Registra una cuenta nueva** con email de prueba

✅ Si funciona: Autenticación OK

---

#### PASO 2: Prueba de Video Upload (Mux)

1. **Inicia sesión**
2. **Ve a:** /studio (o haz clic en tu avatar → Studio)
3. **Haz clic en:** "Upload Video" (botón grande)
4. **Selecciona:** Un video pequeño (para prueba)
5. **Rellena:**
   - Title: "Video de Prueba"
   - Description: "Descripción"
   - Category: Cualquiera
6. **Sube**

**Verifica en Mux Dashboard:**

- Ve a: https://dashboard.mux.com/video/assets
- **Debes ver** un asset nuevo con estado "uploading" o "ready"

✅ Si funciona: Mux OK

---

#### PASO 3: Prueba de Thumbnail Upload (UploadThing)

1. En la página del video que subiste, ve a: "Edit Video"
2. Haz clic en: "Change Thumbnail"
3. Sube una imagen pequeña
4. Verifica que aparezca en la lista

✅ Si funciona: UploadThing OK

---

#### PASO 4: Prueba de Redis (Caching)

1. **Abre la consola del navegador** (F12)
2. **Ve a:** /studio
3. **Abre el Devtools** (F12) → Console
4. **No debe haber errores** sobre Redis

✅ Si funciona: Redis OK

---

---

## 📌 PRIORIDAD 3: NEXT FEATURES (Próximo - 4-6 horas)

Una vez que todo esté configurado y funcionando, esto es lo que sigue:

### OPCIÓN A: Página de Video Individual (Recomendado - 2 horas)

**¿Qué permite?** Ver videos en la página principal

**Pasos básicos:**

1. Crear ruta: `/app/video/[videoId]/page.tsx`
2. Componente de reproductor (Mux Player ya está instalado)
3. Información del video (título, autor, descripción)
4. Botón de like/comentarios (básico)

**Salida:** Puedes hacer clic en un video y verlo completo

---

### OPCIÓN B: Búsqueda de Videos (1.5 horas)

**¿Qué permite?** Buscar videos por título

**Pasos:**

1. Implementar lógica en `/modules/home/ui/components/home-navbar/search-input.tsx`
2. Crear endpoint tRPC: `videos.search`
3. Mostrar resultados

**Salida:** Input de búsqueda funciona

---

### OPCIÓN C: Streaming en Vivo (3 horas)

**¿Qué permite?** Usuarios hagan streaming desde OBS

**Nota:** Mux Live Streaming ya está implementado. Ver código en `src/modules/live/`

**Salida:** Crear página para iniciar streams

---

### OPCIÓN D: Sistema de Comentarios (1.5 horas)

**¿Qué permite?** Comentarios en videos

**Pasos:**

1. Tabla en DB: `comments`
2. Endpoints tRPC
3. UI para formulario
4. Mostrar comentarios

**Salida:** Puedes comentar en videos

---

---

## 🎯 MI RECOMENDACIÓN - ORDEN SUGERIDO

### Hoy (ya completado si llegamos hasta aquí)

- ✅ Fase 1: Variables de entorno
- ✅ Pruebas básicas

### Mañana (2-3 horas)

- 🎯 Página de Video Individual
- 🎯 Búsqueda Básica

### Próximos días (cuando tengas tiempo)

- 📚 Comentarios
- 🔴 Streaming en Vivo
- 👤 Perfiles y Suscripciones

### Último (cuando todo esté funcionando)

- 📊 Monitoreo (Sentry)
- 🚀 Deploy en Vercel

---

---

## 🆘 TROUBLESHOOTING - Si algo falla

### Error: "Cannot find module" o "X is not defined"

**Solución:**

1. Detén el servidor (Ctrl+C)
2. Borra: `node_modules` y `.next`
3. Reinstala: `npm install`
4. Reinicia: `npm run dev`

### Error: "MUX_TOKEN_ID is not defined"

**Solución:**

- Verifica que las variables estén en `.env.local`
- Verifica que **NO haya espacios** alrededor del `=`
- Reinicia el servidor

### Error: "Redis connection refused"

**Solución:**

- Verifica que las variables de Redis estén en `.env.local`
- Verifica que sean exactas (copiar-pegar sin cambios)
- Prueba en: https://console.upstash.com si la BD está activa

### ngrok no funciona

**Solución:**

1. Descarga: https://ngrok.com/download
2. Descomprime
3. Abre PowerShell en la carpeta descomprimida
4. Corre: `.\ngrok.exe http 3000`

### El video no sube

**Solución:**

1. Verifica que `MUX_TOKEN_ID` y `MUX_TOKEN_SECRET` sean correctos
2. Verifica en Mux Dashboard que el token tenga permisos de "upload"
3. Prueba con un video más pequeño (< 100MB)

---

---

## 📋 CHECKLIST FINAL - Verificar TODO

- [ ] Tienes archivo `.env.local` con TODAS las variables
- [ ] Servidor inicia sin errores: `npm run dev` ✅
- [ ] No hay mensajes rojos de error en la consola
- [ ] Puedes acceder a http://localhost:3000
- [ ] Puedes iniciar sesión
- [ ] Puedes ir a /studio
- [ ] El botón de upload de video existe
- [ ] Mux Dashboard muestra assets nuevos después de upload
- [ ] UploadThing recibe thumbnails

**Si TODO está marcado:** ✅ **¡ESTÁS LISTO PARA EMPEZAR!**

---

## 🎓 SIGUIENTE DOCUMENTO A LEER

Una vez completado esto, lee:

1. **`ANALISIS_ESTADO_ACTUAL.md`** - Estado completo del proyecto (detalles)
2. **`ANALISIS_ESTRUCTURA.md`** - Cómo está organizado el código (estructura)
3. **Luego:** Uno de los documentos de TAREA_X según qué quieras hacer

---

## ⏱️ TIEMPO ESTIMADO

- **Fase 1 (Hoy):** 1 hora
- **Fase 2 (Verificación):** 30 minutos
- **Fase 3 (Features):** Depende cuál hagas (1.5-3 horas)

**Total para tener app funcionando:** 2-3 horas

---

**¿EMPEZAMOS? Lee el PASO 1 de PRIORIDAD 1 arriba.**
