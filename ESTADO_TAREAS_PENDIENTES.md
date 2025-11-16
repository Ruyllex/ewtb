# 📋 Estado de Tareas Pendientes

## ✅ Tareas COMPLETADAS

### 1. Mux Live Streams - Implementación Core ✅

- ✅ **Creación de Live Streams**: Implementado en `src/modules/live/server/procedures.ts`
- ✅ **Guardar stream_key y playback_id en DB**: ✅ Completado
  - Se guarda en tabla `live_streams` con todos los campos necesarios
  - Campos: `streamKey`, `playbackId`, `muxLiveStreamId`, `status`, etc.
- ✅ **UI para crear y gestionar streams**: Completado
- ✅ **Reproductor de video para live streams**: Completado con MuxPlayer
- ✅ **Configuración de OBS mostrada en UI**: Completado
- ✅ **Opciones avanzadas**: `reduced_latency`, `reconnect_window`, `passthrough`

### 2. Estructura de Base de Datos ✅

- ✅ Tabla `live_streams` creada en schema
- ✅ Relaciones configuradas
- ✅ Migraciones aplicadas

---

## ⚠️ Tareas PARCIALMENTE COMPLETADAS

### 1. Configurar .env.local

**Estado:** ⚠️ PARCIAL - Algunas variables faltan

#### ✅ Ya Configuradas (según documentación):
- ✅ `DATABASE_URL` (NeonDB)
- ✅ `CLERK_SECRET_KEY`
- ✅ `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- ✅ `CLERK_SIGNING_SECRET`
- ✅ `STRIPE_SECRET_KEY`
- ✅ `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- ✅ `STRIPE_WEBHOOK_SECRET`

#### ❌ Faltan Configurar:
- ❌ `MUX_TOKEN_ID` - **CRÍTICO** (necesario para Live Streaming)
- ❌ `MUX_TOKEN_SECRET` - **CRÍTICO** (necesario para Live Streaming)
- ❌ `MUX_WEBHOOK_SECRET` - **IMPORTANTE** (para actualizar videos cuando se procesan)
- ❌ `UPLOADTHING_TOKEN` - **IMPORTANTE** (para subir thumbnails)
- ❌ `UPSTASH_REDIS_REST_URL` - **OPCIONAL** (para rate limiting, tiene fallback)
- ❌ `UPSTASH_REDIS_REST_TOKEN` - **OPCIONAL** (para rate limiting, tiene fallback)

**Guía:** Ver `TAREA_1_COMPLETAR_ENV.md` y `GUIA_CREDENCIALES.md`

---

## ❌ Tareas PENDIENTES

### 1. Endpoint REST `/api/mux/live` ❌

**Estado:** ❌ NO implementado como endpoint REST separado

**Situación actual:**
- ✅ La funcionalidad está implementada vía **tRPC** en `src/modules/live/server/procedures.ts`
- ✅ Funciona perfectamente a través de tRPC
- ❌ NO existe un endpoint REST `/api/mux/live` separado

**¿Es necesario?**
- **Depende de tus necesidades:**
  - Si solo usas tRPC desde el frontend → ✅ **NO es necesario**
  - Si necesitas llamarlo desde fuera (webhooks, otros servicios) → ❌ **SÍ es necesario**

**Si necesitas crearlo:**
- Crear `src/app/api/mux/live/route.ts`
- Implementar POST, GET, DELETE
- Usar las mismas funciones de `src/modules/live/server/procedures.ts`

**Tiempo estimado:** 30-45 minutos

---

### 2. Crear Proyecto en Sentry / Logtail ❌

**Estado:** ❌ NO iniciado

**Qué falta:**
- ❌ Crear proyecto en Sentry.io o Logtail.com
- ❌ Instalar dependencias (`@sentry/nextjs`)
- ❌ Crear `src/lib/sentry.ts` o `src/lib/logtail.ts`
- ❌ Configurar variables de entorno
- ❌ Integrar en la aplicación

**Guía:** Ver `TAREA_2_SENTRY.md`

**Tiempo estimado:** 1 hora

**Prioridad:** 🟡 MEDIA (útil para producción, no bloquea funcionalidad)

---

### 3. Configurar Deploy Productivo en Vercel ❌

**Estado:** ❌ NO iniciado

**Qué falta:**
- ❌ Crear proyecto en Vercel
- ❌ Conectar repositorio
- ❌ Configurar variables de entorno en Vercel
- ❌ Configurar build settings
- ❌ Hacer primer deploy
- ❌ Configurar dominios personalizados (opcional)

**Guía:** Ver `TAREA_3_VERCEL.md`

**Tiempo estimado:** 1.5 horas

**Prioridad:** 🟡 MEDIA (necesario para producción, pero no bloquea desarrollo local)

---

### 4. Probar RTMP desde OBS ❌

**Estado:** ❌ Pendiente de probar

**Qué falta:**
- ❌ Habilitar Live Streaming en Mux Dashboard (activar $20 de créditos)
- ❌ Crear un stream desde la aplicación
- ❌ Configurar OBS Studio con:
  - Server: `rtmp://live.mux.com/app`
  - Stream Key: (el obtenido de la app)
