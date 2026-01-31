import { describe, it, expect } from 'vitest';
import { LDrawParser } from './LDrawParser';
import * as THREE from 'three';

describe('LDrawParser', () => {
  const sampleLDrawContent = `
0 FILE my_robot.ldr
0 NAME my_robot.ldr
0 AUTHOR Willy E. Coyote
0
1 4 0 0 0 1 0 0 0 1 0 0 0 1 3005.dat
1 15 20 -10 0 0 -1 0 1 0 0 0 0 1 wheel.dat
  `;

  describe('parseLDraw', () => {
    it('should parse author from meta commands', () => {
      const parser = new LDrawParser();
      const result = parser.parseLDraw(sampleLDrawContent, 'test_model');

      expect(result.metadata.author).toBe('Willy E. Coyote');
    });

    it('should use provided model name', () => {
      const parser = new LDrawParser();
      const result = parser.parseLDraw(sampleLDrawContent, 'test_model');

      expect(result.metadata.name).toBe('test_model');
    });

    it('should have correct part count in metadata', () => {
      const parser = new LDrawParser();
      const result = parser.parseLDraw(sampleLDrawContent, 'test_model');

      expect(result.metadata.partCount).toBe(2);
    });

    it('should parse the correct number of parts', () => {
      const parser = new LDrawParser();
      const result = parser.parseLDraw(sampleLDrawContent, 'test_model');

      expect(result.parts.length).toBe(2);
    });

    describe('Part 1 (brick) properties', () => {
      it('should normalize part ID', () => {
        const parser = new LDrawParser();
        const result = parser.parseLDraw(sampleLDrawContent, 'test_model');

        expect(result.parts[0].partId).toBe('3005');
      });

      it('should parse color correctly', () => {
        const parser = new LDrawParser();
        const result = parser.parseLDraw(sampleLDrawContent, 'test_model');

        expect(result.parts[0].color).toBe(4);
      });

      it('should parse position at origin', () => {
        const parser = new LDrawParser();
        const result = parser.parseLDraw(sampleLDrawContent, 'test_model');
        const part1 = result.parts[0];

        const expectedPos = new THREE.Vector3(0, 0, 0);
        expect(part1.position.distanceTo(expectedPos)).toBeLessThan(1e-6);
      });

      it('should have identity rotation', () => {
        const parser = new LDrawParser();
        const result = parser.parseLDraw(sampleLDrawContent, 'test_model');
        const part1 = result.parts[0];

        const expectedRot = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().identity());
        expect(part1.rotation.angleTo(expectedRot)).toBeLessThan(1e-6);
      });
    });

    describe('Part 2 (wheel) properties', () => {
      it('should normalize part ID', () => {
        const parser = new LDrawParser();
        const result = parser.parseLDraw(sampleLDrawContent, 'test_model');

        expect(result.parts[1].partId).toBe('wheel');
      });

      it('should parse color correctly', () => {
        const parser = new LDrawParser();
        const result = parser.parseLDraw(sampleLDrawContent, 'test_model');

        expect(result.parts[1].color).toBe(15);
      });

      it('should convert position from LDraw to Three.js coordinates', () => {
        const parser = new LDrawParser();
        const result = parser.parseLDraw(sampleLDrawContent, 'test_model');
        const part2 = result.parts[1];

        // LDraw coords: x=20, y=-10, z=0. Scale = 0.0004
        // Three.js: x = 20*s, y = -(-10)*s, z = -0*s
        const scale = 0.0004;
        const expectedPos = new THREE.Vector3(20 * scale, 10 * scale, 0);

        expect(part2.position.distanceTo(expectedPos)).toBeLessThan(1e-6);
      });

      it('should parse rotation matrix correctly', () => {
        const parser = new LDrawParser();
        const result = parser.parseLDraw(sampleLDrawContent, 'test_model');
        const part2 = result.parts[1];

        // LDraw matrix: 0 -1 0 / 1 0 0 / 0 0 1 (90 deg rotation around Z)
        const expectedRotMatrix = new THREE.Matrix4().set(
          0, -1, 0, 0,
          1, 0, 0, 0,
          0, 0, 1, 0,
          0, 0, 0, 1
        );
        const expectedRot = new THREE.Quaternion().setFromRotationMatrix(expectedRotMatrix);

        expect(part2.rotation.angleTo(expectedRot)).toBeLessThan(1e-6);
      });
    });

    describe('edge cases', () => {
      it('should handle empty content', () => {
        const parser = new LDrawParser();
        const result = parser.parseLDraw('', 'empty');

        expect(result.parts.length).toBe(0);
      });

      it('should handle invalid content', () => {
        const parser = new LDrawParser();
        const result = parser.parseLDraw('this is not a valid ldraw file', 'invalid');

        expect(result.parts.length).toBe(0);
      });

      it('should handle content with only comments', () => {
        const parser = new LDrawParser();
        const content = `
0 This is a comment
0 Another comment
        `;
        const result = parser.parseLDraw(content, 'comments_only');

        expect(result.parts.length).toBe(0);
      });
    });
  });

  describe('normalizePartId', () => {
    it('should remove .dat extension', () => {
      const parser = new LDrawParser();
      const content = '1 15 0 0 0 1 0 0 0 1 0 0 0 1 3005.dat';
      const result = parser.parseLDraw(content, 'test');

      expect(result.parts[0].partId).toBe('3005');
    });

    it('should handle Studio-specific paths', () => {
      const parser = new LDrawParser();
      const content = '1 15 0 0 0 1 0 0 0 1 0 0 0 1 parts/54696.dat';
      const result = parser.parseLDraw(content, 'test');

      expect(result.parts[0].partId).toBe('54696');
    });

    it('should handle color suffix patterns', () => {
      const parser = new LDrawParser();
      const content = '1 15 0 0 0 1 0 0 0 1 0 0 0 1 54696c01.dat';
      const result = parser.parseLDraw(content, 'test');

      expect(result.parts[0].partId).toBe('54696');
    });
  });
});
