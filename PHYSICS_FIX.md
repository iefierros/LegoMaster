# 🔧 Physics System Analysis & Implementation Status

**Fecha:** 2026-01-26
**Versión:** 2.0.0
**Estado:** ANÁLISIS COMPLETO - PENDIENTE IMPLEMENTACIÓN

---

## 📊 Resumen Ejecutivo

El sistema de física actual tiene **limitaciones críticas** que impiden un comportamiento realista del robot y la interacción con elementos de misión de Studio/LDraw. Este documento analiza la arquitectura actual, identifica los problemas y propone soluciones.

### Estado Actual vs Esperado

| Característica | Estado Actual | Estado Esperado |
|----------------|---------------|-----------------|
| Colisión robot-suelo | ⚠️ Simplificada (check Y) | ✅ CANNON.js world |
| Colisión robot-objetos | ❌ No implementada | ✅ Collision detection |
| Formas de colisión | ⚠️ Hardcodeadas | ✅ Derivadas de LDraw |
| Física de ruedas | ❌ Solo visual | ✅ HingeConstraint |
| Elementos de misión | ❌ No implementado | ✅ Importación + física |
| Integración CANNON world | ❌ Desconectada | ✅ useCompoundBody |

---

## 🏗️ Arquitectura Actual

### 1. Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────────┐
│                      SimulatedRobot.tsx                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐       ┌──────────────────────────────┐   │
│  │ useCompoundBody  │       │   CANNON.Body (Manual)       │   │
│  │ (react-three/    │       │   - Creado manualmente       │   │
│  │  cannon)         │       │   - NO en physics world      │   │
│  │                  │       │   - Sin collision detection  │   │
│  │ ❌ NO SE USA     │       │   ✅ USADO EN useFrame       │   │
│  └──────────────────┘       └──────────────────────────────┘   │
│                                      │                          │
│                                      ▼                          │
│                          ┌────────────────────┐                 │
│                          │   VirtualMotor     │                 │
│                          │   Modifica:        │                 │
│                          │   - body.velocity  │                 │
│                          │   - body.angVel    │                 │
│                          └────────────────────┘                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Flujo de Física Actual

```typescript
// SimulatedRobot.tsx - Líneas 55-65 (NO USADO)
const [ref, api] = useCompoundBody(() => ({
  mass: riggedData.chassis.mass,
  shapes: shapes,  // Shapes hardcodeadas
  ...
}));

// SimulatedRobot.tsx - Líneas 95-123 (USADO)
const body = new CANNON.Body({
  mass: riggedData.chassis.mass,
  ...
});
// Este body NO está en ningún physics world!

// SimulatedRobot.tsx - Líneas 677-781 (useFrame loop)
useFrame((state, delta) => {
  // Física manual sin collision detection real
  body.velocity.y -= 9.81 * dt;  // Gravedad manual

  // "Colisión" con suelo = simple check de Y
  if (body.position.y < groundHeight) {
    body.position.y = groundHeight;
    body.velocity.y = 0;
  }
});
```

---

## 🐛 Problemas Identificados

### Problema 1: Cuerpos de Física Desconectados

**Archivo:** `src/components/SimulatedRobot.tsx`

**Descripción:** Se crean DOS cuerpos de física separados:
1. `useCompoundBody` (líneas 55-65) - Conectado a react-three/cannon pero NO USADO
2. `new CANNON.Body()` (líneas 95-123) - Usado pero NO conectado al physics world

**Impacto:**
- No hay collision detection real
- La física es una simulación fake
- Los objetos no pueden colisionar con el robot

**Código Problemático:**
```typescript
// Línea 55: Se crea pero no se usa
const [ref, api] = useCompoundBody<THREE.Group>(() => ({...}));

// Línea 95: Se crea otro body que no está en el world
const body = new CANNON.Body({...});
physicsBodyRef.current = body;

// Línea 677: Solo se usa el body manual
useFrame((state, delta) => {
  const body = physicsBodyRef.current;  // Body sin world!
  ...
});
```

---

### Problema 2: Formas de Colisión Hardcodeadas

**Archivos:**
- `src/components/SimulatedRobot.tsx` (líneas 29-51, 110-121)
- `src/core/RigBuilder.ts` (líneas 293-339)

**Descripción:** Las formas de colisión son cajas y cilindros con dimensiones fijas, ignorando la geometría real de las piezas LDraw.

