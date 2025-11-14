# 🎬 Paso 3: Configurar Mux (OBLIGATORIO)

## 🎯 Objetivo
Obtener las credenciales de Mux para procesar videos y configurar webhooks.

---

## 📋 Pasos Detallados

### Parte 1: Obtener Token de API (5 minutos)

#### 1. Ir a Mux Dashboard

Abre en tu navegador:
👉 **https://dashboard.mux.com**

#### 2. Iniciar Sesión o Crear Cuenta

- Si ya tienes cuenta: Haz clic en **Sign In**
- Si no tienes cuenta: Haz clic en **Sign Up** (puedes usar GitHub)

#### 3. Ir a API Access Tokens

Una vez dentro del dashboard:

1. Ve a **Settings** (Configuración) en el menú lateral
2. Haz clic en **API Access Tokens**
3. Verás una lista de tokens existentes o un botón para crear uno nuevo

#### 4. Crear o Usar Token Existente

**Si no tienes token:**
1. Haz clic en **Create Token** o **Generate New Token**
2. Dale un nombre (ej: "NewTube Development")
3. Selecciona los permisos necesarios (generalmente "Full Access" para desarrollo)
4. Haz clic en **Create** o **Generate**

**Si ya tienes token:**
- Simplemente copia el Token ID y Token Secret existentes

#### 5. Copiar las Credenciales

Verás dos valores:

**Token ID:**
- Formato: Algo como `abc123...` o un UUID
- Copia este valor

**Token Secret:**
- Formato: Una cadena larga de caracteres
- ⚠️ **IMPORTANTE:** Solo se muestra una vez al crear el token
- Si no lo copiaste, tendrás que crear un nuevo token

---

### Parte 2: Configurar Webhook (10 minutos)

#### 1. Preparar ngrok (Para Desarrollo Local)

**Si no tienes ngrok instalado:**
```bash
# Opción 1: Descargar desde https://ngrok.com/download
# Opción 2: Instalar con npm
npm install -g ngrok
```

**Iniciar ngrok:**
1. Asegúrate de que tu servidor Next.js esté corriendo (`npm run dev`)
2. En otra terminal, ejecuta:
   ```bash
   ngrok http 3000
   ```
3. Copia la URL que aparece, algo como: `https://abc123.ngrok.io`

#### 2. Configurar Webhook en Mux

1. En Mux Dashboard, ve a **Settings** > **Webhooks**
2. Haz clic en **Add Webhook** o **Create Webhook**
3. Configura:
   - **URL:** `https://tu-url-ngrok.ngrok.io/api/videos/webhook`
     (Reemplaza `tu-url-ngrok.ngrok.io` con tu URL de ngrok)
   - **Events:** Selecciona estos eventos:
     - ✅ `video.asset.created`
     - ✅ `video.asset.ready`
     - ✅ `video.asset.errored`
     - ✅ `video.asset.deleted`
     - ✅ `video.asset.track.ready`
4. Haz clic en **Save** o **Create**

#### 3. Copiar el Signing Secret

Después de crear el webhook:
1. Haz clic en el webhook que acabas de crear
2. Verás un **Signing Secret** (empieza con algo como `whsec_...`)
3. ⚠️ **IMPORTANTE:** Copia este valor, lo necesitarás

---

### Parte 3: Agregar a .env.local

Abre el archivo `.env.local` y busca la sección de Mux:

```env
# Mux - Procesamiento de Videos y Streaming
MUX_TOKEN_ID=tu_token_id_aqui           # ← Pega tu Token ID
MUX_TOKEN_SECRET=tu_token_secret_aqui   # ← Pega tu Token Secret
MUX_WEBHOOK_SECRET=tu_webhook_secret    # ← Pega tu Signing Secret
```

**Reemplaza** los valores con tus credenciales reales.

---

## ✅ Verificación

Después de agregar las credenciales:

1. **Guarda el archivo** `.env.local`
2. **Reinicia el servidor:**
   ```bash
   # Detén el servidor (Ctrl+C)
   # Luego reinícialo
   npm run dev
   ```

3. **Verifica que no haya errores** en la consola del servidor

4. **Prueba el webhook:**
   - Sube un video desde tu aplicación
   - Verifica en Mux Dashboard que el webhook se reciba correctamente

---

## 🎉 ¡Listo!

Una vez completado, **TAREA 1 estará 100% completa** ✅

---

## 🐛 Si Tienes Problemas

### No encuentro API Access Tokens
- Busca en **Settings** > **API** o **Settings** > **Tokens**
- Algunas cuentas nuevas necesitan verificar el email primero

### No puedo ver el Token Secret
- Si ya creaste el token antes, el secret no se muestra de nuevo
- Crea un nuevo token para obtener el secret

### El webhook no funciona
- Verifica que ngrok esté corriendo
- Verifica que la URL del webhook sea correcta
- Asegúrate de que tu servidor Next.js esté corriendo en el puerto 3000
- Revisa los logs de Mux Dashboard para ver si hay errores

### Error "Mux no está configurado"
- Verifica que las 3 variables estén en `.env.local`
- Reinicia el servidor después de agregar las variables
- Verifica que no haya espacios extra en los valores

---

## 💡 Tips

- **Para producción:** Usa ngrok solo para desarrollo. En producción, usa tu dominio real
- **Token Secret:** Si lo pierdes, crea un nuevo token
- **Webhook:** Puedes tener múltiples webhooks para diferentes entornos

---

¿Ya tienes las 3 credenciales de Mux? Pégamelas y las agrego al archivo, o si prefieres hacerlo tú, avísame cuando esté listo.

