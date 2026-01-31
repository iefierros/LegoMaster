# 🐛 Debug Console Commands

**Para ejecutar en la consola del navegador (F12)**

---

## 🎯 Comandos Rápidos de Diagnóstico

### **1. Verificar estado general**

```javascript
console.log('=== ESTADO GENERAL ===');
console.log('Robot API existe:', !!window.robotAPI);
console.log('Skulpt cargado:', typeof window.Sk);
console.log('React dev tools:', typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__);
```

### **2. Verificar Robot API completo**

```javascript
if (window.robotAPI) {
  console.log('=== ROBOT API ===');
  console.log('Motor API:', Object.keys(window.robotAPI.motor));
  console.log('Sensor API:', Object.keys(window.robotAPI.sensor));
  console.log('Wait function:', typeof window.robotAPI.wait);
  console.log('Print function:', typeof window.robotAPI.print);
} else {
  console.error('❌ Robot API NO EXISTE - Robot no está inicializado');
}
```

### **3. Probar motor manualmente**

```javascript
// Solo ejecutar después de que el indicador esté en verde (Ready)
if (window.robotAPI) {
  console.log('🧪 Probando motor A...');
  window.robotAPI.motor.run('A', 50);

  setTimeout(() => {
    console.log('🛑 Deteniendo motor A...');
    window.robotAPI.motor.stop('A');
  }, 2000);
} else {
  console.error('❌ Robot API no disponible');
}
```

### **4. Ver estado de motores**

```javascript
if (window.robotAPI) {
  console.log('=== ESTADO DE MOTORES ===');
  console.log('Motor A angle:', window.robotAPI.motor.getAngle('A'));
  console.log('Motor A speed:', window.robotAPI.motor.getSpeed('A'));
  console.log('Motor B angle:', window.robotAPI.motor.getAngle('B'));
  console.log('Motor B speed:', window.robotAPI.motor.getSpeed('B'));
}
```

### **5. Ejecutar código Python manualmente**

```javascript
// Solo ejecutar después de que el indicador esté en verde
const testCode = `
motor_a = Motor('A')
motor_b = Motor('B')

print_robot("Test manual iniciado")
motor_a.run(50)
motor_b.run(50)
wait(1000)
motor_a.stop()
motor_b.stop()
print_robot("Test manual completado")
`;

// Ejecutar
if (window.Sk && window.robotAPI) {
  console.log('🐍 Ejecutando código Python de prueba...');
  eval(`
    (async () => {
      try {
        const result = await window.codeInterpreter.executePython(testCode);
        console.log('✅ Resultado:', result);
      } catch (error) {
        console.error('❌ Error:', error);
      }
    })();
  `);
} else {
  console.error('❌ Skulpt o Robot API no disponibles');
}
```

---

## 🔍 Comandos de Debugging Avanzado

### **6. Inspeccionar Three.js scene**

```javascript
// Ver todos los objetos en la escena 3D
console.log('=== THREE.JS SCENE ===');
// Buscar el canvas
const canvas = document.querySelector('canvas');
if (canvas) {
  console.log('✅ Canvas encontrado:', canvas);
  // El scene debería estar accesible via React DevTools
} else {
  console.error('❌ Canvas no encontrado');
}
```

### **7. Forzar inicialización (CUIDADO)**

```javascript
// Solo usar si el robot se quedó atascado
// ADVERTENCIA: Puede causar comportamiento inesperado
console.log('⚠️ Forzando reset de estado...');
window.location.reload();
```

### **8. Ver logs de rigging**

```javascript
// Ejecutar ANTES de cargar el robot
// Intercepta console.log para capturar todo
const originalLog = console.log;
const logs = [];

console.log = function(...args) {
  logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' '));
  originalLog.apply(console, args);
};

// Después de cargar el robot:
console.log('=== LOGS CAPTURADOS ===');
logs.forEach((log, i) => {
  if (log.includes('🤖') || log.includes('✅') || log.includes('❌')) {
    console.log(`${i}: ${log}`);
  }
});

// Restaurar console.log original
console.log = originalLog;
```

### **9. Ver performance metrics**

```javascript
console.log('=== PERFORMANCE ===');
console.log('Memory:', performance.memory);
console.log('Timing:', performance.timing);
console.log('Navigation:', performance.navigation);
```

### **10. Dump completo del estado**

```javascript
const dumpState = () => {
  const state = {
    timestamp: new Date().toISOString(),
    robotAPI: !!window.robotAPI,
    skulpt: typeof window.Sk,
    canvas: !!document.querySelector('canvas'),
    errors: [],
  };

  if (window.robotAPI) {
    state.motorAPI = Object.keys(window.robotAPI.motor);
    state.sensorAPI = Object.keys(window.robotAPI.sensor);

    try {
      state.motorAAngle = window.robotAPI.motor.getAngle('A');
      state.motorBAngle = window.robotAPI.motor.getAngle('B');
    } catch (e) {
      state.errors.push('Error getting motor angles: ' + e.message);
    }
  }

  console.log('=== STATE DUMP ===');
  console.log(JSON.stringify(state, null, 2));

  return state;
};

// Ejecutar:
dumpState();
```

