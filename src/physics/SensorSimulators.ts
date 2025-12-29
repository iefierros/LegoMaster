import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import type { SensorSimulator, SensorReading, ColorSensorReading, UltrasonicReading, SensorConfig } from '@/types';

/**
 * Base class for sensor simulators
 */
abstract class BaseSensorSimulator implements SensorSimulator {
  protected lastReading: SensorReading | null = null;

  constructor(
    public readonly id: string,
    public readonly type: 'ultrasonic' | 'color' | 'gyro' | 'touch',
    public readonly port: string,
    protected config: SensorConfig
  ) {}

  abstract update(scene: THREE.Scene, robotBody: CANNON.Body): SensorReading;
  abstract read(): number | string | any;
}

/**
 * Ultrasonic Distance Sensor Simulator
 * Uses raycasting to measure distance to nearest object
 */
export class UltrasonicSensor extends BaseSensorSimulator {
  private raycaster: THREE.Raycaster;
  private maxDistance: number = 2.55; // 255cm in meters

  constructor(id: string, port: string, config: SensorConfig) {
    super(id, 'ultrasonic', port, config);
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = this.maxDistance;
  }

  update(scene: THREE.Scene, robotBody: CANNON.Body): UltrasonicReading {
    // Get world position of sensor
    const sensorWorldPos = new THREE.Vector3(
      robotBody.position.x + this.config.position.x,
      robotBody.position.y + this.config.position.y,
      robotBody.position.z + this.config.position.z
    );

    // Get world direction (apply robot rotation)
    const robotQuat = new THREE.Quaternion(
      robotBody.quaternion.x,
      robotBody.quaternion.y,
      robotBody.quaternion.z,
      robotBody.quaternion.w
    );

    const sensorDirection = this.config.direction.clone();
    sensorDirection.applyQuaternion(robotQuat);
    sensorDirection.normalize();

    // Perform raycast
    this.raycaster.set(sensorWorldPos, sensorDirection);

    // Filter out the robot's own meshes
    const intersectableObjects = scene.children.filter(
      obj => obj.userData.isTrack || obj.userData.isMissionElement
    );

    const intersects = this.raycaster.intersectObjects(intersectableObjects, true);

    // Calculate distance in cm
    let distanceCm = 255; // Max reading
    if (intersects.length > 0) {
      distanceCm = Math.min(intersects[0].distance * 100, 255);
    }

    this.lastReading = {
      sensorId: this.id,
      type: 'ultrasonic',
      timestamp: Date.now(),
      value: Math.round(distanceCm)
    };

    return this.lastReading as UltrasonicReading;
  }

  read(): number {
    return (this.lastReading?.value as number) ?? 255;
  }

  /**
   * Get reading in inches (common in FLL)
   */
  readInches(): number {
    return this.read() / 2.54;
  }
}

/**
 * Color Sensor Simulator
 * Samples pixels from the mat texture to detect color
 */