- ❌ Iniciar transmisión desde OBS
- ❌ Verificar que el video se reproduce en la aplicación

**Nota:** Mux Live Streaming ya está implementado. Ver código en `src/modules/live/`

**Tiempo estimado:** 30 minutos

**Prioridad:** 🟢 ALTA (verificar que todo funciona)

---

## 📊 Resumen por Prioridad

### 🔴 CRÍTICO (Bloquea funcionalidad)

1. ❌ **Configurar `MUX_TOKEN_ID` y `MUX_TOKEN_SECRET`** en `.env.local`
   - Sin esto, NO se pueden crear live streams
   - **Tiempo:** 10 minutos
   - **Guía:** `GUIA_CREDENCIALES.md` → Sección Mux

2. ❌ **Habilitar Live Streaming en Mux Dashboard**
   - Activar los $20 de créditos de prueba
   - **Tiempo:** 5 minutos
   - **Nota:** Ver configuración en Mux Dashboard

### 🟡 IMPORTANTE (Mejora funcionalidad)

3. ❌ **Configurar `MUX_WEBHOOK_SECRET`**
   - Para que los videos se actualicen automáticamente cuando se procesan
   - **Tiempo:** 15 minutos
   - **Guía:** `TAREA_1_COMPLETAR_ENV.md` → Sección Mux Webhooks

4. ❌ **Configurar `UPLOADTHING_TOKEN`**
   - Para poder subir thumbnails
   - **Tiempo:** 10 minutos
   - **Guía:** `TAREA_1_COMPLETAR_ENV.md` → Sección UploadThing

5. ❌ **Probar RTMP desde OBS**
   - Verificar que todo funciona end-to-end
   - **Tiempo:** 30 minutos

### 🟢 OPCIONAL (Nice to have)

6. ❌ **Configurar Upstash Redis**
   - Para rate limiting (actualmente tiene fallback)
   - **Tiempo:** 15 minutos
   - **Prioridad:** BAJA (funciona sin esto)

7. ❌ **Crear endpoint REST `/api/mux/live`**
   - Solo si necesitas llamarlo desde fuera de tRPC
   - **Tiempo:** 30-45 minutos
   - **Prioridad:** BAJA (tRPC ya funciona)

8. ❌ **Configurar Sentry/Logtail**
   - Monitoreo de errores en producción
   - **Tiempo:** 1 hora
   - **Prioridad:** BAJA (útil pero no crítico)

9. ❌ **Deploy en Vercel**
   - Para producción
   - **Tiempo:** 1.5 horas
   - **Prioridad:** MEDIA (necesario para producción, pero no bloquea desarrollo)

---

## 🎯 Plan de Acción Recomendado

### Fase 1: Hacer que Live Streaming Funcione (30 min)

1. ✅ Configurar `MUX_TOKEN_ID` y `MUX_TOKEN_SECRET` (10 min)
2. ✅ Habilitar Live Streaming en Mux Dashboard (5 min)
3. ✅ Probar crear un stream desde la app (5 min)
4. ✅ Probar RTMP desde OBS (10 min)

**Resultado:** Live Streaming funcionando completamente ✅

### Fase 2: Completar Configuración (45 min)

5. ✅ Configurar `MUX_WEBHOOK_SECRET` (15 min)
6. ✅ Configurar `UPLOADTHING_TOKEN` (10 min)
7. ✅ Configurar Upstash Redis (opcional, 15 min)

**Resultado:** Todas las funcionalidades core funcionando ✅

### Fase 3: Preparar para Producción (2.5 horas)

8. ✅ Configurar Sentry/Logtail (1 hora)
9. ✅ Deploy en Vercel (1.5 horas)

**Resultado:** Aplicación lista para producción ✅

---

## ✅ Checklist Final

### Funcionalidad Core
- [ ] `MUX_TOKEN_ID` configurado
- [ ] `MUX_TOKEN_SECRET` configurado
- [ ] Live Streaming habilitado en Mux Dashboard
- [ ] Probar crear stream desde app
- [ ] Probar RTMP desde OBS
- [ ] Verificar que video se reproduce

### Configuración Completa
- [ ] `MUX_WEBHOOK_SECRET` configurado
- [ ] `UPLOADTHING_TOKEN` configurado
- [ ] `UPSTASH_REDIS_REST_URL` configurado (opcional)
- [ ] `UPSTASH_REDIS_REST_TOKEN` configurado (opcional)

### Producción
- [ ] Sentry/Logtail configurado
- [ ] Deploy en Vercel
- [ ] Variables de entorno configuradas en Vercel
- [ ] Dominio personalizado (opcional)

---

## 📝 Notas Importantes

1. **Endpoint `/api/mux/live`**: La funcionalidad ya existe vía tRPC. Solo crea el endpoint REST si lo necesitas para llamadas externas.

2. **Upstash Redis**: Es opcional. El código tiene fallback y funciona sin Redis.

3. **Sentry/Logtail**: Útil para producción pero no bloquea funcionalidad.

4. **Vercel**: Necesario para producción, pero puedes desarrollar localmente sin esto.

---

**¿Quieres que te ayude a completar alguna de estas tareas?** 🚀

