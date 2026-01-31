import { describe, it, expect } from 'vitest';
import { RigBuilder } from './RigBuilder';
import { PartInstance } from '@/types';
import * as THREE from 'three';

function createMockWheel(id: string, x: number, y: number, z: number): PartInstance {
  return {
    id,
    partId: 'wheel',
    position: new THREE.Vector3(x, y, z),
    rotation: new THREE.Quaternion(),
    color: 15,
    category: 'wheel'
  };
}

describe('RigBuilder', () => {
  describe('detectWheelAxles', () => {
    it('should detect a single standard axle with two wheels', () => {
      const rigBuilder = new RigBuilder();
      const wheels: PartInstance[] = [
        createMockWheel('w1', -0.04, 0.02, 0.05),  // Left wheel
        createMockWheel('w2', 0.04, 0.02, 0.051),  // Right wheel (slightly different Z)
      ];

      const axles = rigBuilder.detectWheelAxles(wheels);

      expect(axles.length).toBe(1);
      expect(axles[0].wheels.length).toBe(2);
    });

    it('should detect two parallel axles', () => {
      const rigBuilder = new RigBuilder();
      const wheels: PartInstance[] = [
        createMockWheel('w1', -0.04, 0.02, 0.05),   // Front-left
        createMockWheel('w2', 0.04, 0.02, 0.05),    // Front-right
        createMockWheel('w3', -0.04, 0.02, -0.05),  // Rear-left
        createMockWheel('w4', 0.04, 0.02, -0.05),   // Rear-right
      ];

      const axles = rigBuilder.detectWheelAxles(wheels);

      expect(axles.length).toBe(2);
    });

    it('should not detect axle with only one wheel', () => {
      const rigBuilder = new RigBuilder();
      const wheels: PartInstance[] = [
        createMockWheel('w1', -0.04, 0.02, 0.05)
      ];

      const axles = rigBuilder.detectWheelAxles(wheels);

      expect(axles.length).toBe(0);
    });

    it('should not detect axle if wheels are too close on X-axis', () => {
      const rigBuilder = new RigBuilder();
      const wheels: PartInstance[] = [
        createMockWheel('w1', -0.01, 0.02, 0.05),
        createMockWheel('w2', 0.01, 0.02, 0.05),
      ];

      const axles = rigBuilder.detectWheelAxles(wheels);

      expect(axles.length).toBe(0);
    });

    it('should not detect axle if wheels are not aligned on Z-axis', () => {
      const rigBuilder = new RigBuilder();
      const wheels: PartInstance[] = [
        createMockWheel('w1', -0.05, 0.02, 0.05),
        createMockWheel('w2', 0.05, 0.02, 0.15),
      ];

      const axles = rigBuilder.detectWheelAxles(wheels);

      expect(axles.length).toBe(0);
    });

    it('should handle odd number of wheels correctly', () => {
      const rigBuilder = new RigBuilder();
      const wheels: PartInstance[] = [
        createMockWheel('w1', -0.04, 0.02, 0.05),
        createMockWheel('w2', 0.04, 0.02, 0.05),
        createMockWheel('w3', 0, 0.1, 0),  // A spare wheel on top
      ];

      const axles = rigBuilder.detectWheelAxles(wheels);

      expect(axles.length).toBe(1);
    });
  });
});
