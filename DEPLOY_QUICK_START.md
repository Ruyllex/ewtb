# 🚀 Quick Start - Deployment en DigitalOcean

Guía rápida para hacer deploy en DigitalOcean en 5 minutos.

---

## ⚡ Deployment Rápido

### Para App Platform (Recomendado - Más Fácil)

#### 1. Pre-deployment (2 minutos)

```bash
# Ejecuta el script de pre-deployment
bash scripts/deploy-digitalocean.sh
```

O manualmente:
```bash
# Verifica que el build funciona
npm run build

# Haz commit y push
git add .
git commit -m "Deploy a DigitalOcean"
git push origin main
```

#### 2. Crear App en DigitalOcean (3 minutos)

1. Ve a [DigitalOcean App Platform](https://cloud.digitalocean.com/apps)
2. Haz clic en **"Create App"**
3. Conecta tu repositorio de GitHub
4. Selecciona tu repositorio y rama `main`
5. DigitalOcean detectará automáticamente que es Next.js

#### 3. Configurar Variables de Entorno

En la sección **"Environment Variables"**, agrega todas las variables:

```
DATABASE_URL=...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
# ... (ver lista completa en GUIA_DEPLOY_DIGITALOCEAN.md)
```

#### 4. Deploy

1. Selecciona el plan: **Professional $12/mes** (recomendado)
2. Haz clic en **"Create Resources"**
3. Espera 5-10 minutos
4. ¡Listo! Tu app estará en: `https://tu-app.ondigitalocean.app`

---

### Para Droplet (Alternativa - Más Control)

#### 1. Crear Droplet

1. Ve a DigitalOcean > **Droplets**
2. Crea un Droplet:
   - **OS:** Ubuntu 22.04 LTS
   - **Plan:** $12/mes (2GB RAM)
   - **Region:** Más cercana a tus usuarios

#### 2. Deployment Automatizado

```bash
# Desde tu máquina local
bash scripts/deploy-droplet.sh
```

Sigue las instrucciones del script.

#### 3. Configurar Nginx y SSL

```bash
# Conectarse al Droplet
ssh root@tu-ip-droplet

# Instalar Nginx
apt install nginx -y

# Configurar Nginx (ver GUIA_DEPLOY_DIGITALOCEAN.md)

# Instalar SSL con Let's Encrypt
apt install certbot python3-certbot-nginx -y
certbot --nginx -d tu-dominio.com
```

---

## ✅ Post-Deployment

### 1. Ejecutar Seed de Base de Datos

```bash
# Desde tu máquina local (con DATABASE_URL de producción)
npm run seed
```

### 2. Configurar Webhooks

Actualiza los webhooks en cada servicio para que apunten a tu URL de producción:

- **Mux:** `https://tu-app.ondigitalocean.app/api/videos/webhook`
- **Stripe:** `https://tu-app.ondigitalocean.app/api/webhooks/stripe`
- **Clerk:** `https://tu-app.ondigitalocean.app/api/users/webhook`

### 3. Verificar

- [ ] La app carga correctamente
- [ ] Puedes registrarte/iniciar sesión
- [ ] Puedes subir videos
- [ ] Los webhooks funcionan

---

## 📋 Checklist Completo

Para una verificación completa, consulta: [DEPLOY_CHECKLIST.md](./DEPLOY_CHECKLIST.md)

---

## 📚 Documentación Completa

- **Guía Completa:** [GUIA_DEPLOY_DIGITALOCEAN.md](./GUIA_DEPLOY_DIGITALOCEAN.md)
- **Checklist Detallado:** [DEPLOY_CHECKLIST.md](./DEPLOY_CHECKLIST.md)

---

## 🆘 Problemas Comunes

### Build falla
- Verifica que todas las variables de entorno estén configuradas
- Revisa los logs en DigitalOcean

### Error 502 Bad Gateway
- Verifica que la app esté corriendo
- Revisa los logs: `pm2 logs` (Droplet) o logs en App Platform

### Webhooks no funcionan
- Verifica que las URLs sean correctas (https://)
- Verifica que los secrets estén actualizados

Para más ayuda, consulta la sección de [Troubleshooting](./GUIA_DEPLOY_DIGITALOCEAN.md#-troubleshooting) en la guía completa.

---

**¡Listo para hacer deploy! 🚀**