**Formas actuales:**
```typescript
// SimulatedRobot.tsx - Chassis shape
new CANNON.Box(new CANNON.Vec3(0.075, 0.04, 0.075));  // 15cm x 8cm x 15cm fijo

// SimulatedRobot.tsx - Wheel shape
new CANNON.Cylinder(0.028, 0.028, 0.012, 16);  // Radio 28mm fijo

// RigBuilder.ts - Crea vertices para ConvexPolyhedron pero...
const vertices = this.createConvexHullVertices(structural);
// ...estos vertices NUNCA se usan en SimulatedRobot.tsx!
```

**Impacto:**
- Robots pequeños tienen colisión de robot grande
- Robots grandes tienen colisión de robot pequeño
- Ruedas de diferentes tamaños tienen la misma colisión

---

### Problema 3: No Hay Colisión con Objetos de la Escena

**Archivo:** `src/components/SimulatedRobot.tsx` (líneas 732-742)

**Descripción:** La "colisión" con el suelo es simplemente un check de posición Y:

```typescript
// Línea 732-742: "Colisión" con suelo
const groundHeight = 0.05;
if (body.position.y < groundHeight) {
  body.position.y = groundHeight;  // Teleport, no física real
  if (body.velocity.y < 0) {
    body.velocity.y = 0;
  }
}
```

**Impacto:**
- El robot atraviesa paredes
- El robot atraviesa elementos de misión
- No hay colisión con el borde del mat
- Los sensores ultrasónicos no detectan objetos (ver problema 5)

---

### Problema 4: Ruedas Sin Física Real

**Archivo:** `src/physics/VirtualSpikeMotor.ts` (líneas 206-223)

**Descripción:** Las ruedas no tienen constraints físicos. Los motores modifican directamente la velocidad del chassis:

```typescript
// VirtualSpikeMotor.ts - Líneas 219-223
// Modifica velocidad directamente, sin simular ruedas
this.chassisBody.velocity.x += forwardDir.x * linearContribution * deltaTime * 10;
this.chassisBody.velocity.z += forwardDir.z * linearContribution * deltaTime * 10;
this.chassisBody.angularVelocity.y += angularSign * angularContribution * deltaTime * 5;
```

**Impacto:**
- No hay derrape de ruedas
- No hay pérdida de tracción
- Las ruedas pueden "flotar" sin contacto con el suelo
- El robot puede moverse incluso si está volcado

---

### Problema 5: Sensores Sin Objetos para Detectar

**Archivo:** `src/physics/SensorSimulators.ts` (líneas 60-64)

**Descripción:** El sensor ultrasónico filtra objetos buscando `userData.isTrack` o `userData.isMissionElement`, pero ningún objeto en la escena tiene estos flags:

```typescript
// SensorSimulators.ts - Líneas 60-64
const intersectableObjects = scene.children.filter(
  obj => obj.userData.isTrack || obj.userData.isMissionElement
);
// Resultado: Array vacío! No hay objetos con estos flags
```

**Impacto:**
- Sensor ultrasónico siempre retorna 255 (máximo)
- No puede detectar paredes ni obstáculos
- Inútil para navegación

---

### Problema 6: Elementos de Misión No Implementados

**Archivo:** `src/types/index.ts` (líneas 139-153)

**Descripción:** Existe el tipo `MissionElement` pero no hay implementación:

```typescript
// types/index.ts - MissionElement definido pero no usado
export interface MissionElement {
  id: string;
  name: string;
  type: 'lever' | 'button' | 'gate' | 'cargo' | 'zone';
  mesh: THREE.Mesh;
  physicsBody?: CANNON.Body;  // Opcional y nunca creado
  position: THREE.Vector3;
  state: 'inactive' | 'triggered' | 'completed';
  points: number;
  triggers: {
    onCollision?: (robot: RobotInstance) => void;
    // Nunca se invocan porque no hay collision detection
  };
}
```

**Impacto:**
- No se pueden importar misiones de Studio
- No hay scoring de misiones FLL
- La simulación es solo del robot, no del juego completo

---

## ✅ Soluciones Propuestas

### Solución 1: Usar useCompoundBody Correctamente

**Cambio necesario en `SimulatedRobot.tsx`:**

