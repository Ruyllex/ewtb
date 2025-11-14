# 📤 Paso 1: Configurar UploadThing

## 🎯 Objetivo
Obtener el token de UploadThing para gestionar archivos y thumbnails.

---

## 📋 Pasos Detallados

### 1. Ir a UploadThing

Abre en tu navegador:
👉 **https://uploadthing.com**

### 2. Iniciar Sesión o Crear Cuenta

- Si ya tienes cuenta: Haz clic en **Sign In**
- Si no tienes cuenta: Haz clic en **Sign Up** (puedes usar GitHub)

### 3. Ir a API Keys

Una vez dentro del dashboard:
1. Busca en el menú lateral: **API Keys** o **Settings** > **API Keys**
2. O ve directamente a: **https://uploadthing.com/dashboard/api-keys**

### 4. Copiar el Token

Verás algo como:
- **Token:** `sk_live_abc123...` o `sk_test_xyz789...`

**Copia todo el token completo** (empieza con `sk_live_` o `sk_test_`)

### 5. Agregar a .env.local

Abre el archivo `.env.local` en tu proyecto y busca la sección de UploadThing:

```env
# UploadThing - Gestión de Archivos y Thumbnails
UPLOADTHING_TOKEN=sk_live_...  # ← Pega tu token aquí
UPLOADTHING_LOG_LEVEL=error
```

**Reemplaza** `sk_live_...` con tu token real.

---

## ✅ Verificación

Después de agregar el token:

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

Una vez completado, avísame y pasamos al siguiente: **Upstash Redis**

---

## 🐛 Si Tienes Problemas

- **No encuentras API Keys:** Busca en Settings o en el menú superior
- **No tienes token:** Algunas cuentas necesitan crear un proyecto primero
- **Token no funciona:** Asegúrate de copiar el token completo sin espacios

---

¿Ya tienes el token? Pégamelo y lo agrego al archivo, o si prefieres hacerlo tú, avísame cuando esté listo y pasamos al siguiente paso.

