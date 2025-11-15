# 📊 Paso a Paso: Configurar Logtail

## 🎯 Objetivo
Configurar Logtail para logging estructurado y análisis de logs en producción.

---

## ✅ Estado Actual

**Buenas noticias:** El código de Logtail ya está preparado:
- ✅ `src/lib/logtail.ts` creado con helpers
- ✅ Funciones `logServer` y `logBrowser` disponibles
- ✅ Fallback a console si no está configurado

**Lo que falta:**
- ❌ Instalar dependencias (`@logtail/node` y `@logtail/browser`)
- ❌ Crear proyecto en Logtail.com
- ❌ Obtener Source Token
- ❌ Agregar variable de entorno

---

## 📋 Paso 1: Instalar Dependencias

### 1.1 Instalar paquetes

Ejecuta en tu terminal:

```bash
npm install @logtail/node @logtail/browser
```

O si usas bun:

```bash
bun add @logtail/node @logtail/browser
```

---

## 📋 Paso 2: Crear Proyecto en Logtail

### 2.1 Ir a Logtail

1. Abre tu navegador
2. Ve a: **https://logtail.com**
3. Inicia sesión o crea una cuenta gratuita

### 2.2 Crear Proyecto

1. En el dashboard, haz clic en **Create Project** o **New Project**
2. Configura el proyecto:
   - **Project Name**: `newtube` (o el nombre que prefieras)
   - **Description**: (opcional) "Logs para NewTube"
3. Haz clic en **Create Project**

### 2.3 Obtener Source Token

Después de crear el proyecto:

1. Ve a la página del proyecto
2. Busca la sección **Source Token** o **API Token**
3. Haz clic en **Copy Token** o **Show Token**
4. **⚠️ IMPORTANTE:** Copia el token completo

El token se verá algo así:
```
abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
```

---

## 📋 Paso 3: Agregar Variable de Entorno

### 3.1 Abrir `.env.local`

Abre tu archivo `.env.local` en la raíz del proyecto.

### 3.2 Agregar Variable

Agrega esta variable con el token que obtuviste:

```env
NEXT_PUBLIC_LOGTALL_SOURCE_TOKEN=tu_source_token_aqui
```

**Ejemplo:**
```env
NEXT_PUBLIC_LOGTALL_SOURCE_TOKEN=abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
```

**⚠️ Importante:**
- Reemplaza `tu_source_token_aqui` con tu token real
- No uses comillas alrededor del valor
- No dejes espacios antes o después del `=`

---

## 📋 Paso 4: Reiniciar el Servidor

Después de agregar la variable de entorno:

1. Detén el servidor (Ctrl+C)
2. Reinícialo:
   ```bash
   npm run dev
   ```

**⚠️ IMPORTANTE:** Next.js solo carga las variables de entorno cuando inicia.

---

## 📋 Paso 5: Verificar que Funciona

### 5.1 Ejecutar Script de Verificación

```bash
npm run verify:logtail
```

Deberías ver:
```
✅ Dependencias de Logtail instaladas
✅ NEXT_PUBLIC_LOGTALL_SOURCE_TOKEN está configurado
✅ Configuración de Logtail verificada correctamente
```

### 5.2 Probar Envío de Logs (Opcional)

Puedes probar que Logtail funciona agregando un log de prueba:

1. En cualquier archivo del servidor, agrega:
   ```typescript
   import { logServer } from "@/lib/logtail";
   
   logServer.info("Test log from Logtail", { test: true });
   ```

2. Ejecuta la función o recarga la página
3. Ve a tu proyecto en Logtail Dashboard
4. Deberías ver el log en la lista

---

## 🔍 Cómo Usar Logtail en tu Código

### En el Servidor (Server Components, API Routes, tRPC)

```typescript
import { logServer } from "@/lib/logtail";

// Info
logServer.info("Usuario creó un video", {
  userId: user.id,
  videoId: video.id,
});

// Warning
logServer.warn("Rate limit alcanzado", {
  userId: user.id,
  endpoint: "/api/videos",
});

// Error
try {
  // tu código
} catch (error) {
  logServer.error("Error al crear video", error, {
    userId: user.id,
    context: "video creation",
  });
}

// Debug (solo en desarrollo)
logServer.debug("Información de debug", {
  data: someData,
});
```

### En el Cliente (Client Components)

