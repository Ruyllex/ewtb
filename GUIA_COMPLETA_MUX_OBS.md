# 📹 Guía Completa: Transmisión en Vivo con Mux y OBS Studio

Esta guía te mostrará paso a paso cómo configurar y realizar transmisiones en vivo usando Mux y OBS Studio.

---

## 🎯 Requisitos Previos

- ✅ Cuenta de Mux creada
- ✅ Live Streaming habilitado en Mux (con los $20 de créditos de prueba)
- ✅ OBS Studio instalado
- ✅ Credenciales de Mux configuradas en `.env.local`

---

## 📋 Paso 1: Crear un Live Stream en la Aplicación

### 1.1 Acceder a Live Streams

1. Inicia sesión en tu aplicación
2. Ve a **Studio** → **Live Streams**
3. O directamente a: `/studio/live`

### 1.2 Crear Nuevo Stream

1. Haz clic en **"Nueva Transmisión"**
2. Completa el formulario:
   - **Título**: Nombre de tu transmisión (ej: "Mi Primera Transmisión")
   - **Descripción**: Descripción opcional
3. Haz clic en **"Crear Stream"**

### 1.3 Obtener Credenciales

Después de crear el stream, verás:
- ✅ **Servidor RTMP**: `rtmp://live.mux.com/app`
- ✅ **Stream Key**: Una cadena larga de caracteres (ej: `abc123...`)
- ✅ **Playback ID**: Para reproducir el stream

**⚠️ IMPORTANTE**: Guarda el **Stream Key**, lo necesitarás para OBS.

---

## 📋 Paso 2: Configurar OBS Studio

### 2.1 Abrir OBS Studio

1. Descarga OBS Studio si no lo tienes: https://obsproject.com/es/download
2. Instala y abre OBS Studio

### 2.2 Configurar la Transmisión

1. En OBS Studio, ve a **Settings** (Configuración) o **Ajustes**
2. Haz clic en **Stream** (Emisión)
3. Configura:
   - **Service**: Selecciona **"Custom"** o **"Personalizado"**
   - **Server**: `rtmp://live.mux.com/app`
   - **Stream Key**: Pega el Stream Key que copiaste de la aplicación
4. Haz clic en **OK**

### 2.3 Configurar Video y Audio (Opcional pero Recomendado)

1. Ve a **Settings** → **Video**
2. Configura:
   - **Base (Canvas) Resolution**: 1920x1080 (o la resolución de tu pantalla)
   - **Output (Scaled) Resolution**: 1920x1080 (o 1280x720 para menor ancho de banda)
   - **FPS**: 30 o 60

3. Ve a **Settings** → **Audio**
4. Configura:
   - **Sample Rate**: 48kHz
   - **Channels**: Stereo

### 2.4 Agregar Fuentes

1. En la sección **Sources** (Fuentes), haz clic en **"+"**
2. Agrega las fuentes que necesites:
   - **Display Capture**: Para capturar tu pantalla
   - **Window Capture**: Para capturar una ventana específica
   - **Video Capture Device**: Para usar tu cámara web
   - **Audio Input Capture**: Para tu micrófono
   - **Audio Output Capture**: Para capturar el audio del sistema

---

## 📋 Paso 3: Iniciar la Transmisión

### 3.1 Verificar Todo Está Listo

Antes de iniciar:
- ✅ OBS está configurado con el servidor y Stream Key correctos
- ✅ Tienes fuentes agregadas (al menos una)
- ✅ El stream está creado en la aplicación
- ✅ Estás en la página del stream en la aplicación

### 3.2 Iniciar Transmisión en OBS

1. En OBS Studio, haz clic en **"Start Streaming"** (Iniciar Transmisión)
2. Verás un indicador rojo en la esquina inferior derecha cuando esté transmitiendo
3. El estado debería cambiar a **"Streaming"**

### 3.3 Verificar en la Aplicación

