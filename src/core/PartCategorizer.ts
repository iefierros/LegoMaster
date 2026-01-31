import * as THREE from 'three';
import type { PartInstance, PartDefinition } from '@/types';
import { CRITICAL_PARTS } from '@/types';

/**
 * Categorizes imported LEGO parts into functional groups
 * (motors, wheels, sensors, structural)
 */
export class PartCategorizer {
  private motorParts: PartInstance[] = [];
  private wheelParts: PartInstance[] = [];
  private sensorParts: PartInstance[] = [];
  private structuralParts: PartInstance[] = [];

  /**
   * Analyze and categorize all parts in the model
   */
  categorizeParts(parts: PartInstance[]): {
    motors: PartInstance[];
    wheels: PartInstance[];
    sensors: PartInstance[];
    structural: PartInstance[];
  } {
    this.motorParts = [];
    this.wheelParts = [];
    this.sensorParts = [];
    this.structuralParts = [];

    parts.forEach(part => {
      const category = this.identifyPartCategory(part.partId);
      part.category = category;

      switch (category) {
        case 'motor':
          this.motorParts.push(part);
          break;
        case 'wheel':
          this.wheelParts.push(part);
          break;
        case 'sensor':
          this.sensorParts.push(part);
          break;
        default:
          this.structuralParts.push(part);
      }
    });

    return {
      motors: this.motorParts,
      wheels: this.wheelParts,
      sensors: this.sensorParts,
      structural: this.structuralParts
    };
  }

  /**
   * Identify the category of a part by its ID
   */
  private identifyPartCategory(partId: string): 'motor' | 'wheel' | 'sensor' | 'structural' {
    const normalized = partId.toLowerCase().trim();

    // Check against critical parts dictionary
    if (CRITICAL_PARTS[partId]) {
      return CRITICAL_PARTS[partId].category as 'motor' | 'wheel' | 'sensor';
    }

    // Pattern matching for common naming conventions
    if (this.isMotorPart(normalized)) return 'motor';
    if (this.isWheelPart(normalized)) return 'wheel';
    if (this.isSensorPart(normalized)) return 'sensor';

    return 'structural';
  }

  /**
   * Check if part is a motor
   */
  private isMotorPart(partId: string): boolean {
    const motorPatterns = [
      /motor/i,
      /^99499/,   // EV3 Large Motor (may have suffix)
      /^95658/,   // EV3 Medium Motor
      /^54696/,   // SPIKE Large Motor
      /^54675/,   // SPIKE Medium Motor
      /^88008/,   // Power Functions Motor
      /^58120/,   // Powered Up Motor
      /^67323/,   // SPIKE Prime Large Angular Motor
      /^67321/,   // SPIKE Prime Medium Angular Motor
      /^28684/,   // Technic Motor
      /^53787/,   // Technic Motor
      /^6290182/, // SPIKE motor alternate ID
      /^6299646/, // SPIKE motor alternate ID
      /^6299645/, // SPIKE motor alternate ID
      /^6310603/, // SPIKE motor alternate ID
      /^6313594/, // SPIKE motor alternate ID
      /bb493/i,   // Motor housing parts
      /bb494/i,
      /bb339/i,   // Motor housing
      /^46375/,   // Technic servo motor
    ];

    return motorPatterns.some(pattern => pattern.test(partId));
  }

  /**
   * Check if part is a wheel or tire
   */
  private isWheelPart(partId: string): boolean {
    const wheelPatterns = [
      /tire/i,
      /wheel/i,
      /tyre/i,
      /^56908/,   // Common wheel/tire combo
      /^44309/,
      /^87697/,
      /^61480/,
      /^6014/,
      /^44772/,
      /^56145/,
      /^32019/,   // Technic gear wheel
      /^55982/,   // Wheel rim
      /^56902/,   // Wheel rim
      /^49295/,   // SPIKE Prime large wheel
      /^11957/,   // Technic wheel
      /^3482/,    // Classic wheel
      /^6580/,    // Wheel hub
      /^44293/,   // Wheel rim small
      /^30027/,   // Wheel rim
      /^18976/,   // Wheel SPIKE
      /^42485/,   // Wheel small
      /^72206/,   // Wheel technic
      /^6290178/, // SPIKE wheel element ID
      /^6311437/, // SPIKE wheel element ID
      /^39367/,   // SPIKE Prime small wheel (57x14)
      /^39368/,   // SPIKE Prime wheel variant
      /^39369/,   // SPIKE Prime wheel variant
      /^39370/,   // SPIKE Prime castor/ball joint
      /^49283/,   // SPIKE Prime wire clip (sometimes part of wheel assembly)
      /^45601/,   // SPIKE Prime hub
      /^49293/,   // Technic wheel variant
      /^49294/,   // Technic wheel variant
      /^68327/,   // SPIKE wheel
      /^68326/,   // SPIKE wheel
    ];

    return wheelPatterns.some(pattern => pattern.test(partId));
  }

