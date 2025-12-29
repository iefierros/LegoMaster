# 🏗️ Arquitectura Técnica - Lego Master

## Visión General del Sistema

Lego Master es una Progressive Web App que simula robots LEGO con física realista mediante una arquitectura modular de tres capas principales:

1. **Capa de Presentación** (React + Tailwind CSS)
2. **Capa de Lógica de Negocio** (TypeScript)
3. **Capa de Renderizado y Física** (Three.js + Cannon.js)

---

## 📐 Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTACIÓN (UI)                         │
├─────────────────────────────────────────────────────────────┤
│  MainInterface                                               │
│  ├─ CodeEditor (Ace)        ┌────────────────────────┐     │
│  ├─ SimulationScene         │   SensorPanel          │     │
│  │  ├─ Canvas (R3F)         │   - Robot Info         │     │
│  │  ├─ Physics (Cannon)     │   - Motor Status       │     │
│  │  ├─ FLLTrack             │   - Sensor Readings    │     │
│  │  └─ SimulatedRobot       └────────────────────────┘     │
│  └─ RobotUploader                                           │
└─────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  LÓGICA DE NEGOCIO                           │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │  LDrawParser     │  │  RigBuilder      │               │
│  │  - parseStudioFile│  │  - rigRobot     │               │
│  │  - parseLDraw    │  │  - detectWheelAxles│             │
│  └────────┬─────────┘  └────────┬─────────┘               │
│           │                      │                          │
│           ▼                      ▼                          │
│  ┌──────────────────────────────────────┐                  │
│  │     PartCategorizer                  │                  │
│  │     - categorizeParts                │                  │
│  │     - assignMotorPorts               │                  │
│  └──────────────────────────────────────┘                  │
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │ CodeInterpreter  │  │  Supabase Client │               │
│  │ - executePython  │  │  - saveRobotModel│               │
│  │ - wrapCodeWithAPI│  │  - saveSession   │               │
│  └──────────────────┘  └──────────────────┘               │
└─────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              RENDERIZADO Y FÍSICA                            │
├─────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────┐    │
│  │  VirtualSpikeMotor                                 │    │
│  │  - PIDController                                   │    │
│  │  - HingeConstraint (Cannon.js)                     │    │
│  │  - update(deltaTime)                               │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Sensor Simulators                                 │    │
│  │  ├─ UltrasonicSensor (Raycasting)                  │    │
│  │  ├─ ColorSensor (Texture Sampling)                 │    │
│  │  └─ GyroSensor (Quaternion Tracking)               │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Physics World (Cannon.js)                         │    │
│  │  - Bodies, Shapes, Constraints                     │    │
│  │  - Collision Detection                             │    │
│  │  - Material Properties                             │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Rendering (Three.js)                              │    │
│  │  - Scene, Camera, Lights                           │    │
│  │  - Meshes, Materials, Textures                     │    │
│  │  - InstancedMesh for optimization                  │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Flujo de Datos: De Archivo .io a Simulación

### 1. Importación de Modelo

```typescript
User uploads .io file
       ↓
LDrawParser.parseStudioFile(file)
       ↓
Extract ZIP → Read main.ldr
       ↓
Parse LDraw commands → PartInstance[]
       ↓
{
  parts: [
    { partId: '54696', position: Vector3, rotation: Quaternion },
    { partId: '56908', position: Vector3, rotation: Quaternion },
    ...
  ]
}
```

### 2. Categorización y Rigging

```typescript
PartCategorizer.categorizeParts(parts)
       ↓
{
  motors: [part1, part2],
  wheels: [part3, part4, part5, part6],
  sensors: [part7],
  structural: [part8, part9, ...]
}
       ↓
RigBuilder.detectWheelAxles(wheels)
       ↓
[
  { centerPoint: Vector3, wheels: [left, right] },
  { centerPoint: Vector3, wheels: [front_left, front_right] }
]
       ↓
RigBuilder.createMotorJoints(motors, axles)
       ↓
[
  {
    motorId: 'motor_0',
    port: 'A',
    axlePosition: Vector3,
    wheelPartIds: ['wheel_0', 'wheel_1']
  }
]
       ↓
RigBuilder.buildChassisData(structural)
       ↓
{
  mass: 0.85, // kg
  centerOfMass: Vector3,
  collisionShape: ConvexHull
}
       ↓
RiggedRobotData (Complete robot definition)
```

### 3. Instanciación en Física

```typescript
SimulatedRobot component receives RiggedRobotData
       ↓
useCompoundBody() creates physics body
       ↓
Cannon.Body {
  mass: riggedData.chassis.mass,
  shapes: [chassisShape, wheel1, wheel2, ...],
  material: { friction: 0.9 }
}
       ↓
VirtualSpikeMotor.initialize(chassisBody)
       ↓
Creates HingeConstraint between chassis and wheels
       ↓
Motor ready to apply torque
```

