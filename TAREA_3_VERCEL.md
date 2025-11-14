# 🚀 TAREA 3: Configurar Deploy en Vercel

## 🎯 Objetivo
Desplegar la aplicación en Vercel para producción.

---

## 📋 Pasos Detallados

### Paso 1: Preparar el Repositorio

#### 1.1 Asegurar que el código esté en Git

```bash
git add .
git commit -m "Preparar para deploy"
git push origin main
```

#### 1.2 Verificar que .env.local NO esté en el repositorio

```bash
# Verificar .gitignore
cat .gitignore | grep .env.local
# Debe mostrar: .env.local
```

---

### Paso 2: Crear Proyecto en Vercel

#### 2.1 Conectar con GitHub/GitLab

1. Ve a [https://vercel.com](https://vercel.com)
2. Inicia sesión con GitHub/GitLab
3. Haz clic en **Add New Project**
4. Selecciona tu repositorio
5. Haz clic en **Import**

#### 2.2 Configurar el Proyecto

- **Framework Preset:** Next.js (debería detectarse automáticamente)
- **Root Directory:** `./` (raíz del proyecto)
- **Build Command:** `npm run build` (o `bun run build`)
- **Output Directory:** `.next` (automático para Next.js)
- **Install Command:** `npm install` (o `bun install`)

---

### Paso 3: Configurar Variables de Entorno

#### 3.1 Agregar Variables en Vercel

En la configuración del proyecto, ve a **Settings** > **Environment Variables**

Agrega TODAS las variables de `.env.local`:

```
DATABASE_URL=...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
CLERK_SIGNING_SECRET=...
MUX_TOKEN_ID=...
MUX_TOKEN_SECRET=...
MUX_WEBHOOK_SECRET=...
UPLOADTHING_TOKEN=...
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
STRIPE_SECRET_KEY=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
STRIPE_WEBHOOK_SECRET=...
# etc...
```

#### 3.2 Configurar para Entornos

- **Production:** Todas las variables
- **Preview:** Variables de desarrollo (opcional)
- **Development:** Variables de desarrollo (opcional)

---

### Paso 4: Configurar Webhooks

#### 4.1 Actualizar URLs de Webhooks

Después del deploy, actualiza las URLs de webhooks en:

- **Clerk:** `https://tu-dominio.vercel.app/api/users/webhook`
- **Mux:** `https://tu-dominio.vercel.app/api/videos/webhook`
- **Stripe:** `https://tu-dominio.vercel.app/api/webhooks/stripe`

#### 4.2 Actualizar NEXT_PUBLIC_APP_URL

En Vercel, agrega:
```
NEXT_PUBLIC_APP_URL=https://tu-dominio.vercel.app
```

---

### Paso 5: Deploy

#### 5.1 Primer Deploy

1. Haz clic en **Deploy**
2. Espera a que termine el build
3. Revisa los logs si hay errores

#### 5.2 Verificar

1. Visita la URL que Vercel te proporciona
2. Verifica que la aplicación funcione
3. Revisa los logs en Vercel Dashboard

---

### Paso 6: Configurar Dominio Personalizado (Opcional)

#### 6.1 Agregar Dominio

1. Ve a **Settings** > **Domains**
2. Agrega tu dominio
3. Sigue las instrucciones de DNS

---

## ✅ Checklist

- [ ] Código en Git
- [ ] Proyecto creado en Vercel
- [ ] Variables de entorno configuradas
- [ ] Build exitoso
- [ ] Aplicación funcionando
- [ ] Webhooks actualizados
- [ ] Dominio configurado (opcional)

---

## 🐛 Troubleshooting

### Error en Build

- Revisa los logs en Vercel
- Verifica que todas las dependencias estén en `package.json`
- Asegúrate de que no haya errores de TypeScript

### Variables de Entorno no Funcionan

- Verifica que las variables estén en Vercel
- Reinicia el deployment
- Verifica que los nombres sean exactos

---

## 🎉 Siguiente Paso

Una vez desplegado, tu aplicación estará en producción.

---

¿Listo para hacer el deploy? Te guiaré paso a paso.