```typescript
// ANTES: Dos bodies separados
const [ref, api] = useCompoundBody(() => ({...}));  // No usado
const body = new CANNON.Body({...});  // Usado pero desconectado

// DESPUÉS: Un solo body del world
const [ref, bodyApi] = useCompoundBody<THREE.Group>(() => ({
  mass: riggedData.chassis.mass,
  position: initialPosition,
  shapes: generateShapesFromRiggedData(riggedData),  // Formas dinámicas
  material: { friction: 0.9, restitution: 0.1 },
  onCollide: (e) => handleCollision(e),  // Collision callbacks
}), useRef<THREE.Group>(null));

// Obtener referencia al body real del world
const bodyRef = useRef<CANNON.Body | null>(null);
useEffect(() => {
  // @react-three/cannon expone el body a través del api
  const unsubscribe = bodyApi.body.subscribe((b) => {
    bodyRef.current = b;
    initializeMotors(b);
  });
  return unsubscribe;
}, []);
```

---

### Solución 2: Generar Formas de Colisión desde LDraw

**Nuevo archivo: `src/physics/CollisionShapeGenerator.ts`**

```typescript
export class CollisionShapeGenerator {
  /**
   * Genera formas de colisión simplificadas desde geometría LDraw
   */
  static fromParts(parts: PartInstance[]): CompoundBodyShape[] {
    const shapes: CompoundBodyShape[] = [];

    // Agrupar por categoría
    const wheels = parts.filter(p => p.category === 'wheel');
    const chassis = parts.filter(p => p.category !== 'wheel');

    // Crear bounding box del chassis
    const chassisBox = this.computeBoundingBox(chassis);
    shapes.push({
      type: 'Box',
      args: [chassisBox.x / 2, chassisBox.y / 2, chassisBox.z / 2],
      position: chassisBox.center
    });

    // Crear cilindros para cada rueda con su tamaño real
    wheels.forEach(wheel => {
      const wheelDef = CRITICAL_PARTS[wheel.partId];
      const radius = wheelDef?.dimensions?.x / 2 || 0.028;
      shapes.push({
        type: 'Cylinder',
        args: [radius, radius, 0.012, 12],
        position: wheel.position.toArray()
      });
    });

    return shapes;
  }

  /**
   * Genera ConvexHull desde mesh LDraw para formas complejas
   */
  static convexHullFromMesh(mesh: THREE.Mesh): CANNON.ConvexPolyhedron {
    const geometry = mesh.geometry;
    const vertices: CANNON.Vec3[] = [];
    const positions = geometry.attributes.position;

    for (let i = 0; i < positions.count; i++) {
      vertices.push(new CANNON.Vec3(
        positions.getX(i),
        positions.getY(i),
        positions.getZ(i)
      ));
    }

    return new CANNON.ConvexPolyhedron({ vertices });
  }
}
```

---

### Solución 3: Implementar Collision Detection Real

**Cambios en `SimulatedRobot.tsx` y nuevo `MissionManager.tsx`:**

```typescript
// En useCompoundBody
onCollide: (e) => {
  const { body, contact } = e;
  const otherBody = body;

  // Detectar tipo de colisión
  if (otherBody.userData?.isMissionElement) {
    const element = missionElements.get(otherBody.userData.elementId);
    element?.triggers.onCollision?.(robotInstance);
  }

  if (otherBody.userData?.isWall) {
    // Impacto con pared - ya manejado por física
  }
}
```

**Nuevo archivo: `src/components/MissionElement.tsx`**

```typescript
export function MissionElement({ element }: { element: MissionElementData }) {
  const [ref] = useBox(() => ({
    mass: element.isStatic ? 0 : element.mass,
    position: element.position,
    userData: {
      isMissionElement: true,
      elementId: element.id
    },
    onCollide: (e) => {
      if (e.body.userData?.isRobot) {
        element.onTriggered();
      }
    }
  }));

  return (
    <mesh ref={ref}>
      <primitive object={element.visualMesh} />
    </mesh>
  );
}
```

---

### Solución 4: Física de Ruedas con Constraints

**Nuevo modelo de física para ruedas:**

