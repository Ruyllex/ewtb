# 🔍 Paso a Paso: Configurar Sentry

## 🎯 Objetivo
Configurar Sentry para monitoreo de errores en producción.

---

## ✅ Estado Actual

**Buenas noticias:** Sentry ya está parcialmente configurado en el proyecto:
- ✅ `@sentry/nextjs` instalado
- ✅ Archivos de configuración creados:
  - `sentry.client.config.ts` (cliente)
  - `sentry.server.config.ts` (servidor)
  - `sentry.edge.config.ts` (edge)
  - `src/instrumentation.ts` (instrumentación)
- ✅ `next.config.ts` configurado con Sentry
- ✅ Integrado en ErrorBoundary

**Lo que falta:**
- ❌ Crear proyecto en Sentry.io
- ❌ Obtener credenciales (DSN, Auth Token, Org, Project)
- ❌ Agregar variables de entorno

---

## 📋 Paso 1: Crear Proyecto en Sentry

### 1.1 Ir a Sentry

1. Abre tu navegador
2. Ve a: **https://sentry.io**
3. Inicia sesión o crea una cuenta gratuita

### 1.2 Crear Organización (si no tienes una)

1. Si es tu primera vez, Sentry te pedirá crear una organización
2. Elige un nombre para tu organización (ej: "mi-empresa" o "personal")
3. Haz clic en **Create Organization**

### 1.3 Crear Proyecto

1. En el dashboard, haz clic en **Create Project** o **Add Project**
2. Selecciona la plataforma: **Next.js**
3. Configura el proyecto:
   - **Project Name**: `newtube` (o el nombre que prefieras)
   - **Platform**: Next.js (debería estar seleccionado automáticamente)
4. Haz clic en **Create Project**

### 1.4 Copiar DSN

Después de crear el proyecto, Sentry te mostrará el **DSN** (Data Source Name):

```
https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
```

**⚠️ IMPORTANTE:** Copia este DSN, lo necesitarás en el siguiente paso.

---

## 📋 Paso 2: Obtener Auth Token (para Source Maps)

### 2.1 Crear Auth Token

1. En Sentry, ve a **Settings** (icono de engranaje) → **Auth Tokens**
2. Haz clic en **Create New Token**
3. Configura el token:
   - **Name**: `newtube-source-maps` (o el nombre que prefieras)
   - **Scopes**: Selecciona:
     - ✅ `project:read`
     - ✅ `project:releases`
     - ✅ `org:read`
4. Haz clic en **Create Token**
5. **⚠️ IMPORTANTE:** Copia el token inmediatamente, solo se muestra una vez

### 2.2 Obtener Org y Project Slug

1. **Org Slug**: 
   - Ve a **Settings** → **Organization Settings**
   - El **Organization Slug** está en la URL o en la página
   - Ejemplo: Si la URL es `https://sentry.io/settings/organizations/mi-empresa/`, el slug es `mi-empresa`

2. **Project Slug**:
   - Ve a tu proyecto
   - El **Project Slug** está en la URL o en **Settings** → **Projects** → [Tu Proyecto]
   - Ejemplo: Si la URL es `https://sentry.io/organizations/mi-empresa/projects/newtube/`, el slug es `newtube`

---

## 📋 Paso 3: Agregar Variables de Entorno

### 3.1 Abrir `.env.local`

Abre tu archivo `.env.local` en la raíz del proyecto.

### 3.2 Agregar Variables

Agrega estas variables con los valores que obtuviste:

```env
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
SENTRY_ORG=tu-org-slug
SENTRY_PROJECT=tu-project-slug
SENTRY_AUTH_TOKEN=tu-auth-token
```

**Ejemplo:**
```env
NEXT_PUBLIC_SENTRY_DSN=https://abc123@o123456.ingest.sentry.io/123456
SENTRY_ORG=mi-empresa
SENTRY_PROJECT=newtube
SENTRY_AUTH_TOKEN=sntrys_abc123def456...
```

**⚠️ Importante:**
- Reemplaza los valores con los tuyos
- No uses comillas alrededor de los valores
- No dejes espacios antes o después del `=`

---

## 📋 Paso 4: Reiniciar el Servidor

Después de agregar las variables de entorno:

1. Detén el servidor (Ctrl+C)
2. Reinícialo:
   ```bash
   npm run dev
   ```

**⚠️ IMPORTANTE:** Next.js solo carga las variables de entorno cuando inicia.

---

## 📋 Paso 5: Verificar que Funciona

### 5.1 Verificar en la Consola

