# ⚡ Paso 2: Configurar Upstash Redis

## 🎯 Objetivo
Crear una base de datos Redis en Upstash para caching y rate limiting.

---

## 📋 Pasos Detallados

### 1. Ir a Upstash Console

Abre en tu navegador:
👉 **https://console.upstash.com**

### 2. Iniciar Sesión o Crear Cuenta

- Si ya tienes cuenta: Haz clic en **Sign In**
- Si no tienes cuenta: Haz clic en **Sign Up** (puedes usar GitHub o Google)

### 3. Crear Nueva Base de Datos

Una vez dentro del dashboard:

1. Haz clic en el botón **Create Database** (o **+ New Database**)
2. Configura:
   - **Name:** `newtube-redis` (o el nombre que prefieras)
   - **Type:** Selecciona **Redis**
   - **Region:** Elige la región más cercana a ti (ej: `us-east-1`, `eu-west-1`)
   - **Primary Region:** La misma que elegiste arriba
3. Haz clic en **Create**

### 4. Esperar a que se Cree

La base de datos se creará en unos segundos. Verás un mensaje de éxito.

### 5. Obtener las Credenciales

Una vez creada la base de datos:

1. Haz clic en el nombre de tu base de datos para abrirla
2. Ve a la pestaña **Details** (o **REST API**)
3. Verás dos valores importantes:

   **REST URL:**
   - Formato: `https://xxxxx.upstash.io`
   - Copia esta URL completa

   **REST Token:**
   - Formato: Una cadena larga de caracteres
   - Copia este token completo

### 6. Agregar a .env.local

Abre el archivo `.env.local` en tu proyecto y busca la sección de Upstash Redis:

```env
# Upstash Redis - Caching y Rate Limiting
UPSTASH_REDIS_REST_URL=https://xxxxx.upstash.io  # ← Pega tu URL aquí
UPSTASH_REDIS_REST_TOKEN=tu_token_aqui           # ← Pega tu token aquí
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

---

## 🎉 ¡Listo!

Una vez completado, avísame y pasamos al siguiente: **Mux** (el último y más importante)

---

## 🐛 Si Tienes Problemas

- **No encuentras REST URL/Token:** Busca en la pestaña "Details" o "REST API"
- **No aparece la base de datos:** Espera unos segundos y refresca la página
- **Error de conexión:** Verifica que copiaste la URL completa sin espacios

---

## 💡 Tip

Upstash tiene un plan gratuito generoso, perfecto para desarrollo. No necesitas tarjeta de crédito.

---

¿Ya tienes las credenciales de Upstash? Pégamelas y las agrego al archivo, o si prefieres hacerlo tú, avísame cuando esté listo y pasamos al siguiente paso.