```typescript
// Opción A: RaycastVehicle (recomendado para simplicidad)
import { RaycastVehicle } from 'cannon-es';

const vehicle = new RaycastVehicle({
  chassisBody: chassisBody,
  indexRightAxis: 0,
  indexForwardAxis: 2,
  indexUpAxis: 1,
});

// Agregar ruedas
riggedData.motorJoints.forEach(joint => {
  vehicle.addWheel({
    chassisConnectionPointLocal: joint.axlePosition.toCANNON(),
    directionLocal: new CANNON.Vec3(0, -1, 0),
    axleLocal: new CANNON.Vec3(1, 0, 0),
    suspensionRestLength: 0.01,
    radius: 0.028,
    suspensionStiffness: 1000,
    dampingCompression: 4.4,
    dampingRelaxation: 2.3,
    frictionSlip: 10.5,
    rollInfluence: 0.01,
  });
});

// Opción B: HingeConstraint (más realista pero complejo)
wheels.forEach((wheel, i) => {
  const wheelBody = new CANNON.Body({ mass: 0.01 });
  const constraint = new CANNON.HingeConstraint(
    chassisBody,
    wheelBody,
    {
      pivotA: joint.axlePosition.toCANNON(),
      pivotB: new CANNON.Vec3(0, 0, 0),
      axisA: new CANNON.Vec3(1, 0, 0),
      axisB: new CANNON.Vec3(1, 0, 0),
    }
  );
  world.addConstraint(constraint);
});
```

---

### Solución 5: Importación de Elementos de Misión desde Studio/LDraw

**Nuevo archivo: `src/loaders/MissionLoader.ts`**

```typescript
export class MissionLoader {
  /**
   * Carga elementos de misión desde archivo .io de Studio
   */
  async loadFromStudio(file: File): Promise<MissionElement[]> {
    const parser = new LDrawParser();
    const model = await parser.parse(file);

    const elements: MissionElement[] = [];

    // Identificar elementos de misión por nombre o posición
    model.parts.forEach(part => {
      if (this.isMissionElement(part)) {
        elements.push({
          id: part.id,
          name: part.partId,
          type: this.detectMissionType(part),
          mesh: this.createMesh(part),
          position: part.position.clone(),
          physicsBody: this.createPhysicsBody(part),
          state: 'inactive',
          points: this.calculatePoints(part),
          triggers: this.createTriggers(part),
        });
      }
    });

    return elements;
  }

  /**
   * Detecta si una pieza es un elemento de misión
   */
  private isMissionElement(part: PartInstance): boolean {
    // Criterios:
    // 1. No es parte del robot (no tiene motor/sensor conectado)
    // 2. Está en la zona del mat (no en posición inicial del robot)
    // 3. Es una pieza interactiva conocida (lever, button, etc.)
    return (
      !part.partId.includes('Motor') &&
      !part.partId.includes('Sensor') &&
      part.position.z > 0.1  // Fuera de zona de inicio
    );
  }

  /**
   * Crea physics body para el elemento
   */
  private createPhysicsBody(part: PartInstance): CANNON.Body {
    const body = new CANNON.Body({
      mass: this.isMovable(part) ? 0.1 : 0,  // 0 = estático
      position: new CANNON.Vec3(
        part.position.x,
        part.position.y,
        part.position.z
      ),
    });

    // Forma de colisión basada en geometría
    const shape = CollisionShapeGenerator.fromPart(part);
    body.addShape(shape);

    body.userData = {
      isMissionElement: true,
      elementId: part.id,
    };

    return body;
  }
}
```

---

### Solución 6: Marcar Objetos para Sensores

**Cambios en `SimulationScene.tsx`:**

```typescript
// Mat del track
<mesh
  rotation={[-Math.PI / 2, 0, 0]}
  position={[0, 0, 0]}
  userData={{ isTrack: true, type: 'mat' }}
>
  <planeGeometry args={[2.4, 1.2]} />
  <meshStandardMaterial map={matTexture} />
</mesh>

// Paredes del track
{walls.map((wall, i) => (
  <mesh
    key={i}
    position={wall.position}
    userData={{ isTrack: true, type: 'wall' }}
  >
    <boxGeometry args={wall.dimensions} />
    <meshStandardMaterial color="#333" />
  </mesh>
))}

// Elementos de misión
{missionElements.map(element => (
  <MissionElement
    key={element.id}
    element={element}
    // userData se establece en MissionElement component
  />
))}
```

---

## 📁 Archivos a Modificar/Crear

### Archivos Existentes a Modificar:

