import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import type {
  PartInstance,
  WheelAxle,
  MotorJoint,
  SensorConfig,
  ChassisData,
  RiggedRobotData,
  RigOptions,
  LDrawLoadProgress
} from '@/types';
import { partCategorizer } from './PartCategorizer';
import { ldrawGeometryLoader } from './LDrawGeometryLoader';

/**
 * Automatically rigs a LEGO robot model for physics simulation
 * Detects wheels, motors, sensors and creates appropriate physics constraints
 */
export class RigBuilder {

  /**
   * Main rigging function - converts a flat list of parts into a rigged robot
   * @param parts - List of parsed LEGO parts
   * @param modelName - Name for the robot model
   * @param options - Optional rigging options (render mode, progress callback)
   */
  async rigRobot(
    parts: PartInstance[],
    modelName: string,
    options?: RigOptions
  ): Promise<RiggedRobotData> {

    const renderMode = options?.renderMode ?? 'detailed';
    console.log('🤖 Starting robot rigging for:', modelName);
    console.log('📦 Total parts to process:', parts.length);
    console.log('🎨 Render mode:', renderMode);

    if (parts.length === 0) {
      throw new Error('Cannot rig robot: No parts provided');
    }

    // Step 1: Categorize parts
    const categorized = partCategorizer.categorizeParts(parts);

    console.log('🏷️ Categorized parts:', {
      motors: categorized.motors.length,
      wheels: categorized.wheels.length,
      sensors: categorized.sensors.length,
      structural: categorized.structural.length
    });

    // Validation: Warn if no motors found
    if (categorized.motors.length === 0) {
      console.warn('⚠️ No motors detected! Robot will not be able to move.');
      console.log('💡 Tip: Make sure your robot includes SPIKE or EV3 motors.');
    }

    // Validation: Warn if no wheels found
    if (categorized.wheels.length === 0) {
      console.warn('⚠️ No wheels detected! Robot may not move correctly.');
      console.log('💡 Tip: Add wheels to your robot design.');
    }

    // Step 2: Detect wheel axles
    const wheelAxles = this.detectWheelAxles(categorized.wheels);
    console.log('🔧 Detected wheel axles:', wheelAxles.length);

    // Step 3: Associate motors with axles
    const motorJoints = this.createMotorJoints(categorized.motors, wheelAxles);
    console.log('⚙️ Created motor joints:', motorJoints.length);

    // Step 4: Configure sensors
    const sensorConfigs = this.configureSensors(categorized.sensors);
    console.log('👁️ Configured sensors:', sensorConfigs.length);

    // Step 5: Build chassis collision shape
    const chassis = this.buildChassisData(categorized.structural, parts);
    console.log('🏗️ Built chassis:', {
      mass: chassis.mass.toFixed(3) + ' kg',
      centerOfMass: chassis.centerOfMass.toArray().map(v => v.toFixed(3))
    });

    // Step 6: Create visual mesh (based on render mode)
    let visualMesh: THREE.Group;
    if (renderMode === 'detailed') {
      visualMesh = await this.createDetailedVisualMesh(parts, options?.onProgress);
    } else {
      visualMesh = this.createSimpleVisualMesh(parts);
    }
    console.log('🎨 Created visual mesh with', visualMesh.children.length, 'children');

    const riggedRobot = {
      id: ( crypto.randomUUID?.() ?? Math.random().toString(36).substring(2) + Date.now().toString(36) ),
      name: modelName,
      chassis,
      motorJoints,
      sensors: sensorConfigs,
      visualMesh,
      partCount: parts.length
    };

    console.log('✅ Robot rigging complete!', {
      id: riggedRobot.id,
      name: riggedRobot.name,
      motors: motorJoints.length,
      sensors: sensorConfigs.length,
      mass: chassis.mass.toFixed(3) + ' kg',
      renderMode
    });

    return riggedRobot;
  }

