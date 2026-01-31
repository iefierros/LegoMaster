# 🔍 Troubleshooting: Robot Initialization Issues

**Problema:** El indicador se queda en "Initializing..." indefinidamente

---

## 🧪 Diagnóstico Paso a Paso

### **Paso 1: Verificar que el servidor está corriendo**

```bash
# En la terminal:
npm run dev
# o
pnpm dev
```

**Esperado:** Servidor corriendo en `http://localhost:5173`

---

### **Paso 2: Abrir consola del navegador**

1. Abrir `http://localhost:5173`
2. Presionar **F12** (Windows/Linux) o **Cmd+Option+I** (Mac)
3. Ir a la pestaña **Console**

---

### **Paso 3: Hacer clic en "Test Robot"**

**Logs esperados en orden:**

```javascript
// 1. Generación del modelo
🧪 Generating test robot...
✅ Test model generated: { parts: Array(5), metadata: {...} }

// 2. Rigging del robot
🤖 Starting robot rigging for: Minimal Test Robot
📦 Total parts to process: 5
🏷️ Categorized parts: { motors: 2, wheels: 2, sensors: 0, structural: 1 }
⚠️ No sensors detected! Sensor functions will not work.
💡 Tip: Add sensors to your robot design.
🔧 Detected wheel axles: 1
⚙️ Created motor joints: 2
👁️ Configured sensors: 0
🏗️ Built chassis: { mass: "0.035 kg", ... }
🎨 Created visual mesh with X children
✅ Robot rigging complete!

// 3. Inicialización de física
🔧 useEffect triggered for physics initialization
📊 Current state: {
  motorsInitialized: false,
  hasRiggedData: true,
  motorJoints: 2,
  sensors: 0
}
🔧 Starting physics initialization...
🔍 Checking bodyApi: { hasAt: true, hasBody: true, type: "object" }
⏰ Initialization attempt 1/10...
✅ bodyApi.at exists
📍 Position subscription triggered: [0, 0.1, 0]
🎯 Attempting to get body: { hasBody: true, hasCurrent: true }
✅ Physics body obtained: Body { ... }
⚙️ Motor A initialized with chassis body: { mass: 0.035, ... }
⚙️ Motor B initialized with chassis body: { mass: 0.035, ... }
✅ Motors initialized: 2
✅ Robot ready for code execution: RobotInstance { ... }
```

---

## 🐛 Problemas Comunes y Soluciones

### **Problema 1: No aparece nada después de "Test model generated"**

**Síntoma:**
```
✅ Test model generated: { parts: Array(5), metadata: {...} }
(no más logs)
```

**Causa:** Error en el rigging

**Diagnóstico:**
1. Buscar errores en rojo en la consola
2. Verificar que `rigBuilder` esté importado correctamente

**Solución:**
```javascript
// En consola del navegador:
console.log(window.rigBuilder);
// Debería mostrar un objeto, no undefined
```

---

### **Problema 2: Se detiene en "Starting physics initialization"**

**Síntoma:**
```
🔧 Starting physics initialization...
🔍 Checking bodyApi: { hasAt: false, hasBody: false, ... }
```

**Causa:** `useCompoundBody` no creó el physics body

**Diagnóstico:**
```javascript
// En consola del navegador (después de cargar robot):
// Esperar 2 segundos, luego ejecutar:
console.log('Checking Three.js scene...');
// Verificar que el robot esté en la escena 3D
```

**Solución:**
- Recargar la página (F5)
- Intentar nuevamente

---

### **Problema 3: Se queda en "Initialization attempt X/10"**

**Síntoma:**
```
⏰ Initialization attempt 1/10...
⏳ bodyApi.at not ready yet, retrying in 100ms...
⏰ Initialization attempt 2/10...
⏳ bodyApi.at not ready yet, retrying in 200ms...
...
⏰ Initialization attempt 10/10...
❌ Failed to initialize physics after 10 attempts
```

**Causa:** El API de cannon no está exponiendo el body correctamente

**Diagnóstico:**
```javascript
// En consola del navegador:
console.log('Checking cannon setup...');
// Verificar versión de @react-three/cannon
```

**Posibles causas:**
1. Versión incompatible de `@react-three/cannon`
2. Versión incompatible de `cannon-es`
3. Conflicto entre dependencias

**Solución:**
```bash
# En terminal:
npm list @react-three/cannon cannon-es three
# Verificar versiones

# Si hay problemas:
rm -rf node_modules package-lock.json
npm install
```

---

### **Problema 4: "Position subscription triggered" pero no continúa**

**Síntoma:**
```
📍 Position subscription triggered: [0, 0.1, 0]
🎯 Attempting to get body: { hasBody: false, hasCurrent: false }
⏳ Body not ready yet, retrying...
```

**Causa:** El body existe pero `.current` no está disponible

**Diagnóstico:**
Agregar log temporal:

```typescript
// En SimulatedRobot.tsx, línea ~116:
const body = (bodyApi as any).body;
console.log('🔎 DETAILED BODY CHECK:', {
  body: body,
  bodyType: typeof body,
  hasCurrent: body ? !!body.current : false,
  bodyKeys: body ? Object.keys(body) : []
});
```

