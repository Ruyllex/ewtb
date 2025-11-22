# 👤 Configurar Usuario como Administrador

## 🎯 Objetivo
Configurar el usuario con email `carlamorrison1947@gmail.com` (ID: `fc64dcc6-d4f5-4493-89f4-97f6ed7000e6`) como administrador para que pueda verificar canales.

---

## 📋 Pasos para Configurar

### Paso 1: Abrir el archivo `.env.local`

Abre el archivo `.env.local` en la raíz del proyecto. Si no existe, créalo.

### Paso 2: Agregar la Variable ADMIN_USER_IDS

Agrega o actualiza la variable `ADMIN_USER_IDS` con el ID del usuario o su email:

**Opción 1: Usar el ID de usuario (UUID) - RECOMENDADO**
```env
# Administradores - IDs separados por comas
ADMIN_USER_IDS=fc64dcc6-d4f5-4493-89f4-97f6ed7000e6
```

**Opción 2: Usar el email**
```env
# Administradores - Emails separados por comas
ADMIN_USER_IDS=carlamorrison1947@gmail.com
```

**Opción 3: Múltiples admins (puedes mezclar IDs y emails)**
```env
ADMIN_USER_IDS=fc64dcc6-d4f5-4493-89f4-97f6ed7000e6,otro-user-id,otro-email@example.com
```

**✅ RECOMENDACIÓN:** Usa el ID de usuario (`fc64dcc6-d4f5-4493-89f4-97f6ed7000e6`) ya que es más rápido y no requiere consultas adicionales a Clerk.

### Paso 3: Reiniciar el Servidor

Después de agregar la variable, **reinicia el servidor**:

```bash
# Detén el servidor (Ctrl+C)
# Luego reinícialo
npm run dev
```

---

## ✅ Verificación.

Una vez configurado, el usuario `carlamorrison1947@gmail.com` podrá:

1. **Verificar canales:**.
   ```typescript
   trpc.channels.verifyChannel.mutate({ channelId: "canal-id" });
   ```

2. **Desverificar canales:**
   ```typescript
   trpc.channels.unverifyChannel.mutate({ channelId: "canal-id" });
   ```

---

## 🔧 Cómo Funciona

El sistema verifica si un usuario es admin de tres formas:

1. **Por ID de usuario** (UUID de la base de datos)
2. **Por Clerk ID** (ID de Clerk)
3. **Por email** (email del usuario en Clerk)

Si alguno de estos coincide con los valores en `ADMIN_USER_IDS`, el usuario será considerado admin.

---

## 📝 Ejemplo Completo de `.env.local`

```env
# ... otras variables ...

# Administradoress
ADMIN_USER_IDS=fc64dcc6-d4f5-4493-89f4-97f6ed7000e6
```

---

## 🎉 ¡Listo!

Una vez configurado, el usuario `carlamorrison1947@gmail.com` tendrá acceso completo para verificar y desverificar canales.

