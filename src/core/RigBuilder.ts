import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import type {
  PartInstance,
  WheelAxle,
  MotorJoint,
  SensorConfig,
  ChassisData,
  RiggedRobotData
} from '@/types';
import { partCategorizer } from './PartCategorizer';

/**
 * Automatically rigs a LEGO robot model for physics simulation
 * Detects wheels, motors, sensors and creates appropriate physics constraints
 */
export class RigBuilder {

  /**
   * Main rigging function - converts a flat list of parts into a rigged robot
   */
  async rigRobot(
    parts: PartInstance[],
    modelName: string
  ): Promise<RiggedRobotData> {

    // Step 1: Categorize parts
    const categorized = partCategorizer.categorizeParts(parts);

    console.log('Categorized parts:', {
      motors: categorized.motors.length,
      wheels: categorized.wheels.length,
      sensors: categorized.sensors.length,
      structural: categorized.structural.length
    });

    // Step 2: Detect wheel axles
    const wheelAxles = this.detectWheelAxles(categorized.wheels);

    // Step 3: Associate motors with axles
    const motorJoints = this.createMotorJoints(categorized.motors, wheelAxles);

    // Step 4: Configure sensors
    const sensorConfigs = this.configureSensors(categorized.sensors);

    // Step 5: Build chassis collision shape
    const chassis = this.buildChassisData(categorized.structural, parts);

    // Step 6: Create visual mesh
    const visualMesh = this.createVisualMesh(parts);

    return {
      id: crypto.randomUUID(),
      name: modelName,
      chassis,
      motorJoints,
      sensors: sensorConfigs,
      visualMesh,
      partCount: parts.length
    };
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

    // Calculate center of mass
    const centerOfMass = partCategorizer.calculateCenterOfMass(structural);

    // Create simplified collision shape (convex hull)
    const vertices = this.createConvexHullVertices(structural);

    return {
      mass,
      centerOfMass,
      collisionShape: {
        type: 'ConvexPolyhedron',
        vertices
      }
    };
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
   * Create visual mesh representation of the robot
   */
  private createVisualMesh(parts: PartInstance[]): THREE.Group {
    const group = new THREE.Group();
    group.name = 'RobotVisualMesh';

    // Group parts by ID for instancing
    const partGroups = new Map<string, PartInstance[]>();

    parts.forEach(part => {
      const key = `${part.partId}_${part.color}`;
      if (!partGroups.has(key)) {
        partGroups.set(key, []);
      }
      partGroups.get(key)!.push(part);
    });

    // Create meshes (simplified for now - would load actual LDraw geometry)
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
   * Create geometry for a part based on its category
   */
  private createPartGeometry(part: PartInstance): THREE.BufferGeometry {
    switch (part.category) {
      case 'motor':
        return new THREE.BoxGeometry(0.032, 0.032, 0.048);
      case 'wheel':
        return new THREE.CylinderGeometry(0.028, 0.028, 0.012, 16);
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