  /**
   * Check if part is a sensor
   */
  private isSensorPart(partId: string): boolean {
    const sensorPatterns = [
      /sensor/i,
      /ultrasonic/i,
      /^37308/,   // SPIKE Color Sensor
      /^37316/,   // SPIKE Ultrasonic
      /^95650/,   // EV3 Color Sensor
      /^95652/,   // EV3 Ultrasonic
      /^45605/,   // EV3 Gyro
      /^95648/,   // EV3 Touch Sensor
      /^6302968/, // SPIKE sensor alternate ID
      /^6308537/, // SPIKE sensor alternate ID
      /^6302888/, // SPIKE color sensor
      /^6302889/, // SPIKE ultrasonic sensor
      /bb667/i,   // Sensor housing
      /bb668/i,   // Sensor housing
    ];

    return sensorPatterns.some(pattern => pattern.test(partId));
  }

  /**
   * Assign port labels to motors based on their position
   * Convention: Left-to-right = A, B, C, D
   */
  assignMotorPorts(motors: PartInstance[]): Map<string, string> {
    const portMap = new Map<string, string>();

    if (motors.length === 0) return portMap;

    // Sort motors by X position (left to right)
    const sortedMotors = [...motors].sort((a, b) => a.position.x - b.position.x);

    const ports = ['A', 'B', 'C', 'D'];
    sortedMotors.forEach((motor, index) => {
      if (index < ports.length) {
        portMap.set(motor.id, ports[index]);
      }
    });

    return portMap;
  }

  /**
   * Assign port labels to sensors
   */
  assignSensorPorts(sensors: PartInstance[]): Map<string, string> {
    const portMap = new Map<string, string>();

    if (sensors.length === 0) return portMap;

    // Sort sensors by position (front to back, left to right)
    const sortedSensors = [...sensors].sort((a, b) => {
      const zDiff = b.position.z - a.position.z; // Front first (higher Z)
      if (Math.abs(zDiff) > 0.01) return zDiff;
      return a.position.x - b.position.x; // Then left to right
    });

    const ports = ['1', '2', '3', '4'];
    sortedSensors.forEach((sensor, index) => {
      if (index < ports.length) {
        portMap.set(sensor.id, ports[index]);
      }
    });

    return portMap;
  }

  /**
   * Get the definition of a part from the critical parts library
   */
  getPartDefinition(partId: string): PartDefinition | null {
    return CRITICAL_PARTS[partId] ?? null;
  }

  /**
   * Calculate total mass of categorized parts
   */
  calculateTotalMass(parts: PartInstance[]): number {
    let totalMass = 0;

    parts.forEach(part => {
      const definition = this.getPartDefinition(part.partId);
      if (definition && definition.mass) {
        totalMass += definition.mass;
      } else {
        // Estimate based on category
        totalMass += this.estimatePartMass(part);
      }
    });

    // Convert from grams to kilograms
    return totalMass / 1000;
  }

  /**
   * Estimate mass for unknown parts
   */
  private estimatePartMass(part: PartInstance): number {
    switch (part.category) {
      case 'motor': return 80;
      case 'wheel': return 15;
      case 'sensor': return 25;
      default: return 2;
    }
  }

  /**
   * Calculate center of mass for a collection of parts
   */
  calculateCenterOfMass(parts: PartInstance[]): THREE.Vector3 {
    if (parts.length === 0) {
      return new THREE.Vector3(0, 0, 0);
    }

    let totalMass = 0;
    const weightedPosition = new THREE.Vector3(0, 0, 0);

    parts.forEach(part => {
      const mass = this.getPartDefinition(part.partId)?.mass ?? this.estimatePartMass(part);
      totalMass += mass;

      weightedPosition.x += part.position.x * mass;
      weightedPosition.y += part.position.y * mass;
      weightedPosition.z += part.position.z * mass;
    });

    if (totalMass > 0) {
      weightedPosition.divideScalar(totalMass);
    }

    return weightedPosition;
  }

  /**
   * Find parts within a certain radius of a position
   */
  findNearbyParts(
    position: THREE.Vector3,
    allParts: PartInstance[],
    radius: number
  ): PartInstance[] {
    return allParts.filter(part => {
      const distance = part.position.distanceTo(position);
      return distance <= radius;
    });
  }

  /**
   * Detect if a part is likely connected to another based on proximity
   */
  arePartsConnected(part1: PartInstance, part2: PartInstance, threshold: number = 0.020): boolean {
    // 0.020m = 20mm = typical LEGO connection distance
    return part1.position.distanceTo(part2.position) <= threshold;
  }
}

export const partCategorizer = new PartCategorizer();
