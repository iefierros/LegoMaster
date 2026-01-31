#!/bin/sh
# Script para ejecutar pruebas de LegoMaster con Vitest en Docker

echo "🚀 Iniciando pruebas con Vitest"
echo ""

# Deshabilitar la conversión de rutas de Git Bash
export MSYS_NO_PATHCONV=1

docker exec -it stupefied_shirley sh -c "
    echo '📦 Ejecutando Vitest...' && \
    npx vitest run && \
    echo ''
    "
