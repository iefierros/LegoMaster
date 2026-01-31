# 📚 Documentación Técnica - LegoMaster

**Guía completa para desarrolladores: mantenimiento, debugging y desarrollo**

---

## 📑 Índice

1. [Visión General de la Arquitectura](#1-visión-general-de-la-arquitectura)
2. [Estructura del Proyecto](#2-estructura-del-proyecto)
3. [Flujo de Datos Completo](#3-flujo-de-datos-completo)
4. [Componentes Principales](#4-componentes-principales)
5. [Patrones de Diseño](#5-patrones-de-diseño)
6. [Sistema de Tipos](#6-sistema-de-tipos)
7. [Interconexiones entre Módulos](#7-interconexiones-entre-módulos)
8. [Motor de Física](#8-motor-de-física)
9. [Intérprete Python/Skulpt](#9-intérprete-pythonskupt)
10. [Debugging Guide](#10-debugging-guide)
11. [Problemas Conocidos y Soluciones](#11-problemas-conocidos-y-soluciones)
12. [Testing](#12-testing)
13. [Guía de Contribución](#13-guía-de-contribución)

---

## 1. Visión General de la Arquitectura

### 1.1 Diagrama de Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              LEGOMASTER APP                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         CAPA DE PRESENTACIÓN                         │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  ┌───────────┐ │   │
│  │  │ MainInterface│  │  CodeEditor  │  │SensorPanel │  │RobotUpload│ │   │
│  │  │    (React)   │  │  (Ace/React) │  │  (React)   │  │  (React)  │ │   │
│  │  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘  └─────┬─────┘ │   │
│  └─────────┼─────────────────┼────────────────┼───────────────┼───────┘   │
│            │                 │                │               │            │
│  ┌─────────▼─────────────────▼────────────────▼───────────────▼───────┐   │
│  │                         CAPA DE SIMULACIÓN                          │   │
│  │  ┌──────────────────┐  ┌────────────────┐  ┌────────────────────┐ │   │
│  │  │ SimulationScene  │  │ SimulatedRobot │  │     FLLTrack       │ │   │
│  │  │ (R3F Canvas)     │  │ (Physics+Visual)│  │  (Tablero 3D)     │ │   │
│  │  └────────┬─────────┘  └───────┬────────┘  └─────────┬──────────┘ │   │
│  └───────────┼────────────────────┼─────────────────────┼─────────────┘   │
│              │                    │                     │                  │
│  ┌───────────▼────────────────────▼─────────────────────▼─────────────┐   │
│  │                          CAPA DE LÓGICA                             │   │
│  │  ┌────────────────┐  ┌─────────────────┐  ┌──────────────────────┐│   │
│  │  │ CodeInterpreter│  │   RigBuilder    │  │   PartCategorizer   ││   │
│  │  │   (Skulpt)     │  │ (Auto-rigging)  │  │  (Clasificación)    ││   │
│  │  └───────┬────────┘  └────────┬────────┘  └──────────┬───────────┘│   │
│  └──────────┼────────────────────┼──────────────────────┼─────────────┘   │
│             │                    │                      │                  │
│  ┌──────────▼────────────────────▼──────────────────────▼─────────────┐   │
│  │                          CAPA DE FÍSICA                             │   │
│  │  ┌──────────────────┐  ┌─────────────────┐  ┌────────────────────┐│   │
│  │  │VirtualSpikeMotor │  │SensorSimulators │  │    CANNON.Body     ││   │
│  │  │  (PID Control)   │  │  (Raycasting)   │  │   (Physics Body)   ││   │
│  │  └──────────────────┘  └─────────────────┘  └────────────────────┘│   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │                          CAPA DE PARSEO                             │   │
│  │  ┌──────────────────┐  ┌─────────────────┐  ┌────────────────────┐│   │
│  │  │   LDrawParser    │  │TestRobotGenerator│  │      JSZip        ││   │
│  │  │  (.io/.ldr)      │  │  (Robots test)  │  │  (Descompresión)  ││   │
│  │  └──────────────────┘  └─────────────────┘  └────────────────────┘│   │
│  └────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Stack Tecnológico

| Capa | Tecnología | Versión | Responsabilidad |
|------|------------|---------|-----------------|
| UI | React | 18.3 | Componentes de interfaz |
| Estilos | Tailwind CSS | 3.4 | Estilos utilitarios |
| 3D Rendering | Three.js | 0.163 | Renderizado 3D |
| React + Three | @react-three/fiber | 8.16 | Integración React-Three |
| Física | cannon-es | 0.20 | Simulación física |
| React + Cannon | @react-three/cannon | 6.6 | Integración React-Cannon |
| Python | Skulpt | 1.2 | Intérprete Python en browser |
| Build | Vite | 5.2 | Bundler y dev server |
| Types | TypeScript | 5.4 | Tipado estático |

---

## 2. Estructura del Proyecto

### 2.1 Árbol de Directorios Completo

```
LegoMaster/
│
├── 📁 src/                          # Código fuente principal
│   │
│   ├── 📁 components/               # Componentes React
│   │   ├── MainInterface.tsx        # [PRINCIPAL] Layout y estado global
│   │   ├── SimulatedRobot.tsx       # [CRÍTICO] Robot 3D + física
│   │   ├── SimulationScene.tsx      # Escena Three.js
│   │   ├── FLLTrack.tsx             # Tablero FLL
│   │   ├── CodeEditor.tsx           # Editor Python (Ace)
│   │   ├── SensorPanel.tsx          # Panel de sensores
│   │   └── RobotUploader.tsx        # Modal de carga
│   │
│   ├── 📁 core/                     # Lógica de negocio
│   │   ├── CodeInterpreter.ts       # [CRÍTICO] Ejecutor Python/Skulpt
│   │   ├── RigBuilder.ts            # Constructor de robots
│   │   └── PartCategorizer.ts       # Clasificador de piezas
│   │
│   ├── 📁 parsers/                  # Parsers de archivos
│   │   └── LDrawParser.ts           # Parser .io/.ldr
│   │
│   ├── 📁 physics/                  # Motor de física
│   │   ├── VirtualSpikeMotor.ts     # [CRÍTICO] Simulador de motor
│   │   └── SensorSimulators.ts      # Simuladores de sensores
│   │
│   ├── 📁 utils/                    # Utilidades
│   │   └── TestRobotGenerator.ts    # Generador de robots test
│   │
│   ├── 📁 types/                    # Definiciones TypeScript
│   │   └── index.ts                 # Todas las interfaces
│   │
│   ├── 📁 lib/                      # Librerías/clientes
│   │   └── supabase.ts              # Cliente Supabase (no usado)
│   │
│   ├── App.tsx                      # Componente raíz
│   ├── main.tsx                     # Entry point
│   └── index.css                    # Estilos globales
│
├── 📁 public/                       # Assets estáticos
│   └── 📁 skulpt/                   # Librerías Skulpt
│
├── 📁 docs/                         # Documentación
│   └── TECHNICAL_DOCUMENTATION.md   # Este archivo
│
├── package.json                     # Dependencias
├── tsconfig.json                    # Config TypeScript
├── vite.config.ts                   # Config Vite
├── tailwind.config.js               # Config Tailwind
└── run-dev.sh                       # Script Docker
```

### 2.2 Archivos Críticos (por orden de importancia)

| Prioridad | Archivo | Función | Estado |
|-----------|---------|---------|--------|
| 🔴 1 | `CodeInterpreter.ts` | Ejecuta Python | ⚠️ Bug |
| 🔴 2 | `SimulatedRobot.tsx` | Robot + física | ✅ OK |
| 🟡 3 | `VirtualSpikeMotor.ts` | Control motores | ✅ OK |
| 🟡 4 | `MainInterface.tsx` | UI principal | ✅ OK |
| 🟢 5 | `RigBuilder.ts` | Construye robots | ✅ OK |
| 🟢 6 | `LDrawParser.ts` | Parsea .io | ✅ OK |

---

## 3. Flujo de Datos Completo

### 3.1 Flujo: Carga de Robot

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     FLUJO: CARGA DE ROBOT                                 │
└──────────────────────────────────────────────────────────────────────────┘

     Usuario                                                    Sistema
        │                                                          │
        │  1. Click "Upload Robot" o "Test Robot"                  │
        ▼                                                          │
   ┌─────────┐                                                     │
   │  Acción │                                                     │
   └────┬────┘                                                     │
        │                                                          │
        │  ════════════════════════════════════════════════════►  │
        │                                                          │
        │         ┌────────────────────────────────────────────────┤
        │         │  2. Si es archivo .io:                         │
        │         │     LDrawParser.parseStudioFile(file)          │
        │         │                                                │
        │         │  3. Si es Test Robot:                          │
        │         │     TestRobotGenerator.generateMinimalRobot()  │
        │         └────────────────────────────────────────────────┤
        │                              │                           │
        │                              ▼                           │
        │                    ┌─────────────────┐                   │
        │                    │   ParsedModel   │                   │
        │                    │ { parts: [...], │                   │
        │                    │   metadata }    │                   │
        │                    └────────┬────────┘                   │
        │                             │                            │
        │                             ▼                            │
        │         ┌────────────────────────────────────────────────┤
        │         │  4. PartCategorizer.categorizeParts(parts)     │
        │         │     → motors[], wheels[], sensors[], struct[]  │
        │         └────────────────────────────────────────────────┤
        │                              │                           │
        │                              ▼                           │
        │         ┌────────────────────────────────────────────────┤
        │         │  5. RigBuilder.rigRobot(parts, name)           │
        │         │     → detectWheelAxles()                       │
        │         │     → createMotorJoints()                      │
        │         │     → configureSensors()                       │
        │         │     → buildChassisData()                       │
        │         │     → createVisualMesh()                       │
        │         └────────────────────────────────────────────────┤
        │                              │                           │
        │                              ▼                           │
        │                    ┌─────────────────┐                   │
        │                    │ RiggedRobotData │                   │
        │                    │ { chassis,      │                   │
        │                    │   motorJoints,  │                   │
        │                    │   sensors,      │                   │
        │                    │   visualMesh }  │                   │
        │                    └────────┬────────┘                   │
        │                             │                            │
        │                             ▼                            │
        │         ┌────────────────────────────────────────────────┤
        │         │  6. setRiggedRobot(riggedRobot)                │
        │         │     → Trigger re-render                        │
        │         │     → SimulatedRobot mounts                    │
        │         └────────────────────────────────────────────────┤
        │                              │                           │
        │  ◄════════════════════════════════════════════════════   │
        │                                                          │
        ▼                                                          │
   ┌─────────┐                                                     │
   │ Robot   │                                                     │
   │ Visible │                                                     │
   └─────────┘                                                     │
```

### 3.2 Flujo: Inicialización de Física

```
┌──────────────────────────────────────────────────────────────────────────┐
│                  FLUJO: INICIALIZACIÓN DE FÍSICA                          │
└──────────────────────────────────────────────────────────────────────────┘

SimulatedRobot.tsx
       │
       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  useEffect(() => {                                                        │
│    // 1. Verificar que no esté ya inicializado                           │
│    if (motorsInitialized.current) return;                                │
│    if (!ref.current) return;                                             │
│                                                                          │
│    // 2. Crear CANNON.Body manualmente                                   │
│    const body = new CANNON.Body({                                        │
│      mass: riggedData.chassis.mass,         // ~0.035 kg                 │
│      position: new CANNON.Vec3(0, 0.1, 0),  // Elevado del suelo         │
│      material: new CANNON.Material({                                      │
│        friction: 0.9,                                                     │
│        restitution: 0.1                                                   │
│      }),                                                                  │
│      linearDamping: 0.3,                                                 │
│      angularDamping: 0.3                                                 │
│    });                                                                    │
│                                                                          │
│    // 3. Agregar shapes de colisión                                      │
│    body.addShape(chassisShape);    // Box principal                      │
│    body.addShape(wheelShape, pos); // Cilindros para ruedas              │
│                                                                          │
│    // 4. Almacenar referencia                                            │
│    physicsBodyRef.current = body;                                        │
│                                                                          │
│    // 5. Inicializar motores con el body                                 │
│    riggedData.motorJoints.forEach(joint => {                             │
│      const motor = new VirtualSpikeMotor(joint.port, joint, 'spike');    │
│      motor.initialize(body);  // ← Motor recibe referencia al body       │
│      motorControllersRef.current.set(joint.port, motor);                 │
│    });                                                                    │
│                                                                          │
│    // 6. Notificar que está listo                                        │
│    onRobotReady(robotInstance);                                          │
│    setupRobotAPI();  // Exponer window.robotAPI                          │
│  });                                                                      │
└──────────────────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  useFrame((state, delta) => {                                            │
│    // Loop de física ejecutado 60 veces por segundo                      │
│                                                                          │
│    // 1. Aplicar gravedad                                                │
│    body.velocity.y -= 9.81 * delta;                                      │
│                                                                          │
│    // 2. Integrar velocidad                                              │
│    body.position.x += body.velocity.x * delta;                           │
│    body.position.y += body.velocity.y * delta;                           │
│    body.position.z += body.velocity.z * delta;                           │
│                                                                          │
│    // 3. Colisión con suelo                                              │
│    if (body.position.y < 0.05) {                                         │
│      body.position.y = 0.05;                                             │
│      body.velocity.y = 0;                                                │
│    }                                                                      │
│                                                                          │
│    // 4. Actualizar motores (aplican fuerza al body)                     │
│    motorControllersRef.current.forEach(motor => {                        │
│      motor.update(delta);                                                │
│    });                                                                    │
│                                                                          │
│    // 5. Sincronizar visual con física                                   │
│    ref.current.position.copy(body.position);                             │
│    ref.current.quaternion.copy(body.quaternion);                         │
│  });                                                                      │
└──────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Flujo: Ejecución de Código Python

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    FLUJO: EJECUCIÓN DE CÓDIGO PYTHON                      │
└──────────────────────────────────────────────────────────────────────────┘

Usuario escribe:                     Sistema procesa:
┌─────────────────────┐              ┌─────────────────────────────────────┐
│ motor_a = Motor('A')│              │                                     │
│ motor_a.run(50)     │─────────────►│ 1. handleRunCode() en MainInterface │
│ wait(2000)          │              │                                     │
│ motor_a.stop()      │              └──────────────┬──────────────────────┘
└─────────────────────┘                             │
                                                    ▼
                                     ┌─────────────────────────────────────┐
                                     │ 2. codeInterpreter.executePython()  │
                                     │    └─► wrapCodeWithAPI(userCode)    │
                                     └──────────────┬──────────────────────┘
                                                    │
                                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 3. CÓDIGO ENVUELTO (lo que realmente ejecuta Skulpt):                    │
│                                                                          │
│ # SPIKE Prime / EV3 API Wrapper                                          │
│                                                                          │
│ class Motor:                                                             │
│     def __init__(self, port):                                            │
│         self.port = port                                                 │
│                                                                          │
│     def run(self, speed):                                                │
│         __robot_motor_run(self.port, speed)  ◄── Built-in function       │
│                                                                          │
│ def wait(milliseconds):                                                  │
│     __robot_wait(milliseconds)               ◄── Built-in function       │
│                                                                          │
│ # === CÓDIGO DEL USUARIO ===                                             │
│ motor_a = Motor('A')                                                     │
│ motor_a.run(50)                                                          │
│ wait(2000)                                                               │
│ motor_a.stop()                                                           │
└──────────────────────────────────────────────────────────────────────────┘
                                                    │
                                                    ▼
                                     ┌─────────────────────────────────────┐
                                     │ 4. runSkulpt(wrappedCode)           │
                                     │    └─► Sk.configure({...})          │
                                     │    └─► Inyectar builtinFuncs        │
                                     │    └─► Sk.importMainWithBody()      │
                                     └──────────────┬──────────────────────┘
                                                    │
                                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 5. BUILT-IN FUNCTIONS (puente Python → JavaScript):                      │
│                                                                          │
│ __robot_motor_run = new Sk.builtin.func((port, speed) => {              │
│   const portStr = Sk.ffi.remapToJs(port);   // Python str → JS string   │
│   const speedNum = Sk.ffi.remapToJs(speed); // Python int → JS number   │
│                                                                          │
│   window.robotAPI.motor.run(portStr, speedNum);  ◄── Llama al API       │
│                                                                          │
│   return Sk.builtin.none.none$;  // Return Python None                  │
│ });                                                                      │
└──────────────────────────────────────────────────────────────────────────┘
                                                    │
                                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 6. window.robotAPI (definido en SimulatedRobot.tsx):                     │
│                                                                          │
│ robotAPI = {                                                             │
│   motor: {                                                               │
│     run: (port, speed) => {                                              │
│       const motor = motorControllersRef.current.get(port);              │
│       if (motor) {                                                       │
│         motor.setSpeed(speed);  ◄── Activa el motor virtual             │
│       }                                                                  │
│     }                                                                    │
│   }                                                                      │
│ }                                                                        │
└──────────────────────────────────────────────────────────────────────────┘
                                                    │
                                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 7. VirtualSpikeMotor.setSpeed(speed):                                    │
│                                                                          │
│ setSpeed(speedPercent: number) {                                         │
│   this.targetVelocity = (speedPercent / 100) * this.maxAngularVelocity; │
│   this.isRunning = true;  ◄── Motor ahora está activo                   │
│ }                                                                        │
└──────────────────────────────────────────────────────────────────────────┘
                                                    │
                                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 8. En useFrame (cada frame):                                             │
│                                                                          │
│ motor.update(delta) → Aplica fuerza al CANNON.Body                      │
│                     → Robot se mueve en la simulación                   │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Componentes Principales

### 4.1 MainInterface.tsx

**Responsabilidad:** Componente contenedor principal, maneja estado global de la aplicación.

```typescript
// Estado principal
const [riggedRobot, setRiggedRobot] = useState<RiggedRobotData | null>(null);
const [pythonCode, setPythonCode] = useState(DEFAULT_PYTHON_CODE);
const [isRunning, setIsRunning] = useState(false);
const [isRobotReady, setIsRobotReady] = useState(false);
const robotInstanceRef = useRef<RobotInstance | null>(null);
```

**Callbacks importantes:**

| Callback | Disparado por | Acción |
|----------|---------------|--------|
| `handleRobotUploaded` | RobotUploader | Guarda robot en estado |
| `handleLoadTestRobot` | Botón Test Robot | Genera y carga robot test |
| `handleRobotReady` | SimulatedRobot | Marca robot como listo |
| `handleRunCode` | Botón Run | Ejecuta Python |
| `handleStopCode` | Botón Stop | Detiene ejecución |

**Diagrama de flujo interno:**

```
┌─────────────────────────────────────────────────────────────────┐
│                      MainInterface                               │
│                                                                  │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐   │
│  │   Header     │     │   Content    │     │   Modals     │   │
│  │ ┌──────────┐ │     │ ┌──────────┐ │     │              │   │
│  │ │TestRobot │─┼─────┼►│CodeEditor│ │     │ RobotUploader│   │
│  │ │  Button  │ │     │ └──────────┘ │     │              │   │
│  │ └──────────┘ │     │ ┌──────────┐ │     └──────────────┘   │
│  │ ┌──────────┐ │     │ │Simulation│ │                        │
│  │ │  Upload  │─┼─────┼►│  Scene   │ │                        │
│  │ │  Button  │ │     │ └──────────┘ │                        │
│  │ └──────────┘ │     │ ┌──────────┐ │                        │
│  └──────────────┘     │ │  Sensor  │ │                        │
│                       │ │  Panel   │ │                        │
│                       │ └──────────┘ │                        │
│                       └──────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 SimulatedRobot.tsx

**Responsabilidad:** Renderiza el robot en 3D y maneja toda la física.

**Props:**

```typescript
interface SimulatedRobotProps {
  riggedData: RiggedRobotData;      // Datos del robot construido
  initialPosition?: [number, number, number];  // Posición inicial
  matTexture?: THREE.Texture;       // Textura del tablero (para sensores)
  matDimensions?: { width: number; height: number };
  onSensorUpdate?: (sensorData: SensorReading[]) => void;
  onRobotReady?: (robot: RobotInstance) => void;  // Callback cuando listo
}
```

**Refs importantes:**

```typescript
const ref = useRef<THREE.Group>(null);  // Referencia al objeto 3D
const motorControllersRef = useRef<Map<string, VirtualSpikeMotor>>();
const physicsBodyRef = useRef<CANNON.Body | null>(null);
const motorsInitialized = useRef<boolean>(false);
const sensorSimulatorsRef = useRef<Map<string, any>>();
```

**Ciclo de vida:**

```
Mount → useEffect (crear body) → useFrame (loop 60fps) → Unmount
                                      │
                                      ├─► Aplicar gravedad
                                      ├─► Integrar posición
                                      ├─► Detectar colisiones
                                      ├─► Actualizar motores
                                      ├─► Sincronizar visual
                                      └─► Actualizar sensores
```

### 4.3 CodeInterpreter.ts

**Responsabilidad:** Ejecuta código Python usando Skulpt y hace puente con el robot.

**Métodos públicos:**

```typescript
class CodeInterpreter {
  async executePython(code: string): Promise<CodeExecutionResult>;
  stop(): void;
  isExecuting(): boolean;
  getOutput(): string[];
  clearOutput(): void;
}
```

**Flujo interno de `executePython`:**

```
executePython(code)
    │
    ├─► wrapCodeWithAPI(code)     // Envuelve con clases Motor, etc.
    │
    ├─► runSkulpt(wrappedCode)    // Configura y ejecuta Skulpt
    │       │
    │       ├─► Sk.configure()     // Output, read modules, timeout
    │       │
    │       ├─► Inyectar builtins  // __robot_motor_run, etc.
    │       │
    │       └─► Sk.importMainWithBody()  // Ejecutar código
    │
    └─► Return { success, output, errors, executionTime }
```

### 4.4 VirtualSpikeMotor.ts

**Responsabilidad:** Simula un motor LEGO SPIKE/EV3 con física realista.

**Propiedades físicas:**

```typescript
// Constantes basadas en especificaciones reales del SPIKE Large Motor
private maxAngularVelocity = 175 * (2 * Math.PI / 60);  // 175 RPM → rad/s
private stallTorque = 0.25;  // 0.25 N⋅m
private wheelRadius = 0.028; // 28mm radio de rueda típica
```

**Controlador PID:**

```typescript
// Ganancias PID (sintonizadas empíricamente)
private readonly pidGains = {
  kP: 0.8,   // Proporcional
  kI: 0.15,  // Integral
  kD: 0.08   // Derivativo
};
```

**Método `update(deltaTime)`:**

```typescript
update(deltaTime: number): void {
  if (!this.chassisBody || !this.isRunning) return;

  // 1. Calcular error PID
  const error = this.targetVelocity - this.currentVelocity;
  this.integralError += error * deltaTime;
  const derivativeError = (error - this.lastError) / deltaTime;

  // 2. Calcular salida PID
  const pidOutput =
    this.pidGains.kP * error +
    this.pidGains.kI * this.integralError +
    this.pidGains.kD * derivativeError;

  // 3. Calcular fuerza: F = τ / r
  const forceMagnitude = (this.stallTorque / this.wheelRadius) * pidOutput;

  // 4. Aplicar fuerza en dirección de movimiento
  const forwardDir = new CANNON.Vec3(0, 0, -1);
  this.chassisBody.quaternion.vmult(forwardDir, forwardDir);

  const force = new CANNON.Vec3(
    forwardDir.x * forceMagnitude,
    0,
    forwardDir.z * forceMagnitude
  );

  this.chassisBody.applyForce(force, wheelWorldPos);

  // 5. Actualizar velocidad actual
  this.currentVelocity += (pidOutput - this.currentVelocity) * deltaTime * 5;
  this.lastError = error;
}
```

---

## 5. Patrones de Diseño

### 5.1 Singleton Pattern

**Usado en:** `CodeInterpreter`

```typescript
// Al final de CodeInterpreter.ts
export const codeInterpreter = new CodeInterpreter();

// Uso en otros archivos
import { codeInterpreter } from '@/core/CodeInterpreter';
await codeInterpreter.executePython(code);
```

**Razón:** Solo debe existir una instancia del intérprete para evitar conflictos con el estado global de Skulpt.

### 5.2 Factory Pattern

**Usado en:** `TestRobotGenerator`, `createSensorSimulator`

```typescript
// TestRobotGenerator.ts
export class TestRobotGenerator {
  static generateMinimalRobot(): ParsedModel { ... }
  static generateSimpleRobot(): ParsedModel { ... }
  static generateLDrawFormat(): string { ... }
}

// SensorSimulators.ts
export function createSensorSimulator(
  config: SensorConfig,
  matTexture?: THREE.Texture,
  matDimensions?: { width: number; height: number }
): SensorSimulator {
  switch (config.type) {
    case 'color': return new ColorSensorSimulator(config, matTexture, matDimensions);
    case 'ultrasonic': return new UltrasonicSensorSimulator(config);
    default: throw new Error(`Unknown sensor type: ${config.type}`);
  }
}
```

### 5.3 Observer Pattern (via React)

**Usado en:** Comunicación entre componentes

```typescript
// MainInterface observa cambios en SimulatedRobot
<SimulatedRobot
  onRobotReady={(robot) => {
    robotInstanceRef.current = robot;
    setIsRobotReady(true);  // Trigger re-render
  }}
  onSensorUpdate={(readings) => {
    setSensorReadings(readings);  // Actualiza panel
  }}
/>
```

### 5.4 Strategy Pattern

**Usado en:** Categorización de piezas

```typescript
// PartCategorizer.ts
private identifyPartCategory(partId: string): Category {
  // Estrategia 1: Buscar en diccionario
  if (CRITICAL_PARTS[partId]) {
    return CRITICAL_PARTS[partId].category;
  }

  // Estrategia 2: Pattern matching
  if (this.isMotorPart(partId)) return 'motor';
  if (this.isWheelPart(partId)) return 'wheel';
  if (this.isSensorPart(partId)) return 'sensor';

  // Default
  return 'structural';
}
```

### 5.5 Bridge Pattern

**Usado en:** Python ↔ JavaScript

```typescript
// El Bridge conecta el mundo Python (Skulpt) con JavaScript (robotAPI)

// Lado Python (strings que Skulpt interpreta)
`def run(self, speed):
    __robot_motor_run(self.port, speed)`

// Bridge (built-in functions de Skulpt)
__robot_motor_run = new Sk.builtin.func((port, speed) => {
  const portStr = Sk.ffi.remapToJs(port);    // Python → JS
  const speedNum = Sk.ffi.remapToJs(speed);
  robotAPI.motor.run(portStr, speedNum);      // Ejecutar en JS
  return Sk.builtin.none.none$;               // JS → Python
});

// Lado JavaScript (robotAPI en SimulatedRobot)
robotAPI.motor.run = (port, speed) => {
  const motor = motorControllersRef.current.get(port);
  motor.setSpeed(speed);
};
```

---

## 6. Sistema de Tipos

### 6.1 Tipos Principales (src/types/index.ts)

```typescript
// ═══════════════════════════════════════════════════════════════
// TIPOS DE PIEZAS
// ═══════════════════════════════════════════════════════════════

export interface PartInstance {
  id: string;                    // UUID único
  partId: string;                // ID de pieza LEGO (ej: "54696")
  position: THREE.Vector3;       // Posición en el modelo
  rotation: THREE.Euler;         // Rotación
  color: number;                 // Código de color LDraw
  category?: 'motor' | 'wheel' | 'sensor' | 'structural';
}

export interface PartDefinition {
  name: string;
  category: string;
  mass?: number;                 // Masa en gramos
  dimensions?: { x: number; y: number; z: number };
}

// ═══════════════════════════════════════════════════════════════
// TIPOS DE MODELO
// ═══════════════════════════════════════════════════════════════

export interface ParsedModel {
  parts: PartInstance[];
  metadata: {
    name?: string;
    author?: string;
    partCount: number;
  };
}

// ═══════════════════════════════════════════════════════════════
// TIPOS DE ROBOT CONSTRUIDO
// ═══════════════════════════════════════════════════════════════

export interface RiggedRobotData {
  id: string;
  name: string;
  chassis: ChassisData;
  motorJoints: MotorJoint[];
  sensors: SensorConfig[];
  visualMesh: THREE.Group;
  partCount: number;
}

export interface ChassisData {
  mass: number;                  // kg
  centerOfMass: THREE.Vector3;
  dimensions: { x: number; y: number; z: number };
  collisionShape: {
    type: 'convex' | 'box';
    vertices?: number[];
  };
}

export interface MotorJoint {
  port: string;                  // 'A', 'B', 'C', 'D'
  motorPartId: string;
  axlePosition: THREE.Vector3;
  axleDirection: THREE.Vector3;
  wheelPartIds: string[];
  wheelRadius: number;
}

export interface SensorConfig {
  port: string;                  // '1', '2', '3', '4'
  type: 'color' | 'ultrasonic' | 'gyro';
  position: THREE.Vector3;
  direction: THREE.Vector3;
}

// ═══════════════════════════════════════════════════════════════
// TIPOS DE INSTANCIA DE ROBOT (runtime)
// ═══════════════════════════════════════════════════════════════

export interface RobotInstance {
  riggedData: RiggedRobotData;
  physicsBody: CANNON.Body;
  visualGroup: THREE.Group;
  motorControllers: Map<string, VirtualSpikeMotor>;
  sensorSimulators: Map<string, any>;
}

// ═══════════════════════════════════════════════════════════════
// TIPOS DE SENSORES
// ═══════════════════════════════════════════════════════════════

export interface SensorReading {
  port: string;
  type: 'color' | 'ultrasonic' | 'gyro';
  value: any;
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════════
// DICCIONARIO DE PIEZAS CRÍTICAS
// ═══════════════════════════════════════════════════════════════

export const CRITICAL_PARTS: Record<string, PartDefinition> = {
  // Motores
  '54696': { name: 'SPIKE Large Motor', category: 'motor', mass: 80 },
  '54675': { name: 'SPIKE Medium Motor', category: 'motor', mass: 55 },
  '99499': { name: 'EV3 Large Motor', category: 'motor', mass: 80 },
  '95658': { name: 'EV3 Medium Motor', category: 'motor', mass: 36 },

  // Ruedas
  '56908': { name: 'Wheel 43.2x22', category: 'wheel', mass: 15 },
  '44309': { name: 'Wheel 30.4x20', category: 'wheel', mass: 10 },

  // Sensores
  '37308': { name: 'SPIKE Color Sensor', category: 'sensor', mass: 25 },
  '37316': { name: 'SPIKE Ultrasonic', category: 'sensor', mass: 25 },
  '95650': { name: 'EV3 Color Sensor', category: 'sensor', mass: 25 },
  '95652': { name: 'EV3 Ultrasonic', category: 'sensor', mass: 25 },
};
```

### 6.2 Diagrama de Relaciones de Tipos

```
                    ParsedModel
                         │
                         │ parts[]
                         ▼
                   PartInstance ─────────► PartDefinition
                         │                 (from CRITICAL_PARTS)
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
      (motors)       (wheels)      (sensors)
          │              │              │
          └──────────────┼──────────────┘
                         │
                         ▼
                  RiggedRobotData
                    │    │    │
         ┌──────────┘    │    └──────────┐
         ▼               ▼               ▼
    ChassisData    MotorJoint[]    SensorConfig[]
         │               │               │
         └───────────────┼───────────────┘
                         │
                         ▼
                  RobotInstance (runtime)
                    │         │
         ┌──────────┘         └──────────┐
         ▼                               ▼
   CANNON.Body              VirtualSpikeMotor[]
   THREE.Group              SensorSimulator[]
```

---

## 7. Interconexiones entre Módulos

### 7.1 Grafo de Dependencias

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        GRAFO DE DEPENDENCIAS                             │
└─────────────────────────────────────────────────────────────────────────┘

                          ┌─────────────────┐
                          │   App.tsx       │
                          └────────┬────────┘
                                   │
                                   ▼
                          ┌─────────────────┐
                          │ MainInterface   │
                          └────────┬────────┘
                                   │
          ┌────────────────────────┼────────────────────────┐
          │                        │                        │
          ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  CodeEditor     │    │ SimulationScene │    │  SensorPanel    │
└─────────────────┘    └────────┬────────┘    └─────────────────┘
                                │
                   ┌────────────┼────────────┐
                   │            │            │
                   ▼            ▼            ▼
         ┌─────────────┐ ┌───────────┐ ┌──────────────┐
         │FLLTrack     │ │Simulated  │ │ (Lighting)   │
         └─────────────┘ │Robot      │ └──────────────┘
                         └─────┬─────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
         ▼                     ▼                     ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│VirtualSpike     │  │ Sensor          │  │ CANNON.Body     │
│Motor            │  │ Simulators      │  │ (manual)        │
└────────┬────────┘  └─────────────────┘  └─────────────────┘
         │
         ▼
┌─────────────────┐
│ CANNON.Body     │
│ (referencia)    │
└─────────────────┘


MÓDULOS INDEPENDIENTES (sin dependencias de componentes):

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ CodeInterpreter │    │  LDrawParser    │    │TestRobotGenerator│
│     (Skulpt)    │    │    (JSZip)      │    │                 │
└────────┬────────┘    └────────┬────────┘    └────────┬────────┘
         │                      │                      │
         │                      ▼                      │
         │             ┌─────────────────┐             │
         │             │ PartCategorizer │◄────────────┘
         │             └────────┬────────┘
         │                      │
         │                      ▼
         │             ┌─────────────────┐
         └────────────►│   RigBuilder    │
                       └─────────────────┘
```

### 7.2 Comunicación entre Módulos

| De | A | Mecanismo | Datos |
|----|---|-----------|-------|
| MainInterface | SimulatedRobot | Props | `riggedRobot` |
| SimulatedRobot | MainInterface | Callback | `onRobotReady(instance)` |
| SimulatedRobot | window | Global | `window.robotAPI` |
| CodeInterpreter | window.robotAPI | Bridge | Comandos Python |
| window.robotAPI | VirtualSpikeMotor | Method call | `setSpeed(speed)` |
| VirtualSpikeMotor | CANNON.Body | Force | `applyForce()` |
| useFrame | Three.js | Sync | Position/Rotation |

### 7.3 Ejemplo de Comunicación Completa

```
Usuario click "Run"
       │
       ▼
MainInterface.handleRunCode()
       │
       ├─► Verifica robotInstanceRef.current existe
       │
       ▼
codeInterpreter.executePython(pythonCode)
       │
       ├─► wrapCodeWithAPI() → Añade clases Motor, wait, etc.
       │
       ├─► runSkulpt(wrappedCode)
       │       │
       │       ├─► Sk.configure() → output callback, read modules
       │       │
       │       ├─► Crear builtinFuncs (__robot_motor_run, etc.)
       │       │
       │       ├─► Inyectar en Sk.builtins
       │       │
       │       └─► Sk.importMainWithBody(code)
       │               │
       │               ▼
       │         Python ejecuta: motor_a.run(50)
       │               │
       │               ▼
       │         Python llama: __robot_motor_run('A', 50)
       │               │
       │               ▼
       │         JS ejecuta: robotAPI.motor.run('A', 50)
       │               │
       │               ▼
       │         SimulatedRobot: motor.setSpeed(50)
       │               │
       │               ▼
       │         VirtualSpikeMotor: this.isRunning = true
       │                            this.targetVelocity = X
       │
       └─► Return { success: true, output: [...] }


En cada frame (useFrame):
       │
       ▼
motor.update(delta)
       │
       ├─► Calcula error PID
       │
       ├─► Calcula fuerza
       │
       ├─► chassisBody.applyForce(force, position)
       │
       ▼
Robot se mueve en la simulación 3D
```

---

## 8. Motor de Física

### 8.1 Arquitectura de Física

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         MOTOR DE FÍSICA                                  │
└─────────────────────────────────────────────────────────────────────────┘

Nota: @react-three/cannon NO expone CANNON.Body directamente.
Solución: Crear body manualmente y sincronizar con visual.

┌─────────────────────────────────────────────────────────────────────────┐
│  CANNON.Body (creado manualmente en SimulatedRobot.tsx)                 │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │ Propiedades:                                                        ││
│  │   mass: 0.035 kg (calculada de piezas)                             ││
│  │   position: Vec3(0, 0.1, 0)                                        ││
│  │   velocity: Vec3(0, 0, 0)                                          ││
│  │   quaternion: Quaternion(0, 0, 0, 1)                               ││
│  │   linearDamping: 0.3                                               ││
│  │   angularDamping: 0.3                                              ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │ Shapes:                                                             ││
│  │   [0] Box(0.075, 0.04, 0.075) - Chassis                            ││
│  │   [1] Cylinder(0.028, 0.028, 0.012) - Rueda izquierda              ││
│  │   [2] Cylinder(0.028, 0.028, 0.012) - Rueda derecha                ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │ Material:                                                           ││
│  │   friction: 0.9 (goma sobre superficie)                            ││
│  │   restitution: 0.1 (poco rebote)                                   ││
│  └────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ useFrame (60 fps)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  LOOP DE FÍSICA (useFrame callback)                                     │
│                                                                          │
│  1. GRAVEDAD                                                            │
│     body.velocity.y -= 9.81 * deltaTime                                 │
│                                                                          │
│  2. INTEGRACIÓN DE POSICIÓN                                             │
│     body.position.x += body.velocity.x * deltaTime                      │
│     body.position.y += body.velocity.y * deltaTime                      │
│     body.position.z += body.velocity.z * deltaTime                      │
│                                                                          │
│  3. COLISIÓN CON SUELO                                                  │
│     if (body.position.y < 0.05) {                                       │
│       body.position.y = 0.05;                                           │
│       body.velocity.y = 0;                                              │
│     }                                                                    │
│                                                                          │
│  4. ACTUALIZAR MOTORES                                                  │
│     motors.forEach(motor => motor.update(deltaTime));                   │
│     // Cada motor puede llamar body.applyForce()                        │
│                                                                          │
│  5. SINCRONIZAR VISUAL                                                  │
│     threeGroup.position.copy(body.position);                            │
│     threeGroup.quaternion.copy(body.quaternion);                        │
└─────────────────────────────────────────────────────────────────────────┘
```

### 8.2 VirtualSpikeMotor - Detalle

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       VirtualSpikeMotor                                  │
└─────────────────────────────────────────────────────────────────────────┘

ESPECIFICACIONES (basadas en SPIKE Large Motor real):
┌────────────────────────────────────────────────────────────────────────┐
│  maxAngularVelocity = 175 RPM = 18.33 rad/s                            │
│  stallTorque = 0.25 N⋅m                                                │
│  wheelRadius = 0.028 m (28mm, rueda típica)                            │
│  mass = 0.080 kg                                                       │
└────────────────────────────────────────────────────────────────────────┘

CONTROLADOR PID:
┌────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  targetVelocity ──┬──► (+) ──► [  Kp  ] ──┬                            │
│                   │     ▲                  │                            │
│                   │     │                  │                            │
│  currentVelocity ─┴──► (-) ──► error ──┬──┼──► pidOutput               │
│                                        │  │                            │
│                              ┌─────────┘  │                            │
│                              ▼            │                            │
│                        [ ∫ Ki dt ] ───────┤                            │
│                              │            │                            │
│                              ▼            │                            │
│                        [ Kd d/dt ] ───────┘                            │
│                                                                         │
│  Ganancias: Kp=0.8, Ki=0.15, Kd=0.08                                   │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘

CÁLCULO DE FUERZA:
┌────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  F = (τ / r) × pidOutput                                               │
│                                                                         │
│  Donde:                                                                │
│    τ = stallTorque = 0.25 N⋅m                                          │
│    r = wheelRadius = 0.028 m                                           │
│    pidOutput = salida del controlador PID (0 a 1)                      │
│                                                                         │
│  Fmax = 0.25 / 0.028 = 8.93 N                                          │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘

APLICACIÓN DE FUERZA:
┌────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  1. Obtener dirección forward del robot                                │
│     forwardDir = Vec3(0, 0, -1)                                        │
│     body.quaternion.vmult(forwardDir, forwardDir)                      │
│                                                                         │
│  2. Calcular posición de la rueda en world space                       │
│     wheelLocalPos = jointConfig.axlePosition                           │
│     wheelWorldPos = body.position + rotate(wheelLocalPos)              │
│                                                                         │
│  3. Aplicar fuerza                                                     │
│     force = forwardDir × forceMagnitude                                │
│     body.applyForce(force, wheelWorldPos)                              │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Intérprete Python/Skulpt

### 9.1 Arquitectura del Bridge Python ↔ JavaScript

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    BRIDGE PYTHON ↔ JAVASCRIPT                            │
└─────────────────────────────────────────────────────────────────────────┘

LADO PYTHON (código que ve el usuario):
┌────────────────────────────────────────────────────────────────────────┐
│ # Usuario escribe:                                                      │
│ motor_a = Motor('A')                                                   │
│ motor_a.run(50)                                                        │
│ wait(2000)                                                             │
│ motor_a.stop()                                                         │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
WRAPPER (código añadido automáticamente):
┌────────────────────────────────────────────────────────────────────────┐
│ class Motor:                                                            │
│     def __init__(self, port):                                          │
│         self.port = port                                               │
│                                                                         │
│     def run(self, speed):                                              │
│         __robot_motor_run(self.port, speed)  ◄── Built-in function     │
│                                                                         │
│     def stop(self):                                                    │
│         __robot_motor_stop(self.port)                                  │
│                                                                         │
│ def wait(milliseconds):                                                │
│     __robot_wait(milliseconds)                                         │
│                                                                         │
│ # === CÓDIGO DEL USUARIO ===                                           │
│ motor_a = Motor('A')                                                   │
│ motor_a.run(50)                                                        │
│ wait(2000)                                                             │
│ motor_a.stop()                                                         │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
BUILT-IN FUNCTIONS (inyectadas en Skulpt):
┌────────────────────────────────────────────────────────────────────────┐
│ // CodeInterpreter.ts                                                  │
│                                                                         │
│ const builtinFuncs = {                                                 │
│                                                                         │
│   __robot_motor_run: new Sk.builtin.func((port, speed) => {           │
│     // Convertir tipos Python → JavaScript                             │
│     const portStr = Sk.ffi.remapToJs(port);   // Py str → JS string   │
│     const speedNum = Sk.ffi.remapToJs(speed); // Py int → JS number   │
│                                                                         │
│     // Llamar al robot API                                             │
│     window.robotAPI.motor.run(portStr, speedNum);                      │
│                                                                         │
│     // Retornar None a Python                                          │
│     return Sk.builtin.none.none$;                                      │
│   }),                                                                  │
│                                                                         │
│   __robot_wait: new Sk.builtin.func((ms) => {                         │
│     const msNum = Sk.ffi.remapToJs(ms);                                │
│                                                                         │
│     // Crear suspension para operación async                           │
│     const susp = new Sk.misceval.Suspension();                         │
│     susp.resume = () => Sk.builtin.none.none$;                         │
│     susp.data = {                                                      │
│       type: 'Sk.promise',                                              │
│       promise: robotAPI.wait(msNum)                                    │
│     };                                                                 │
│     return susp;                                                       │
│   })                                                                   │
│ };                                                                     │
│                                                                         │
│ // Inyectar en Skulpt                                                  │
│ Object.entries(builtinFuncs).forEach(([name, func]) => {              │
│   Sk.builtins[name] = func;                                            │
│ });                                                                    │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
ROBOT API (definida en SimulatedRobot.tsx):
┌────────────────────────────────────────────────────────────────────────┐
│ // SimulatedRobot.tsx - setupRobotAPI()                                │
│                                                                         │
│ window.robotAPI = {                                                    │
│   motor: {                                                             │
│     run: (port: string, speed: number) => {                           │
│       const motor = motorControllersRef.current.get(port);            │
│       if (motor) {                                                     │
│         motor.setSpeed(speed);                                         │
│       }                                                                │
│     },                                                                 │
│     stop: (port: string) => {                                         │
│       const motor = motorControllersRef.current.get(port);            │
│       if (motor) motor.stop();                                         │
│     },                                                                 │
│     // ... más métodos                                                 │
│   },                                                                   │
│   sensor: { /* ... */ },                                               │
│   wait: (ms: number) => new Promise(r => setTimeout(r, ms)),          │
│   print: (msg: string) => console.log('[Robot]:', msg)                │
│ };                                                                     │
└────────────────────────────────────────────────────────────────────────┘
```

### 9.2 Problema Actual con Skulpt

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    🔴 BUG ACTUAL: ERROR DE SKULPT                        │
└─────────────────────────────────────────────────────────────────────────┘

SÍNTOMA:
┌────────────────────────────────────────────────────────────────────────┐
│ ❌ Python execution error: constructor {args: constructor, traceback}  │
└────────────────────────────────────────────────────────────────────────┘

PUNTO DE FALLA:
┌────────────────────────────────────────────────────────────────────────┐
│ // CodeInterpreter.ts línea ~345                                       │
│ Sk.misceval                                                            │
│   .asyncToPromise(() => Sk.importMainWithBody('<stdin>', false, code)) │
│   .catch((err) => {                                                    │
│     // El error llega aquí pero sin información útil                   │
│   });                                                                  │
└────────────────────────────────────────────────────────────────────────┘

POSIBLES CAUSAS:

1. SINTAXIS DEL WRAPPER
   ┌──────────────────────────────────────────────────────────────────┐
   │ El código Python generado puede tener errores de sintaxis o      │
   │ indentación que Skulpt no puede manejar.                         │
   │                                                                   │
   │ PRUEBA: Ejecutar solo `print("hello")` sin wrapper               │
   └──────────────────────────────────────────────────────────────────┘

2. BUILT-IN FUNCTIONS MAL DEFINIDAS
   ┌──────────────────────────────────────────────────────────────────┐
   │ Las funciones __robot_* pueden tener un problema con:            │
   │ - Sk.ffi.remapToJs / remapToPy                                   │
   │ - Sk.builtin.none.none$                                          │
   │ - new Sk.builtin.func()                                          │
   │                                                                   │
   │ PRUEBA: Probar cada función individualmente                      │
   └──────────────────────────────────────────────────────────────────┘

3. VERSIÓN DE SKULPT
   ┌──────────────────────────────────────────────────────────────────┐
   │ La versión de Skulpt (1.2.0) puede tener incompatibilidades     │
   │ con el código que estamos usando.                                │
   │                                                                   │
   │ PRUEBA: Verificar versión y comparar con documentación           │
   └──────────────────────────────────────────────────────────────────┘

4. CONFIGURACIÓN DE Sk.configure
   ┌──────────────────────────────────────────────────────────────────┐
   │ La configuración de Skulpt puede estar incompleta o incorrecta: │
   │ - output callback                                                │
   │ - read callback (para módulos)                                   │
   │ - __future__ settings                                            │
   │                                                                   │
   │ PRUEBA: Simplificar configuración al mínimo                      │
   └──────────────────────────────────────────────────────────────────┘

PLAN DE DEBUGGING:

1. ┌─────────────────────────────────────────────────────────────────┐
   │ PASO 1: Probar código mínimo                                    │
   │                                                                  │
   │ const testCode = 'print("hello")';                              │
   │ await codeInterpreter.executePython(testCode);                  │
   │                                                                  │
   │ Si funciona → problema está en el wrapper                       │
   │ Si falla → problema está en configuración de Skulpt             │
   └─────────────────────────────────────────────────────────────────┘

2. ┌─────────────────────────────────────────────────────────────────┐
   │ PASO 2: Probar wrapper sin built-ins                            │
   │                                                                  │
   │ const testCode = `                                              │
   │ class Motor:                                                    │
   │     def __init__(self, port):                                   │
   │         self.port = port                                        │
   │                                                                  │
   │ m = Motor('A')                                                  │
   │ print(m.port)                                                   │
   │ `;                                                              │
   │                                                                  │
   │ Si funciona → problema está en built-in functions               │
   │ Si falla → problema está en sintaxis de clases                  │
   └─────────────────────────────────────────────────────────────────┘

3. ┌─────────────────────────────────────────────────────────────────┐
   │ PASO 3: Probar built-in function simple                         │
   │                                                                  │
   │ Sk.builtins['test_func'] = new Sk.builtin.func(() => {         │
   │   console.log('test_func called');                              │
   │   return Sk.builtin.none.none$;                                 │
   │ });                                                             │
   │                                                                  │
   │ const testCode = 'test_func()';                                 │
   │                                                                  │
   │ Si funciona → problema específico en __robot_* functions        │
   │ Si falla → problema general con built-in injection              │
   └─────────────────────────────────────────────────────────────────┘
```

---

## 10. Debugging Guide

### 10.1 Sistema de Logging

El proyecto usa emojis para categorizar logs:

| Emoji | Categoría | Ejemplo |
|-------|-----------|---------|
| 🔧 | Inicialización | `🔧 Creating physics body manually...` |
| ✅ | Éxito | `✅ Motors initialized: 2` |
| ❌ | Error | `❌ Python execution error` |
| ⚠️ | Advertencia | `⚠️ No motors detected!` |
| 🚗 | Motores | `🚗 Motor.run(A, 50)` |
| 🐍 | Python | `🐍 Starting Python execution...` |
| 📦 | Parsing | `📦 Starting to parse Studio file` |
| 🎯 | Callbacks | `🎯 Calling onRobotReady callback...` |
| ⏰ | Timing | `⏰ Initialization attempt 1/10...` |
| 📊 | Estado | `📊 Current state: {...}` |

### 10.2 Comandos de Consola para Debugging

```javascript
// ═══════════════════════════════════════════════════════════════
// VERIFICAR ESTADO GENERAL
// ═══════════════════════════════════════════════════════════════

// Ver si robotAPI existe
console.log('robotAPI:', !!window.robotAPI);

// Ver si Skulpt está cargado
console.log('Skulpt:', typeof window.Sk);

// Ver estructura completa del robotAPI
console.log('robotAPI structure:', window.robotAPI);

// ═══════════════════════════════════════════════════════════════
// PROBAR MOTORES MANUALMENTE
// ═══════════════════════════════════════════════════════════════

// Activar motor A
window.robotAPI.motor.run('A', 50);

// Ver ángulo del motor
console.log('Motor A angle:', window.robotAPI.motor.getAngle('A'));

// Detener motor
window.robotAPI.motor.stop('A');

// ═══════════════════════════════════════════════════════════════
// PROBAR SKULPT DIRECTAMENTE
// ═══════════════════════════════════════════════════════════════

// Configuración mínima de Skulpt
Sk.configure({
  output: (text) => console.log('[Py]:', text),
  read: (f) => { throw new Error('Module not found: ' + f); }
});

// Ejecutar código simple
Sk.misceval.asyncToPromise(() =>
  Sk.importMainWithBody('<test>', false, 'print("hello")', true)
).then(() => console.log('OK')).catch(e => console.error('Error:', e));

// ═══════════════════════════════════════════════════════════════
// INSPECCIONAR FÍSICA
// ═══════════════════════════════════════════════════════════════

// Si tienes acceso al body (desde consola de React DevTools)
// body.position → Vec3(x, y, z)
// body.velocity → Vec3(vx, vy, vz)
// body.quaternion → Quaternion(x, y, z, w)

// ═══════════════════════════════════════════════════════════════
// MONITOREO EN TIEMPO REAL
// ═══════════════════════════════════════════════════════════════

// Monitor de motores (ejecutar en consola)
const monitor = setInterval(() => {
  if (window.robotAPI) {
    console.clear();
    console.log('Motor A:', {
      angle: window.robotAPI.motor.getAngle('A').toFixed(1),
      speed: window.robotAPI.motor.getSpeed('A').toFixed(1)
    });
    console.log('Motor B:', {
      angle: window.robotAPI.motor.getAngle('B').toFixed(1),
      speed: window.robotAPI.motor.getSpeed('B').toFixed(1)
    });
  }
}, 500);

// Para detener: clearInterval(monitor);
```

### 10.3 Breakpoints Recomendados

| Archivo | Línea | Propósito |
|---------|-------|-----------|
| `MainInterface.tsx` | `handleRunCode` | Ver inicio de ejecución |
| `CodeInterpreter.ts` | `executePython` | Ver código a ejecutar |
| `CodeInterpreter.ts` | `runSkulpt` | Ver configuración Skulpt |
| `CodeInterpreter.ts` | `Sk.importMainWithBody` | Ver ejecución Python |
| `SimulatedRobot.tsx` | `useEffect` | Ver inicialización física |
| `SimulatedRobot.tsx` | `useFrame` | Ver loop de física |
| `VirtualSpikeMotor.ts` | `setSpeed` | Ver activación de motor |
| `VirtualSpikeMotor.ts` | `update` | Ver aplicación de fuerzas |

---

## 11. Problemas Conocidos y Soluciones

### 11.1 Problema: Error de Skulpt al ejecutar Python

**Estado:** 🔴 ABIERTO - CRÍTICO

**Síntoma:**
```
❌ Python execution error: constructor {args: constructor, traceback: Array(1)}
```

**Diagnóstico realizado:**
- ✅ Skulpt está cargado (`window.Sk` existe)
- ✅ robotAPI está disponible (`window.robotAPI` existe)
- ❌ El error ocurre en `Sk.importMainWithBody()`

**Próximos pasos para resolver:**

```javascript
// PASO 1: Probar ejecución mínima (ejecutar en consola)
Sk.configure({
  output: (t) => console.log('[Py]:', t),
  read: (f) => { throw new Error('Module not found'); }
});
Sk.misceval.asyncToPromise(() =>
  Sk.importMainWithBody('<t>', false, 'print("hello")', true)
).then(() => console.log('OK')).catch(e => console.error(e));

// PASO 2: Si paso 1 funciona, probar con clase
const code = `
class Test:
    def __init__(self):
        self.x = 1

t = Test()
print(t.x)
`;
Sk.misceval.asyncToPromise(() =>
  Sk.importMainWithBody('<t>', false, code, true)
).then(() => console.log('OK')).catch(e => console.error(e));

// PASO 3: Si paso 2 funciona, el problema está en los built-ins
```

### 11.2 Problema: @react-three/cannon no expone body

**Estado:** ✅ RESUELTO

**Solución implementada:** Crear CANNON.Body manualmente

```typescript
// En lugar de intentar obtener body de useCompoundBody:
const [ref, api] = useCompoundBody(...);
// api.body es undefined!

// Solución: crear body manualmente
const body = new CANNON.Body({
  mass: riggedData.chassis.mass,
  position: new CANNON.Vec3(x, y, z),
  // ...
});

// Sincronizar en useFrame
useFrame(() => {
  ref.current.position.copy(body.position);
  ref.current.quaternion.copy(body.quaternion);
});
```

### 11.3 Problema: Motores no se mueven

**Estado:** 🟡 DEPENDE DE SKULPT

El problema es que `motor.setSpeed()` nunca se llama porque Python falla antes. Una vez resuelto el problema de Skulpt, los motores deberían funcionar.

**Para verificar que motores funcionan sin Python:**

```javascript
// Ejecutar directamente en consola
window.robotAPI.motor.run('A', 50);
// El robot debería empezar a moverse

// Detener después de unos segundos
setTimeout(() => window.robotAPI.motor.stop('A'), 3000);
```

---

## 12. Testing

### 12.1 Tests Manuales Recomendados

#### Test 1: Carga de Robot

```
1. Abrir aplicación
2. Click "Test Robot"
3. Verificar logs:
   - ✅ 🧪 Generating minimal test robot...
   - ✅ ✅ Test robot rigged
   - ✅ 🔧 Creating physics body manually...
   - ✅ ✅ Motors initialized: 2
   - ✅ 🎯 Calling onRobotReady callback...
4. Indicador debe cambiar a 🟢 Ready
```

#### Test 2: Robot API Manual

```javascript
// Ejecutar en consola después de cargar robot

// 1. Verificar API existe
console.assert(window.robotAPI, 'robotAPI should exist');
console.assert(window.robotAPI.motor, 'motor API should exist');

// 2. Probar motor
window.robotAPI.motor.run('A', 50);
// Esperar 2 segundos, robot debe moverse

// 3. Detener
window.robotAPI.motor.stop('A');

// 4. Verificar ángulo cambió
const angle = window.robotAPI.motor.getAngle('A');
console.assert(angle !== 0, 'Angle should have changed');
```

#### Test 3: Python Básico

```python
# Código para probar en el editor
print("Test 1: Print works")

x = 1 + 1
print("Test 2: Math works, x =", x)

class Test:
    pass
print("Test 3: Class definition works")
```

### 12.2 Tests Unitarios (Por Implementar)

```typescript
// Ejemplo de estructura de tests sugerida

// __tests__/PartCategorizer.test.ts
describe('PartCategorizer', () => {
  it('should identify motor parts', () => {
    const parts = [{ partId: '54696', ... }];
    const result = partCategorizer.categorizeParts(parts);
    expect(result.motors.length).toBe(1);
  });

  it('should identify wheel parts', () => {
    const parts = [{ partId: '56908', ... }];
    const result = partCategorizer.categorizeParts(parts);
    expect(result.wheels.length).toBe(1);
  });
});

// __tests__/VirtualSpikeMotor.test.ts
describe('VirtualSpikeMotor', () => {
  it('should set target velocity on setSpeed', () => {
    const motor = new VirtualSpikeMotor('A', joint, 'spike-large');
    motor.initialize(mockBody);
    motor.setSpeed(50);
    expect(motor.isRunning).toBe(true);
  });

  it('should apply force on update', () => {
    const motor = new VirtualSpikeMotor('A', joint, 'spike-large');
    motor.initialize(mockBody);
    motor.setSpeed(50);
    motor.update(0.016);
    expect(mockBody.applyForce).toHaveBeenCalled();
  });
});
```

---

## 13. Guía de Contribución

### 13.1 Configuración del Entorno

```bash
# 1. Clonar repositorio
git clone https://github.com/user/LegoMaster.git
cd LegoMaster

# 2. Instalar dependencias
pnpm install
# o
npm install

# 3. Iniciar servidor de desarrollo
pnpm dev
# o usar Docker
./run-dev.sh

# 4. Abrir en navegador
# http://localhost:5173
```

### 13.2 Estructura de Branches

```
main                    # Producción
├── dev                 # Desarrollo activo
│   ├── feature/*       # Nuevas funcionalidades
│   ├── fix/*           # Correcciones de bugs
│   └── refactor/*      # Refactorizaciones
```

### 13.3 Convenciones de Código

```typescript
// ═══════════════════════════════════════════════════════════════
// NOMBRES
// ═══════════════════════════════════════════════════════════════

// Componentes: PascalCase
export function SimulatedRobot() { }

// Funciones/variables: camelCase
const motorController = new VirtualSpikeMotor();

// Constantes: UPPER_SNAKE_CASE
const MAX_ANGULAR_VELOCITY = 175;

// Interfaces/Types: PascalCase con prefijo I opcional
interface RiggedRobotData { }
type MotorPort = 'A' | 'B' | 'C' | 'D';

// ═══════════════════════════════════════════════════════════════
// LOGGING
// ═══════════════════════════════════════════════════════════════

// Usar emojis para categorizar
console.log('🔧 Initializing...');   // Inicialización
console.log('✅ Success!');          // Éxito
console.error('❌ Error:', err);     // Error
console.warn('⚠️ Warning');          // Advertencia

// ═══════════════════════════════════════════════════════════════
// COMENTARIOS
// ═══════════════════════════════════════════════════════════════

// Comentarios de sección con líneas
// ═══════════════════════════════════════════════════════════════
// NOMBRE DE SECCIÓN
// ═══════════════════════════════════════════════════════════════

// JSDoc para funciones públicas
/**
 * Ejecuta código Python usando Skulpt
 * @param code - Código Python a ejecutar
 * @returns Resultado de la ejecución
 */
async executePython(code: string): Promise<CodeExecutionResult>
```

### 13.4 Checklist para Pull Requests

```markdown
## Descripción
[Describir los cambios realizados]

## Tipo de cambio
- [ ] Bug fix
- [ ] Nueva funcionalidad
- [ ] Refactorización
- [ ] Documentación

## Checklist
- [ ] El código compila sin errores (`pnpm build`)
- [ ] Se probó manualmente la funcionalidad
- [ ] Se actualizó la documentación si es necesario
- [ ] Los logs usan el sistema de emojis
- [ ] No hay console.log de debugging olvidados
```

---

## 📞 Contacto y Recursos

- **Repositorio:** [GitHub](https://github.com/user/LegoMaster)
- **Issues:** Para reportar bugs o sugerir mejoras
- **Documentación Skulpt:** [skulpt.org](https://skulpt.org)
- **Three.js:** [threejs.org](https://threejs.org)
- **Cannon-es:** [pmndrs/cannon-es](https://github.com/pmndrs/cannon-es)

---

**Última actualización:** Enero 2026
**Versión del documento:** 1.0
**Autor:** Equipo LegoMaster
