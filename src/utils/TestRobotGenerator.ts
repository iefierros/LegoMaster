import type { ParsedModel, PartInstance } from '@/types';
import * as THREE from 'three';

/**
 * Generates a simple test robot for development and testing
 * This robot has 2 motors, 2 wheels, and basic structure
 */
export class TestRobotGenerator {

  /**
   * Generate a simple wheeled robot with motors
   */
  static generateSimpleRobot(): ParsedModel {
    console.log('🧪 Generating test robot...');

    const parts: PartInstance[] = [];
    let partCounter = 0;

    // Helper function to create a part
    const createPart = (
      partId: string,
      x: number,
      y: number,
      z: number,
      color: number = 71
    ): PartInstance => {
      return {
        id: `part_${partCounter++}`,
        partId,
        position: new THREE.Vector3(x, y, z),
        rotation: new THREE.Quaternion(),
        color,
        category: undefined
      };
    };

    // ============ CHASSIS (Central structure) ============

    // Main beam (horizontal, center)
    parts.push(createPart('32524', 0, 0, 0, 71)); // Beam 7M

    // Side beams
    parts.push(createPart('32524', 0.05, 0, 0, 71)); // Right
    parts.push(createPart('32524', -0.05, 0, 0, 71)); // Left

    // Cross beams
    parts.push(createPart('32316', 0, 0, 0.04, 71)); // Front
    parts.push(createPart('32316', 0, 0, -0.04, 71)); // Back

    // ============ MOTORS ============

    // SPIKE Large Motor - Left (Port A)
    // Position: left side, slightly back
    parts.push(createPart('54696', -0.08, 0, -0.02, 0));

    // SPIKE Large Motor - Right (Port B)
    // Position: right side, slightly back
    parts.push(createPart('54696', 0.08, 0, -0.02, 0));

    // ============ WHEELS ============

    // Left wheels
    parts.push(createPart('56908', -0.08, -0.04, 0, 0)); // Tire 68.7 x 34R
    parts.push(createPart('56908', -0.08, -0.04, -0.02, 0));

    // Right wheels
    parts.push(createPart('56908', 0.08, -0.04, 0, 0));
    parts.push(createPart('56908', 0.08, -0.04, -0.02, 0));

    // ============ SENSORS ============

    // Color sensor - Front center (Port 1)
    parts.push(createPart('37308', 0, -0.02, 0.06, 1)); // SPIKE Color Sensor

    // Ultrasonic sensor - Front left (Port 2)
    parts.push(createPart('37316', -0.03, 0, 0.08, 1)); // SPIKE Ultrasonic

    // ============ ADDITIONAL STRUCTURE ============

    // Top plate
    parts.push(createPart('87580', 0, 0.02, 0, 71)); // Plate 2x2

    // Battery/Hub (cosmetic)
    parts.push(createPart('32524', 0, 0.04, 0, 14)); // Yellow beam (represents hub)

    console.log('✅ Test robot generated:', {
      totalParts: parts.length,
      expectedMotors: 2,
      expectedWheels: 4,
      expectedSensors: 2
    });

    return {
      parts,
      metadata: {
        name: 'Simple Test Robot',
        author: 'LegoMaster Test Generator',
        partCount: parts.length
      }
    };
  }

  /**
   * Generate a minimal robot with just 2 motors and 2 wheels
   */
  static generateMinimalRobot(): ParsedModel {
    console.log('🧪 Generating minimal test robot...');

    const parts: PartInstance[] = [];
    let partCounter = 0;

    const createPart = (
      partId: string,
      x: number,
      y: number,
      z: number,
      color: number = 71
    ): PartInstance => {
      return {
        id: `part_${partCounter++}`,
        partId,
        position: new THREE.Vector3(x, y, z),
        rotation: new THREE.Quaternion(),
        color,
        category: undefined
      };
    };

    // Main chassis beam
    parts.push(createPart('32524', 0, 0, 0, 71));

    // Motors
    parts.push(createPart('54696', -0.08, 0, 0, 0)); // Left motor (A)
    parts.push(createPart('54696', 0.08, 0, 0, 0));  // Right motor (B)

    // Wheels
    parts.push(createPart('56908', -0.08, -0.04, 0, 0)); // Left wheel
    parts.push(createPart('56908', 0.08, -0.04, 0, 0));  // Right wheel

    console.log('✅ Minimal test robot generated:', {
      totalParts: parts.length,
      expectedMotors: 2,
      expectedWheels: 2
    });

    return {
      parts,
      metadata: {
        name: 'Minimal Test Robot',
        author: 'LegoMaster Test Generator',
        partCount: parts.length
      }
    };
  }

  /**
   * Get a simple robot in LDraw format
   */
  static generateLDrawFormat(): string {
    return `0 Simple Test Robot
0 Name: test-robot.ldr
0 Author: LegoMaster Test Generator

0 Chassis
1 71 0 0 0 1 0 0 0 1 0 0 0 1 32524.dat
1 71 50 0 0 1 0 0 0 1 0 0 0 1 32524.dat
1 71 -50 0 0 1 0 0 0 1 0 0 0 1 32524.dat

0 Motors
1 0 -80 0 -20 1 0 0 0 1 0 0 0 1 54696.dat
1 0 80 0 -20 1 0 0 0 1 0 0 0 1 54696.dat

0 Wheels
1 0 -80 -40 0 1 0 0 0 1 0 0 0 1 56908.dat
1 0 -80 -40 -20 1 0 0 0 1 0 0 0 1 56908.dat
1 0 80 -40 0 1 0 0 0 1 0 0 0 1 56908.dat
1 0 80 -40 -20 1 0 0 0 1 0 0 0 1 56908.dat

0 Sensors
1 1 0 -20 60 1 0 0 0 1 0 0 0 1 37308.dat
1 1 -30 0 80 1 0 0 0 1 0 0 0 1 37316.dat
`;
  }
}
