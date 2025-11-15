# 🔧 Solución: Error "Unable to create live stream. Check your Mux credentials."

## 🎯 Problema
Al intentar crear un live stream, recibes el error: "Unable to create live stream. Check your Mux credentials."

## ✅ Soluciones Paso a Paso

### 1. Verificar que las credenciales estén en `.env.local`

Abre tu archivo `.env.local` y verifica que tengas estas variables:

```env
MUX_TOKEN_ID=tu_token_id_aqui
MUX_TOKEN_SECRET=tu_token_secret_aqui
```

**⚠️ Importante:**
- No deben tener comillas alrededor
- No deben tener espacios antes o después del `=`
- Deben estar en la raíz del proyecto (no en subcarpetas)

### 2. Obtener las credenciales correctas de Mux

#### Paso 2.1: Ir al Dashboard de Mux
1. Ve a [https://dashboard.mux.com](https://dashboard.mux.com)
2. Inicia sesión en tu cuenta

#### Paso 2.2: Obtener Token ID y Secret
1. Ve a **Settings** → **API Access Tokens**
2. Si no tienes un token, haz clic en **Create Token**
3. Copia:
   - **Token ID** → `MUX_TOKEN_ID`
   - **Token Secret** → `MUX_TOKEN_SECRET` (solo se muestra una vez, guárdalo bien)

#### Paso 2.3: Verificar permisos del token
Asegúrate de que el token tenga permisos para:
- ✅ Video API
- ✅ Live Streaming (si está disponible)

### 3. Habilitar Live Streaming en Mux

**⚠️ IMPORTANTE:** Live Streaming puede no estar habilitado por defecto en algunas cuentas.

#### Paso 3.1: Verificar si Live Streaming está habilitado
1. Ve a **Settings** → **Live Streaming** en Mux Dashboard
2. Si no ves esta opción o está deshabilitada, necesitas habilitarla

#### Paso 3.2: Habilitar Live Streaming
1. Si estás en una cuenta de prueba, es posible que necesites:
   - Actualizar a un plan que incluya Live Streaming
   - O contactar con soporte de Mux para habilitarlo

2. Si ya tienes Live Streaming habilitado:
   - Verifica que no haya restricciones en tu cuenta
   - Revisa si hay límites de uso alcanzados

### 4. Reiniciar el servidor de desarrollo

Después de agregar o modificar las variables de entorno:

```bash
# Detén el servidor (Ctrl+C)
# Luego reinícialo
npm run dev
```

**⚠️ Importante:** Next.js solo carga las variables de entorno al iniciar. Si las agregas mientras el servidor está corriendo, necesitas reiniciarlo.

### 5. Verificar en la consola del servidor

Cuando intentes crear un live stream, revisa la consola del servidor (donde ejecutaste `npm run dev`). Ahora verás información detallada del error:

- Si las credenciales están presentes
- El código de estado HTTP del error
- El mensaje de error específico de Mux

### 6. Errores comunes y soluciones

#### Error: "Mux credentials are missing"
**Solución:** Agrega `MUX_TOKEN_ID` y `MUX_TOKEN_SECRET` a tu `.env.local`

#### Error: "Invalid Mux credentials" (401)
**Solución:** 
- Verifica que copiaste correctamente el Token ID y Secret
- Asegúrate de que no hay espacios extra
- Crea un nuevo token si es necesario

#### Error: "Mux credentials don't have permission" (403)
**Solución:**
- Verifica que el token tenga permisos para Live Streaming
- Verifica que tu plan de Mux incluya Live Streaming
- Crea un nuevo token con los permisos correctos

#### Error: "Rate limit exceeded" (429)
**Solución:** Espera unos minutos y vuelve a intentar

### 7. Verificar que la tabla existe

Aunque el error principal es de Mux, también asegúrate de que la tabla `live_streams` existe:

```bash
npm run drizzle:push
```

## 🔍 Depuración

### Verificar variables de entorno en el código

Si quieres verificar que las variables se están cargando correctamente, puedes agregar temporalmente esto en `src/lib/mux.ts`:

```typescript
console.log("Mux Token ID present:", !!process.env.MUX_TOKEN_ID);
console.log("Mux Token Secret present:", !!process.env.MUX_TOKEN_SECRET);
```

**⚠️ No olvides eliminar estos logs después de depurar.**

### Probar la API de Mux directamente

Puedes probar si tus credenciales funcionan usando curl:

```bash
curl -X POST https://api.mux.com/video/v1/live-streams \
  -H "Content-Type: application/json" \
  -u "TU_TOKEN_ID:TU_TOKEN_SECRET" \
  -d '{
    "playback_policy": ["public"],
    "new_asset_settings": {
      "playback_policy": ["public"]
    }
  }'
```

Si esto funciona, el problema está en el código. Si no funciona, el problema está en las credenciales o permisos.

## 📝 Checklist

- [ ] Variables `MUX_TOKEN_ID` y `MUX_TOKEN_SECRET` están en `.env.local`
- [ ] Las credenciales son correctas (copiadas desde Mux Dashboard)
- [ ] El servidor de desarrollo fue reiniciado después de agregar las variables
- [ ] Live Streaming está habilitado en tu cuenta de Mux
- [ ] El token tiene permisos para Live Streaming
- [ ] La tabla `live_streams` existe (ejecutaste `npm run drizzle:push`)
- [ ] Revisaste la consola del servidor para ver el error detallado

## 🆘 Si el problema persiste

1. **Revisa la consola del servidor** - Ahora muestra información detallada del error
2. **Verifica tu plan de Mux** - Algunos planes no incluyen Live Streaming
3. **Contacta a soporte de Mux** - Pueden ayudarte a verificar tu cuenta y permisos
4. **Crea un nuevo token** - A veces los tokens pueden tener problemas

## ✅ Después de solucionar

Una vez que las credenciales estén correctas y Live Streaming esté habilitado:

1. Reinicia el servidor de desarrollo
2. Intenta crear un nuevo live stream
3. Deberías ver el Stream Key y Playback ID
4. Configura OBS con esos valores

---

**¿Necesitas ayuda adicional?** Revisa la consola del servidor para ver el error específico que ahora se muestra con más detalle.

