# 🔧 Solución de Errores

**Fecha:** 2026-01-07

---

## ❌ Error 1: TypeScript - "Cannot find module 'react'"

### **Síntomas:**

```
Cannot find module 'react' or its corresponding type declarations.
Cannot find module '@react-three/fiber' or its corresponding type declarations.
JSX element implicitly has type 'any' because no interface 'JSX.IntrinsicElements' exists.
```

### **Causa:**

El IDE (VSCode/Cursor) no encuentra las definiciones de tipos de TypeScript porque:
1. Los `node_modules` no están instalados localmente
2. Estás usando Docker para desarrollo
3. El IDE busca tipos en tu sistema, no en el contenedor

### **Solución:**

**Opción 1: Instalar node_modules localmente (Recomendado)**

```bash
# Esto solo instala las dependencias localmente para que el IDE las vea
# NO afecta cómo se ejecuta la aplicación (que sigue usando Docker)
npm install

# O si tienes pnpm instalado:
pnpm install
```

**Después de ejecutar esto:**
- ✅ Los errores de TypeScript en el IDE desaparecerán
- ✅ Tendrás autocomplete completo
- ✅ El IDE podrá hacer type checking
- ⚠️ Ocuparás ~500MB de espacio en disco (node_modules)

**Opción 2: Ignorar los errores del IDE**

Si no quieres instalar node_modules localmente:
- Los errores en el IDE son **solo visuales**
- **NO afectarán** la ejecución de la aplicación
- La aplicación compilará y correrá perfectamente en Docker
- Solo perderás autocomplete y type checking en el IDE

**Opción 3: Configurar VSCode para usar Docker**

Instalar la extensión "Dev Containers" y desarrollar dentro del contenedor.

---

## ✅ Solución Implementada: Mejorar run-dev.sh

### **Cambios realizados:**

El script `run-dev.sh` ahora incluye:

1. **Logs más visibles:**
   ```
   ╔════════════════════════════════════════════════════════╗
   ║  🌐  Servidor: http://localhost:5173                  ║
   ║  🔧  HMR habilitado - cambios en tiempo real          ║
   ║  📊  Logs en tiempo real visibles abajo               ║
   ║  ⏹️   Ctrl+C para detener                             ║
   ╚════════════════════════════════════════════════════════╝
   ```

2. **Opciones de Vite mejoradas:**
   - `--clearScreen false` - NO limpia la pantalla, mantiene historial de logs
   - `--logLevel info` - Muestra logs informativos detallados
   - Verás cada request HTTP, HMR updates, etc.

3. **Instalación menos invasiva:**
   - `--reporter=append-only` - Progreso de instalación sin limpiar pantalla

### **Logs que verás ahora:**

```bash
🚀 Iniciando LegoMaster con pnpm en Docker...

📦 Habilitando pnpm con corepack...
✅ Prepared pnpm

📥 Instalando dependencias (si es necesario)...
Already up to date
Done in 2.1s

⚡ Iniciando servidor de desarrollo...

╔════════════════════════════════════════════════════════╗
║  🌐  Servidor: http://localhost:5173                  ║
║  🔧  HMR habilitado - cambios en tiempo real          ║
║  📊  Logs en tiempo real visibles abajo               ║
║  ⏹️   Ctrl+C para detener                             ║
╚════════════════════════════════════════════════════════╝

  VITE v5.2.9  ready in 523 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://172.17.0.2:5173/
  ➜  press h + enter to show help

  12:34:56 PM [vite] hmr update /src/App.tsx
  12:35:12 PM [vite] page reload /src/main.tsx
```

---

## 🚀 Cómo Usar el Script Mejorado

### **Ejecutar:**

```bash
# Desde Git Bash en Windows:
./run-dev.sh

# Desde terminal en Linux/Mac:
sh run-dev.sh
```

### **Lo que verás:**

1. **Inicio del contenedor** con logs descriptivos
2. **Instalación de dependencias** (solo si es necesario)
3. **Banner informativo** con instrucciones
4. **Logs de Vite en tiempo real:**
   - Cada archivo que se compila
   - Cada cambio detectado (HMR)
   - Cada request HTTP
   - Errores de TypeScript/ESLint

### **Ejemplo de sesión completa:**

```bash
$ ./run-dev.sh
🚀 Iniciando LegoMaster con pnpm en Docker...

📦 Habilitando pnpm con corepack...
✅ pnpm habilitado

📥 Instalando dependencias (si es necesario)...
Lockfile is up to date, resolution step is skipped
Already up to date
Done in 1.2s

⚡ Iniciando servidor de desarrollo...

╔════════════════════════════════════════════════════════╗
║  🌐  Servidor: http://localhost:5173                  ║
║  🔧  HMR habilitado - cambios en tiempo real          ║
║  📊  Logs en tiempo real visibles abajo               ║
║  ⏹️   Ctrl+C para detener                             ║
╚════════════════════════════════════════════════════════╝

  VITE v5.2.9  ready in 523 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://172.17.0.2:5173/

  ready in 523 ms.

# Ahora editas un archivo...
  12:34:56 PM [vite] hmr update /src/components/MainInterface.tsx

# Guardas otro archivo...
  12:35:12 PM [vite] hmr update /src/core/CodeInterpreter.ts

# Si hay un error...
  12:36:00 PM [vite] Error: Missing semicolon
    at /app/src/App.tsx:15:3
```

---

## 📊 Comandos Útiles Durante Desarrollo

### **Ver logs detallados de build:**

Vite ya muestra todo automáticamente con `--logLevel info`

### **Ver errores de TypeScript en la terminal:**

```bash
# En otra terminal, mientras el servidor corre:
docker exec -it $(docker ps -q --filter ancestor=node:24-alpine) sh -c "cd /app && pnpm exec tsc --noEmit"
```

### **Ver tamaño del bundle:**

```bash
docker exec -it $(docker ps -q --filter ancestor=node:24-alpine) sh -c "cd /app && pnpm exec vite build --logLevel info"
```

---

## 🎯 Checklist de Verificación

Para confirmar que todo funciona:

- [ ] `./run-dev.sh` ejecuta sin errores
- [ ] Ves el banner con instrucciones
- [ ] Ves "ready in XXX ms"
- [ ] Puedes abrir `http://localhost:5173`
- [ ] Al editar archivos ves logs de HMR
- [ ] La página se actualiza automáticamente

---

## 🐛 Troubleshooting

### **Error: "permission denied: ./run-dev.sh"**

```bash
chmod +x run-dev.sh
```

### **Error: "docker: command not found"**

Instala Docker Desktop desde https://www.docker.com/products/docker-desktop

### **Error: "port 5173 already in use"**

Detén el proceso que usa el puerto:
```bash
# Windows:
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Linux/Mac:
lsof -ti:5173 | xargs kill -9
```

### **Los logs no aparecen**

Verifica que el script tenga las opciones correctas:
```bash
grep "clearScreen false" run-dev.sh
# Debería encontrar la línea
```

---

## ✅ Resumen

### **Problema 1: Errores de TypeScript en el IDE**
- **Solución:** `npm install` localmente (opcional)
- **Alternativa:** Ignorar errores, no afectan ejecución

### **Problema 2: Logs no visibles**
- **Solución:** Script `run-dev.sh` actualizado
- **Nuevas opciones:** `--clearScreen false --logLevel info`
- **Resultado:** Logs detallados en tiempo real

---

**Última actualización:** 2026-01-07
