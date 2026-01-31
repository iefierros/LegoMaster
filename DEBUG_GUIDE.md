# 🔍 LegoMaster - Guía de Debugging

## 📋 Logs que verás en la consola del navegador

### **Al cargar un robot:**

```
🔧 Starting physics initialization...
🔍 Checking bodyApi: { hasAt: true, hasBody: true, type: "object" }
⏰ Timeout fired, checking for body...
✅ bodyApi.at exists
📍 Position subscription triggered: [0, 0.1, -0.5]
🎯 Attempting to get body: { hasBody: true, hasCurrent: true }
✅ Physics body obtained: Body {...}
⚙️ Motor A initialized with chassis body: { mass: 0.5, position: ..., wheelPosition: ..., motorSide: "left" }
⚙️ Motor B initialized with chassis body: { mass: 0.5, position: ..., wheelPosition: ..., motorSide: "right" }
✅ Motors initialized: 2
```

### **Al ejecutar código Python:**

```
🚀 Starting code execution...
✅ Robot API available: { motor: true, sensor: true, wait: true, print: true }
🐍 Starting Python execution...
Code to execute: # SPIKE Prime / EV3 API Wrapper
import time
...
🚗 Motor.run(A, 50)
🎮 Motor A.setSpeed(50): { clamped: 50, targetVelocity: 9.16, maxVelocity: 18.33, isRunning: true, hasBody: true }
🚗 Motor.run(B, 50)
🎮 Motor B.setSpeed(50): { clamped: 50, targetVelocity: 9.16, maxVelocity: 18.33, isRunning: true, hasBody: true }
✅ Python execution completed successfully
```

### **Durante la simulación (cada 100ms):**

```
🔧 Motor A update: {
  targetVel: "9.16",
  currentVel: "1.23",
  force: "[0.15, -0.45]",
  bodyVel: "[0.01, 0.03]",
  bodyPos: "[0.00, -0.50]"
}
🔧 Motor B update: {Ñ
  targetVel: "9.16",
  currentVel: "1.20",
  force: "[0.14, -0.44]",
  bodyVel: "[0.01, 0.03]",
  bodyPos: "[0.00, -0.50]"
}
```

---

## 🐛 Problemas comunes y soluciones

### **Problema 1: "Robot API not initialized"**

**Síntoma:**
```
❌ Error: Robot API not initialized. Please load a robot model first.
```

**Causa:** El robot no se ha cargado o la inicialización de physics falló.

**Solución:**
1. Espera 1-2 segundos después de cargar el robot
2. Verifica en consola que veas: `✅ Motors initialized: 2`
3. Si no aparece, recarga la página y vuelve a cargar el robot

---

### **Problema 2: Motor no mueve el robot**

**Síntoma:**
```
⏸️ Motor A: Not running
```

**Debugging:**

1. **Verifica que el motor tenga chassis body:**
   ```
   ⚙️ Motor A initialized with chassis body: { mass: 0.5, ... }
   ```

2. **Verifica que se llame setSpeed:**
   ```
   🎮 Motor A.setSpeed(50): { hasBody: true }
   ```

3. **Verifica que update() aplique fuerzas:**
   ```
   🔧 Motor A update: { force: "[0.15, -0.45]", ... }
   ```

4. **Si force es [0.00, 0.00]:** El motor no está generando fuerza
   - Revisa `stallTorque` (debería ser > 0)
   - Revisa `currentVelocity` (debería aumentar)

---

### **Problema 3: Errores de Python no se muestran**

**Síntoma:** El código falla pero no ves el error.

**Solución:**
1. Abre la consola del navegador (F12)
2. Busca líneas que empiecen con `❌ Python execution error:`
3. El error completo estará ahí con el traceback

**Ejemplo:**
```
❌ Python execution error: NameError: name 'motor_invalido' is not defined on line 5
```

---

## 🧪 Código de prueba para debugging

### **Test 1: Verificar API básica**