---

## 🧪 Tests de Integración

### **Test completo de motores**

```javascript
const testMotors = async () => {
  if (!window.robotAPI) {
    console.error('❌ Robot API no disponible');
    return;
  }

  console.log('🧪 === TEST DE MOTORES ===');

  // Test 1: Run forward
  console.log('Test 1: Ambos motores hacia adelante (50%)');
  window.robotAPI.motor.run('A', 50);
  window.robotAPI.motor.run('B', 50);
  await window.robotAPI.wait(2000);

  // Test 2: Stop
  console.log('Test 2: Detener ambos motores');
  window.robotAPI.motor.stop('A');
  window.robotAPI.motor.stop('B');
  await window.robotAPI.wait(1000);

  // Test 3: Turn
  console.log('Test 3: Girar (motor A forward, motor B backward)');
  window.robotAPI.motor.run('A', 50);
  window.robotAPI.motor.run('B', -50);
  await window.robotAPI.wait(1000);

  // Test 4: Stop again
  console.log('Test 4: Detener');
  window.robotAPI.motor.stop('A');
  window.robotAPI.motor.stop('B');

  console.log('✅ Test completo!');

  // Ver estado final
  console.log('Estado final:');
  console.log('Motor A:', {
    angle: window.robotAPI.motor.getAngle('A'),
    speed: window.robotAPI.motor.getSpeed('A')
  });
  console.log('Motor B:', {
    angle: window.robotAPI.motor.getAngle('B'),
    speed: window.robotAPI.motor.getSpeed('B')
  });
};

// Ejecutar:
testMotors();
```

### **Test de sensores**

```javascript
const testSensors = () => {
  if (!window.robotAPI) {
    console.error('❌ Robot API no disponible');
    return;
  }

  console.log('🧪 === TEST DE SENSORES ===');

  try {
    const color = window.robotAPI.sensor.color('1');
    console.log('Color sensor (port 1):', color);
  } catch (e) {
    console.log('⚠️ Color sensor no disponible:', e.message);
  }

  try {
    const distance = window.robotAPI.sensor.ultrasonic('2');
    console.log('Ultrasonic sensor (port 2):', distance, 'cm');
  } catch (e) {
    console.log('⚠️ Ultrasonic sensor no disponible:', e.message);
  }

  try {
    const reflectance = window.robotAPI.sensor.reflectance('1');
    console.log('Reflectance:', reflectance, '%');
  } catch (e) {
    console.log('⚠️ Reflectance no disponible:', e.message);
  }
};

// Ejecutar:
testSensors();
```

---

## 📋 Workflow de Debugging Recomendado

### **Cuando el robot se queda en "Initializing...":**

1. **Verificar estado básico:**
   ```javascript
   console.log('Robot API:', !!window.robotAPI);
   console.log('Skulpt:', typeof window.Sk);
   ```

2. **Si Robot API no existe:**
   - Esperar 5 segundos más
   - Recargar página (F5)
   - Revisar logs para ver dónde se detuvo

3. **Si Robot API existe pero indicador sigue amarillo:**
   - Hay un problema con el callback
   - Verificar consola para errores en React

4. **Si nada funciona:**
   - Ejecutar `dumpState()` y copiar resultado
   - Reportar issue con logs completos

---

## 🎨 Helpers Útiles

### **Monitor continuo de estado**

```javascript
// Monitorear estado cada segundo
const monitor = setInterval(() => {
  console.clear();
  console.log('=== MONITOR (cada 1s) ===');
  console.log('Robot API:', !!window.robotAPI);

  if (window.robotAPI) {
    console.log('Motor A:', {
      angle: window.robotAPI.motor.getAngle('A').toFixed(1) + '°',
      speed: window.robotAPI.motor.getSpeed('A').toFixed(1) + ' RPM'
    });
    console.log('Motor B:', {
      angle: window.robotAPI.motor.getAngle('B').toFixed(1) + '°',
      speed: window.robotAPI.motor.getSpeed('B').toFixed(1) + ' RPM'
    });
  }

  console.log('Presiona Ctrl+C para detener monitor');
}, 1000);

// Para detener:
// clearInterval(monitor);
```

### **Capturar todos los errores**

```javascript
window.addEventListener('error', (event) => {
  console.error('🚨 ERROR GLOBAL:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  });
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 PROMISE REJECTION:', {
    reason: event.reason,
    promise: event.promise
  });
});

console.log('✅ Error handlers instalados');
```

---

**Última actualización:** 2026-01-07