  /**
   * Detect wheel axles by grouping wheels that are aligned
   */
  private detectWheelAxles(wheels: PartInstance[]): WheelAxle[] {
    if (wheels.length < 2) {
      console.warn('Not enough wheels detected for axle detection');
      return [];
    }

    const axles: WheelAxle[] = [];
    const usedWheels = new Set<string>();

    // Sort wheels by X position
    const sortedWheels = [...wheels].sort((a, b) => a.position.x - b.position.x);

    for (let i = 0; i < sortedWheels.length; i++) {
      if (usedWheels.has(sortedWheels[i].id)) continue;

      const wheel1 = sortedWheels[i];

      // Find opposing wheel (similar Z position, opposite X)
      for (let j = i + 1; j < sortedWheels.length; j++) {
        if (usedWheels.has(sortedWheels[j].id)) continue;

        const wheel2 = sortedWheels[j];

        // Check if wheels are aligned (same Z, different X)
        const zDiff = Math.abs(wheel1.position.z - wheel2.position.z);
        const xDiff = Math.abs(wheel1.position.x - wheel2.position.x);

        // Tolerance: 20mm in Z, at least 50mm in X
        if (zDiff < 0.020 && xDiff > 0.050) {
          // Found an axle pair
          const centerPoint = new THREE.Vector3(
            (wheel1.position.x + wheel2.position.x) / 2,
            (wheel1.position.y + wheel2.position.y) / 2,
            (wheel1.position.z + wheel2.position.z) / 2
          );

          const direction = new THREE.Vector3(1, 0, 0); // X-axis (left-right)

          axles.push({
            centerPoint,
            direction,
            wheels: [wheel1, wheel2],
            radius: 0.028 // Default LEGO wheel radius (28mm)
          });

          usedWheels.add(wheel1.id);
          usedWheels.add(wheel2.id);
          break;
        }
      }
    }

    console.log(`Detected ${axles.length} wheel axles`);
    return axles;
  }

  /**
   * Create motor joints by associating motors with detected axles
   */
  private createMotorJoints(
    motors: PartInstance[],
    axles: WheelAxle[]
  ): MotorJoint[] {
    const motorJoints: MotorJoint[] = [];
    const motorPortMap = partCategorizer.assignMotorPorts(motors);

    axles.forEach((axle, axleIndex) => {
      // Find nearest motor to this axle
      const nearestMotor = this.findNearestMotor(axle.centerPoint, motors);

      if (nearestMotor) {
        const port = motorPortMap.get(nearestMotor.id) ?? `M${axleIndex}`;

        motorJoints.push({
          motorId: nearestMotor.id,
          motorPartId: nearestMotor.partId,
          axlePosition: axle.centerPoint.clone(),
          axleDirection: axle.direction.clone(),
          wheelPartIds: axle.wheels.map(w => w.id),
          gearRatio: 1.0, // Default, could be detected from gear parts
          port
        });
      } else {
        console.warn(`No motor found for axle at ${axle.centerPoint.toArray()}`);
      }
    });

    // Handle motors without axles (e.g., arm motors)
    motors.forEach(motor => {
      const alreadyAssigned = motorJoints.some(j => j.motorId === motor.id);
      if (!alreadyAssigned) {
        const port = motorPortMap.get(motor.id) ?? `M${motorJoints.length}`;

        // Create a virtual joint for this motor
        motorJoints.push({
          motorId: motor.id,
          motorPartId: motor.partId,
          axlePosition: motor.position.clone(),
          axleDirection: new THREE.Vector3(1, 0, 0),
          wheelPartIds: [],
          gearRatio: 1.0,
          port
        });
      }
    });

    return motorJoints;
  }

  /**
   * Find the nearest motor to a given position
   */
  private findNearestMotor(
    position: THREE.Vector3,
    motors: PartInstance[]
  ): PartInstance | null {
    if (motors.length === 0) return null;

    let nearest: PartInstance | null = null;
    let minDistance = Infinity;

    motors.forEach(motor => {
      const distance = motor.position.distanceTo(position);
      if (distance < minDistance && distance < 0.1) { // Max 10cm radius
        minDistance = distance;
        nearest = motor;
      }
    });

    return nearest;
  }

  /**
   * Configure sensor positions and orientations
   */
  private configureSensors(sensors: PartInstance[]): SensorConfig[] {
    const sensorPortMap = partCategorizer.assignSensorPorts(sensors);

    return sensors.map(sensor => {
      // Determine sensor type from part ID
      let sensorType: 'ultrasonic' | 'color' | 'gyro' | 'touch' = 'ultrasonic';

      const partId = sensor.partId.toLowerCase();
      if (partId.includes('color')) {
        sensorType = 'color';
      } else if (partId.includes('gyro')) {
        sensorType = 'gyro';
      } else if (partId.includes('touch')) {
        sensorType = 'touch';
      }

      // Assume sensors point forward (+Z direction in robot space)
      const direction = new THREE.Vector3(0, 0, 1);
      direction.applyQuaternion(sensor.rotation);

      return {
        id: sensor.id,
        type: sensorType,
        position: sensor.position.clone(),
        direction,
        port: sensorPortMap.get(sensor.id) ?? '1'
      };
    });
  }

