#!/bin/bash

# ============================================
# Script de Deployment para DigitalOcean Droplet
# ============================================
# Este script ayuda a automatizar el proceso
# de deployment en un Droplet usando Docker
# ============================================

set -e  # Salir si hay algún error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Script de Deployment para DigitalOcean Droplet${NC}\n"

# Variables de configuración (ajusta según tu setup)
DROPLET_IP=""
DROPLET_USER="root"
APP_DIR="/var/www/newtube"
REMOTE_REPO="https://github.com/tu-usuario/tu-repositorio.git"

# Solicitar IP del Droplet si no está configurada
if [ -z "$DROPLET_IP" ]; then
    read -p "Ingresa la IP del Droplet: " DROPLET_IP
fi

# Verificar conectividad con el Droplet
echo -e "${GREEN}🔍 Verificando conectividad con el Droplet...${NC}"
if ! ssh -o ConnectTimeout=5 $DROPLET_USER@$DROPLET_IP "echo 'Conexión exitosa'" 2>/dev/null; then
    echo -e "${RED}❌ Error: No se pudo conectar al Droplet${NC}"
    echo "Verifica:"
    echo "1. Que la IP sea correcta: $DROPLET_IP"
    echo "2. Que tu clave SSH esté configurada"
    echo "3. Que el firewall permita conexiones SSH"
    exit 1
fi

echo -e "${GREEN}✅ Conexión exitosa${NC}\n"

# Función para ejecutar comandos en el Droplet
run_remote() {
    ssh $DROPLET_USER@$DROPLET_IP "$1"
}

# Verificar si Docker está instalado
echo -e "${GREEN}🐳 Verificando Docker...${NC}"
if ! run_remote "command -v docker &> /dev/null"; then
    echo -e "${YELLOW}⚠️  Docker no está instalado. Instalando...${NC}"
    run_remote "curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh"
fi
echo -e "${GREEN}✅ Docker instalado${NC}\n"

# Verificar si Docker Compose está instalado
echo -e "${GREEN}🐳 Verificando Docker Compose...${NC}"
if ! run_remote "command -v docker-compose &> /dev/null"; then
    echo -e "${YELLOW}⚠️  Docker Compose no está instalado. Instalando...${NC}"
    run_remote "apt-get update && apt-get install -y docker-compose"
fi
echo -e "${GREEN}✅ Docker Compose instalado${NC}\n"

# Crear directorio de la aplicación si no existe
echo -e "${GREEN}📁 Creando directorio de la aplicación...${NC}"
run_remote "mkdir -p $APP_DIR"
echo -e "${GREEN}✅ Directorio creado${NC}\n"

# Clonar o actualizar el repositorio
echo -e "${GREEN}📥 Actualizando código...${NC}"
if run_remote "[ -d $APP_DIR/.git ]"; then
    echo -e "${YELLOW}📂 Repositorio ya existe, actualizando...${NC}"
    run_remote "cd $APP_DIR && git pull origin main"
else
    echo -e "${YELLOW}📥 Clonando repositorio...${NC}"
    run_remote "cd $(dirname $APP_DIR) && git clone $REMOTE_REPO $(basename $APP_DIR)"
fi
echo -e "${GREEN}✅ Código actualizado${NC}\n"

# Verificar que existe .env.production
echo -e "${GREEN}🔐 Verificando archivo .env.production...${NC}"
if ! run_remote "[ -f $APP_DIR/.env.production ]"; then
    echo -e "${RED}❌ Error: No se encontró .env.production${NC}"
    echo "Por favor, crea el archivo .env.production en el servidor con todas las variables de entorno"
    exit 1
fi
echo -e "${GREEN}✅ Archivo .env.production encontrado${NC}\n"

# Construir y levantar los contenedores
echo -e "${GREEN}🔨 Construyendo y levantando contenedores...${NC}"
run_remote "cd $APP_DIR && docker-compose down && docker-compose build --no-cache && docker-compose up -d"
echo -e "${GREEN}✅ Contenedores levantados${NC}\n"

# Verificar que los contenedores están corriendo
echo -e "${GREEN}🔍 Verificando estado de los contenedores...${NC}"
run_remote "cd $APP_DIR && docker-compose ps"
echo ""

# Mostrar logs
echo -e "${GREEN}📋 Logs recientes:${NC}"
run_remote "cd $APP_DIR && docker-compose logs --tail=50"
echo ""

echo -e "${GREEN}✅ Deployment completado${NC}\n"
echo -e "${YELLOW}📋 Próximos pasos:${NC}"
echo "1. Verifica que la aplicación esté corriendo: ssh $DROPLET_USER@$DROPLET_IP 'cd $APP_DIR && docker-compose ps'"
echo "2. Revisa los logs: ssh $DROPLET_USER@$DROPLET_IP 'cd $APP_DIR && docker-compose logs -f'"
echo "3. Verifica que Nginx esté configurado y funcionando"
echo "4. Verifica que SSL esté configurado con Let's Encrypt"
echo ""
echo -e "${GREEN}¡Deployment completado! 🚀${NC}"