1. Regresa a la página del stream en tu aplicación
2. El estado debería cambiar de **"idle"** a **"active"**
3. Deberías ver el reproductor de video mostrando tu transmisión
4. Puede tomar unos segundos para que el stream aparezca

---

## 📋 Paso 4: Verificar la Transmisión

### 4.1 En la Aplicación

- ✅ El reproductor muestra tu transmisión
- ✅ El estado del stream es **"active"**
- ✅ Puedes ver y escuchar tu transmisión

### 4.2 En Mux Dashboard

1. Ve a: https://dashboard.mux.com
2. Navega a **Live Streams**
3. Deberías ver tu stream activo
4. Puedes ver estadísticas en tiempo real

### 4.3 En OBS Studio

- ✅ El indicador muestra que estás transmitiendo
- ✅ No hay errores en la consola de OBS
- ✅ Las fuentes están funcionando correctamente

---

## 🔧 Configuración Avanzada de OBS

### Optimizar Calidad vs. Ancho de Banda

Para mejor calidad (requiere más ancho de banda):
- **Output Resolution**: 1920x1080
- **FPS**: 60
- **Bitrate**: 6000-8000 kbps

Para menor ancho de banda:
- **Output Resolution**: 1280x720
- **FPS**: 30
- **Bitrate**: 2500-4000 kbps

### Configurar Bitrate

1. Ve a **Settings** → **Output**
2. Selecciona **"Advanced"** mode
3. En **Streaming**, configura:
   - **Encoder**: x264 (software) o tu GPU (si está disponible)
   - **Bitrate**: 4000-6000 kbps (ajusta según tu conexión)
   - **Keyframe Interval**: 2

---

## 🐛 Solución de Problemas

### Problema: El stream no aparece en la aplicación

**Soluciones:**
1. Espera 10-30 segundos (puede haber latencia)
2. Verifica que OBS esté transmitiendo (indicador rojo)
3. Verifica que el Stream Key sea correcto
4. Recarga la página del stream
5. Verifica en Mux Dashboard si el stream está activo

### Problema: Error de conexión en OBS

**Soluciones:**
1. Verifica que el servidor sea: `rtmp://live.mux.com/app`
2. Verifica que el Stream Key sea correcto (sin espacios)
3. Verifica tu conexión a internet
4. Intenta crear un nuevo stream y usar ese Stream Key

### Problema: El video se ve pixelado o con lag

**Soluciones:**
1. Reduce el bitrate en OBS
2. Reduce la resolución de salida
3. Reduce los FPS a 30
4. Cierra otras aplicaciones que usen ancho de banda
5. Verifica tu velocidad de internet (necesitas al menos 5 Mbps de subida)

### Problema: No hay audio

**Soluciones:**
1. Verifica que tengas una fuente de audio agregada en OBS
2. Verifica que el micrófono/audio esté funcionando
3. Verifica los niveles de audio en OBS (deben moverse)
4. Verifica que el audio no esté silenciado en OBS

---

## ✅ Checklist Final

Antes de transmitir, verifica:

- [ ] Live Streaming está habilitado en Mux
- [ ] Tienes créditos disponibles en Mux
- [ ] Stream creado en la aplicación
- [ ] Stream Key copiado correctamente
- [ ] OBS configurado con servidor y Stream Key
- [ ] Fuentes agregadas en OBS
- [ ] Configuración de video/audio optimizada
- [ ] Conexión a internet estable
- [ ] Página del stream abierta en la aplicación

---

## 🎉 ¡Listo para Transmitir!

Una vez que todo esté configurado:

1. Haz clic en **"Start Streaming"** en OBS
2. Espera unos segundos
3. Verifica que el stream aparezca en la aplicación
4. ¡Disfruta tu transmisión en vivo!

---

## 📚 Recursos Adicionales

- **Documentación de Mux**: https://docs.mux.com/guides/video/stream-live-video
- **Documentación de OBS**: https://obsproject.com/help
- **Soporte de Mux**: support@mux.com

---

**¿Necesitas ayuda?** Revisa la sección de solución de problemas o contacta a soporte.