  /**
   * Build chassis collision data
   */
  private buildChassisData(structural: PartInstance[], allParts: PartInstance[]): ChassisData {
    // Calculate total mass
    const mass = partCategorizer.calculateTotalMass(allParts);

    // Calculate center of mass from ALL parts (not just structural)
    const centerOfMass = partCategorizer.calculateCenterOfMass(allParts);

    // Create simplified collision shape (convex hull)
    const vertices = this.createConvexHullVertices(structural);

    // Compute bounding box dimensions for collision
    const boundingBox = this.computeBoundingBox(allParts);

    return {
      mass,
      centerOfMass,
      collisionShape: {
        type: 'ConvexPolyhedron',
        vertices,
        dimensions: boundingBox.size
      }
    };
  }

  /**
   * Compute bounding box from all parts
   */
  private computeBoundingBox(parts: PartInstance[]): { center: THREE.Vector3; size: THREE.Vector3 } {
    if (parts.length === 0) {
      return {
        center: new THREE.Vector3(0, 0, 0),
        size: new THREE.Vector3(0.15, 0.08, 0.15)
      };
    }

    const box = new THREE.Box3();

    parts.forEach(part => {
      // Estimate part size based on category
      let partSize = new THREE.Vector3(0.008, 0.0096, 0.008); // Default brick size

      if (part.category === 'motor') {
        partSize.set(0.032, 0.032, 0.048);
      } else if (part.category === 'wheel') {
        partSize.set(0.056, 0.012, 0.056); // Wheel diameter x width
      } else if (part.category === 'sensor') {
        partSize.set(0.024, 0.024, 0.020);
      }

      // Expand box by part position + half size
      const min = part.position.clone().sub(partSize.clone().multiplyScalar(0.5));
      const max = part.position.clone().add(partSize.clone().multiplyScalar(0.5));
      box.expandByPoint(min);
      box.expandByPoint(max);
    });

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // Ensure minimum size
    size.x = Math.max(size.x, 0.05);
    size.y = Math.max(size.y, 0.04);
    size.z = Math.max(size.z, 0.05);

    return { center, size };
  }

  /**
   * Create vertices for convex hull collision shape
   */
  private createConvexHullVertices(parts: PartInstance[]): THREE.Vector3[] {
    const vertices: THREE.Vector3[] = [];

    // Collect all part positions as hull points
    parts.forEach(part => {
      vertices.push(part.position.clone());
    });

    // If too few points, create a bounding box
    if (vertices.length < 4) {
      const box = new THREE.Box3().setFromPoints(vertices);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      // Add box corners
      vertices.length = 0;
      for (let x = -1; x <= 1; x += 2) {
        for (let y = -1; y <= 1; y += 2) {
          for (let z = -1; z <= 1; z += 2) {
            vertices.push(new THREE.Vector3(
              center.x + (x * size.x / 2),
              center.y + (y * size.y / 2),
              center.z + (z * size.z / 2)
            ));
          }
        }
      }
    }

    return vertices;
  }

