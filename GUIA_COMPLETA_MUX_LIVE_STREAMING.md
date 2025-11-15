# 📹 Guía Completa: Mux Live Streaming con OBS

Esta guía te muestra cómo configurar y usar Mux Live Streaming siguiendo las mejores prácticas.

---

## 🎯 Configuración Completa

### 1. Crear un Live Stream

Cuando un usuario crea un live stream desde la aplicación:

```typescript
// src/modules/live/server/procedures.ts
const liveStream = await mux.video.liveStreams.create({
  playback_policy: ["public"],
  new_asset_settings: {
    playback_policy: ["public"],
  },
  reduced_latency: true,      // ✅ Reduce la latencia
  reconnect_window: 60,        // ✅ Ventana de reconexión automática
  passthrough: userId,         // ✅ Metadata personalizada
});
```

**Respuesta de Mux:**
```typescript
{
  id: "mux_stream_id_123",
  stream_key: "abc123...",           // ← Para OBS
  playback_ids: [
    { id: "playback_id_456" }        // ← Para reproducir
  ],
  status: "idle",
  // ... más campos
}
```

---

## 📺 Configuración de OBS Studio

### Paso 1: Abrir OBS Studio

1. Abre **OBS Studio** en tu computadora
2. Si no lo tienes, descárgalo de: https://obsproject.com/

### Paso 2: Configurar Stream Settings

1. En OBS, ve a **Settings** (Configuración)
2. Haz clic en **Stream** en el menú lateral

### Paso 3: Configurar Custom Service

1. **Service**: Selecciona **Custom**
2. **Server**: Ingresa `rtmp://live.mux.com/app`
3. **Stream Key**: Pega el Stream Key que obtuviste de la aplicación

**Ejemplo:**
```
Service: Custom
Server: rtmp://live.mux.com/app
Stream Key: abc123def456ghi789...
```

### Paso 4: Guardar y Transmitir

1. Haz clic en **OK** para guardar
2. En la ventana principal de OBS, haz clic en **Start Streaming**
3. El stream comenzará a transmitirse a Mux

---

## 🎬 Configuración Recomendada de OBS

### Video Settings

1. Ve a **Settings** → **Video**
2. Configuración recomendada:
   - **Base (Canvas) Resolution**: 1920x1080 (o tu resolución nativa)
   - **Output (Scaled) Resolution**: 1920x1080
   - **Common FPS Values**: 30 o 60

### Output Settings

1. Ve a **Settings** → **Output**
2. **Output Mode**: Advanced
3. **Encoder**: x264 (software) o NVENC (NVIDIA) / QuickSync (Intel)
4. **Bitrate**: 
   - 1080p: 6000-8000 Kbps
   - 720p: 3000-4500 Kbps
   - 480p: 1500-2500 Kbps

### Audio Settings

1. Ve a **Settings** → **Audio**
2. **Sample Rate**: 48 kHz
3. **Channels**: Stereo

---

## 🔍 Verificar el Stream

### En Mux Dashboard

1. Ve a: https://dashboard.mux.com
2. Navega a **Live Streams**
3. Deberías ver tu stream con estado:
   - **idle**: Esperando conexión
   - **active**: Transmitiendo activamente
   - **disconnected**: Desconectado

### En tu Aplicación

1. Ve a la página del stream: `/studio/live/[streamId]`
2. Deberías ver el reproductor de video
3. Cuando OBS esté transmitiendo, el video aparecerá automáticamente

---

## 🎥 Reproducir el Stream

### Usando Mux Player

El stream se reproduce automáticamente usando el `playbackId`:

```typescript
// El playbackId se obtiene de: liveStream.playback_ids[0].id
<MuxPlayer
  playbackId={stream.playbackId}
  streamType="live"
  autoPlay
  muted={false}
/>
```

### URL Directa

También puedes reproducir directamente:
```
https://stream.mux.com/{playbackId}.m3u8
```

---

## ⚙️ Opciones Avanzadas de Mux

### Reduced Latency

```typescript
reduced_latency: true  // Reduce la latencia a ~2-3 segundos
```

