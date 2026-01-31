# Documentacion Tecnica - LegoMaster

**Version:** 1.0.0
**Ultima actualizacion:** 2026-01-16
**Autor:** Equipo de Desarrollo LegoMaster

---

## Tabla de Contenidos

1. [Vision General del Proyecto](#1-vision-general-del-proyecto)
2. [Arquitectura del Sistema](#2-arquitectura-del-sistema)
3. [Estructura de Directorios](#3-estructura-de-directorios)
4. [Stack Tecnologico](#4-stack-tecnologico)
5. [Patrones de Diseno](#5-patrones-de-diseno)
6. [Modelos de Datos (Types)](#6-modelos-de-datos-types)
7. [Flujo de Datos](#7-flujo-de-datos)
8. [Modulos Core](#8-modulos-core)
9. [Sistema de Fisica](#9-sistema-de-fisica)
10. [Interprete Python (Skulpt)](#10-interprete-python-skulpt)
11. [Componentes React](#11-componentes-react)
12. [API del Robot](#12-api-del-robot)
13. [Guia de Desarrollo](#13-guia-de-desarrollo)
14. [Testing](#14-testing)
15. [Troubleshooting](#15-troubleshooting)

---

## 1. Vision General del Proyecto

### 1.1 Proposito

**LegoMaster** es una PWA (Progressive Web App) educativa disenada para competidores de First Lego League (FLL). Permite a los estudiantes:

- Importar modelos de robots desde BrickLink Studio (archivos `.io`)
- Simular el comportamiento fisico del robot en un entorno 3D
- Programar el robot usando Python (similar a SPIKE Prime/EV3)
- Probar misiones FLL sin necesidad de hardware fisico

### 1.2 Objetivos Tecnicos

1. **Simulacion realista** - Fisica basada en CANNON.js para movimiento preciso
2. **Compatibilidad** - Soporte para formatos LDraw/Studio
3. **Programacion educativa** - API Python compatible con SPIKE Prime
4. **Offline-first** - PWA con capacidades offline
5. **Rendimiento** - 60 FPS en hardware moderno

---

## 2. Arquitectura del Sistema

### 2.1 Diagrama de Alto Nivel

```
+----------------------------------------------------------+
|                      PRESENTACION                         |
|  +-------------+  +----------------+  +----------------+  |
|  | MainInterface|  | SimulationScene|  | CodeEditor    |  |
|  +-------------+  +----------------+  +----------------+  |
+----------------------------------------------------------+
                            |
+----------------------------------------------------------+
|                    LOGICA DE NEGOCIO                      |
|  +--------------+  +---------------+  +----------------+  |
|  | CodeInterpreter| | RigBuilder   |  | PartCategorizer|  |
|  +--------------+  +---------------+  +----------------+  |
+----------------------------------------------------------+
                            |
+----------------------------------------------------------+
|                    CAPA DE FISICA                         |
|  +------------------+  +-------------------+              |
|  | VirtualSpikeMotor|  | SensorSimulators  |              |
|  +------------------+  +-------------------+              |
|  +------------------+  +-------------------+              |
|  | PIDController    |  | CANNON.js World   |              |
|  +------------------+  +-------------------+              |
+----------------------------------------------------------+
                            |
+----------------------------------------------------------+
|                    CAPA DE DATOS                          |
|  +---------------+  +----------------+  +---------------+ |
|  | LDrawParser   |  | Supabase Client|  | LocalStorage  | |
|  +---------------+  +----------------+  +---------------+ |
+----------------------------------------------------------+
```

### 2.2 Flujo de Ejecucion Principal

```
Usuario carga .io → LDrawParser → RigBuilder → SimulatedRobot
                                                     ↓
Usuario escribe Python → CodeInterpreter → Skulpt → window.robotAPI
                                                     ↓
                                              VirtualSpikeMotor
                                                     ↓
                                              CANNON.Body (Physics)
                                                     ↓
                                              THREE.Group (Visual)
```

---

## 3. Estructura de Directorios

```
LegoMaster/
├── src/
│   ├── components/          # Componentes React UI
│   │   ├── MainInterface.tsx    # Layout principal
│   │   ├── SimulationScene.tsx  # Canvas 3D con fisica
│   │   ├── SimulatedRobot.tsx   # Robot con fisica
│   │   ├── FLLTrack.tsx         # Tapete de competencia
│   │   ├── CodeEditor.tsx       # Editor Python (Ace)
│   │   ├── SensorPanel.tsx      # Panel de sensores
│   │   └── RobotUploader.tsx    # Upload de archivos
│   │
│   ├── core/                # Logica de negocio
│   │   ├── CodeInterpreter.ts   # Puente Skulpt-Robot
│   │   ├── RigBuilder.ts        # Auto-rigging de robots
│   │   └── PartCategorizer.ts   # Clasificacion de piezas
│   │
│   ├── parsers/             # Parsers de formatos
│   │   └── LDrawParser.ts       # Parser LDraw/Studio
│   │
│   ├── physics/             # Sistema de fisica
│   │   ├── VirtualSpikeMotor.ts # Motor SPIKE simulado
│   │   ├── SensorSimulators.ts  # Simuladores de sensores
│   │   └── PIDController.ts     # Control PID
│   │
│   ├── types/               # TypeScript types
│   │   └── index.ts             # Todas las interfaces
│   │
│   ├── utils/               # Utilidades
│   │   └── TestRobotGenerator.ts # Generador de pruebas
│   │
│   ├── lib/                 # Librerias externas config
│   │   └── supabase.ts          # Cliente Supabase
│   │
│   ├── App.tsx              # Componente raiz
│   ├── main.tsx             # Entry point
│   └── App.css              # Estilos globales
│
├── public/                  # Assets estaticos
├── index.html               # HTML template
├── package.json             # Dependencias
├── vite.config.ts           # Configuracion Vite
├── tailwind.config.js       # Configuracion Tailwind
├── tsconfig.json            # Configuracion TypeScript
└── run-dev.sh               # Script de desarrollo Docker
```

---

## 4. Stack Tecnologico

### 4.1 Dependencias Principales

| Libreria | Version | Proposito |
|----------|---------|-----------|
| React | 18.3.1 | Framework UI |
| Three.js | 0.163.0 | Renderizado 3D |
| @react-three/fiber | 8.16.0 | React bindings para Three.js |
| @react-three/cannon | 6.6.0 | React bindings para CANNON.js |
| cannon-es | 0.20.0 | Motor de fisica |
| Skulpt | 1.2.0 | Interprete Python en browser |
| Vite | 5.2.9 | Build tool |
| TypeScript | 5.4.5 | Type safety |
| Tailwind CSS | 3.4.3 | Estilos |
| Supabase | 2.42.0 | Backend as a Service |

### 4.2 Dependencias de Desarrollo

```json
{
  "@types/react": "^18.3.0",
  "@types/three": "^0.163.0",
  "@typescript-eslint/eslint-plugin": "^7.5.0",
  "vite-plugin-pwa": "^0.19.8"
}
```

---

## 5. Patrones de Diseno

### 5.1 Singleton Pattern

**Uso:** Instancias unicas de servicios core.

```typescript
// src/core/RigBuilder.ts
export class RigBuilder {
  // ... implementacion
}
export const rigBuilder = new RigBuilder();

// src/core/CodeInterpreter.ts
export class CodeInterpreter {
  // ... implementacion
}
export const codeInterpreter = new CodeInterpreter();

// src/parsers/LDrawParser.ts
export class LDrawParser {
  // ... implementacion
}
export const ldrawParser = new LDrawParser();
```

**Razon:** Evita multiples instancias de parsers/builders que mantienen estado interno (caches, configuraciones).

---

### 5.2 Factory Pattern

**Uso:** Creacion de sensores segun tipo.

```typescript
// src/physics/SensorSimulators.ts
export function createSensorSimulator(
  config: SensorConfig,
  matTexture?: THREE.Texture,
  matDimensions?: { width: number; height: number }
): SensorSimulator {
  switch (config.type) {
    case 'ultrasonic':
      return new UltrasonicSensor(config.id, config.port, config);
    case 'color': {
      const colorSensor = new ColorSensor(config.id, config.port, config);
      if (matTexture && matDimensions) {
        colorSensor.setMatTexture(matTexture, matDimensions);
      }
      return colorSensor;
    }
    case 'gyro':
      return new GyroSensor(config.id, config.port, config);
    default:
      throw new Error(`Unsupported sensor type: ${config.type}`);
  }
}
```

**Razon:** Encapsula la logica de creacion y permite extender facilmente con nuevos tipos de sensores.

---

### 5.3 Strategy Pattern

**Uso:** Diferentes estrategias de categorizacion de piezas.

```typescript
// src/core/PartCategorizer.ts
private isMotorPart(partId: string): boolean {
  const motorPatterns = [
    /motor/i,
    /^99499$/,  // EV3 Large Motor
    /^95658$/,  // EV3 Medium Motor
    /^54696$/,  // SPIKE Large Motor
    /^54675$/,  // SPIKE Medium Motor
  ];
  return motorPatterns.some(pattern => pattern.test(partId));
}

private isWheelPart(partId: string): boolean {
  const wheelPatterns = [
    /tire/i,
    /wheel/i,
    /^56908$/,
    /^44309$/,
  ];
  return wheelPatterns.some(pattern => pattern.test(partId));
}
```

**Razon:** Permite agregar nuevos patrones de reconocimiento sin modificar la logica principal.

---

### 5.4 Observer Pattern (via React Callbacks)

**Uso:** Comunicacion entre SimulatedRobot y MainInterface.

```typescript
// MainInterface.tsx
<SimulationScene
  riggedRobot={riggedRobot}
  onRobotReady={handleRobotReady}      // Observer
  onSensorUpdate={handleSensorUpdate}   // Observer
/>

// SimulatedRobot.tsx
useEffect(() => {
  // ... inicializacion
  if (onRobotReady) {
    onRobotReady(robotInstance);  // Notifica al observer
  }
}, []);
```

---

### 5.5 Bridge Pattern

**Uso:** Conexion entre Python (Skulpt) y JavaScript (Robot API).

```typescript
// CodeInterpreter.ts
const builtinFuncs = {
  __robot_motor_run: new Sk.builtin.func((port: any, speed: any) => {
    const portStr = Sk.ffi.remapToJs(port);
    const speedNum = Sk.ffi.remapToJs(speed);
    robotAPI.motor.run(portStr, speedNum);  // Bridge al API JS
    return Sk.builtin.none.none$;
  }),
};

// Inyectar en Skulpt
Object.entries(builtinFuncs).forEach(([name, func]) => {
  Sk.builtins[name] = func;
});
```

**Razon:** Desacopla la API de Python del runtime de JavaScript.

---

### 5.6 Composition over Inheritance

**Uso:** SimulatedRobot compone motor controllers y sensors.

```typescript
// SimulatedRobot.tsx
interface RobotInstance {
  riggedData: RiggedRobotData;
  physicsBody: CANNON.Body;
  visualGroup: THREE.Group;
  motorControllers: Map<string, VirtualMotorController>;  // Composicion
  sensorSimulators: Map<string, SensorSimulator>;         // Composicion
}
```

---

## 6. Modelos de Datos (Types)

### 6.1 Tipos de Parsing LDraw

```typescript
// Comando LDraw individual
interface LDrawCommand {
  type: number;           // 0=comment, 1=part, 2=line, 3=triangle, 4=quad
  color: number;          // Codigo de color LDraw
  position: THREE.Vector3;
  rotation: THREE.Matrix3;
  partId?: string;
  vertices?: THREE.Vector3[];
}

// Instancia de pieza parseada
interface PartInstance {
  id: string;                               // ID unico
  partId: string;                           // ID de la pieza (ej: "54696")
  position: THREE.Vector3;                  // Posicion en metros
  rotation: THREE.Quaternion;               // Rotacion
  color: number;                            // Codigo de color
  category?: 'motor' | 'wheel' | 'sensor' | 'structural';
}

// Modelo completo parseado
interface ParsedModel {
  parts: PartInstance[];
  metadata: {
    name: string;
    author?: string;
    partCount: number;
  };
}
```

### 6.2 Tipos de Robot Rigging

```typescript
// Eje de ruedas detectado
interface WheelAxle {
  centerPoint: THREE.Vector3;
  direction: THREE.Vector3;
  wheels: PartInstance[];
  radius: number;
}

// Motor joint (motor + ruedas conectadas)
interface MotorJoint {
  motorId: string;
  motorPartId: string;
  axlePosition: THREE.Vector3;
  axleDirection: THREE.Vector3;
  wheelPartIds: string[];
  gearRatio: number;
  port: string;  // 'A', 'B', 'C', 'D'
}

// Configuracion de sensor
interface SensorConfig {
  id: string;
  type: 'ultrasonic' | 'color' | 'gyro' | 'touch';
  position: THREE.Vector3;
  direction: THREE.Vector3;
  port: string;
}

// Datos del chassis
interface ChassisData {
  mass: number;  // kg
  centerOfMass: THREE.Vector3;
  collisionShape: {
    type: 'ConvexPolyhedron' | 'Box' | 'Compound';
    vertices?: THREE.Vector3[];
    dimensions?: THREE.Vector3;
  };
  inertia?: CANNON.Vec3;
}

// Robot completamente rigged
interface RiggedRobotData {
  id: string;
  name: string;
  chassis: ChassisData;
  motorJoints: MotorJoint[];
  sensors: SensorConfig[];
  visualMesh: THREE.Group;
  partCount: number;
  thumbnail?: string;
}
```

### 6.3 Tipos de Fisica

```typescript
interface PhysicsConfig {
  gravity: number;
  friction: number;
  restitution: number;
  linearDamping: number;
  angularDamping: number;
}

// Comando de velocidad para motor
interface VelocityCommand {
  port: string;
  velocity: number;  // rad/s
  acceleration?: number;
}

// Comando de posicion para motor
interface PositionCommand {
  port: string;
  targetAngle: number;  // degrees
  speed: number;        // percentage
}
```

### 6.4 Tipos de Sensores

```typescript
// Lectura generica de sensor
interface SensorReading {
  sensorId: string;
  type: 'ultrasonic' | 'color' | 'gyro' | 'touch';
  timestamp: number;
  value: number | string | { r: number; g: number; b: number };
  raw?: any;
}

// Lectura de sensor de color
interface ColorSensorReading extends SensorReading {
  type: 'color';
  value: 'black' | 'white' | 'red' | 'blue' | 'green' | 'yellow' | 'unknown';
  raw: { r: number; g: number; b: number };
  reflectance: number;  // 0-100
}

// Lectura de sensor ultrasonico
interface UltrasonicReading extends SensorReading {
  type: 'ultrasonic';
  value: number;  // cm (0-255)
}
```

### 6.5 Interfaces de Controladores

```typescript
// Controlador de motor virtual
interface VirtualMotorController {
  port: string;
  maxRPM: number;
  stallTorque: number;
  currentVelocity: number;
  targetVelocity: number;
  setSpeed(percentage: number): void;
  runForRotations(rotations: number, speed: number): Promise<void>;
  stop(): void;
  reset(): void;
  update(deltaTime: number): void;
}

// Simulador de sensor
interface SensorSimulator {
  id: string;
  type: 'ultrasonic' | 'color' | 'gyro' | 'touch';
  port: string;
  update(scene: THREE.Scene, robotBody: CANNON.Body): SensorReading;
  read(): number | string | any;
}
```

### 6.6 Diccionario de Piezas Criticas

```typescript
const CRITICAL_PARTS: Record<string, PartDefinition> = {
  // SPIKE Prime Motors
  '54696': { id: '54696', name: 'SPIKE Large Motor', category: 'motor', mass: 120 },
  '54675': { id: '54675', name: 'SPIKE Medium Motor', category: 'motor', mass: 80 },

  // EV3 Motors
  '99499': { id: '99499', name: 'EV3 Large Motor', category: 'motor', mass: 76 },
  '95658': { id: '95658', name: 'EV3 Medium Motor', category: 'motor', mass: 36 },

  // Ruedas comunes
  '56908': { id: '56908', name: 'Tire 68.7 x 34R', category: 'wheel', mass: 15 },
  '44309': { id: '44309', name: 'Tire 94.8 x 44R', category: 'wheel', mass: 25 },
  '87697': { id: '87697', name: 'Tire 43.2 x 22', category: 'wheel', mass: 8 },

  // Sensores SPIKE
  '37308': { id: '37308', name: 'SPIKE Color Sensor', category: 'sensor', mass: 25 },
  '37316': { id: '37316', name: 'SPIKE Ultrasonic Sensor', category: 'sensor', mass: 30 },

  // Sensores EV3
  '95650': { id: '95650', name: 'EV3 Color Sensor', category: 'sensor', mass: 20 },
  '95652': { id: '95652', name: 'EV3 Ultrasonic Sensor', category: 'sensor', mass: 28 }
};
```

---

## 7. Flujo de Datos

### 7.1 Carga de Robot

```
1. Usuario selecciona archivo .io
                ↓
2. RobotUploader.tsx lee el File
                ↓
3. LDrawParser.parseStudioFile(file)
   - JSZip extrae contenido
   - Busca archivo .ldr dentro del ZIP
   - Parsea lineas LDraw
                ↓
4. ParsedModel { parts[], metadata }
                ↓
5. RigBuilder.rigRobot(parts, name)
   - PartCategorizer categoriza piezas
   - detectWheelAxles() agrupa ruedas
   - createMotorJoints() asocia motores
   - configureSensors() configura sensores
   - buildChassisData() calcula masa/colision
   - createVisualMesh() genera THREE.Group
                ↓
6. RiggedRobotData
                ↓
7. MainInterface.setRiggedRobot(data)
                ↓
8. SimulationScene renderiza <SimulatedRobot>
                ↓
9. SimulatedRobot.useEffect()
   - Crea CANNON.Body manual
   - Inicializa VirtualSpikeMotor para cada joint
   - Crea SensorSimulators
   - Expone window.robotAPI
   - Llama onRobotReady(robotInstance)
```

### 7.2 Ejecucion de Codigo Python

```
1. Usuario escribe codigo Python en CodeEditor
                ↓
2. Click "Run" → handleRunCode()
                ↓
3. codeInterpreter.executePython(code)
                ↓
4. wrapCodeWithAPI(code)
   - Agrega funciones wrapper (motor_run, wait, etc.)
                ↓
5. runSkulpt(wrappedCode)
   - Configura Sk.configure()
   - Inyecta builtinFuncs en Sk.builtins
   - Cada funcion Python llama a window.robotAPI
                ↓
6. Skulpt ejecuta codigo
   - motor_run('A', 50) → __robot_motor_run
   - __robot_motor_run → robotAPI.motor.run('A', 50)
   - robotAPI.motor.run → motor.setSpeed(50)
                ↓
7. VirtualSpikeMotor.setSpeed()
   - Actualiza targetVelocity
   - isRunning = true
                ↓
8. useFrame loop (60fps)
   - motor.update(delta)
   - PIDController calcula control
   - CANNON.Body.applyForce()
   - Sincroniza visual con fisica
```

### 7.3 Simulacion de Sensores

```
1. useFrame loop en SimulatedRobot
                ↓
2. sensorSimulatorsRef.forEach(sensor => sensor.update())
                ↓
3. UltrasonicSensor.update(scene, body)
   - Calcula posicion mundial del sensor
   - Raycaster.set(position, direction)
   - Intersecta con objetos de la escena
   - Retorna distancia en cm
                ↓
4. ColorSensor.update(scene, body)
   - Calcula posicion UV en el tapete
   - Samplea pixel del canvas texture
   - Clasifica color RGB → nombre
   - Calcula reflectancia
                ↓
5. onSensorUpdate(readings) → SensorPanel muestra datos
```

---

## 8. Modulos Core

### 8.1 LDrawParser

**Ubicacion:** `src/parsers/LDrawParser.ts`

**Responsabilidad:** Parsear archivos LDraw y BrickLink Studio.

**Metodos principales:**

```typescript
class LDrawParser {
  // Parsea archivo .io (ZIP con LDR dentro)
  async parseStudioFile(file: File): Promise<ParsedModel>

  // Parsea contenido LDraw texto
  parseLDraw(content: string, modelName: string): ParsedModel

  // Parsea linea tipo 1 (referencia a pieza)
  private parsePartLine(tokens: string[], lineIndex: number): PartInstance | null

  // Convierte coordenadas LDraw a Three.js
  private convertLDrawToThreeJS(ldrawPos: THREE.Vector3): THREE.Vector3
}
```

**Conversion de coordenadas:**

```typescript
// LDraw: +X right, +Y down, +Z forward
// Three.js: +X right, +Y up, +Z toward viewer
// Scale: 1 LDU = 0.4mm = 0.0004m

private convertLDrawToThreeJS(ldrawPos: THREE.Vector3): THREE.Vector3 {
  const scale = 0.0004;
  return new THREE.Vector3(
    ldrawPos.x * scale,
    -ldrawPos.y * scale,  // Flip Y
    -ldrawPos.z * scale   // Flip Z
  );
}
```

---

### 8.2 RigBuilder

**Ubicacion:** `src/core/RigBuilder.ts`

**Responsabilidad:** Convertir lista de piezas en robot rigged con fisica.

**Pipeline de rigging:**

```typescript
async rigRobot(parts: PartInstance[], modelName: string): Promise<RiggedRobotData> {
  // 1. Categorizar piezas
  const categorized = partCategorizer.categorizeParts(parts);

  // 2. Detectar ejes de ruedas
  const wheelAxles = this.detectWheelAxles(categorized.wheels);

  // 3. Asociar motores con ejes
  const motorJoints = this.createMotorJoints(categorized.motors, wheelAxles);

  // 4. Configurar sensores
  const sensorConfigs = this.configureSensors(categorized.sensors);

  // 5. Construir datos del chassis
  const chassis = this.buildChassisData(categorized.structural, parts);

  // 6. Crear mesh visual
  const visualMesh = this.createVisualMesh(parts);

  return { id, name, chassis, motorJoints, sensors, visualMesh, partCount };
}
```

**Deteccion de ejes:**

```typescript
private detectWheelAxles(wheels: PartInstance[]): WheelAxle[] {
  // Ordena ruedas por posicion X
  const sortedWheels = [...wheels].sort((a, b) => a.position.x - b.position.x);

  // Busca pares de ruedas alineadas (mismo Z, diferente X)
  for (let i = 0; i < sortedWheels.length; i++) {
    for (let j = i + 1; j < sortedWheels.length; j++) {
      const zDiff = Math.abs(wheel1.position.z - wheel2.position.z);
      const xDiff = Math.abs(wheel1.position.x - wheel2.position.x);

      // Tolerancia: 20mm en Z, minimo 50mm en X
      if (zDiff < 0.020 && xDiff > 0.050) {
        // Encontrado par de ruedas
        axles.push({ centerPoint, direction, wheels: [wheel1, wheel2], radius });
      }
    }
  }
  return axles;
}
```

---

### 8.3 PartCategorizer

**Ubicacion:** `src/core/PartCategorizer.ts`

**Responsabilidad:** Clasificar piezas LEGO por tipo funcional.

**Algoritmo de categorizacion:**

```typescript
categorizeParts(parts: PartInstance[]): CategorizedParts {
  parts.forEach(part => {
    const category = this.identifyPartCategory(part.partId);
    part.category = category;

    switch (category) {
      case 'motor': this.motorParts.push(part); break;
      case 'wheel': this.wheelParts.push(part); break;
      case 'sensor': this.sensorParts.push(part); break;
      default: this.structuralParts.push(part);
    }
  });
}

private identifyPartCategory(partId: string): Category {
  // 1. Buscar en diccionario de piezas criticas
  if (CRITICAL_PARTS[partId]) {
    return CRITICAL_PARTS[partId].category;
  }

  // 2. Pattern matching con regex
  if (this.isMotorPart(partId)) return 'motor';
  if (this.isWheelPart(partId)) return 'wheel';
  if (this.isSensorPart(partId)) return 'sensor';

  return 'structural';
}
```

---

### 8.4 CodeInterpreter

**Ubicacion:** `src/core/CodeInterpreter.ts`

**Responsabilidad:** Ejecutar codigo Python via Skulpt y conectar con API del robot.

**Estructura del wrapper Python:**

```python
# API wrapper inyectado antes del codigo del usuario
def motor_run(port, speed):
    __robot_motor_run(port, speed)

def motor_run_for_rotations(port, rotations, speed=50):
    __robot_motor_run_rotations(port, rotations, speed)

def motor_stop(port):
    __robot_motor_stop(port)

def wait(milliseconds):
    __robot_wait(milliseconds)

def print_robot(message):
    print(message)
    __robot_print(str(message))

# ---- Codigo del usuario comienza aqui ----
```

**Builtin functions de Skulpt:**

```typescript
const builtinFuncs = {
  __robot_motor_run: new Sk.builtin.func((port: any, speed: any) => {
    const portStr = Sk.ffi.remapToJs(port);
    const speedNum = Sk.ffi.remapToJs(speed);
    robotAPI.motor.run(portStr, speedNum);
    return Sk.builtin.none.none$;
  }),

  __robot_wait: new Sk.builtin.func((ms: any) => {
    const msNum = Sk.ffi.remapToJs(ms);

    // Crear Skulpt Suspension para async
    const susp = new Sk.misceval.Suspension();
    susp.resume = function() {
      return Sk.builtin.none.none$;
    };
    susp.data = {
      type: 'Sk.promise',
      promise: robotAPI.wait(msNum)
    };
    return susp;
  }),
};
```

---

## 9. Sistema de Fisica

### 9.1 VirtualSpikeMotor

**Ubicacion:** `src/physics/VirtualSpikeMotor.ts`

**Responsabilidad:** Simular motor SPIKE Prime/EV3 con fisica realista.

**Especificaciones de motores:**

| Motor | Max RPM | Stall Torque (Nm) |
|-------|---------|-------------------|
| SPIKE Large | 175 | 0.25 |
| SPIKE Medium | 135 | 0.18 |
| EV3 Large | 160 | 0.20 |
| EV3 Medium | 250 | 0.12 |

**Loop de actualizacion:**

```typescript
update(deltaTime: number): void {
  if (!this.chassisBody || !this.isRunning) return;

  // 1. Actualizar angulo acumulado
  this.currentAngle += this.currentVelocity * deltaTime;

  // 2. Control PID
  const velocityError = this.targetVelocity - this.currentVelocity;
  const controlOutput = this.pidController.calculate(velocityError, deltaTime);

  // 3. Limitar aceleracion
  const maxAcceleration = 20.0; // rad/s^2
  const velocityChange = Math.max(-maxAcceleration * deltaTime,
                                 Math.min(maxAcceleration * deltaTime, controlOutput));
  this.currentVelocity += velocityChange;

  // 4. Calcular fuerza lineal
  // F = torque / radius
  const forceMagnitude = (this.stallTorque / this.wheelRadius) *
                         (this.currentVelocity / this.maxAngularVelocity);

  // 5. Aplicar fuerza al chassis
  const force = new CANNON.Vec3(
    forwardDir.x * forceMagnitude,
    0,
    forwardDir.z * forceMagnitude
  );
  this.chassisBody.applyForce(force, wheelWorldPos);
}
```

---

### 9.2 PIDController

**Ubicacion:** `src/physics/PIDController.ts`

**Responsabilidad:** Control suave de velocidad/posicion del motor.

**Formula PID:**

```
output = Kp*error + Ki*integral(error) + Kd*derivative(error)
```

**Implementacion:**

```typescript
class PIDController {
  private integral: number = 0;
  private previousError: number = 0;

  constructor(
    private kp: number = 0.5,   // Proporcional
    private ki: number = 0.1,   // Integral
    private kd: number = 0.05   // Derivativo
  ) {}

  calculate(error: number, deltaTime: number): number {
    // Proporcional
    const p = this.kp * error;

    // Integral (con proteccion anti-windup)
    this.integral += error * deltaTime;
    this.integral = Math.max(-10, Math.min(10, this.integral));
    const i = this.ki * this.integral;

    // Derivativo
    const derivative = (error - this.previousError) / deltaTime;
    const d = this.kd * derivative;

    this.previousError = error;
    return p + i + d;
  }
}
```

---

### 9.3 SensorSimulators

**Ubicacion:** `src/physics/SensorSimulators.ts`

#### UltrasonicSensor

```typescript
class UltrasonicSensor {
  private raycaster: THREE.Raycaster;
  private maxDistance: number = 2.55; // 255cm

  update(scene: THREE.Scene, robotBody: CANNON.Body): UltrasonicReading {
    // Posicion del sensor en coordenadas mundiales
    const sensorWorldPos = new THREE.Vector3(
      robotBody.position.x + this.config.position.x,
      robotBody.position.y + this.config.position.y,
      robotBody.position.z + this.config.position.z
    );

    // Direccion aplicando rotacion del robot
    const sensorDirection = this.config.direction.clone();
    sensorDirection.applyQuaternion(robotQuat);

    // Raycast
    this.raycaster.set(sensorWorldPos, sensorDirection);
    const intersects = this.raycaster.intersectObjects(scene.children, true);

    // Distancia en cm
    let distanceCm = 255;
    if (intersects.length > 0) {
      distanceCm = Math.min(intersects[0].distance * 100, 255);
    }

    return { sensorId, type: 'ultrasonic', timestamp, value: distanceCm };
  }
}
```

#### ColorSensor

```typescript
class ColorSensor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  update(scene: THREE.Scene, robotBody: CANNON.Body): ColorSensorReading {
    // Convertir posicion 3D a coordenadas UV del tapete
    const u = (sensorWorldPos.x + matWidth/2) / matWidth;
    const v = (sensorWorldPos.z + matHeight/2) / matHeight;

    // Samplear pixel del canvas
    const x = Math.floor(u * this.canvas.width);
    const y = Math.floor(v * this.canvas.height);
    const pixelData = this.ctx.getImageData(x, y, 1, 1).data;

    // Clasificar color
    const colorName = this.classifyColor({ r: pixelData[0], g: pixelData[1], b: pixelData[2] });

    return { sensorId, type: 'color', value: colorName, raw: rgb, reflectance };
  }

  classifyColor(rgb): string {
    const brightness = (rgb.r + rgb.g + rgb.b) / 3;

    if (brightness < 40) return 'black';
    if (brightness > 200) return 'white';

    if (rgb.r > rgb.g && rgb.r > rgb.b) return 'red';
    if (rgb.g > rgb.r && rgb.g > rgb.b) return 'green';
    if (rgb.b > rgb.r && rgb.b > rgb.g) return 'blue';

    return 'unknown';
  }
}
```

---

## 10. Interprete Python (Skulpt)

### 10.1 Configuracion de Skulpt

```typescript
Sk.configure({
  output: (text: string) => {
    this.output.push(text);
    console.log('[Python Output]:', text);
  },
  read: (filename: string) => {
    // Proveer modulo time stub
    if (filename.includes('time.js')) {
      return `var $builtinmodule = function(name) {
        var mod = {};
        mod.sleep = new Sk.builtin.func(function(seconds) {
          var secs = Sk.ffi.remapToJs(seconds);
          return new Sk.misceval.promiseToSuspension(
            new Promise(function(resolve) {
              setTimeout(resolve, secs * 1000);
            })
          );
        });
        return mod;
      };`;
    }
    throw new Error(`Module ${filename} not found`);
  },
  execLimit: 30000, // 30 segundos timeout
  __future__: Sk.python3
});
```

### 10.2 Conversion de Tipos Python ↔ JavaScript

```typescript
// JavaScript → Python
const pyValue = Sk.ffi.remapToPy(jsValue);

// Python → JavaScript
const jsValue = Sk.ffi.remapToJs(pyValue);

// Ejemplo: Motor speed
const portStr = Sk.ffi.remapToJs(port);    // Python str → JS string
const speedNum = Sk.ffi.remapToJs(speed);  // Python int → JS number
```

### 10.3 Manejo de Async (Suspensions)

```typescript
// Crear una Suspension de Skulpt para operaciones async
__robot_wait: new Sk.builtin.func((ms: any) => {
  const msNum = Sk.ffi.remapToJs(ms);

  const susp = new Sk.misceval.Suspension();
  susp.resume = function() {
    return Sk.builtin.none.none$;
  };
  susp.data = {
    type: 'Sk.promise',
    promise: new Promise(resolve => setTimeout(resolve, msNum))
  };

  return susp;
}),
```

---

## 11. Componentes React

### 11.1 MainInterface

**Ubicacion:** `src/components/MainInterface.tsx`

**Responsabilidad:** Layout principal y orquestacion de estado.

**Estado principal:**

```typescript
const [riggedRobot, setRiggedRobot] = useState<RiggedRobotData | null>(null);
const [pythonCode, setPythonCode] = useState(DEFAULT_PYTHON_CODE);
const [isRunning, setIsRunning] = useState(false);
const [sensorReadings, setSensorReadings] = useState<SensorReading[]>([]);
const [isRobotReady, setIsRobotReady] = useState(false);

const robotInstanceRef = useRef<RobotInstance | null>(null);
```

**Layout:**

```
+----------------------------------------------------------+
|  Header: Logo, Test Robot, Upload Robot, Settings        |
+----------------------------------------------------------+
|            |                           |                 |
|  Code      |   3D Simulation          |  Sensor         |
|  Editor    |   Scene                  |  Panel          |
|  (1/3)     |   (flex-1)               |  (w-80)         |
|            |                           |                 |
+------------+                           +-----------------+
|  Output    |                           |                 |
|  Console   |                           |                 |
+------------+---------------------------+-----------------+
```

---

### 11.2 SimulatedRobot

**Ubicacion:** `src/components/SimulatedRobot.tsx`

**Responsabilidad:** Robot con fisica y API global.

**Ciclo de vida:**

```typescript
// 1. Render inicial crea group ref
const [ref, api] = useCompoundBody<THREE.Group>(() => ({
  mass: riggedData.chassis.mass,
  position: initialPosition,
  shapes: shapes,
}));

// 2. useEffect inicializa motores y API
useEffect(() => {
  // Crear CANNON.Body manual
  const body = new CANNON.Body({ mass, position });
  physicsBodyRef.current = body;

  // Inicializar motores
  riggedData.motorJoints.forEach(joint => {
    const motor = new VirtualSpikeMotor(joint.port, joint);
    motor.initialize(body);
    motorControllersRef.current.set(joint.port, motor);
  });

  // Exponer API global
  setupRobotAPI();

  // Notificar que robot esta listo
  onRobotReady(robotInstance);
}, []);

// 3. useFrame actualiza fisica cada frame
useFrame((state, delta) => {
  // Gravedad y colision con suelo
  body.velocity.y -= 9.81 * delta;
  if (body.position.y < 0.05) {
    body.position.y = 0.05;
    body.velocity.y = 0;
  }

  // Actualizar motores
  motorControllersRef.current.forEach(motor => motor.update(delta));

  // Sincronizar visual con fisica
  ref.current.position.copy(body.position);
  ref.current.quaternion.copy(body.quaternion);

  // Actualizar sensores
  sensorSimulatorsRef.current.forEach(sensor => {
    sensor.update(state.scene, body);
  });
});
```

---

### 11.3 SimulationScene

**Ubicacion:** `src/components/SimulationScene.tsx`

**Responsabilidad:** Canvas 3D con fisica y entorno.

**Estructura:**

```jsx
<Canvas shadows>
  {/* Iluminacion */}
  <ambientLight intensity={0.4} />
  <directionalLight castShadow />

  {/* Camara */}
  <PerspectiveCamera makeDefault position={[2, 1.5, 2]} />
  <OrbitControls />

  {/* Entorno */}
  <Environment preset="warehouse" />

  {/* Fisica */}
  <Physics gravity={[0, -9.81, 0]}>
    <FLLTrack />
    {riggedRobot && <SimulatedRobot riggedData={riggedRobot} />}
  </Physics>

  {/* Grid de referencia */}
  <Grid args={[10, 10]} />
</Canvas>
```

---

### 11.4 FLLTrack

**Ubicacion:** `src/components/FLLTrack.tsx`

**Responsabilidad:** Tapete de competencia FLL.

**Dimensiones:** 2.4m x 1.2m (8ft x 4ft)

**Componentes:**

```jsx
<group>
  {/* Plano con fisica */}
  <mesh ref={physicsRef}>
    <planeGeometry args={[2.4, 1.2]} />
    <meshStandardMaterial map={matTexture} />
  </mesh>

  {/* Paredes */}
  <TrackBorders width={2.4} height={1.2} />

  {/* Elementos de mision */}
  <MissionElements />
</group>
```

---

## 12. API del Robot

### 12.1 window.robotAPI

La API del robot se expone en `window.robotAPI` y es accesible desde Python via Skulpt.

```typescript
window.robotAPI = {
  motor: {
    run(port: string, speed: number): void,
    runForRotations(port: string, rotations: number, speed: number): Promise<void>,
    stop(port: string): void,
    reset(port: string): void,
    getAngle(port: string): number,
    getSpeed(port: string): number,
  },

  sensor: {
    color(port: string): string,
    ultrasonic(port: string): number,
    reflectance(port: string): number,
  },

  wait(ms: number): Promise<void>,
  print(message: string): void,
};
```

### 12.2 Funciones Python Disponibles

```python
# Motores
motor_run(port, speed)                    # Ejecutar motor a velocidad (-100 a 100)
motor_run_for_rotations(port, rot, speed) # Ejecutar rotaciones especificas
motor_stop(port)                          # Detener motor
motor_reset(port)                         # Resetear angulo a 0
motor_get_angle(port)                     # Obtener angulo en grados
motor_get_speed(port)                     # Obtener velocidad actual

# Sensores
color_sensor_get_color(port)              # Obtener nombre de color
ultrasonic_sensor_get_distance(port)      # Obtener distancia en cm

# Utilidades
wait(milliseconds)                        # Esperar N milisegundos
print_robot(message)                      # Imprimir mensaje
```

### 12.3 Ejemplo de Codigo Python

```python
# Programa basico de robot FLL
print_robot("Iniciando mision...")

# Avanzar por 2 segundos
motor_run('A', 50)
motor_run('B', 50)
wait(2000)

# Girar a la derecha
motor_run('A', 50)
motor_run('B', -50)
wait(500)

# Detectar color
color = color_sensor_get_color('1')
print_robot("Color detectado: " + color)

# Detener
motor_stop('A')
motor_stop('B')
print_robot("Mision completada!")
```

---

## 13. Guia de Desarrollo

### 13.1 Configuracion del Entorno

**Opcion A: Docker (Recomendado)**

```bash
# Ejecutar servidor de desarrollo
./run-dev.sh

# Abrir en navegador
http://localhost:5173
```

**Opcion B: Local**

```bash
# Instalar dependencias
pnpm install
# o
npm install

# Ejecutar
pnpm dev
```

### 13.2 Agregar Nueva Pieza al Diccionario

1. Editar `src/types/index.ts`:

```typescript
export const CRITICAL_PARTS: Record<string, PartDefinition> = {
  // ... existentes

  // Agregar nueva pieza
  '12345': {
    id: '12345',
    name: 'Nuevo Motor XYZ',
    category: 'motor',
    mass: 100  // gramos
  },
};
```

2. Actualizar patrones en `src/core/PartCategorizer.ts` si es necesario.

### 13.3 Agregar Nuevo Tipo de Sensor

1. Crear clase en `src/physics/SensorSimulators.ts`:

```typescript
export class TouchSensor extends BaseSensorSimulator {
  constructor(id: string, port: string, config: SensorConfig) {
    super(id, 'touch', port, config);
  }

  update(scene: THREE.Scene, robotBody: CANNON.Body): SensorReading {
    // Implementar logica de colision
    return { sensorId: this.id, type: 'touch', timestamp: Date.now(), value: 0 };
  }

  read(): number {
    return (this.lastReading?.value as number) ?? 0;
  }
}
```

2. Agregar al factory:

```typescript
export function createSensorSimulator(config: SensorConfig): SensorSimulator {
  switch (config.type) {
    // ... existentes
    case 'touch':
      return new TouchSensor(config.id, config.port, config);
  }
}
```

3. Agregar funcion Python en `src/core/CodeInterpreter.ts`.

### 13.4 Agregar Nueva Funcion Python

1. Agregar al wrapper en `wrapCodeWithAPI()`:

```typescript
const wrappedCode = `
# ... existentes

def nueva_funcion(param):
    __robot_nueva_funcion(param)

# User code
${userCode}
`;
```

2. Agregar builtin en `runSkulpt()`:

```typescript
const builtinFuncs = {
  // ... existentes

  __robot_nueva_funcion: new Sk.builtin.func((param: any) => {
    const paramJs = Sk.ffi.remapToJs(param);
    robotAPI.nuevaFuncion(paramJs);
    return Sk.builtin.none.none$;
  }),
};
```

3. Agregar implementacion en `window.robotAPI` (en SimulatedRobot.tsx).

---

## 14. Testing

### 14.1 Robot de Prueba

```typescript
// Generar robot minimo para testing
import { TestRobotGenerator } from '@/utils/TestRobotGenerator';

const testModel = TestRobotGenerator.generateMinimalRobot();
// Retorna: { parts: [...], metadata: { name, author, partCount } }
```

### 14.2 Tests de Unidad

**PIDController:**

```typescript
// src/physics/PIDController.test.ts
describe('PIDController', () => {
  it('should return 0 for 0 error', () => {
    const pid = new PIDController(1, 0, 0);
    expect(pid.calculate(0, 0.016)).toBe(0);
  });

  it('should reset integral on reset()', () => {
    const pid = new PIDController(0, 1, 0);
    pid.calculate(10, 0.1);
    pid.reset();
    expect(pid.getIntegral()).toBe(0);
  });
});
```

**SensorSimulators:**

```typescript
// src/physics/SensorSimulators.test.ts
describe('ColorSensor.classifyColor', () => {
  it('should detect black', () => {
    const sensor = new ColorSensor('test', '1', config);
    expect(sensor.classifyColor({ r: 10, g: 10, b: 10 })).toBe('black');
  });

  it('should detect white', () => {
    const sensor = new ColorSensor('test', '1', config);
    expect(sensor.classifyColor({ r: 250, g: 250, b: 250 })).toBe('white');
  });
});
```

### 14.3 Ejecutar Tests

```bash
# Con Docker
docker run -it --rm -v "$(pwd):/app" -w /app node:24-alpine sh -c "pnpm test"

# Local
pnpm test
```

---

## 15. Troubleshooting

### 15.1 "Skulpt not loaded"

**Causa:** La libreria Skulpt no se cargo.

**Solucion:** Verificar que `skulpt.min.js` esta en `index.html`:

```html
<script src="https://cdn.jsdelivr.net/npm/skulpt@1.2.0/dist/skulpt.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/skulpt@1.2.0/dist/skulpt-stdlib.js"></script>
```

### 15.2 "Robot API not initialized"

**Causa:** Se intento ejecutar codigo antes de que el robot estuviera listo.

**Solucion:** Esperar a que `isRobotReady` sea `true` antes de habilitar el boton Run.

```typescript
<button
  onClick={handleRunCode}
  disabled={!riggedRobot || !isRobotReady}
>
  Run
</button>
```

### 15.3 Robot no se mueve

**Checklist:**
1. Verificar que `motor.setSpeed()` establece `isRunning = true`
2. Verificar que `chassisBody` no es null en el motor
3. Verificar que `update()` se llama cada frame
4. Abrir consola (F12) y buscar logs de motor

### 15.4 Errores de TypeScript en el IDE

**Causa:** node_modules no instalados localmente.

**Solucion:**
```bash
npm install
# Solo instala tipos para el IDE, no afecta Docker
```

### 15.5 Sensores devuelven valores incorrectos

**Checklist:**
1. Verificar posicion del sensor en `riggedData.sensors`
2. Verificar que la textura del tapete se cargo correctamente
3. Para color sensor, verificar conversion de coordenadas 3D a UV

---

## Anexos

### A. Tabla de Colores LDraw

| Codigo | Color | Hex |
|--------|-------|-----|
| 0 | Negro | #05131D |
| 1 | Azul | #0055BF |
| 2 | Verde | #257A3E |
| 4 | Rojo | #C91A09 |
| 14 | Amarillo | #F2CD37 |
| 15 | Blanco | #FFFFFF |
| 71 | Gris Claro | #8A928D |
| 72 | Gris Oscuro | #6C6E68 |

### B. Unidades de Medida

| Sistema | Unidad | Equivalencia |
|---------|--------|--------------|
| LDraw | LDU | 1 LDU = 0.4mm |
| Three.js | metros | 1 unidad = 1 metro |
| Conversion | | 1 LDU = 0.0004 metros |

### C. Especificaciones FLL

| Elemento | Medida |
|----------|--------|
| Tapete | 2.4m x 1.2m |
| Peso max robot | 1 kg |
| Tiempo mision | 2.5 minutos |

---

**Fin de la documentacion tecnica.**

*Para preguntas o mejoras, crear un issue en el repositorio.*