  /**
   * Create simple visual mesh (placeholder geometry - fast loading)
   */
  private createSimpleVisualMesh(parts: PartInstance[]): THREE.Group {
    const group = new THREE.Group();
    group.name = 'RobotVisualMesh_Simple';

    // Group parts by ID for instancing
    const partGroups = new Map<string, PartInstance[]>();

    parts.forEach(part => {
      const key = `${part.partId}_${part.color}`;
      if (!partGroups.has(key)) {
        partGroups.set(key, []);
      }
      partGroups.get(key)!.push(part);
    });

    // Create meshes with simplified placeholder geometry
    partGroups.forEach((instances, key) => {
      instances.forEach(part => {
        const geometry = this.createPartGeometry(part);
        const material = new THREE.MeshStandardMaterial({
          color: this.colorCodeToHex(part.color),
          roughness: 0.6,
          metalness: 0.1
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(part.position);
        mesh.quaternion.copy(part.rotation);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.partId = part.id;

        group.add(mesh);
      });
    });

    return group;
  }

  /**
   * Create detailed visual mesh using LDrawLoader (real LEGO geometry)
   * This loads actual part shapes from the LDraw parts library
   */
  private async createDetailedVisualMesh(
    parts: PartInstance[],
    onProgress?: (progress: LDrawLoadProgress) => void
  ): Promise<THREE.Group> {
    const group = new THREE.Group();
    group.name = 'RobotVisualMesh_Detailed';

    console.log('🎨 Creating detailed visual mesh with LDrawLoader...');

    // Initialize the loader
    await ldrawGeometryLoader.initialize();

    const totalParts = parts.length;
    let loadedParts = 0;
    let failedParts = 0;

    // Load each part with real geometry
    for (const part of parts) {
      try {
        onProgress?.({
          loaded: loadedParts,
          total: totalParts,
          message: `Loading part ${part.partId}...`,
          currentPart: part.partId
        });

        // Try to load the real LDraw geometry for this part
        const partGeometry = await ldrawGeometryLoader.loadPart(part.partId);

        if (partGeometry) {
          // Clone and position the loaded geometry
          const partMesh = partGeometry.clone();
          partMesh.position.copy(part.position);
          partMesh.quaternion.copy(part.rotation);

          // Apply the part's color to all meshes in the group
          partMesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              // Preserve existing material colors from LDraw where possible
              // but override solid color parts with the specified color
              if (child.material instanceof THREE.MeshStandardMaterial) {
                // Check if this is a placeholder color (color 16 = main color)
                const mat = child.material as THREE.MeshStandardMaterial;
                if (mat.userData?.ldrawColor === 16) {
                  mat.color.setHex(this.colorCodeToHex(part.color));
                }
              }
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          partMesh.userData.partId = part.id;
          partMesh.userData.ldrawPartId = part.partId;
          group.add(partMesh);
          loadedParts++;
        } else {
          // Fallback to simple geometry if part not found
          console.warn(`⚠️ Part ${part.partId} not found in LDraw library, using placeholder`);
          const fallbackMesh = this.createFallbackMesh(part);
          group.add(fallbackMesh);
          failedParts++;
          loadedParts++;
        }
      } catch (error) {
        console.error(`❌ Error loading part ${part.partId}:`, error);
        // Use fallback geometry
        const fallbackMesh = this.createFallbackMesh(part);
        group.add(fallbackMesh);
        failedParts++;
        loadedParts++;
      }
    }

    onProgress?.({
      loaded: totalParts,
      total: totalParts,
      message: `Completed! ${totalParts - failedParts}/${totalParts} parts loaded`
    });

    console.log(`✅ Detailed mesh created: ${totalParts - failedParts}/${totalParts} parts loaded successfully`);
    if (failedParts > 0) {
      console.warn(`⚠️ ${failedParts} parts used fallback geometry`);
    }

    return group;
  }

  /**
   * Create fallback mesh when LDraw geometry is not available
   */
  private createFallbackMesh(part: PartInstance): THREE.Mesh {
    const geometry = this.createPartGeometry(part);
    const material = new THREE.MeshStandardMaterial({
      color: this.colorCodeToHex(part.color),
      roughness: 0.6,
      metalness: 0.1,
      transparent: true,
      opacity: 0.8 // Slightly transparent to indicate it's a placeholder
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(part.position);
    mesh.quaternion.copy(part.rotation);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.partId = part.id;
    mesh.userData.isFallback = true;

    return mesh;
  }

  /**
   * Create geometry for a part based on its category
   */
  private createPartGeometry(part: PartInstance): THREE.BufferGeometry {
    switch (part.category) {
      case 'motor': {
        // Motor body with visible hub detail
        const motorGeo = new THREE.BoxGeometry(0.032, 0.032, 0.048);
        return motorGeo;
      }
      case 'wheel': {
        const wheelGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.012, 16);
        wheelGeo.rotateZ(Math.PI / 2); // Align with X-axis (axle direction)
        return wheelGeo;
      }
      case 'sensor':
        return new THREE.BoxGeometry(0.024, 0.024, 0.020);
      default:
        return new THREE.BoxGeometry(0.008, 0.0096, 0.008);
    }
  }

  /**
   * Convert LDraw color code to hex
   */
  private colorCodeToHex(colorCode: number): number {
    const colors: Record<number, number> = {
      0: 0x05131D,
      1: 0x0055BF,
      2: 0x257A3E,
      4: 0xC91A09,
      14: 0xF2CD37,
      15: 0xFFFFFF,
      71: 0x8A928D,
      72: 0x6C6E68,
    };
    return colors[colorCode] ?? 0x808080;
  }
}

export const rigBuilder = new RigBuilder();
