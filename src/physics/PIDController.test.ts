import { describe, it, expect } from 'vitest';
import { PIDController } from './PIDController';

describe('PIDController', () => {
  describe('calculate', () => {
    it('should apply proportional term correctly', () => {
      const pid = new PIDController(0.5, 0, 0);
      const output = pid.calculate(10, 0.1);

      expect(output).toBe(5); // kp * error = 0.5 * 10
    });

    it('should accumulate integral term correctly', () => {
      const pid = new PIDController(0, 0.1, 0);
      pid.calculate(10, 0.1);  // integral = 1
      const output = pid.calculate(10, 0.1);  // integral = 2

      expect(output).toBe(0.2); // ki * integral = 0.1 * 2
    });

    it('should apply derivative term correctly', () => {
      const pid = new PIDController(0, 0, 0.05);
      pid.calculate(10, 0.1);  // previousError = 10
      const output = pid.calculate(5, 0.1);  // derivative = (5 - 10) / 0.1 = -50

      const expectedDerivative = 0.05 * ((5 - 10) / 0.1);
      expect(output).toBe(expectedDerivative);
    });

    it('should combine P, I, D terms correctly', () => {
      const pid = new PIDController(0.5, 0.1, 0.05);
      pid.calculate(10, 0.1);  // p=5, i=0.1, d=5. prevError=10, integral=1
      const output = pid.calculate(8, 0.1);

      const p = 0.5 * 8;
      const i = 0.1 * (1 + 8 * 0.1);
      const d = 0.05 * ((8 - 10) / 0.1);
      const expectedOutput = p + i + d;

      expect(Math.abs(output - expectedOutput)).toBeLessThan(1e-9);
    });
  });

  describe('reset', () => {
    it('should reset integral to zero', () => {
      const pid = new PIDController(0.5, 0.1, 0.05);
      pid.calculate(10, 0.1);
      pid.calculate(10, 0.1);

      pid.reset();

      expect(pid.getIntegral()).toBe(0);
    });

    it('should behave like new controller after reset', () => {
      const pid = new PIDController(0.5, 0.1, 0.05);
      pid.calculate(10, 0.1);
      pid.calculate(20, 0.1);
      pid.reset();

      const output = pid.calculate(10, 0.1);

      const freshPid = new PIDController(0.5, 0.1, 0.05);
      const freshOutput = freshPid.calculate(10, 0.1);

      expect(output).toBe(freshOutput);
    });
  });

  describe('integral windup protection', () => {
    it('should clamp integral to prevent windup', () => {
      const pid = new PIDController(0, 0.1, 0);

      for (let k = 0; k < 200; k++) {
        pid.calculate(100, 0.1);
      }

      const integral = pid.getIntegral();
      expect(integral).toBeLessThanOrEqual(10);
      expect(integral).toBeGreaterThanOrEqual(-10);
    });
  });
});