### 4. Bucle de Simulación

```typescript
useFrame((state, delta) => {
  // 1. Update motors
  motorControllers.forEach(motor => {
    motor.update(delta);
    // → PID calculates torque
    // → Apply to HingeConstraint
  });

  // 2. Cannon.js physics step
  physicsWorld.step(delta);
  // → Resolve collisions
  // → Update positions

  // 3. Update sensors
  sensorSimulators.forEach(sensor => {
    sensor.update(state.scene, robotBody);
    // → Raycasting for ultrasonic
    // → Texture sampling for color
  });

  // 4. Sync Three.js visuals
  visualMesh.position.copy(physicsBody.position);
  visualMesh.quaternion.copy(physicsBody.quaternion);
});
```

---

## 🧮 Motor de Física: Controlador PID

### Ecuación del PID

```
error(t) = target_velocity - current_velocity

P = Kp × error(t)
I = Ki × ∫error(t)dt
D = Kd × d/dt error(t)

output(t) = P + I + D
```

### Implementación

```typescript
class PIDController {
  calculate(error: number, deltaTime: number): number {
    // Proportional
    const p = this.kp * error;

    // Integral (with anti-windup)
    this.integral += error * deltaTime;
    this.integral = clamp(this.integral, -10, 10);
    const i = this.ki * this.integral;

    // Derivative
    const derivative = (error - this.previousError) / deltaTime;
    const d = this.kd * derivative;

    this.previousError = error;

    return p + i + d;
  }
}
```

### Aplicación en Motor

```typescript
class VirtualSpikeMotor {
  update(deltaTime: number) {
    const currentVel = this.hingeConstraint.getRelativeVelocity();
    const error = this.targetVelocity - currentVel;

    // PID computes required torque
    const torque = this.pidController.calculate(error, deltaTime);

    // Apply physics force (clamped to stall torque)
    const clampedTorque = clamp(torque, -this.stallTorque, this.stallTorque);
    this.hingeConstraint.setMotorMaxForce(clampedTorque);
  }
}
```

---

## 📡 Sistema de Sensores

### Sensor Ultrasónico (Raycasting)

```typescript
class UltrasonicSensor {
  update(scene: THREE.Scene, robotBody: CANNON.Body): number {
    // 1. Get sensor world position
    const worldPos = robotBody.position + this.config.position;

    // 2. Get sensor direction (rotated by robot)
    const direction = this.config.direction.applyQuaternion(
      robotBody.quaternion
    );

    // 3. Perform raycast
    const raycaster = new THREE.Raycaster(worldPos, direction);
    const intersects = raycaster.intersectObjects(scene.children);

    // 4. Return distance in cm
    return intersects.length > 0
      ? Math.min(intersects[0].distance * 100, 255)
      : 255;
  }
}
```

### Sensor de Color (Texture Sampling)

```typescript
class ColorSensor {
  update(scene: THREE.Scene, robotBody: CANNON.Body): ColorReading {
    // 1. Get sensor position on mat
    const worldPos = robotBody.position + this.sensorOffset;

    // 2. Convert to UV coordinates (0-1)
    const u = (worldPos.x + matWidth / 2) / matWidth;
    const v = (worldPos.z + matHeight / 2) / matHeight;

    // 3. Sample pixel from canvas texture
    const x = Math.floor(u * canvas.width);
    const y = Math.floor(v * canvas.height);
    const pixel = ctx.getImageData(x, y, 1, 1).data;

    // 4. Classify color
    const rgb = { r: pixel[0], g: pixel[1], b: pixel[2] };
    return this.classifyColor(rgb);
  }

  classifyColor(rgb: RGB): string {
    const brightness = (rgb.r + rgb.g + rgb.b) / 3;

    if (brightness < 40) return "black";
    if (brightness > 200) return "white";

    // HSV color classification...
    return "red" | "blue" | "green" | "yellow";
  }
}
```

---

## 🎨 Optimización de Renderizado

### Instancing de Geometrías Repetidas

```typescript
// Instead of creating 100 individual meshes for pins:
for (let i = 0; i < 100; i++) {
  scene.add(new Mesh(pinGeometry, pinMaterial)); // ❌ 100 draw calls
}

// Use InstancedMesh:
const instancedPins = new InstancedMesh(pinGeometry, pinMaterial, 100);
for (let i = 0; i < 100; i++) {
  instancedPins.setMatrixAt(i, matrix);
}
scene.add(instancedPins); // ✅ 1 draw call
```

### Level of Detail (LOD)

```typescript
const lod = new LOD();

// High detail (camera close)
lod.addLevel(highDetailMesh, 0);

// Medium detail
lod.addLevel(mediumDetailMesh, 1);

// Low detail (camera far)
lod.addLevel(lowDetailMesh, 3);

scene.add(lod);
```

