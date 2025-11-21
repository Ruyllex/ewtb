# 🚀 Guía Completa de Deploy en DigitalOcean

Esta guía te ayudará a desplegar tu aplicación Next.js en DigitalOcean de forma exitosa. Te ofrecemos dos opciones: **App Platform** (recomendado) y **Droplet con Docker** (alternativa avanzada).

---

## 📋 Tabla de Contenidos

1. [Pre-requisitos](#pre-requisitos)
2. [Opción 1: DigitalOcean App Platform (Recomendado)](#opción-1-digitalocean-app-platform-recomendado)
3. [Opción 2: Droplet con Docker (Alternativa)](#opción-2-droplet-con-docker-alternativa)
4. [Configuración de Webhooks en Producción](#configuración-de-webhooks-en-producción)
5. [Troubleshooting](#troubleshooting)

---

## 🎯 Pre-requisitos

Antes de comenzar, asegúrate de tener:

- ✅ Cuenta en DigitalOcean (si no tienes, [crea una aquí](https://m.do.co/c/7e5ae8e1e5a2))
- ✅ Repositorio en GitHub (privado o público)
- ✅ Todas las variables de entorno configuradas localmente
- ✅ Base de datos NeonDB configurada
- ✅ Cuentas configuradas en:
  - Clerk (autenticación)
  - Mux (video streaming)

  - UploadThing (archivos)
  - Upstash Redis (caching)

> 💡 **Tip:** Usa el [Checklist de Deployment](./DEPLOY_CHECKLIST.md) para asegurarte de que todo esté listo antes de comenzar.

> 💡 **Tip:** Usa el script de deployment automatizado: `bash scripts/deploy-digitalocean.sh` (para App Platform) o `bash scripts/deploy-droplet.sh` (para Droplet).

---

## 🏗️ Opción 1: DigitalOcean App Platform (Recomendado)

**App Platform** es la forma más sencilla de desplegar tu aplicación Next.js en DigitalOcean. Es similar a Vercel o Netlify, pero con servidores en DigitalOcean.

### Ventajas:
- ✅ SSL automático
- ✅ Deploy automático desde GitHub
- ✅ Escalado automático
- ✅ Logs integrados
- ✅ Variables de entorno fáciles de gestionar
- ✅ Health checks automáticos

### Pasos:

#### 1. Preparar el Repositorio

**Opción A: Script automatizado (Recomendado)**
```bash
bash scripts/deploy-digitalocean.sh
```
Este script verifica automáticamente:
- Que el build funciona
- Que no hay cambios sin commitear
- Que no hay archivos `.env` en el repositorio
- Hace push automáticamente

**Opción B: Manual**
1. **Asegúrate de tener todo commitado:**
   ```bash
   git add .
   git commit -m "Preparando para deploy en DigitalOcean"
   git push origin main
   ```

2. **Verifica que tu repositorio esté en GitHub**
3. **Verifica que el build funciona:**
   ```bash
   npm run build
   ```

#### 2. Crear la Aplicación en App Platform

1. **Inicia sesión en DigitalOcean:**
   - Ve a [https://cloud.digitalocean.com](https://cloud.digitalocean.com)
   - Inicia sesión con tu cuenta

2. **Crea una nueva App:**
   - Haz clic en **"Apps"** en el menú lateral
   - Haz clic en **"Create App"**
   - Conecta tu cuenta de GitHub si no lo has hecho
   - Selecciona tu repositorio
   - Selecciona la rama `main` (o la que uses para producción)

3. **Configuración de la Aplicación:**
   - **Type:** Automáticamente detectará que es Next.js
   - **Name:** Elige un nombre único (ej: `newtube-prod`)
   - **Region:** Elige la región más cercana a tus usuarios

4. **Configurar Build Settings:**
   - **Build Command:** `npm run build` (o `bun run build` si usas Bun)
   - **Run Command:** `npm start` (o `bun start`)
   - **Environment Variables:** Las configuramos después

5. **Plan y Recursos:**
   - **Plan:** 
     - **Básico:** $5/mes (512 MB RAM) - Para empezar
     - **Professional:** $12/mes (1 GB RAM) - Recomendado para producción
   - **Instance Count:** 1 para empezar (puedes escalar después)

#### 3. Configurar Variables de Entorno

En la sección **"Environment Variables"**, agrega todas las variables necesarias:

```env
# Base de Datos
DATABASE_URL=postgresql://usuario:password@host:puerto/database

# Clerk (Autenticación)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
CLERK_SIGNING_SECRET=whsec_...
NEXT_PUBLIC_CLERK_URL=https://tu-app-url.ondigitalocean.app



# Mux (Video Streaming)
MUX_TOKEN_ID=tu_token_id
MUX_TOKEN_SECRET=tu_token_secret
MUX_WEBHOOK_SECRET=whsec_...

# UploadThing (Archivos)
UPLOADTHING_TOKEN=sk_live_...
UPLOADTHING_SECRET=tu_secret

# Upstash Redis (Caching)
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=tu_token

# Sentry (Monitoreo - Opcional)
SENTRY_ORG=tu_org
SENTRY_PROJECT=tu_project
SENTRY_AUTH_TOKEN=tu_token
NEXT_PUBLIC_SENTRY_DSN=tu_dsn

# Node Environment
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://tu-app-url.ondigitalocean.app
```

**⚠️ IMPORTANTE:**
- Usa claves de **producción** (`pk_live_`, `sk_live_`) en lugar de test
- La variable `NEXT_PUBLIC_CLERK_URL` debe ser tu URL de producción
- La variable `NEXT_PUBLIC_APP_URL` debe ser tu URL de producción

#### 4. Configurar Health Check (Opcional pero Recomendado)

1. En la configuración de la app, ve a **"Settings"** > **"Health Checks"**
2. Configura:
   - **Path:** `/`
   - **Initial Delay:** 60 segundos
   - **Interval:** 30 segundos
   - **Timeout:** 10 segundos

#### 5. Deploy

1. Haz clic en **"Next"** para revisar la configuración
2. Haz clic en **"Create Resources"**
3. Espera a que se complete el deploy (5-10 minutos)
4. Una vez completado, tu app estará disponible en: `https://tu-app-name.ondigitalocean.app`

#### 6. Seed de la Base de Datos

Después del primer deploy, ejecuta el seed:

1. **Opción A: Desde tu máquina local**
   ```bash
   # Asegúrate de tener DATABASE_URL configurada con tu BD de producción
   npm run seed
   ```

2. **Opción B: Usando App Platform Console**
   - Ve a tu app en DigitalOcean
   - Ve a **"Settings"** > **"Run Command"**
   - Ejecuta: `npm run seed`

#### 7. Configurar Webhooks de Producción

Ver sección [Configuración de Webhooks en Producción](#configuración-de-webhooks-en-producción)

---

## 🐳 Opción 2: Droplet con Docker (Alternativa)

Esta opción te da más control pero requiere más configuración manual.

### Ventajas:
- ✅ Control total sobre el servidor
- ✅ Más económico a largo plazo (si manejas múltiples apps)
- ✅ Flexibilidad para configurar como desees

### Desventajas:
- ❌ Configuración más compleja
- ❌ Debes gestionar SSL manualmente (usando Let's Encrypt)
- ❌ Debes gestionar actualizaciones y seguridad

### Pasos:

#### 1. Crear un Droplet

1. En DigitalOcean, ve a **"Droplets"** > **"Create Droplet"**
2. Configura:
   - **Image:** Ubuntu 22.04 LTS
   - **Plan:** 
     - **Basic:** $6/mes (1 GB RAM) - Mínimo recomendado
     - **Basic:** $12/mes (2 GB RAM) - Recomendado para producción
   - **Region:** Elige la más cercana
   - **Authentication:** SSH keys (recomendado) o Password
3. Haz clic en **"Create Droplet"**

#### 2. Conectar al Droplet

```bash
ssh root@tu-ip-droplet
```

#### 3. Instalar Docker y Docker Compose

```bash
# Actualizar sistema
apt update && apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Instalar Docker Compose
apt install docker-compose -y

# Agregar usuario actual a grupo docker
usermod -aG docker $USER

# Verificar instalación
docker --version
docker-compose --version
```

#### 4. Instalar Node.js y npm

```bash
# Instalar Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verificar instalación
node --version
npm --version
```

#### 5. Clonar el Repositorio

**Opción A: Script automatizado (Recomendado)**
```bash
# Desde tu máquina local
bash scripts/deploy-droplet.sh
```
Este script automatiza todo el proceso de deployment.

**Opción B: Manual**
```bash
# Instalar Git
apt install git -y

# Clonar repositorio
cd /var/www
git clone https://github.com/tu-usuario/tu-repositorio.git newtube
cd newtube
```

#### 6. Configurar Variables de Entorno

```bash
# Crear archivo .env.production
nano .env.production
```

Agrega todas las variables de entorno (igual que en App Platform)

#### 7. Instalar Dependencias y Build

```bash
# Instalar dependencias
npm install

# Build de producción
npm run build
```

#### 8. Configurar PM2 (Process Manager)

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Crear archivo ecosystem.config.js
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'newtube',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/newtube',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
EOF

# Iniciar aplicación con PM2
pm2 start ecosystem.config.js

# Configurar PM2 para iniciar al reiniciar el servidor
pm2 startup
pm2 save
```

#### 9. Configurar Nginx como Reverse Proxy

```bash
# Instalar Nginx
apt install nginx -y

# Crear configuración
cat > /etc/nginx/sites-available/newtube << EOF
server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Habilitar sitio
ln -s /etc/nginx/sites-available/newtube /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default

# Verificar configuración
nginx -t

# Reiniciar Nginx
systemctl restart nginx
```

#### 10. Configurar SSL con Let's Encrypt

```bash
# Instalar Certbot
apt install certbot python3-certbot-nginx -y

# Obtener certificado SSL
certbot --nginx -d tu-dominio.com -d www.tu-dominio.com

# El certificado se renovará automáticamente
```

#### 11. Configurar Firewall

```bash
# Configurar UFW
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

---

## 🔗 Configuración de Webhooks en Producción

Después del deploy, necesitas actualizar los webhooks para que apunten a tu URL de producción.

### 1. Webhooks de Mux

1. Ve a [https://dashboard.mux.com](https://dashboard.mux.com)
2. Ve a **Settings** > **Webhooks**
3. Edita tu webhook existente o crea uno nuevo:
   - **URL:** `https://tu-app-url.ondigitalocean.app/api/videos/webhook`
   - **Events:** Selecciona todos los eventos de video
4. Guarda y copia el nuevo **Signing Secret**
5. Actualiza `MUX_WEBHOOK_SECRET` en DigitalOcean App Platform



### 3. Webhooks de Clerk

1. Ve a [https://dashboard.clerk.com](https://dashboard.clerk.com)
2. Ve a tu aplicación > **Webhooks**
3. Crea un nuevo endpoint:
   - **URL:** `https://tu-app-url.ondigitalocean.app/api/users/webhook`
   - **Events:** Selecciona los eventos que necesitas
4. Guarda y copia el **Signing Secret**
5. Actualiza `CLERK_SIGNING_SECRET` en DigitalOcean App Platform

### 4. UploadThing

UploadThing no requiere webhooks específicos, pero asegúrate de que tu token tenga permisos en producción.

---

## 🔧 Troubleshooting

### Problema: Build falla

**Solución:**
- Verifica que todas las variables de entorno estén configuradas
- Revisa los logs de build en App Platform
- Asegúrate de que `package.json` tenga los scripts correctos

### Problema: Error de base de datos

**Solución:**
- Verifica que `DATABASE_URL` esté correcta
- Asegúrate de que la IP del servidor esté permitida en NeonDB
- Ejecuta el seed de la base de datos

### Problema: Webhooks no funcionan

**Solución:**
- Verifica que las URLs de webhooks estén correctas
- Verifica que los secrets estén actualizados en App Platform
- Revisa los logs en App Platform para ver errores de webhooks

### Problema: Error 502 Bad Gateway

**Solución:**
- Verifica que la aplicación esté corriendo (en Droplet: `pm2 status`)
- Revisa los logs: `pm2 logs newtube`
- Verifica que el puerto 3000 esté abierto
- En App Platform, verifica el health check

### Problema: Variables de entorno no se cargan

**Solución:**
- Verifica que las variables estén en la sección correcta (Runtime Environment)
- Reinicia la aplicación después de agregar variables
- En App Platform, las variables que empiezan con `NEXT_PUBLIC_` deben estar en ambas secciones (Build y Runtime)

---

## 📊 Monitoreo y Logs

### En App Platform:
- Ve a tu app > **"Runtime Logs"** para ver logs en tiempo real
- Ve a **"Metrics"** para ver CPU, memoria y requests

### En Droplet:
```bash
# Ver logs de PM2
pm2 logs newtube

# Ver logs de Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

---

## 🔄 Actualizaciones y CI/CD

### App Platform:
- Los deploys se hacen automáticamente cuando haces push a la rama conectada
- Puedes hacer deploy manual desde la interfaz

### Droplet:
```bash
# Conectarse al servidor
ssh root@tu-ip-droplet

# Actualizar código
cd /var/www/newtube
git pull origin main

# Reinstalar dependencias (si hay cambios)
npm install

# Rebuild
npm run build

# Reiniciar aplicación
pm2 restart newtube
```

---

## 💰 Costos Estimados

### App Platform:
- **Básico:** $5/mes (512 MB RAM) - Desarrollo/Testing
- **Professional:** $12/mes (1 GB RAM) - Producción pequeña
- **Professional:** $24/mes (2 GB RAM) - Producción mediana

### Droplet:
- **Basic:** $6/mes (1 GB RAM) - Desarrollo
- **Basic:** $12/mes (2 GB RAM) - Producción pequeña
- **Basic:** $24/mes (4 GB RAM) - Producción mediana

**Nota:** Los costos no incluyen base de datos (NeonDB), Redis (Upstash) u otros servicios externos.

---

## ✅ Checklist Post-Deploy

Para una lista completa de verificación post-deployment, consulta el [Checklist de Deployment](./DEPLOY_CHECKLIST.md).

### Checklist Rápido:

- [ ] Aplicación accesible en producción
- [ ] Variables de entorno configuradas
- [ ] Base de datos seed ejecutado
- [ ] Webhooks de Mux configurados
- [ ] Webhooks de Stripe configurados
- [ ] Webhooks de Clerk configurados
- [ ] SSL funcionando (en Droplet)
- [ ] Health checks funcionando
- [ ] Logs accesibles y funcionando
- [ ] Monitoreo configurado (Sentry)

---

## 📚 Recursos Adicionales

### Documentación del Proyecto
- [**Quick Start Guide**](./DEPLOY_QUICK_START.md) - Guía rápida de 5 minutos
- [**Checklist de Deployment**](./DEPLOY_CHECKLIST.md) - Checklist completo pre y post-deployment
- [**Scripts de Deployment**](./scripts/) - Scripts automatizados para facilitar el proceso

### Documentación Externa
- [Documentación de DigitalOcean App Platform](https://docs.digitalocean.com/products/app-platform/)
- [Documentación de Next.js Deployment](https://nextjs.org/docs/deployment)
- [Guía de Nginx Reverse Proxy](https://www.nginx.com/blog/nginx-reverse-proxy/)

---

## 🛠️ Archivos de Deployment Incluidos

Este repositorio incluye los siguientes archivos para facilitar el deployment:

- **`app.yaml`** - Configuración para DigitalOcean App Platform
- **`Dockerfile`** - Imagen Docker para deployment en Droplet
- **`docker-compose.yml`** - Orquestación de contenedores Docker
- **`ecosystem.config.js`** - Configuración de PM2 para gestión de procesos
- **`scripts/deploy-digitalocean.sh`** - Script automatizado para App Platform
- **`scripts/deploy-droplet.sh`** - Script automatizado para Droplet

---

¡Felicitaciones! 🎉 Tu aplicación está desplegada en DigitalOcean. Si tienes problemas, consulta la sección de Troubleshooting o los logs de la aplicación.

