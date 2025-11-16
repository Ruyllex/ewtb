#!/bin/bash

# ============================================
# Script de Deployment para DigitalOcean
# ============================================
# Este script ayuda a automatizar el proceso
# de deployment en DigitalOcean App Platform
# ============================================

set -e  # Salir si hay algún error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Iniciando proceso de deployment para DigitalOcean${NC}\n"

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: No se encontró package.json${NC}"
    echo "Por favor, ejecuta este script desde la raíz del proyecto"
    exit 1
fi

# Verificar que Git está configurado
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Error: Git no está instalado${NC}"
    exit 1
fi

# Verificar que estamos en la rama correcta
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo -e "${YELLOW} branch actual: ${CURRENT_BRANCH}${NC}"

if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
    echo -e "${YELLOW}⚠️  Advertencia: No estás en la rama main/master${NC}"
    read -p "¿Continuar de todas formas? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Verificar que no hay cambios sin commitear
if ! git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}⚠️  Hay cambios sin commitear${NC}"
    git status
    read -p "¿Deseas commitear antes de hacer push? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add .
        read -p "Mensaje del commit: " commit_message
        git commit -m "$commit_message"
    fi
fi

# Verificar que el build funciona
echo -e "\n${GREEN}🔨 Verificando que el build funciona...${NC}"
if npm run build; then
    echo -e "${GREEN}✅ Build exitoso${NC}\n"
else
    echo -e "${RED}❌ Error: El build falló${NC}"
    echo "Por favor, corrige los errores antes de hacer deploy"
    exit 1
fi

# Verificar que no hay archivos .env en el repositorio
if git ls-files | grep -q "\.env"; then
    echo -e "${RED}❌ Error: Se encontraron archivos .env en el repositorio${NC}"
    echo "Por favor, asegúrate de que están en .gitignore"
    exit 1
fi

# Hacer push a la rama remota
echo -e "${GREEN}📤 Haciendo push a GitHub...${NC}"
read -p "¿Deseas hacer push ahora? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git push origin $CURRENT_BRANCH
    echo -e "${GREEN}✅ Push completado${NC}\n"
else
    echo -e "${YELLOW}⚠️  Push cancelado. Hazlo manualmente antes del deploy.${NC}\n"
fi

# Resumen final
echo -e "${GREEN}✅ Proceso de pre-deployment completado${NC}\n"
echo -e "${YELLOW}📋 Próximos pasos:${NC}"
echo "1. Ve a DigitalOcean App Platform"
echo "2. Si es la primera vez, crea una nueva App y conecta tu repositorio"
echo "3. Si ya existe la App, el deploy se iniciará automáticamente después del push"
echo "4. Verifica que todas las variables de entorno estén configuradas"
echo "5. Revisa el checklist en DEPLOY_CHECKLIST.md"
echo ""
echo -e "${GREEN}¡Buena suerte con el deployment! 🚀${NC}"

