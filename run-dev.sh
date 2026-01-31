#!/bin/sh
# Script para ejecutar LegoMaster con pnpm en Docker

# Explicación de cada parámetro de Docker:
#
# docker run          - Crea y ejecuta un nuevo contenedor
# -it                 - Modo interactivo con terminal (para ver logs y poder detener con Ctrl+C)
# --rm                - Elimina el contenedor automáticamente al salir (no deja basura)
# -v "$(pwd):/app"    - Monta la carpeta actual (LegoMaster) dentro del contenedor en /app
#                       $(pwd) = Print Working Directory (tu carpeta actual)
# -w /app             - Establece /app como directorio de trabajo dentro del contenedor
# -p 5173:5173        - Mapea el puerto 5173 del contenedor al puerto 5173 de tu máquina
#                       Formato: puerto_local:puerto_contenedor
# node:24-alpine      - Imagen de Docker a usar (Node.js v24 en Alpine Linux, muy ligera)

echo "🚀 Iniciando LegoMaster con pnpm en Docker..."
echo ""

# Deshabilitar la conversión de rutas de Git Bash
# MSYS_NO_PATHCONV=1 evita que /app se convierta a C:/Program Files/Git/app
export MSYS_NO_PATHCONV=1

# PWD en Git Bash: /d/playground/LegoMaster
WORKDIR="${PWD}"

docker run -it --rm \
  -v "${WORKDIR}:/app" \
  -v legomaster_node_modules:/app/node_modules \
  -w /app \
  -p 5173:5173 \
  node:24-alpine sh -c "
    echo '📦 Habilitando pnpm con corepack...' && \
    corepack enable && \
    echo '📥 Instalando dependencias (si es necesario)...' && \
    pnpm install --no-frozen-lockfile && \
    echo '⚡ Iniciando servidor de desarrollo...' && \
    echo '' && \
    echo '🌐 Abre http://localhost:5173 en tu navegador' && \
    echo '⏹️  Presiona Ctrl+C para detener' && \
    echo '' && \
    pnpm exec vite --host
    "

# Explicación del comando sh -c:
#
# corepack enable     - Activa pnpm en Node.js (viene incluido pero deshabilitado)
# pnpm install        - Instala las dependencias del package.json
# pnpm exec vite      - Ejecuta vite directamente (sin pasar por script npm)
# --host              - Hace que Vite acepte conexiones desde cualquier IP
#                       (necesario para acceder desde fuera del contenedor Docker)
