# 🔍 TAREA 2: Configurar Sentry / Logtail

## 🎯 Objetivo
Integrar monitoreo de errores y logs con Sentry o Logtail para producción.

---

## 📋 Pasos Detallados

### Opción A: Sentry (Recomendado para errores)

#### Paso 1: Crear Proyecto en Sentry

1. Ve a [https://sentry.io](https://sentry.io)
2. Inicia sesión o crea una cuenta
3. Crea un nuevo proyecto:
   - **Platform:** Next.js
   - **Name:** `newtube` (o el que prefieras)
4. Copia el **DSN** (Data Source Name)

#### Paso 2: Instalar Dependencias

```bash
npm install @sentry/nextjs
```

#### Paso 3: Configurar Sentry

Ejecuta el wizard de Sentry:
```bash
npx @sentry/wizard@latest -i nextjs
```

O crea manualmente `lib/sentry.ts`

#### Paso 4: Agregar Variables de Entorno

```env
NEXT_PUBLIC_SENTRY_DSN=tu_dsn_aqui
SENTRY_AUTH_TOKEN=tu_auth_token_aqui
SENTRY_ORG=tu_org
SENTRY_PROJECT=tu_proyecto
```

---

### Opción B: Logtail (Recomendado para logs)

#### Paso 1: Crear Proyecto en Logtail

1. Ve a [https://logtail.com](https://logtail.com)
2. Inicia sesión o crea una cuenta
3. Crea un nuevo proyecto
4. Copia el **Source Token**

#### Paso 2: Instalar Dependencias

```bash
npm install @logtail/node @logtail/browser
```

#### Paso 3: Crear lib/logtail.ts

```typescript
import { Logtail } from "@logtail/node";
import { Logtail as BrowserLogtail } from "@logtail/browser";

export const logtail = process.env.NEXT_PUBLIC_LOGTALL_SOURCE_TOKEN
  ? new Logtail(process.env.NEXT_PUBLIC_LOGTALL_SOURCE_TOKEN)
  : null;

export const browserLogtail = process.env.NEXT_PUBLIC_LOGTALL_SOURCE_TOKEN
  ? new BrowserLogtail(process.env.NEXT_PUBLIC_LOGTALL_SOURCE_TOKEN)
  : null;
```

#### Paso 4: Agregar Variables de Entorno

```env
NEXT_PUBLIC_LOGTALL_SOURCE_TOKEN=tu_token_aqui
```

---

## 📝 Archivos a Crear

- `src/lib/sentry.ts` - Configuración de Sentry
- O `src/lib/logtail.ts` - Configuración de Logtail

---

## ✅ Checklist

- [ ] Proyecto creado en Sentry/Logtail
- [ ] Dependencias instaladas
- [ ] Archivo de configuración creado
- [ ] Variables de entorno agregadas
- [ ] Integrado en la aplicación
- [ ] Probado en desarrollo

---

¿Prefieres Sentry o Logtail? Te guiaré con la implementación.

