# 🚀 Paso a Paso: Solución Error Mux Live Streaming

Este documento te guiará paso a paso para solucionar el error "Unable to create live stream. Check your Mux credentials."

---

## 📋 Paso 1: Verificar que las credenciales estén en `.env.local`

### 1.1 Abrir el archivo `.env.local`

El archivo `.env.local` debe estar en la raíz del proyecto (mismo nivel que `package.json`).

### 1.2 Verificar las variables

Asegúrate de tener estas dos variables:

```env
MUX_TOKEN_ID=tu_token_id_aqui
MUX_TOKEN_SECRET=tu_token_secret_aqui
```

**⚠️ Importante:**
- ❌ NO uses comillas: `MUX_TOKEN_ID="valor"` (incorrecto)
- ✅ Sin comillas: `MUX_TOKEN_ID=valor` (correcto)
- ❌ NO dejes espacios: `MUX_TOKEN_ID = valor` (incorrecto)
- ✅ Sin espacios: `MUX_TOKEN_ID=valor` (correcto)

### 1.3 Si no tienes el archivo `.env.local`

Créalo en la raíz del proyecto con este contenido mínimo:

```env
# Mux Credentials
MUX_TOKEN_ID=
MUX_TOKEN_SECRET=
```

---

## 📋 Paso 2: Obtener las credenciales correctas de Mux

### 2.1 Ir al Dashboard de Mux

1. Abre tu navegador
2. Ve a: **https://dashboard.mux.com**
3. Inicia sesión con tu cuenta

### 2.2 Obtener Token ID y Secret

1. En el menú lateral, ve a **Settings** (Configuración)
2. Haz clic en **API Access Tokens**
3. Si ya tienes un token:
   - Haz clic en el token existente
   - Copia el **Token ID**
   - ⚠️ **Token Secret**: Si no lo tienes guardado, necesitas crear un nuevo token (el secret solo se muestra una vez)
4. Si NO tienes un token o necesitas crear uno nuevo:
   - Haz clic en **Create Token** o **New Token**
   - Dale un nombre descriptivo (ej: "Live Streaming Token")
   - Asegúrate de que tenga permisos para:
     - ✅ **Video API**
     - ✅ **Live Streaming** (si está disponible)
   - Haz clic en **Create**
   - ⚠️ **IMPORTANTE**: Copia el **Token Secret** inmediatamente, solo se muestra una vez

### 2.3 Copiar las credenciales

1. **Token ID**: Cópialo completo (algo como `abc123def456...`)
2. **Token Secret**: Cópialo completo (algo como `xyz789uvw012...`)

### 2.4 Agregar a `.env.local`

Abre `.env.local` y agrega o actualiza:

```env
MUX_TOKEN_ID=abc123def456...
MUX_TOKEN_SECRET=xyz789uvw012...
```

**Reemplaza** `abc123def456...` y `xyz789uvw012...` con tus valores reales.

---

## 📋 Paso 3: Habilitar Live Streaming en Mux

### 3.1 Verificar si Live Streaming está habilitado

1. En Mux Dashboard, ve a **Settings** → **Live Streaming**
2. Verifica el estado:
   - ✅ Si ves opciones de configuración → Live Streaming está habilitado
   - ❌ Si no ves esta sección o dice "Not available" → Necesitas habilitarlo

### 3.2 Habilitar Live Streaming (si no está habilitado)

**Opción A: Si estás en cuenta de prueba/gratuita**
- Algunas cuentas de prueba no incluyen Live Streaming
- Puedes necesitar:
  - Actualizar a un plan que incluya Live Streaming
  - O contactar a soporte de Mux para habilitarlo

**Opción B: Si tienes un plan que incluye Live Streaming**
- Verifica que no haya restricciones en tu cuenta
- Revisa si hay límites de uso alcanzados
- Contacta a soporte de Mux si es necesario

### 3.3 Verificar permisos del token

1. Ve a **Settings** → **API Access Tokens**
2. Selecciona tu token
3. Verifica que tenga permisos para:
   - ✅ Video API
   - ✅ Live Streaming

Si no tiene permisos para Live Streaming:
- Crea un nuevo token con los permisos correctos
- O edita el token existente (si es posible)

---

## 📋 Paso 4: Verificar la tabla en la base de datos

### 4.1 Aplicar migraciones

Abre tu terminal en la raíz del proyecto y ejecuta:

```bash
npm run drizzle:push
```

Esto creará la tabla `live_streams` si no existe.

### 4.2 Verificar que se creó correctamente

Deberías ver un mensaje similar a:

```
✓ Pushed to database
```

Si hay errores, revísalos y corrígelos antes de continuar.

---

## 📋 Paso 5: Ejecutar script de verificación

### 5.1 Ejecutar el script

He creado un script que verifica automáticamente toda la configuración:

```bash
npm run verify:mux-live
```

O si prefieres usar tsx directamente:

```bash
npx tsx scripts/verify-mux-live.ts
```

### 5.2 Interpretar los resultados

El script verificará:

1. ✅ **Credenciales presentes**: Si `MUX_TOKEN_ID` y `MUX_TOKEN_SECRET` están configuradas
2. ✅ **Credenciales válidas**: Si las credenciales son correctas y funcionan
3. ✅ **Permisos de Live Streaming**: Si puedes crear live streams

**Si todo está bien**, verás:
```
✅ ¡Todo está configurado correctamente!
```

**Si hay errores**, el script te dirá exactamente qué está mal y cómo solucionarlo.

---

## 📋 Paso 6: Reiniciar el servidor de desarrollo

### 6.1 Detener el servidor

Si tienes el servidor corriendo:
1. Ve a la terminal donde está corriendo `npm run dev`
2. Presiona `Ctrl + C` para detenerlo

