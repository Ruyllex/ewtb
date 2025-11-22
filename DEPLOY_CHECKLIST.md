# ✅ Checklist de Deployment en DigitalOcean

Este checklist te ayudará a asegurar que todo esté listo antes de hacer el deploy.

---

## 🔍 Pre-Deployment Checklist

### 📦 Repositorio y Código
- [ ] Todo el código está commitado y pusheado a GitHub
- [ ] El repositorio está sincronizado con la rama de producción (`main` o `master`)
- [ ] No hay archivos `.env.local` o `.env` en el repositorio (verifica `.gitignore`)
- [ ] El build local funciona correctamente: `npm run build`
- [ ] No hay errores de linting: `npm run lint`
- [ ] Los tests pasan (si los tienes)  

### 🔐 Variables de Entorno
- [ ] Tienes todas las claves de **producción** (no de desarrollo/test)
- [ ] `DATABASE_URL` - URL de tu base de datos de producción
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clave pública de Clerk (producción)
- [ ] `CLERK_SECRET_KEY` - Clave secreta de Clerk (producción)
- [ ] `CLERK_SIGNING_SECRET` - Signing secret de Clerk para webhooks

- [ ] `MUX_TOKEN_ID` - Token ID de Mux
- [ ] `MUX_TOKEN_SECRET` - Token secret de Mux
- [ ] `MUX_WEBHOOK_SECRET` - Webhook secret de Mux
- [ ] `UPLOADTHING_TOKEN` - Token de UploadThing
- [ ] `UPLOADTHING_SECRET` - Secret de UploadThing
- [ ] `UPSTASH_REDIS_REST_URL` - URL de Redis (Upstash)
- [ ] `UPSTASH_REDIS_REST_TOKEN` - Token de Redis (Upstash)
- [ ] `NEXT_PUBLIC_APP_URL` - URL de producción (se configurará después del deploy)
- [ ] `SENTRY_ORG` - Organización de Sentry (opcional)
- [ ] `SENTRY_PROJECT` - Proyecto de Sentry (opcional)
- [ ] `SENTRY_AUTH_TOKEN` - Token de autenticación de Sentry (opcional)
- [ ] `NEXT_PUBLIC_SENTRY_DSN` - DSN de Sentry (opcional)

### 🗄️ Base de Datos
- [ ] Base de datos de producción creada (NeonDB o similar)
- [ ] Las migraciones están aplicadas o listas para aplicar
- [ ] Tienes acceso a la base de datos para ejecutar seeds
- [ ] Has probado la conexión a la base de datos

### 🔗 Servicios Externos
- [ ] **Clerk**: Cuenta configurada en modo producción

- [ ] **Mux**: Cuenta activa con créditos
- [ ] **UploadThing**: Cuenta configurada
- [ ] **Upstash Redis**: Base de datos Redis creada
- [ ] **Sentry**: Proyecto configurado (opcional)

### 📝 Configuración de DigitalOcean
- [ ] Tienes cuenta en DigitalOcean
- [ ] Has elegido el plan (App Platform o Droplet)
- [ ] Tienes acceso a tu repositorio de GitHub desde DigitalOcean

---

## 🚀 Durante el Deployment

### App Platform (Recomendado)
- [ ] Repositorio conectado en App Platform
- [ ] Build command configurado: `npm run build`
- [ ] Run command configurado: `npm start`
- [ ] Todas las variables de entorno agregadas
- [ ] Health check configurado
- [ ] Plan seleccionado (mínimo Professional $12/mes recomendado)

### Droplet con Docker (Alternativa)
- [ ] Droplet creado con suficiente RAM (mínimo 1GB, recomendado 2GB)
- [ ] Docker y Docker Compose instalados
- [ ] Nginx configurado como reverse proxy
- [ ] SSL configurado con Let's Encrypt
- [ ] Firewall configurado (UFW)
- [ ] PM2 instalado y configurado (si no usas Docker)

---

## ✅ Post-Deployment Checklist

### 🎯 Verificación Inicial
- [ ] La aplicación está accesible en la URL de producción
- [ ] No hay errores en la consola del navegador
- [ ] La página principal carga correctamente
- [ ] El SSL/HTTPS funciona correctamente

### 🔐 Autenticación
- [ ] Puedes registrarte con Clerk
- [ ] Puedes iniciar sesión
- [ ] El perfil de usuario se muestra correctamente
- [ ] Los webhooks de Clerk funcionan

### 📹 Funcionalidades de Video
- [ ] Puedes subir un video
- [ ] El video se procesa correctamente en Mux
- [ ] Los webhooks de Mux funcionan
- [ ] Los thumbnails se generan correctamente
- [ ] Puedes reproducir videos



### 🗄️ Base de Datos
- [ ] Ejecutaste el seed: `npm run seed`
- [ ] Las categorías se crearon correctamente
- [ ] Los datos se persisten correctamente
- [ ] Las consultas funcionan rápidamente

### 📊 Monitoreo
- [ ] Los logs están accesibles en DigitalOcean
- [ ] Sentry está configurado y funcionando (si lo usas)
- [ ] Puedes ver errores en tiempo real

### 🔗 Webhooks de Producción
- [ ] **Mux Webhook**: URL actualizada a producción

- [ ] **Clerk Webhook**: URL actualizada a producción
- [ ] Los webhook secrets están actualizados en las variables de entorno

### 📱 Testing Final
- [ ] Prueba todas las rutas principales
- [ ] Prueba en diferentes dispositivos (móvil, tablet, desktop)
- [ ] Verifica que las imágenes carguen correctamente
- [ ] Verifica que los videos se reproduzcan bien

---

## 🐛 Troubleshooting

Si algo no funciona:

1. **Revisa los logs** en DigitalOcean App Platform o `pm2 logs` en Droplet
2. **Verifica las variables de entorno** - Asegúrate de que todas estén configuradas
3. **Revisa la consola del navegador** - Busca errores en el cliente
4. **Verifica la base de datos** - Asegúrate de que la conexión funcione
5. **Revisa los webhooks** - Verifica que las URLs sean correctas

---

## 📚 Recursos

- [Guía Completa de Deploy](./GUIA_DEPLOY_DIGITALOCEAN.md)
- [Documentación de DigitalOcean App Platform](https://docs.digitalocean.com/products/app-platform/)
- [Documentación de Next.js Deployment](https://nextjs.org/docs/deployment)

---

**¡Felicitaciones!** 🎉 Si todos los checkboxes están marcados, tu aplicación debería estar funcionando correctamente en producción.