```python
# Debe imprimir en consola y en output
print_robot("Test 1: API funciona")

# Debe mostrar en logs de consola
motor_a = Motor('A')
print_robot("Motor creado")
```

**Logs esperados:**
```
🐍 Starting Python execution...
[Robot]: Test 1: API funciona
[Robot]: Motor creado
✅ Python execution completed successfully
```

---

### **Test 2: Verificar motores**

```python
motor_a = Motor('A')
motor_b = Motor('B')

print_robot("Activando motores...")
motor_a.run(50)
motor_b.run(50)

wait(2000)

motor_a.stop()
motor_b.stop()
print_robot("Motores detenidos")
```

**Logs esperados:**
```
🚗 Motor.run(A, 50)
🎮 Motor A.setSpeed(50): { isRunning: true, hasBody: true }
🔧 Motor A update: { targetVel: "9.16", currentVel: "1.23", force: "[0.15, -0.45]" }
```

**Si ves fuerza [0.00, 0.00]:** Problema con cálculo de física.

---

### **Test 3: Provocar error intencional**

```python
# Esto debe mostrar error claro
variable_inexistente.metodo()
```

**Logs esperados:**
```
❌ Python execution error: NameError: name 'variable_inexistente' is not defined
Line 2
```

---

## 📊 Métricas normales de física

### **Valores típicos del motor:**

- **maxRPM:** 175 (SPIKE Large)
- **stallTorque:** 0.25 Nm
- **maxAngularVelocity:** 18.33 rad/s
- **wheelRadius:** 0.028 m (28mm)

### **Cálculo de fuerza:**

```
F = (τ / r) × (currentVel / maxVel)
F = (0.25 / 0.028) × (velocidad normalizada)
F ≈ 8.93 × factor
```

**Fuerza normal al 50% velocidad:** ~4.5 N por motor

### **Valores de chassis:**

- **mass:** 0.3 - 1.0 kg (depende de piezas)
- **friction:** 0.9
- **linearDamping:** 0.3
- **angularDamping:** 0.3

---

## 🔬 Cómo verificar que la física funciona

### **1. Robot debe caer por gravedad:**
- Quita el plano del piso temporalmente
- El robot debe caer (position.y disminuye)

### **2. Motores deben generar velocidad:**
```
🔧 Motor A update: { currentVel: "0.00" -> "1.23" -> "3.45" -> ... }
```
La velocidad debe **aumentar gradualmente** hasta alcanzar targetVel.

### **3. Chassis debe moverse:**
```
🔧 Motor A update: {
  bodyPos: "[0.00, -0.50]" -> "[0.01, -0.50]" -> "[0.05, -0.50]"
}
```
La posición X o Z debe cambiar cuando los motores están activos.

---

## 🚨 Si nada funciona:

### **Checklist completo:**

1. ✅ Dependencias instaladas: `pnpm install`
2. ✅ Servidor corriendo: `pnpm dev`
3. ✅ Skulpt cargado (verifica en Network tab de DevTools)
4. ✅ Robot cargado (verifica `✅ Motors initialized`)
5. ✅ Physics body existe (verifica `hasBody: true`)
6. ✅ Update loop corre (verifica logs cada 100ms)
7. ✅ Fuerzas se aplican (verifica `force: [...]`)

### **Último recurso:**

```javascript
// Pega esto en la consola del navegador:
console.log('Debug Info:', {
  hasRobotAPI: !!window.robotAPI,
  hasMotors: window.robotAPI?.motor,
  hasSkulpt: !!window.Sk
});
```

Deberías ver:
```
Debug Info: {
  hasRobotAPI: true,
  hasMotors: { run: ƒ, stop: ƒ, ... },
  hasSkulpt: true
}
```

---

## 📞 Información adicional

- **Repo:** LegoMaster - FLL Simulator
- **Tech Stack:** React + Three.js + Cannon.js + Skulpt
- **Physics Engine:** Cannon-es (fork de Cannon.js)
- **Python Interpreter:** Skulpt 1.2.0

**Última actualización:** 2026-01-07