### 6.2 Reiniciar el servidor

```bash
npm run dev
```

**⚠️ IMPORTANTE**: Next.js solo carga las variables de entorno cuando inicia. Si agregaste o modificaste variables en `.env.local`, **debes reiniciar el servidor**.

### 6.3 Verificar logs de depuración

Cuando el servidor inicie, deberías ver en la consola:

```
🔍 [DEBUG] Mux Token ID present: true
🔍 [DEBUG] Mux Token Secret present: true
🔍 [DEBUG] Mux Token ID length: XX
🔍 [DEBUG] Mux Token Secret length: XX
```

Si ves `false` en alguno, significa que las variables no se están cargando correctamente.

---

## 📋 Paso 7: Probar crear un Live Stream

### 7.1 Abrir la aplicación

1. Abre tu navegador
2. Ve a: **http://localhost:3000** (o el puerto que uses)
3. Inicia sesión

### 7.2 Navegar a Live Streams

1. Ve a **Studio** → **Live Streams**
2. O directamente a: **http://localhost:3000/studio/live**

### 7.3 Crear un nuevo stream

1. Haz clic en **Nueva Transmisión**
2. Completa el formulario:
   - **Título**: (requerido)
   - **Descripción**: (opcional)
3. Haz clic en **Crear Stream**

### 7.4 Verificar el resultado

**Si funciona:**
- ✅ Verás la página del stream con:
  - Stream Key
  - Playback ID
  - Instrucciones para OBS

**Si hay error:**
- Revisa la consola del servidor (donde ejecutaste `npm run dev`)
- Ahora verás información detallada del error:
  - Si las credenciales están presentes
  - El código de estado HTTP
  - El mensaje de error específico de Mux

---

## 📋 Paso 8: Interpretar errores específicos

### Error: "Mux credentials are missing"

**Causa**: Las variables `MUX_TOKEN_ID` o `MUX_TOKEN_SECRET` no están en `.env.local`

**Solución**:
1. Verifica que el archivo `.env.local` existe en la raíz del proyecto
2. Verifica que las variables estén escritas correctamente (sin comillas, sin espacios)
3. Reinicia el servidor de desarrollo

### Error: "Invalid Mux credentials" (401)

**Causa**: Las credenciales son incorrectas o inválidas

**Solución**:
1. Ve a Mux Dashboard → Settings → API Access Tokens
2. Verifica que copiaste correctamente el Token ID y Secret
3. Asegúrate de que no hay espacios extra
4. Crea un nuevo token si es necesario

### Error: "Mux credentials don't have permission" (403)

**Causa**: El token no tiene permisos para Live Streaming o Live Streaming no está habilitado

**Solución**:
1. Verifica que Live Streaming esté habilitado en tu cuenta de Mux
2. Verifica que el token tenga permisos para Live Streaming
3. Crea un nuevo token con los permisos correctos
4. Verifica que tu plan de Mux incluya Live Streaming

### Error: "Rate limit exceeded" (429)

**Causa**: Has hecho demasiadas solicitudes a la API de Mux

**Solución**: Espera unos minutos y vuelve a intentar

### Error: "La tabla live_streams no existe"

**Causa**: La tabla no se ha creado en la base de datos

**Solución**:
```bash
npm run drizzle:push
```

---

## 📋 Paso 9: Limpiar logs de depuración (opcional)

Una vez que todo funcione, puedes eliminar los logs de depuración de `src/lib/mux.ts`:

1. Abre `src/lib/mux.ts`
2. Elimina estas líneas:
   ```typescript
   // Logs de depuración (temporal - eliminar después de verificar)
   console.log("🔍 [DEBUG] Mux Token ID present:", !!tokenId);
   console.log("🔍 [DEBUG] Mux Token Secret present:", !!tokenSecret);
   if (tokenId) {
     console.log("🔍 [DEBUG] Mux Token ID length:", tokenId.length);
   }
   if (tokenSecret) {
     console.log("🔍 [DEBUG] Mux Token Secret length:", tokenSecret.length);
   }
   ```

O déjalos si quieres seguir monitoreando.

---

## ✅ Checklist Final

Antes de considerar que todo está resuelto, verifica:

- [ ] Variables `MUX_TOKEN_ID` y `MUX_TOKEN_SECRET` están en `.env.local`
- [ ] Las credenciales son correctas (copiadas desde Mux Dashboard)
- [ ] El servidor de desarrollo fue reiniciado después de agregar las variables
- [ ] Live Streaming está habilitado en tu cuenta de Mux
- [ ] El token tiene permisos para Live Streaming
- [ ] La tabla `live_streams` existe (ejecutaste `npm run drizzle:push`)
- [ ] El script de verificación (`npm run verify:mux-live`) pasa sin errores
- [ ] Puedes crear un live stream desde la aplicación sin errores

---

## 🆘 Si el problema persiste

1. **Revisa la consola del servidor** - Ahora muestra información detallada del error
2. **Ejecuta el script de verificación** - `npm run verify:mux-live`
3. **Verifica tu plan de Mux** - Algunos planes no incluyen Live Streaming
4. **Contacta a soporte de Mux** - Pueden ayudarte a verificar tu cuenta y permisos
5. **Crea un nuevo token** - A veces los tokens pueden tener problemas

---

## 🎉 Después de solucionar

Una vez que todo funcione:

1. ✅ Puedes crear live streams desde la aplicación
2. ✅ Verás el Stream Key y Playback ID
3. ✅ Puedes configurar OBS con esos valores
4. ✅ Puedes transmitir en vivo desde OBS

---

**¿Necesitas ayuda?** Revisa la consola del servidor para ver el error específico que ahora se muestra con más detalle.