export class ColorSensor extends BaseSensorSimulator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private matTexture: THREE.Texture | null = null;
  private matDimensions: { width: number; height: number } = { width: 2.4, height: 1.2 };

  constructor(id: string, port: string, config: SensorConfig) {
    super(id, 'color', port, config);

    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
  }

  /**
   * Initialize with the mat texture
   */
  setMatTexture(texture: THREE.Texture, dimensions: { width: number; height: number }): void {
    this.matTexture = texture;
    this.matDimensions = dimensions;

    // Draw texture to canvas for pixel sampling
    if (texture.image) {
      this.canvas.width = texture.image.width || 1024;
      this.canvas.height = texture.image.height || 512;
      this.ctx.drawImage(texture.image, 0, 0);
    }
  }

  update(scene: THREE.Scene, robotBody: CANNON.Body): ColorSensorReading {
    if (!this.matTexture) {
      return this.getDefaultReading();
    }

    // Get world position of sensor
    const sensorWorldPos = new THREE.Vector3(
      robotBody.position.x + this.config.position.x,
      robotBody.position.y + this.config.position.y,
      robotBody.position.z + this.config.position.z
    );

    // Convert 3D position to UV coordinates on the mat
    // Assuming mat is centered at origin
    const u = (sensorWorldPos.x + this.matDimensions.width / 2) / this.matDimensions.width;
    const v = (sensorWorldPos.z + this.matDimensions.height / 2) / this.matDimensions.height;

    // Clamp to valid range
    const uClamped = Math.max(0, Math.min(1, u));
    const vClamped = Math.max(0, Math.min(1, v));

    // Sample pixel from canvas
    const x = Math.floor(uClamped * this.canvas.width);
    const y = Math.floor(vClamped * this.canvas.height);

    const pixelData = this.ctx.getImageData(x, y, 1, 1).data;
    const rgb = {
      r: pixelData[0],
      g: pixelData[1],
      b: pixelData[2]
    };

    // Classify color and calculate reflectance
    const colorName = this.classifyColor(rgb);
    const reflectance = this.calculateReflectance(rgb);

    this.lastReading = {
      sensorId: this.id,
      type: 'color',
      timestamp: Date.now(),
      value: colorName,
      raw: rgb,
      reflectance
    };

    return this.lastReading as ColorSensorReading;
  }

  private getDefaultReading(): ColorSensorReading {
    return {
      sensorId: this.id,
      type: 'color',
      timestamp: Date.now(),
      value: 'unknown',
      raw: { r: 128, g: 128, b: 128 },
      reflectance: 50
    };
  }

  /**
   * Classify RGB values into color names
   */
  private classifyColor(rgb: { r: number; g: number; b: number }): string {
    const { r, g, b } = rgb;
    const brightness = (r + g + b) / 3;

    // Black/White detection
    if (brightness < 40) return 'black';
    if (brightness > 200 && Math.abs(r - g) < 30 && Math.abs(g - b) < 30) return 'white';

    // Color detection based on dominant channel
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max - min;

    // Low saturation = gray/white
    if (saturation < 40) {
      return brightness > 150 ? 'white' : 'gray';
    }

    // Determine dominant color
    if (r > g && r > b && r > 100) {
      // Check if it's red or orange/yellow
      if (g > 100 && g > b * 1.5) return 'yellow';
      if (g > 50 && g < 150) return 'orange';
      return 'red';
    }

    if (g > r && g > b && g > 100) {
      // Green or yellow
      if (r > 100) return 'yellow';
      return 'green';
    }

    if (b > r && b > g && b > 100) {
      return 'blue';
    }

    return 'unknown';
  }

  /**
   * Calculate reflectance (0-100)
   */
  private calculateReflectance(rgb: { r: number; g: number; b: number }): number {
    const brightness = (rgb.r + rgb.g + rgb.b) / 3;
    return Math.round((brightness / 255) * 100);
  }

  read(): string {
    return (this.lastReading?.value as string) ?? 'unknown';
  }

  /**
   * Read reflected light intensity (0-100)
   */
  readReflectance(): number {
    return (this.lastReading as ColorSensorReading)?.reflectance ?? 50;
  }

  /**
   * Read raw RGB values
   */
  readRGB(): { r: number; g: number; b: number } {
    return (this.lastReading as ColorSensorReading)?.raw ?? { r: 128, g: 128, b: 128 };
  }
}

/**
 * Gyroscope Sensor Simulator
 * Measures robot rotation
 */
export class GyroSensor extends BaseSensorSimulator {
  private initialRotation: THREE.Euler = new THREE.Euler(0, 0, 0);
  private currentRotation: THREE.Euler = new THREE.Euler(0, 0, 0);

  constructor(id: string, port: string, config: SensorConfig) {
    super(id, 'gyro', port, config);
  }

  update(scene: THREE.Scene, robotBody: CANNON.Body): SensorReading {
    // Get current rotation from physics body
    const quat = new THREE.Quaternion(
      robotBody.quaternion.x,
      robotBody.quaternion.y,
      robotBody.quaternion.z,
      robotBody.quaternion.w
    );

    this.currentRotation.setFromQuaternion(quat);

    // Calculate relative rotation in degrees
    const yawDegrees = ((this.currentRotation.y - this.initialRotation.y) * 180) / Math.PI;

    this.lastReading = {
      sensorId: this.id,
      type: 'gyro',
      timestamp: Date.now(),
      value: Math.round(yawDegrees),
      raw: {
        pitch: (this.currentRotation.x * 180) / Math.PI,
        yaw: yawDegrees,
        roll: (this.currentRotation.z * 180) / Math.PI
      }
    };

    return this.lastReading;
  }

  read(): number {
    return (this.lastReading?.value as number) ?? 0;
  }

  /**
   * Reset gyro angle to zero
   */
  reset(): void {
    this.initialRotation.copy(this.currentRotation);
  }

  /**
   * Get rotation rate (degrees/second)
   */
  readRate(robotBody: CANNON.Body): number {
    const angularVel = robotBody.angularVelocity;
    return (angularVel.y * 180) / Math.PI;
  }
}

/**
 * Factory function to create appropriate sensor simulator
 */
export function createSensorSimulator(
  config: SensorConfig,
  matTexture?: THREE.Texture,
  matDimensions?: { width: number; height: number }
): SensorSimulator {
  switch (config.type) {
    case 'ultrasonic':
      return new UltrasonicSensor(config.id, config.port, config);

    case 'color': {
      const colorSensor = new ColorSensor(config.id, config.port, config);
      if (matTexture && matDimensions) {
        colorSensor.setMatTexture(matTexture, matDimensions);
      }
      return colorSensor;
    }

    case 'gyro':
      return new GyroSensor(config.id, config.port, config);

    default:
      throw new Error(`Unsupported sensor type: ${config.type}`);
  }
}
