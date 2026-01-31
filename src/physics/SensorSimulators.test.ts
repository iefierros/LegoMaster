import { describe, it, expect } from 'vitest';
import { ColorSensor } from './SensorSimulators';

describe('SensorSimulators', () => {
  describe('ColorSensor.classifyColor', () => {
    it('should classify black correctly', () => {
      const result = ColorSensor.classifyColor({ r: 10, g: 15, b: 20 });
      expect(result).toBe('black');
    });

    it('should classify white correctly', () => {
      const result = ColorSensor.classifyColor({ r: 240, g: 245, b: 250 });
      expect(result).toBe('white');
    });

    it('should classify gray correctly', () => {
      const result = ColorSensor.classifyColor({ r: 120, g: 125, b: 130 });
      expect(result).toBe('gray');
    });

    it('should classify red correctly', () => {
      const result = ColorSensor.classifyColor({ r: 200, g: 30, b: 40 });
      expect(result).toBe('red');
    });

    it('should classify green correctly', () => {
      const result = ColorSensor.classifyColor({ r: 30, g: 200, b: 40 });
      expect(result).toBe('green');
    });

    it('should classify blue correctly', () => {
      const result = ColorSensor.classifyColor({ r: 30, g: 40, b: 200 });
      expect(result).toBe('blue');
    });

    it('should classify yellow correctly', () => {
      const result = ColorSensor.classifyColor({ r: 230, g: 220, b: 50 });
      expect(result).toBe('yellow');
    });

    it('should classify orange correctly', () => {
      const result = ColorSensor.classifyColor({ r: 240, g: 100, b: 30 });
      expect(result).toBe('orange');
    });

    it('should classify ambiguous colors as unknown', () => {
      // A purplish color that doesn't fit standard categories
      const result = ColorSensor.classifyColor({ r: 150, g: 40, b: 140 });
      expect(result).toBe('unknown');
    });

    it('should classify bright saturated green correctly', () => {
      const result = ColorSensor.classifyColor({ r: 150, g: 250, b: 150 });
      expect(result).toBe('green');
    });
  });
});