---

## 💾 Modelo de Datos de Supabase

### Esquema Relacional

```sql
users (Supabase Auth)
  ↓
robot_models
  ├─ id (UUID)
  ├─ user_id (FK → users)
  ├─ rigged_data (JSONB)
  └─ source_file_url (Storage)
       ↓
    sessions
      ├─ id (UUID)
      ├─ robot_model_id (FK → robot_models)
      ├─ track_id (FK → tracks)
      └─ simulation_state (JSONB)
           ↓
        code_snapshots
          ├─ session_id (FK → sessions)
          ├─ code (TEXT)
          └─ version (INT)
```

### Ejemplo de rigged_data JSONB

```json
{
  "chassis": {
    "mass": 0.85,
    "centerOfMass": { "x": 0, "y": -0.05, "z": 0 },
    "collisionShape": {
      "type": "ConvexPolyhedron",
      "vertices": [[x, y, z], ...]
    }
  },
  "motorJoints": [
    {
      "port": "A",
      "motorPartId": "54696",
      "axlePosition": { "x": -0.08, "y": 0, "z": 0 },
      "wheelPartIds": ["wheel_0", "wheel_1"]
    }
  ],
  "sensors": [
    {
      "type": "color",
      "port": "1",
      "position": { "x": 0.12, "y": 0.02, "z": 0 }
    }
  ]
}
```

---

## 🔐 Seguridad y RLS (Row Level Security)

### Políticas de Supabase

```sql
-- Users can only access their own robots
CREATE POLICY "Users own robots"
  ON robot_models
  USING (auth.uid() = user_id);

-- Sessions linked to user through robot
CREATE POLICY "Users own sessions"
  ON sessions
  USING (
    EXISTS (
      SELECT 1 FROM robot_models
      WHERE robot_models.id = sessions.robot_model_id
      AND robot_models.user_id = auth.uid()
    )
  );
```

---

## 🚀 Estrategia de Despliegue

### Build de Producción

```bash
npm run build
# → dist/
#    ├─ index.html
#    ├─ assets/
#    │   ├─ index-[hash].js
#    │   └─ index-[hash].css
#    └─ manifest.webmanifest
```

### PWA Offline Strategy

```typescript
// Service Worker (auto-generated by vite-plugin-pwa)
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
```

### Hosting Recommendations

- **Vercel/Netlify**: Auto-deploy from Git
- **Cloudflare Pages**: Global CDN
- **Supabase Storage**: Asset hosting

---

## 📊 Métricas de Rendimiento

### Objetivos

| Métrica | Target | Actual |
| ------- | ------ | ------ |
| First Contentful Paint | < 1.5s | TBD |
| Time to Interactive | < 3.5s | TBD |
| Physics FPS | 60 | 60 |
| Render FPS (mobile) | > 30 | TBD |
| Bundle Size | < 500KB | TBD |

### Optimizaciones Críticas

1. **Code Splitting**: Lazy load components
2. **Tree Shaking**: Remove unused code
3. **Asset Compression**: Gzip/Brotli
4. **Texture Optimization**: Use compressed formats (KTX2)
5. **Physics Throttling**: Lower frequency on mobile

---

## 🧪 Testing Strategy

### Unit Tests (Vitest)

```typescript
describe("PIDController", () => {
  it("should calculate proportional term correctly", () => {
    const pid = new PIDController(1, 0, 0);
    const output = pid.calculate(10, 0.1);
    expect(output).toBe(10);
  });
});
```

### Integration Tests

```typescript
describe("RigBuilder", () => {
  it("should detect wheel axles from model", async () => {
    const parts = mockLDrawParts();
    const rigged = await rigBuilder.rigRobot(parts, "Test Robot");
    expect(rigged.motorJoints.length).toBeGreaterThan(0);
  });
});
```

---

## 📝 Extensibilidad

### Agregar Nuevo Sensor

1. Crear clase en `SensorSimulators.ts`:

```typescript
export class TouchSensor extends BaseSensorSimulator {
  update(scene, robotBody): SensorReading {
    // Implement collision detection
  }
}
```

2. Registrar en factory:

```typescript
export function createSensorSimulator(config) {
  switch (config.type) {
    case "touch":
      return new TouchSensor(config);
    // ...
  }
}
```

### Agregar Nueva Pista FLL

1. Crear modelo 3D en Blender
2. Exportar como GLB
3. Crear textura del tapete (PNG)
4. Insertar en base de datos:

```sql
INSERT INTO tracks (season, model_url, mat_texture_url) VALUES
('FLL 2025', '/assets/tracks/fll-2025.glb', '/assets/tracks/fll-2025.png');
```

---

**Última actualización**: 2024
**Versión**: 1.0.0
