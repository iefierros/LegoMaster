import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { PartCategorizer } from './PartCategorizer';
import type { PartInstance } from '@/types';

// Helper to create a mock PartInstance
const createMockPart = (partId: string, x = 0, y = 0, z = 0): PartInstance => ({
  id: `instance_${partId}_${Math.random()}`,
  partId,
  position: new THREE.Vector3(x, y, z),
  rotation: new THREE.Quaternion(),
  color: 0,
});

describe('PartCategorizer', () => {
  let categorizer: PartCategorizer;

  beforeEach(() => {
    categorizer = new PartCategorizer();
  });

  describe('categorizeParts', () => {
    it('should categorize parts based on CRITICAL_PARTS dictionary', () => {
      const parts: PartInstance[] = [
        createMockPart('54696'), // SPIKE Large Motor
        createMockPart('56908'), // Common Wheel/Tire
        createMockPart('37308'), // SPIKE Color Sensor
        createMockPart('12345'), // Structural part
      ];

      const { motors, wheels, sensors, structural } = categorizer.categorizeParts(parts);

      expect(motors).toHaveLength(1);
      expect(motors[0].partId).toBe('54696');
      expect(motors[0].category).toBe('motor');

      expect(wheels).toHaveLength(1);
      expect(wheels[0].partId).toBe('56908');
      expect(wheels[0].category).toBe('wheel');

      expect(sensors).toHaveLength(1);
      expect(sensors[0].partId).toBe('37308');
      expect(sensors[0].category).toBe('sensor');

      expect(structural).toHaveLength(1);
      expect(structural[0].partId).toBe('12345');
      expect(structural[0].category).toBe('structural');
    });

    it('should categorize parts based on regex patterns', () => {
      const parts: PartInstance[] = [
        createMockPart('some_motor_part.dat'),
        createMockPart('a_wheel_for_my_car'),
        createMockPart('my-ultra-sensor-9000'),
        createMockPart('stud.dat'),
      ];

      const { motors, wheels, sensors, structural } = categorizer.categorizeParts(parts);

      expect(motors).toHaveLength(1);
      expect(motors[0].category).toBe('motor');
      expect(wheels).toHaveLength(1);
      expect(wheels[0].category).toBe('wheel');
      expect(sensors).toHaveLength(1);
      expect(sensors[0].category).toBe('sensor');
      expect(structural).toHaveLength(1);
      expect(structural[0].category).toBe('structural');
    });

    it('should return empty arrays if no parts are provided', () => {
      const { motors, wheels, sensors, structural } = categorizer.categorizeParts([]);
      expect(motors).toHaveLength(0);
      expect(wheels).toHaveLength(0);
      expect(sensors).toHaveLength(0);
      expect(structural).toHaveLength(0);
    });
  });

  describe('assignMotorPorts', () => {
    it('should assign ports A, B, C, D from left to right (x-axis)', () => {
      const motorC = createMockPart('54696', 2); // Rightmost
      const motorA = createMockPart('54696', -2); // Leftmost
      const motorB = createMockPart('99499', 0);  // Center

      const motorParts = [motorC, motorA, motorB];
      const portMap = categorizer.assignMotorPorts(motorParts);

      expect(portMap.get(motorA.id)).toBe('A');
      expect(portMap.get(motorB.id)).toBe('B');
      expect(portMap.get(motorC.id)).toBe('C');
    });

    it('should handle more than 4 motors gracefully', () => {
        const motors = [
            createMockPart('54696', 1),
            createMockPart('54696', 2),
            createMockPart('54696', 3),
            createMockPart('54696', 4),
            createMockPart('54696', 5),
        ];
        const portMap = categorizer.assignMotorPorts(motors);
        expect(portMap.size).toBe(4);
    });

    it('should return an empty map if no motors are provided', () => {
      const portMap = categorizer.assignMotorPorts([]);
      expect(portMap.size).toBe(0);
    });
  });

  describe('assignSensorPorts', () => {
    it('should assign ports based on Z (front-to-back) then X (left-to-right)', () => {
      const sensor4 = createMockPart('37308', 2, 0, -1);  // Back, Right
      const sensor3 = createMockPart('37308', -2, 0, -1); // Back, Left
      const sensor2 = createMockPart('95650', 2, 0, 1);   // Front, Right
      const sensor1 = createMockPart('95650', -2, 0, 1);  // Front, Left

      const sensorParts = [sensor4, sensor2, sensor3, sensor1];
      const portMap = categorizer.assignSensorPorts(sensorParts);
      
      // Sorted order should be: sensor1 (z=1, x=-2), sensor2 (z=1, x=2), sensor3 (z=-1, x=-2), sensor4 (z=-1, x=2)
      // But wait, sorting is `b.position.z - a.position.z`, so higher Z comes first.
      // Correct sorted order: sensor1, sensor2, sensor3, sensor4
      expect(portMap.get(sensor1.id)).toBe('1');
      expect(portMap.get(sensor2.id)).toBe('2');
      expect(portMap.get(sensor3.id)).toBe('3');
      expect(portMap.get(sensor4.id)).toBe('4');
    });
  });

  describe('calculateTotalMass', () => {
    it('should calculate mass using definitions and estimates', () => {
        const parts: PartInstance[] = [
            createMockPart('54696'), // Motor from CRITICAL_PARTS, mass: 120g
            createMockPart('some_other_motor'), // Estimated motor mass: 80g
            createMockPart('12345'), // Structural part, estimated mass: 2g
        ];
        categorizer.categorizeParts(parts);
        const totalMass = categorizer.calculateTotalMass(parts);

        // (120 + 80 + 2) / 1000
        expect(totalMass).toBeCloseTo(0.202);
    });
  });

  describe('calculateCenterOfMass', () => {
    it('should calculate the weighted center of mass', () => {
        const part1 = createMockPart('54696', -10, 0, 0); // mass 120g
        const part2 = createMockPart('structural-part', 10, 0, 0); // mass 2g (estimated)
        const parts = [part1, part2];
        categorizer.categorizeParts(parts);

        const centerOfMass = categorizer.calculateCenterOfMass(parts);

        // CoM = ((-10 * 120) + (10 * 2)) / (120 + 2) = -1180 / 122 = -9.67
        expect(centerOfMass.x).toBeCloseTo(-9.67, 2);
        expect(centerOfMass.y).toBe(0);
        expect(centerOfMass.z).toBe(0);
    });
  });
});
