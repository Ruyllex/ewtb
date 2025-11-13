# 🔧 Solución al Error: DATABASE_URL no definida

## ❌ Problema

El error `Cannot read properties of undefined (reading 'query')` ocurre porque la variable de entorno `DATABASE_URL` no está definida.

## ✅ Solución

### Paso 1: Crear archivo `.env.local`

En la raíz del proyecto, crea un archivo llamado `.env.local`:

```bash
cd "/home/juan/Documentos/Proyectos/TRABAJO /CLON TWITCH/Complete-Clone-of-Youtube-main"
touch .env.local
```

### Paso 2: Agregar la variable DATABASE_URL

Abre el archivo `.env.local` y agrega tu URL de conexión a la base de datos:

```env
DATABASE_URL=postgresql://usuario:password@host:puerto/database
```

### Paso 3: Obtener tu URL de base de datos

#### Opción A: Usando NeonDB (Recomendado)

1. Ve a [https://neon.tech](https://neon.tech)
2. Crea una cuenta o inicia sesión
3. Crea un nuevo proyecto
4. Copia la **Connection String** que te proporcionan
5. Pégala en tu archivo `.env.local`

Ejemplo de URL de NeonDB:
```
postgresql://usuario:password@ep-xxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

#### Opción B: Usando PostgreSQL local

Si tienes PostgreSQL instalado localmente:

```env
DATABASE_URL=postgresql://postgres:tu_password@localhost:5432/nombre_base_datos
```

### Paso 4: Configurar otras variables de entorno (Opcional pero recomendado)

Para que la aplicación funcione completamente, también necesitas configurar:

```env
# Clerk - Autenticación (Obtén desde https://dashboard.clerk.com)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_SIGNING_SECRET=whsec_...

# Mux - Procesamiento de Videos (Obtén desde https://dashboard.mux.com)
MUX_TOKEN_ID=tu_mux_token_id
MUX_TOKEN_SECRET=tu_mux_token_secret
MUX_WEBHOOK_SECRET=tu_mux_webhook_secret

# UploadThing - Gestión de Archivos (Obtén desde https://uploadthing.com)
UPLOADTHING_TOKEN=sk_live_...

# Upstash Redis - Caching (Obtén desde https://console.upstash.com)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=tu_redis_token
```

**Nota**: Puedes usar el archivo `.env.example` como referencia. Cópialo:
```bash
cp .env.example .env.local
```

### Paso 5: Reiniciar el servidor de desarrollo

Después de crear/actualizar el archivo `.env.local`, **debes reiniciar el servidor**:

1. Detén el servidor actual (Ctrl+C)
2. Inicia el servidor nuevamente:
   ```bash
   bun dev
   # o
   npm run dev
   ```

## 🔍 Verificación

Para verificar que la variable está cargada correctamente, puedes agregar temporalmente este código en cualquier archivo del servidor:

```typescript
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Definida' : '❌ No definida');
```

## 📝 Notas Importantes

1. **El archivo `.env.local` NO debe ser commiteado al repositorio** (ya está en `.gitignore`)
2. **Next.js carga automáticamente** las variables de `.env.local` en desarrollo
3. **Para producción**, configura estas variables en tu plataforma de hosting (Vercel, Netlify, etc.)
4. **Reinicia el servidor** cada vez que cambies variables de entorno

## 🚀 Siguiente Paso: Seed de la Base de Datos

Una vez que tengas `DATABASE_URL` configurada, ejecuta el seed para poblar las categorías iniciales:

```bash
bun seed
# o
npm run seed
```

## ❓ ¿Problemas?

Si después de seguir estos pasos sigues teniendo problemas:

1. Verifica que el archivo se llame exactamente `.env.local` (con el punto al inicio)
2. Verifica que esté en la raíz del proyecto (mismo nivel que `package.json`)
3. Verifica que la URL de la base de datos sea correcta
4. Asegúrate de haber reiniciado el servidor después de crear el archivo