**Solución:**
- Verificar que `useCompoundBody` retorna un ref válido
- Revisar documentación de `@react-three/cannon` para versión específica

---

### **Problema 5: "Motors initialized" pero indicador sigue en amarillo**

**Síntoma:**
```
✅ Motors initialized: 2
✅ Robot ready for code execution: RobotInstance { ... }
(pero indicador sigue en 🟡 Initializing...)
```

**Causa:** El callback `onRobotReady` no está actualizando el estado

**Diagnóstico:**
```javascript
// En consola del navegador:
console.log('Checking robot ready callback...');
window.addEventListener('robot-ready-test', () => {
  console.log('Callback works!');
});
```

**Solución:**
1. Verificar que `handleRobotReady` en `MainInterface.tsx` se ejecuta
2. Agregar log temporal:

```typescript
// En MainInterface.tsx, línea ~54:
const handleRobotReady = useCallback((robot: RobotInstance) => {
  console.log('🎯 handleRobotReady CALLED!'); // <- AGREGAR ESTO
  robotInstanceRef.current = robot;
  setIsRobotReady(true);
  console.log('✅ Robot ready for code execution:', robot);
  toast.success('Robot ready! You can now run code.', { icon: '🤖' });
}, []);
```

---

## 🔬 Tests Manuales Detallados

### **Test 1: Verificar generación del modelo**

```javascript
// En consola del navegador:
import { TestRobotGenerator } from './utils/TestRobotGenerator';
const model = TestRobotGenerator.generateMinimalRobot();
console.log('Model:', model);
console.log('Parts:', model.parts.length); // Debería ser 5
console.log('Motor parts:', model.parts.filter(p => p.partId === '54696').length); // Debería ser 2
console.log('Wheel parts:', model.parts.filter(p => p.partId === '56908').length); // Debería ser 2
```

**Esperado:**
```
Parts: 5
Motor parts: 2
Wheel parts: 2
```

---

### **Test 2: Verificar rigging**

```javascript
// En consola del navegador (después de cargar test robot):
// Esperar a que aparezca "Robot rigging complete"
// Luego ejecutar:
console.log('Checking rigged robot state...');
// Debería mostrar objeto con motorJoints, chassis, etc.
```

---

### **Test 3: Verificar Robot API global**

```javascript
// En consola del navegador (después de ver "Motors initialized"):
console.log('Robot API:', {
  exists: !!window.robotAPI,
  motor: window.robotAPI?.motor,
  sensor: window.robotAPI?.sensor,
  wait: typeof window.robotAPI?.wait,
  print: typeof window.robotAPI?.print
});
```

**Esperado:**
```javascript
{
  exists: true,
  motor: { run: ƒ, stop: ƒ, runForRotations: ƒ, ... },
  sensor: { color: ƒ, ultrasonic: ƒ, ... },
  wait: "function",
  print: "function"
}
```

---

## 📊 Métricas de Tiempo Normal

| Etapa | Tiempo esperado |
|-------|----------------|
| Generar modelo | < 50ms |
| Rigging | 100-200ms |
| Crear physics body | 200-500ms |
| Primera suscripción | 100-300ms |
| Obtener body.current | 100-500ms |
| Inicializar motores | 50-100ms |
| **Total** | **~1-2 segundos** |

Si toma más de **5 segundos**, hay un problema.

---

## 🚨 Si Nada Funciona

### **Último recurso: Verificación completa**

1. **Limpiar caché del navegador:**
   - Ctrl+Shift+Delete (Chrome/Edge)
   - Seleccionar "Cached images and files"
   - Click "Clear data"

2. **Limpiar node_modules:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Verificar versiones de dependencias:**
   ```bash
   npm list three @react-three/fiber @react-three/cannon cannon-es
   ```

4. **Verificar que Skulpt está cargado:**
   ```javascript
   // En consola del navegador:
   console.log('Skulpt:', typeof window.Sk);
   // Debería mostrar: "object"
   ```

5. **Crear issue con logs:**
   - Copiar TODOS los logs de la consola
   - Incluir versión de navegador
   - Incluir versiones de dependencias
   - Reportar en GitHub

---

## 📝 Template para Reportar Problemas

```markdown
### Problema
(Descripción breve: ej. "Se queda en Initializing...")

### Logs de consola
```
(Pegar TODOS los logs desde que se hizo click en Test Robot)
```

### Información del sistema
- Navegador: (Chrome 120, Firefox 119, etc.)
- OS: (Windows 11, macOS 14, etc.)
- Node version: `node -v`
- Dependencias:
```
npm list three @react-three/fiber @react-three/cannon cannon-es
```

### Pasos para reproducir
1. Abrir aplicación
2. Click en "Test Robot"
3. ...
```

---

## ✅ Checklist de Verificación

Antes de reportar un problema, verificar:

- [ ] Servidor corriendo correctamente
- [ ] Consola del navegador abierta (F12)
- [ ] Sin errores en rojo en consola
- [ ] `window.Sk` existe (Skulpt cargado)
- [ ] Esperaste al menos 5 segundos
- [ ] Probaste recargar la página (F5)
- [ ] Probaste limpiar caché del navegador
- [ ] Node modules instalados (`npm install`)

---

**Última actualización:** 2026-01-07
**Versión:** 1.2.0-physics-fix