**Beneficios:**
- Latencia más baja (2-3 segundos vs 6-8 segundos)
- Mejor para interacción en tiempo real
- Ideal para Q&A, gaming, etc.

### Reconnect Window

```typescript
reconnect_window: 60  // 60 segundos de ventana de reconexión
```

**Beneficios:**
- Si OBS se desconecta, Mux espera 60 segundos antes de marcar como desconectado
- Permite reconexión automática sin perder el stream

### Passthrough Metadata

```typescript
passthrough: userId  // Metadata personalizada
```

**Beneficios:**
- Permite identificar el stream con metadata personalizada
- Útil para webhooks y tracking

---

## 🔧 Solución de Problemas

### El stream no aparece en Mux Dashboard

**Posibles causas:**
1. OBS no está transmitiendo
2. Stream Key incorrecto
3. Servidor RTMP incorrecto

**Solución:**
1. Verifica que OBS esté en "Streaming" (botón verde)
2. Verifica el Stream Key en la aplicación
3. Verifica que el servidor sea: `rtmp://live.mux.com/app`

### El video no se reproduce

**Posibles causas:**
1. El stream no está activo
2. Playback ID incorrecto
3. Problemas de red

**Solución:**
1. Verifica el estado del stream en Mux Dashboard
2. Verifica que el `playbackId` sea correcto
3. Prueba la URL directa: `https://stream.mux.com/{playbackId}.m3u8`

### Latencia alta

**Solución:**
1. Asegúrate de que `reduced_latency: true` esté configurado
2. Reduce el bitrate en OBS
3. Usa una conexión de internet estable

---

## 📋 Checklist de Configuración

### Antes de Transmitir

- [ ] Live Streaming habilitado en Mux Dashboard
- [ ] Créditos disponibles ($20 de prueba o plan activo)
- [ ] Stream creado desde la aplicación
- [ ] Stream Key copiado
- [ ] OBS configurado con:
  - [ ] Service: Custom
  - [ ] Server: `rtmp://live.mux.com/app`
  - [ ] Stream Key: (el que obtuviste)
- [ ] Video y audio configurados en OBS
- [ ] Conexión a internet estable

### Durante la Transmisión

- [ ] OBS muestra "Streaming" (botón verde)
- [ ] Mux Dashboard muestra estado "active"
- [ ] El video se reproduce en la aplicación
- [ ] Audio y video funcionan correctamente

---

## 🎯 Mejores Prácticas

### 1. Calidad de Video

- **1080p @ 30fps**: Ideal para la mayoría de casos
- **720p @ 60fps**: Para gaming o contenido rápido
- **Bitrate**: Ajusta según tu conexión (mínimo 2500 Kbps para 720p)

### 2. Audio

- **Sample Rate**: 48 kHz (estándar de streaming)
- **Bitrate**: 128-192 kbps
- **Formato**: AAC

### 3. Red

- **Upload Speed**: Mínimo 5 Mbps para 720p, 10 Mbps para 1080p
- **Conexión**: Ethernet preferible sobre WiFi
- **Latencia**: Usa `reduced_latency: true` para menor latencia

### 4. Hardware

- **CPU**: Intel i5 o equivalente (para x264)
- **GPU**: NVIDIA GTX 1050+ (para NVENC)
- **RAM**: Mínimo 8GB

---

## 📚 Recursos Adicionales

### Documentación Oficial

- **Mux Live Streaming**: https://docs.mux.com/guides/video/stream-live-video
- **Mux API Reference**: https://docs.mux.com/api-reference
- **OBS Studio Guide**: https://obsproject.com/wiki/

### Enlaces Útiles

- **Mux Dashboard**: https://dashboard.mux.com
- **OBS Studio**: https://obsproject.com/
- **Mux Support**: support@mux.com

---

## ✅ Resumen

1. **Crear Stream**: Desde la aplicación → Obtener Stream Key
2. **Configurar OBS**: Custom service → `rtmp://live.mux.com/app` → Stream Key
3. **Transmitir**: Start Streaming en OBS
4. **Reproducir**: El video aparece automáticamente en la aplicación

**¡Todo listo para transmitir en vivo!** 🎉