| Archivo | Cambios Necesarios |
|---------|-------------------|
| `src/components/SimulatedRobot.tsx` | Usar useCompoundBody correctamente, eliminar body manual |
| `src/physics/VirtualSpikeMotor.ts` | Cambiar a torque en ruedas o RaycastVehicle |
| `src/physics/SensorSimulators.ts` | Verificar que objetos tengan userData correcto |
| `src/core/RigBuilder.ts` | Pasar collision shapes al output |
| `src/components/SimulationScene.tsx` | Agregar userData a objetos de escena |

### Archivos Nuevos a Crear:

| Archivo | Propósito |
|---------|-----------|
| `src/physics/CollisionShapeGenerator.ts` | Genera shapes desde LDraw geometry |
| `src/components/MissionElement.tsx` | Componente para elementos de misión con física |
| `src/loaders/MissionLoader.ts` | Carga misiones desde Studio/LDraw |
| `src/components/TrackWalls.tsx` | Paredes y bordes del track con colisión |

---

## 🔄 Plan de Implementación

### Fase 1: Corregir Integración CANNON.js (Prioridad Alta)

1. **Tarea 1.1:** Refactorizar `SimulatedRobot.tsx` para usar solo useCompoundBody
2. **Tarea 1.2:** Obtener referencia al body real del physics world
3. **Tarea 1.3:** Eliminar el body manual y el physics loop custom
4. **Tarea 1.4:** Verificar que el robot caiga y colisione correctamente

### Fase 2: Formas de Colisión Dinámicas (Prioridad Alta)

1. **Tarea 2.1:** Crear `CollisionShapeGenerator.ts`
2. **Tarea 2.2:** Modificar RigBuilder para exportar collision data
3. **Tarea 2.3:** Usar collision data real en useCompoundBody
4. **Tarea 2.4:** Testear con robots de diferentes tamaños

### Fase 3: Collision Detection con Escena (Prioridad Media)

1. **Tarea 3.1:** Agregar userData a mat y paredes
2. **Tarea 3.2:** Crear componente TrackWalls con física
3. **Tarea 3.3:** Verificar que sensores detecten objetos
4. **Tarea 3.4:** Agregar collision callbacks

### Fase 4: Elementos de Misión (Prioridad Media)

1. **Tarea 4.1:** Crear MissionLoader para .io files
2. **Tarea 4.2:** Crear componente MissionElement con física
3. **Tarea 4.3:** Implementar triggers y scoring
4. **Tarea 4.4:** UI para cargar y visualizar misiones

### Fase 5: Física de Ruedas Avanzada (Prioridad Baja)

1. **Tarea 5.1:** Evaluar RaycastVehicle vs HingeConstraint
2. **Tarea 5.2:** Implementar modelo seleccionado
3. **Tarea 5.3:** Ajustar parámetros de fricción y suspensión
4. **Tarea 5.4:** Testear tracción y derrape

---

## 🧪 Verificación

### Tests de Física Básica

```typescript
describe('Physics Integration', () => {
  it('robot falls due to gravity', async () => {
    const robot = await loadTestRobot();
    const initialY = robot.position.y;

    await simulateFrames(60);  // 1 segundo

    expect(robot.position.y).toBeLessThan(initialY);
  });

  it('robot collides with ground', async () => {
    const robot = await loadTestRobot();

    await simulateFrames(300);  // 5 segundos

    expect(robot.position.y).toBeGreaterThanOrEqual(0.05);  // No atraviesa suelo
  });

  it('robot collides with wall', async () => {
    const robot = await loadTestRobot();
    robot.motor.run('A', 100);
    robot.motor.run('B', 100);

    await simulateFrames(600);  // 10 segundos hacia pared

    expect(robot.position.x).toBeLessThan(1.2);  // Detenido por pared
  });

  it('ultrasonic detects wall', async () => {
    const robot = await loadTestRobot();
    // Robot facing wall at 50cm

    const distance = robot.sensor.ultrasonic('2');

    expect(distance).toBeLessThan(60);  // Detecta pared cercana
    expect(distance).toBeGreaterThan(40);
  });
});
```

### Tests de Elementos de Misión