```typescript
"use client";

import { logBrowser } from "@/lib/logtail";

// Info
logBrowser.info("Usuario hizo clic en botón", {
  buttonId: "create-video",
});

// Error
try {
  // tu código
} catch (error) {
  logBrowser.error("Error en el cliente", error, {
    component: "VideoPlayer",
    videoId: video.id,
  });
}
```

---

## 📊 Ejemplos de Integración

### Ejemplo 1: Logging en tRPC Procedures

```typescript
// src/modules/videos/server/procedures.ts
import { logServer } from "@/lib/logtail";

export const videosRouter = createTRPCRouter({
  create: protectedProcedure.mutation(async ({ ctx }) => {
    const { id: userId } = ctx.user;
    
    logServer.info("Iniciando creación de video", { userId });
    
    try {
      // ... código de creación
      logServer.info("Video creado exitosamente", { userId, videoId: video.id });
      return video;
    } catch (error) {
      logServer.error("Error al crear video", error, { userId });
      throw error;
    }
  }),
});
```

### Ejemplo 2: Logging en API Routes

```typescript
// src/app/api/videos/webhook/route.ts
import { logServer } from "@/lib/logtail";

export async function POST(req: Request) {
  logServer.info("Webhook recibido", { 
    path: "/api/videos/webhook",
    method: "POST",
  });
  
  try {
    // ... procesar webhook
    logServer.info("Webhook procesado exitosamente", { type: payload.type });
  } catch (error) {
    logServer.error("Error procesando webhook", error, { type: payload.type });
  }
}
```

### Ejemplo 3: Logging en Client Components

```typescript
"use client";

import { logBrowser } from "@/lib/logtail";
import { useEffect } from "react";

export function VideoPlayer({ videoId }: { videoId: string }) {
  useEffect(() => {
    logBrowser.info("Reproductor de video cargado", { videoId });
  }, [videoId]);
  
  const handleError = (error: Error) => {
    logBrowser.error("Error en reproductor", error, { videoId });
  };
  
  // ... resto del componente
}
```

---

## 🎯 Beneficios de Logtail

### 1. Logs Estructurados

Los logs se envían con metadata estructurada:
```typescript
logServer.info("Video creado", {
  userId: "123",
  videoId: "456",
  duration: 120,
  size: 1024000,
});
```

### 2. Búsqueda Avanzada

En Logtail Dashboard puedes buscar:
- Por usuario: `userId:123`
- Por tipo de error: `level:error`
- Por rango de tiempo
- Por campos personalizados

### 3. Alertas

Puedes configurar alertas para:
- Errores críticos
- Rate limits
- Patrones específicos

### 4. Análisis

- Ver tendencias de errores
- Analizar performance
- Identificar problemas comunes

---

## ✅ Checklist

- [ ] Dependencias instaladas (`@logtail/node` y `@logtail/browser`)
- [ ] Proyecto creado en Logtail.com
- [ ] Source Token copiado
- [ ] Variable `NEXT_PUBLIC_LOGTALL_SOURCE_TOKEN` agregada a `.env.local`
- [ ] Servidor reiniciado
- [ ] Script de verificación ejecutado (`npm run verify:logtail`)
- [ ] (Opcional) Probado envío de logs

---

## 🆘 Solución de Problemas

### Error: "Cannot find module '@logtail/node'"

**Solución:** Instala las dependencias:
```bash
npm install @logtail/node @logtail/browser
```

### Los logs no aparecen en Logtail

**Posibles causas:**
1. Token incorrecto
2. Variable de entorno no cargada (reinicia el servidor)
3. Logs solo en desarrollo (verifica que estés en producción o que los logs se envíen)

**Solución:**
1. Verifica el token con `npm run verify:logtail`
2. Reinicia el servidor
3. Verifica que estés usando `logServer` o `logBrowser` en lugar de `console.log`

### Error: "Logtail token is invalid"

**Solución:**
1. Verifica que copiaste el token completo
2. Verifica que no hay espacios extra
3. Obtén un nuevo token desde Logtail Dashboard

---

## 📚 Recursos Adicionales

- **Logtail Dashboard**: https://logtail.com
- **Documentación**: https://docs.logtail.com
- **API Reference**: https://docs.logtail.com/integrations/javascript

---

## 🎉 Resumen

Una vez configurado:

1. ✅ Los logs se envían automáticamente a Logtail
2. ✅ Puedes buscar y analizar logs en tiempo real
3. ✅ Puedes configurar alertas
4. ✅ Tienes logs estructurados con metadata

**¿Necesitas ayuda?** Ejecuta `npm run verify:logtail` para verificar la configuración.

