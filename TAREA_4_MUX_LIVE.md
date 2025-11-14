# 📹 TAREA 4: Configurar Mux Live Streams

## 🎯 Objetivo
Implementar streaming en vivo usando Mux Live, permitiendo que los usuarios transmitan desde OBS.

---

## 📋 Pasos Detallados

### Paso 1: Crear Tabla en Base de Datos

#### 1.1 Actualizar Schema

Necesitamos agregar una tabla `live_streams` al schema de la base de datos.

**Archivo:** `src/db/schema.ts`

```typescript
export const liveStreams = pgTable("live_streams", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  streamKey: text("stream_key").unique().notNull(),
  playbackId: text("playback_id").unique(),
  status: text("status").default("idle"), // idle, active, disconnected
  muxLiveStreamId: text("mux_live_stream_id").unique(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

#### 1.2 Aplicar Migración

```bash
npm run drizzle:push
```

---

### Paso 2: Crear Endpoint /api/mux/live

#### 2.1 Crear Archivo

**Archivo:** `src/app/api/mux/live/route.ts`

Este endpoint:
- Crea un live stream en Mux
- Guarda el stream_key y playback_id en la base de datos
- Retorna la información del stream

#### 2.2 Funcionalidades

- `POST /api/mux/live` - Crear nuevo stream
- `GET /api/mux/live/[id]` - Obtener información del stream
- `DELETE /api/mux/live/[id]` - Eliminar stream

---

### Paso 3: Configurar Mux Live en .env.local

Asegúrate de tener:
```env
MUX_TOKEN_ID=...
MUX_TOKEN_SECRET=...
MUX_LIVE_STREAM_KEY=... (opcional, para RTMP)
MUX_LIVE_STREAM_SECRET=... (opcional, para RTMP)
```

---

### Paso 4: Probar con OBS

#### 4.1 Obtener Stream Key

1. Crea un stream desde la aplicación
2. Copia el `stream_key` que se genera

#### 4.2 Configurar OBS

1. Abre OBS Studio
2. Ve a **Settings** > **Stream**
3. **Service:** Custom
4. **Server:** `rtmp://live.mux.com/app`
5. **Stream Key:** Pega el `stream_key` obtenido
6. Haz clic en **OK**
7. Haz clic en **Start Streaming**

#### 4.3 Verificar

- El stream debería aparecer en Mux Dashboard
- Deberías poder ver el playback en tu aplicación

---

## 📝 Estructura de Archivos a Crear

```
src/
  app/
    api/
      mux/
        live/
          route.ts          # POST - Crear stream
          [id]/
            route.ts        # GET, DELETE - Obtener/Eliminar stream
  db/
    schema.ts               # Agregar tabla live_streams
```

---

## 🔧 Implementación Técnica

### Endpoint POST /api/mux/live

```typescript
// Crear live stream en Mux
const liveStream = await mux.video.liveStreams.create({
  playback_policy: ["public"],
  new_asset_settings: {
    playback_policy: ["public"],
  },
});

// Guardar en DB
await db.insert(liveStreams).values({
  streamKey: liveStream.stream_key,
  playbackId: liveStream.playback_ids[0].id,
  muxLiveStreamId: liveStream.id,
  userId: user.id,
  title: "Mi Stream",
  status: "idle",
});
```

---

## ✅ Checklist

- [ ] Tabla `live_streams` creada en DB
- [ ] Endpoint `/api/mux/live` creado
- [ ] Endpoint `/api/mux/live/[id]` creado
- [ ] Variables de Mux configuradas
- [ ] Probar creación de stream
- [ ] Probar con OBS
- [ ] Verificar playback en la app

---

## 🎉 Siguiente Paso

Una vez completada, podrás:
- Crear streams en vivo desde tu aplicación
- Transmitir desde OBS
- Ver los streams en tiempo real

---

¿Listo para implementar? Te guiaré paso a paso.