```typescript
describe('Mission Elements', () => {
  it('loads mission from Studio file', async () => {
    const loader = new MissionLoader();
    const elements = await loader.loadFromStudio(studioFile);

    expect(elements.length).toBeGreaterThan(0);
    elements.forEach(e => {
      expect(e.physicsBody).toBeDefined();
      expect(e.physicsBody.userData.isMissionElement).toBe(true);
    });
  });

  it('triggers mission on collision', async () => {
    const mission = await loadMission('lever');
    const robot = await loadTestRobot();

    let triggered = false;
    mission.triggers.onCollision = () => { triggered = true; };

    // Drive robot into mission element
    robot.motor.run('A', 50);
    robot.motor.run('B', 50);
    await simulateFrames(120);

    expect(triggered).toBe(true);
  });
});
```

---

## 📚 Referencias

### Documentación

- [CANNON.js Docs](https://pmndrs.github.io/cannon-es/docs/)
- [react-three/cannon](https://github.com/pmndrs/react-three-cannon)
- [Three.js BufferGeometry](https://threejs.org/docs/#api/en/core/BufferGeometry)
- [LDraw File Format](https://www.ldraw.org/article/218.html)

### Código de Referencia

- Ejemplo de RaycastVehicle: `cannon-es/examples/raycast_vehicle.html`
- Ejemplo de ConvexPolyhedron: `cannon-es/examples/convex.html`
- react-three-cannon CompoundBody: `@react-three/cannon/src/hooks.tsx`

---

## 📈 Métricas de Éxito

| Métrica | Actual | Objetivo |
|---------|--------|----------|
| Collision detection funcional | ✅ Sí | ✅ Sí |
| Elementos de misión cargables | 4+ | 10+ |
| Tests de física pasando | 49 | 20+ |
| FPS con física completa | ~60 | >45 |
| Robots de Studio compatibles | ~50% | >90% |

---

## ✅ Estado de Resolución v1.0 (2026-01-07)

Los siguientes problemas fueron resueltos en la versión anterior:

1. ✅ **Sistema de reintentos para inicialización** - Implementado
2. ✅ **Indicador visual de estado** - Implementado
3. ✅ **Mensajes de error mejorados** - Implementado
4. ✅ **Differential drive model** - Implementado
5. ✅ **Quaternion integration** - Implementado

---

## ✅ Estado de Resolución v2.0 (2026-01-26)

### Archivos Creados

| Archivo | Descripción |
|---------|-------------|
| `src/physics/CollisionShapeGenerator.ts` | Genera formas de colisión dinámicas desde datos LDraw |
| `src/components/TrackWalls.tsx` | Paredes de track con física CANNON.js |
| `src/components/MissionElement.tsx` | Componentes de misión con detección de colisión |
| `src/loaders/MissionLoader.ts` | Carga misiones desde archivos Studio/LDraw |

### Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `src/components/SimulatedRobot.tsx` | Integración correcta con useCompoundBody, proxy body pattern |
| `src/core/RigBuilder.ts` | Export de dimensiones de colisión |
| `src/components/FLLTrack.tsx` | userData agregado a paredes y elementos de misión |
| `src/components/SimulationScene.tsx` | Handler de colisiones para misiones |

### Problemas Resueltos

1. ✅ **Problema 1: Cuerpos de Física Desconectados**
   - Implementado patrón proxy body para sincronizar con cannon world
   - Motores ahora aplican velocidad a través de la API de cannon

2. ✅ **Problema 2: Formas de Colisión Hardcodeadas**
   - `CollisionShapeGenerator.ts` genera shapes desde RiggedRobotData
   - Soporta Box, Cylinder, y ConvexPolyhedron

3. ✅ **Problema 3: Sin Colisión con Objetos**
   - Paredes tienen userData.isWall y userData.isTrack
   - Elementos de misión tienen userData.isMissionElement
   - onCollide handlers en todos los elementos

4. ✅ **Problema 5: Sensores Sin Objetos**
   - Todos los elementos ahora tienen userData correcto
   - Ultrasonic sensor puede detectar paredes y misiones

5. ✅ **Problema 6: Elementos de Misión**
   - MissionElement.tsx con 5 tipos: lever, button, gate, cargo, zone
   - MissionLoader.ts para cargar desde .io/.ldr files
   - Collision callbacks para scoring

### Pendiente (Fase 5 - Prioridad Baja)

- ⏳ **Problema 4: Ruedas Sin Física Real**
  - RaycastVehicle o HingeConstraint para física de ruedas realista
  - Simulación de tracción y derrape

---

**Estado:** ✅ IMPLEMENTADO (Fases 1-4)
**Próximo paso:** Fase 5 - Física de ruedas avanzada (opcional)
**Fecha:** 2026-01-26
