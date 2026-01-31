# 🤖 Lego Master - FLL Simulator

Una **Progressive Web App (PWA)** educativa para competidores de la **First Lego League**. Simula robots LEGO personalizados con física realista, sensores funcionales e interacción con pistas de competición.

![Lego Master](https://via.placeholder.com/800x400?text=Lego+Master+Screenshot)

## 🎯 Características Principales

### 🔧 Constructor de Robots
- **Importación de modelos**: Soporta archivos `.io` de BrickLink Studio, `.ldr` y `.mpd`
- **Rigging automático**: Detección inteligente de motores, ruedas y sensores
- **Física realista**: Motor de física Cannon.js con parámetros calibrados para LEGO

### 🎮 Simulación 3D
- **Motor gráfico**: Three.js + React Three Fiber para renderizado 60 FPS
- **Pistas FLL**: Modelos 3D de mesas de competición oficiales
- **Elementos de misión**: Palancas, compuertas y objetivos interactivos

### 🐍 Programación Python
- **Intérprete en navegador**: Ejecuta código Python usando Skulpt
- **API compatible**: Sintaxis similar a SPIKE Prime y EV3 MicroPython
- **Sensores simulados**:
  - Sensor de color con detección RGB
  - Sensor ultrasónico con raycasting
  - Giroscopio para orientación

### 💾 Persistencia de Datos
- **Supabase Backend**: Almacena robots, sesiones y código
- **Modo offline**: Funciona sin conexión como PWA
- **Historial de versiones**: Control de versiones de código

---

## 🚀 Instalación y Configuración

### Requisitos Previos
- Node.js 18+ y npm/pnpm/yarn
- Cuenta de Supabase (gratuita)
- BrickLink Studio (para diseñar robots)

### 1. Clonar el Repositorio
```bash
git clone https://github.com/tu-usuario/lego-master.git
cd lego-master
```

### 2. Instalar Dependencias
```bash
npm install
```

### 3. Configurar Supabase

#### Crear Proyecto en Supabase
1. Ve a [supabase.com](https://supabase.com) y crea un nuevo proyecto
2. Copia la URL del proyecto y la clave anónima

#### Configurar Variables de Entorno
Crea un archivo `.env` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anonima-aqui
```

#### Ejecutar Migración de Base de Datos
1. En el dashboard de Supabase, ve a **SQL Editor**
2. Copia y ejecuta el contenido de `supabase/schema.sql`

#### Configurar Storage Buckets
1. Ve a **Storage** en Supabase
2. Crea los siguientes buckets:
   - `robot-models` (privado)
   - `thumbnails` (público)
   - `track-assets` (público)

### 4. Ejecutar en Desarrollo
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

### 5. Build para Producción
```bash
npm run build
npm run preview
```

---

## 📚 Guía de Uso

### Subir un Robot

1. **Diseña tu robot en BrickLink Studio**:
   - Usa piezas de SPIKE Prime o EV3
   - Asegúrate de incluir motores (IDs: `54696`, `99499`) y ruedas

2. **Exporta el modelo**:
   - File → Export As → Studio File (`.io`)

3. **Sube el archivo**:
   - Click en "Upload Robot" en Lego Master
   - Selecciona tu archivo `.io`
   - El sistema detectará automáticamente motores y sensores

### Programar el Robot

Ejemplo básico de código Python:

```python
# Crear motores (puertos A y B)
motor_a = Motor('A')
motor_b = Motor('B')

# Crear base de tracción
drive = DriveBase('A', 'B')

# Crear sensores
color_sensor = ColorSensor('1')
ultrasonic = UltrasonicSensor('2')

# Programa principal
print_robot("Iniciando misión...")

# Avanzar hasta detectar línea negra
drive.drive_straight(50)
while color_sensor.get_color() != 'black':
    wait(10)

drive.stop()
print_robot("Línea detectada!")

# Girar 90 grados
motor_a.run_for_rotations(2, 50)
motor_b.run_for_rotations(-2, 50)

# Avanzar hasta obstáculo
drive.drive_straight(40)
while ultrasonic.get_distance() > 10:
    wait(10)

drive.stop()
print_robot("¡Misión completada!")
```

### API de Motores

```python
# Crear motor
motor = Motor('A')  # Puertos: A, B, C, D

# Ejecutar a velocidad constante
motor.run(50)  # -100 a 100

# Ejecutar número de rotaciones
motor.run_for_rotations(2, speed=50)

# Detener motor
motor.stop()

# Leer ángulo actual
angle = motor.get_angle()  # En grados

# Leer velocidad
speed = motor.get_speed()  # En RPM
```

### API de Sensores

```python
# Sensor de Color
color_sensor = ColorSensor('1')
color = color_sensor.get_color()  # 'black', 'white', 'red', etc.
reflectance = color_sensor.get_reflectance()  # 0-100

# Sensor Ultrasónico
ultrasonic = UltrasonicSensor('2')
distance = ultrasonic.get_distance()  # cm (0-255)

# Funciones de Utilidad
wait(1000)  # Esperar 1000 ms
print_robot("Mensaje")  # Imprimir en consola
```

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                      LEGO MASTER PWA                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │   UI Layer   │  │  Code Editor │  │  Sensor Panel   │  │
│  │ (React/Tailwind) │  (Ace Editor) │  │                 │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬────────┘  │
│         │                  │                    │           │
│  ┌──────▼──────────────────▼────────────────────▼────────┐ │
│  │          Simulation Controller                        │ │
│  │  (State Management, Event Handling)                   │ │
│  └──────┬────────────────────────────────────────────────┘ │
│         │                                                   │
│  ┌──────▼──────────┐  ┌────────────┐  ┌─────────────────┐│
│  │  Code Interpreter│  │  Rig Builder│  │  LDraw Parser  ││
│  │    (Skulpt)     │  │  (Auto-Rig) │  │   (.io/.ldr)   ││
│  └──────┬──────────┘  └─────┬──────┘  └────────┬────────┘│
│         │                    │                   │         │
│  ┌──────▼────────────────────▼───────────────────▼──────┐ │
│  │              Physics & Rendering Engine              │ │
│  │                                                       │ │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────┐ │ │
│  │  │  Cannon.js  │  │  Three.js    │  │  R3F       │ │ │
│  │  │  (Physics)  │  │  (Graphics)  │  │  (React)   │ │ │
│  │  └─────────────┘  └──────────────┘  └────────────┘ │ │
│  │                                                       │ │
│  │  ┌─────────────────────────────────────────────────┐ │ │
│  │  │  Virtual Components                             │ │ │
│  │  │  • VirtualSpikeMotor (PID Controller)           │ │ │
│  │  │  • UltrasonicSensor (Raycasting)                │ │ │
│  │  │  • ColorSensor (Texture Sampling)               │ │ │
│  │  │  • GyroSensor (Quaternion Tracking)             │ │ │
│  │  └─────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Data Persistence Layer                   │  │
│  │                                                        │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │  │
│  │  │  Supabase    │  │  IndexedDB   │  │  LocalStore││  │
│  │  │  (Cloud DB)  │  │  (Offline)   │  │  (Cache)   ││  │
│  │  └──────────────┘  └──────────────┘  └────────────┘ │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Flujo de Ejecución del Código

```
1. Usuario escribe código Python
         ↓
2. CodeInterpreter parsea con Skulpt
         ↓
3. API calls a robotAPI (window.robotAPI)
         ↓
4. VirtualSpikeMotor recibe comando
         ↓
5. PID Controller calcula torque
         ↓
6. Cannon.js aplica fuerzas físicas
         ↓
7. Three.js renderiza posición actualizada
         ↓
8. Sensores leen estado del mundo
         ↓
9. Resultados retornan al código Python
```

---

## 🧪 Sistema de Rigging Automático

### Fase 1: Parsing
```typescript
LDrawParser.parseStudioFile(file)
  → Extrae archivo .io (ZIP)
  → Lee archivo .ldr principal
  → Convierte comandos LDraw a PartInstance[]
```

### Fase 2: Categorización
```typescript
PartCategorizer.categorizeParts(parts)
  → Identifica motores (IDs: 54696, 99499...)
  → Identifica ruedas (IDs: 56908, 44309...)
  → Identifica sensores (IDs: 37308, 95650...)
  → Resto → estructurales
```

### Fase 3: Detección de Ejes
```typescript
RigBuilder.detectWheelAxles(wheels)
  → Busca pares de ruedas alineadas
  → Calcula punto central del eje
  → Encuentra motor cercano (<10cm)
  → Crea HingeConstraint
```

### Fase 4: Generación de Física
```typescript
RigBuilder.buildChassisData(structural)
  → Calcula masa total
  → Calcula centro de masa
  → Genera ConvexHull para colisiones
  → Optimiza con InstancedMesh
```

---

## 🔬 Calibración de Física

### Especificaciones Reales vs Simuladas

| Componente | Valor Real | Valor Simulado | Unidad |
|------------|------------|----------------|--------|
| SPIKE Large Motor Max RPM | 175 | 175 | RPM |
| SPIKE Large Motor Stall Torque | 0.25 | 0.25 | N⋅m |
| Fricción Rueda-Neopreno | ~0.9 | 0.9 | - |
| Masa Ladrillo 2x4 | 2.5 | 2.5 | g |
| Gravedad | 9.81 | 9.81 | m/s² |

### Controlador PID
```
Kp = 0.8  // Ganancia proporcional
Ki = 0.15 // Ganancia integral
Kd = 0.08 // Ganancia derivativa

Torque = Kp×error + Ki×∫error + Kd×(derror/dt)
```

---

## 📁 Estructura del Proyecto

```
lego-master/
├── public/
│   └── assets/
│       └── tracks/          # Modelos 3D y texturas de pistas
├── src/
│   ├── components/
│   │   ├── CodeEditor.tsx   # Editor de código Ace
│   │   ├── FLLTrack.tsx     # Componente de pista FLL
│   │   ├── MainInterface.tsx# Interfaz principal
│   │   ├── RobotUploader.tsx# Modal de carga de robots
│   │   ├── SensorPanel.tsx  # Panel de sensores
│   │   └── SimulationScene.tsx # Escena 3D
│   ├── core/
│   │   ├── CodeInterpreter.ts  # Intérprete Python
│   │   ├── PartCategorizer.ts  # Clasificador de piezas
│   │   └── RigBuilder.ts       # Constructor de rigging
│   ├── parsers/
│   │   └── LDrawParser.ts   # Parser LDraw/Studio
│   ├── physics/
│   │   ├── PIDController.ts # Controlador PID
│   │   ├── SensorSimulators.ts # Sensores virtuales
│   │   └── VirtualSpikeMotor.ts # Motor virtual
│   ├── types/
│   │   └── index.ts         # Definiciones TypeScript
│   ├── lib/
│   │   └── supabase.ts      # Cliente Supabase
│   ├── App.tsx
│   ├── App.css
│   └── main.tsx
├── supabase/
│   └── schema.sql           # Schema de base de datos
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 🐛 Troubleshooting

### El robot no se mueve
- Verifica que los motores estén asignados a los puertos correctos
- Revisa la consola del navegador para errores
- Asegúrate de que el código use `wait()` entre comandos

### Sensores no detectan nada
- Confirma que los sensores estén orientados correctamente
- Verifica que la textura de la pista esté cargada
- Los sensores necesitan `update()` del loop de física

### El archivo .io no se carga
- Verifica que el archivo no esté corrupto
- Asegúrate de usar BrickLink Studio versión 2.0+
- Comprueba que el modelo tenga al menos un motor y ruedas

---

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Por favor:

1. Fork el repositorio
2. Crea una rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

---

## 📄 Licencia

MIT License - ver [LICENSE](LICENSE) para más detalles.

---

## 🙏 Agradecimientos

- **BrickLink Studio** - Herramienta de diseño LEGO
- **LDraw.org** - Especificación de formato LDraw
- **First Lego League** - Inspiración del proyecto
- **Three.js** - Motor gráfico 3D
- **Cannon.js** - Motor de física
- **Supabase** - Backend como servicio

---

## 📞 Soporte

- 📧 Email: soporte@legomaster.com
- 💬 Discord: [Unirse al servidor](https://discord.gg/legomaster)
- 📖 Docs: [docs.legomaster.com](https://docs.legomaster.com)

---

**Hecho con ❤️ para la comunidad FLL**

------

Analysis Summary
The project is a LEGO robot simulator for the First Lego League, built with a modern web stack (React, Three.js, Cannon-es). The core components for parsing models, rigging robots, and simulating sensors are in place. However, to become a viable application, several areas need improvement, most critically the testing framework.

Work Plan for Viability
Phase 1: Solidify the Foundation
This phase focuses on fixing core technical issues to create a stable base for future development.

Stabilize the Test Environment:

Action: Create a dedicated test script in package.json (e.g., "test": "vite-node run-tests.ts").
Action: Refactor all tests to be environment-agnostic. Remove dependencies on browser-only APIs like document by using mocking libraries (jsdom) or careful checks, so tests can run reliably in Node.js.
Goal: Ensure a pnpm test command runs all tests successfully every time.
Complete Core Component Simulation:

Action: Implement the TouchSensor simulator, which is defined but not yet created.
Action: Review and address any known bugs outlined in PHYSICS_FIX.md.
Action: Expand the Python CodeInterpreter`` to cover a wider range of the official SPIKE/EV3 API functions to allow for more complex user programs.
Phase 2: Enhance User Features
This phase focuses on improving the user experience and adding key features.

Improve Robot Import and Management:

Action: Enhance the UI to provide clear feedback and progress indicators during robot model uploading, parsing, and rigging.
Action: Develop a user-facing "Robot Garage" where users can save, load, and manage their uploaded robot models, using Supabase for storage.
Flesh out the Simulation Environment:

Action: Create a feature that allows users to select from a library of official First Lego League competition mats.
Action: Implement the ability to place and interact with virtual mission models on the mat.
Improve the Coding Interface:

Action: Enhance the in-browser code editor with features like syntax highlighting, autocomplete for the robot API, and real-time error checking.
Action: Create a set of example programs and tutorials to help new users get started.
Phase 3: Backend, Deployment, and Documentation
This phase prepares the application for public use.

Finalize Backend Integration:

Action: Implement a full user authentication system (login, logout, profiles) using Supabase.
Action: Ensure all user data (robots, code) is securely stored and linked to individual user accounts.
Prepare for Production:

**Action:**Set up a CI/CD pipeline(e.g., using GitHub Actions) to automate testing and deployment.
Action: Optimize the application's performance through code splitting, lazy loading, and asset optimization.
Update Documentation:

Action: Thoroughly review and update all project documentation (README.md, ARCHITECTURE.md, etc.) to reflect the final state of the application.
Following this plan will address the current instabilities and build a robust, feature-rich, and user-friendly application. The most critical first step is to fix the testing foundation.