Cuando inicies el servidor, deberías ver:
- ✅ No hay advertencias sobre Sentry
- ✅ Si hay advertencias, verifica que las variables estén correctas

### 5.2 Probar Captura de Errores (Opcional)

Puedes probar que Sentry funciona creando un error de prueba:

1. En cualquier componente, agrega temporalmente:
   ```typescript
   import { captureException } from "@/lib/sentry";
   
   // En un botón o función
   const testError = () => {
     captureException(new Error("Test error from Sentry"));
   };
   ```

2. Ejecuta la función
3. Ve a tu proyecto en Sentry Dashboard
4. Deberías ver el error en **Issues**

**⚠️ Nota:** En desarrollo, los errores NO se envían a Sentry (solo se muestran en consola). Solo se envían en producción.

---

## 📋 Paso 6: Configurar para Producción

### 6.1 Variables en Vercel (cuando hagas deploy)

Cuando despliegues en Vercel, agrega las mismas variables:

1. Ve a tu proyecto en Vercel
2. **Settings** → **Environment Variables**
3. Agrega las 4 variables:
   - `NEXT_PUBLIC_SENTRY_DSN`
   - `SENTRY_ORG`
   - `SENTRY_PROJECT`
   - `SENTRY_AUTH_TOKEN`
4. Selecciona los ambientes (Production, Preview, Development)
5. Haz clic en **Save**

### 6.2 Build en Producción

Cuando hagas `npm run build` o Vercel haga el build:
- Sentry automáticamente subirá los source maps
- Los errores en producción tendrán stack traces completos

---

## 🔍 Cómo Usar Sentry en tu Código

### Capturar Errores Manualmente

```typescript
import { captureException } from "@/lib/sentry";

try {
  // Tu código
} catch (error) {
  captureException(error instanceof Error ? error : new Error(String(error)), {
    context: "nombre-del-contexto",
    additionalData: "información adicional",
  });
}
```

### Capturar Mensajes

```typescript
import { captureMessage } from "@/lib/sentry";

captureMessage("Algo importante sucedió", "info");
captureMessage("Advertencia", "warning");
captureMessage("Error crítico", "error");
```

### Agregar Contexto de Usuario

```typescript
import { setUserContext } from "@/lib/sentry";

// Cuando el usuario inicia sesión
setUserContext({
  id: user.id,
  email: user.email,
  username: user.username,
});
```

### Agregar Tags

```typescript
import { setTag } from "@/lib/sentry";

setTag("environment", "production");
setTag("feature", "live-streaming");
```

---

## ✅ Checklist

- [ ] Cuenta creada en Sentry.io
- [ ] Organización creada
- [ ] Proyecto Next.js creado
- [ ] DSN copiado
- [ ] Auth Token creado y copiado
- [ ] Org Slug obtenido
- [ ] Project Slug obtenido
- [ ] Variables agregadas a `.env.local`:
  - [ ] `NEXT_PUBLIC_SENTRY_DSN`
  - [ ] `SENTRY_ORG`
  - [ ] `SENTRY_PROJECT`
  - [ ] `SENTRY_AUTH_TOKEN`
- [ ] Servidor reiniciado
- [ ] Verificado que no hay errores en consola
- [ ] (Opcional) Probado captura de errores

---

## 🎯 Próximos Pasos

Una vez configurado Sentry:

1. **En Desarrollo:**
   - Los errores se muestran en consola (no se envían a Sentry)
   - Útil para debugging local

2. **En Producción:**
   - Los errores se envían automáticamente a Sentry
   - Recibirás notificaciones de errores
   - Podrás ver stack traces completos

3. **Monitoreo:**
   - Ve a tu proyecto en Sentry Dashboard
   - Revisa **Issues** para ver errores
   - Configura alertas por email/Slack si quieres

---

## 🆘 Solución de Problemas

### Error: "Sentry DSN not configured"

**Solución:** Verifica que `NEXT_PUBLIC_SENTRY_DSN` esté en `.env.local` y reinicia el servidor.

### Error: "Failed to upload source maps"

**Solución:** Verifica que `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` y `SENTRY_PROJECT` estén configurados correctamente.

### Los errores no aparecen en Sentry

**Causa:** En desarrollo, los errores NO se envían a Sentry (solo en producción).

**Solución:** 
- Para probar, cambia temporalmente `NODE_ENV` a `production` (no recomendado)
- O espera a hacer deploy en producción

---

**¿Necesitas ayuda?** Revisa la documentación oficial: https://docs.sentry.io/platforms/javascript/guides/nextjs/
