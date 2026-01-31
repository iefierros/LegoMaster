import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import type { VirtualMotorController, MotorJoint } from '@/types';
import { PIDController } from './PIDController';

/**
 * Virtual SPIKE Prime/EV3 Motor with realistic physics
 * Applies forces directly to the robot chassis based on wheel position
 */
export class VirtualSpikeMotor implements VirtualMotorController {
  // Motor specifications (SPIKE Large Motor as reference)
  public readonly maxRPM: number = 175;
  public readonly stallTorque: number = 0.25; // Newton-meters
  private readonly maxAngularVelocity: number; // rad/s
  private readonly wheelRadius: number = 0.028; // 28mm wheel radius

  // State
  public currentVelocity: number = 0;
  public targetVelocity: number = 0;
  private currentAngle: number = 0; // Total accumulated rotation in radians
  private targetAngle: number | null = null;

  // Control
  private pidController: PIDController;
  private isRunning: boolean = false;
  private positionMode: boolean = false;

  // Physics references
  private chassisBody: CANNON.Body | null = null;
  private wheelPosition: THREE.Vector3;
  private motorSide: 'left' | 'right'; // Which side of the robot
  private robotMass: number = 0.5; // kg, updated on initialize
  private motorCount: number = 2; // number of drive motors

  constructor(
    public readonly port: string,
    private joint: MotorJoint,
    motorType: 'spike-large' | 'spike-medium' | 'ev3-large' | 'ev3-medium' = 'spike-large'
  ) {
    // Set motor specifications based on type
    switch (motorType) {
      case 'spike-large':
        this.maxRPM = 175;
        this.stallTorque = 0.25;
        break;
      case 'spike-medium':
        this.maxRPM = 135;
        this.stallTorque = 0.18;
        break;
      case 'ev3-large':
        this.maxRPM = 160;
        this.stallTorque = 0.20;
        break;
      case 'ev3-medium':
        this.maxRPM = 250;
        this.stallTorque = 0.12;
        break;
    }

    this.maxAngularVelocity = this.maxRPM * (2 * Math.PI / 60); // Convert RPM to rad/s
    this.pidController = new PIDController(1.2, 0.2, 0.1);

    // Store wheel position
    this.wheelPosition = joint.axlePosition.clone();

    // Determine if this is a left or right motor based on X position
    this.motorSide = joint.axlePosition.x < 0 ? 'left' : 'right';
  }

  /**
   * Initialize motor with chassis body
   * @param chassisBody - The physics body to apply forces to
   * @param robotMass - Total robot mass in kg (for force limiting)
   * @param motorCount - Number of drive motors (for force distribution)
   */
  initialize(chassisBody: CANNON.Body, robotMass?: number, motorCount?: number): void {
    this.chassisBody = chassisBody;
    if (robotMass !== undefined) this.robotMass = robotMass;
    if (motorCount !== undefined) this.motorCount = motorCount;
  }

  /**
   * Set motor speed as percentage (-100 to 100)
   */
  setSpeed(percentage: number): void {
    const clampedPercentage = Math.max(-100, Math.min(100, percentage));
    this.targetVelocity = (clampedPercentage / 100) * this.maxAngularVelocity;
    this.isRunning = Math.abs(clampedPercentage) > 0;
    this.positionMode = false;
    this.targetAngle = null;

    if (!this.isRunning) {
      this.pidController.reset();
    }
  }

  /**
   * Run motor for a specific number of rotations
   */
  async runForRotations(rotations: number, speed: number = 50): Promise<void> {
    const targetAngleDegrees = rotations * 360;
    const targetAngleRadians = (targetAngleDegrees * Math.PI) / 180;

    this.targetAngle = this.currentAngle + targetAngleRadians;
    this.targetVelocity = ((speed / 100) * this.maxAngularVelocity) * Math.sign(rotations);
    this.positionMode = true;
    this.isRunning = true;

    // Return promise that resolves when target is reached
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!this.positionMode || !this.isRunning) {
          clearInterval(checkInterval);
          resolve();
        }

        // Check if target angle reached
        if (this.targetAngle !== null) {
          const error = Math.abs(this.targetAngle - this.currentAngle);
          if (error < 0.05) { // ~3 degrees tolerance
            this.stop();
            clearInterval(checkInterval);
            resolve();
          }
        }
      }, 16); // Check every ~60fps
    });
  }

  /**
   * Stop the motor
   */
  stop(): void {
    this.targetVelocity = 0;
    this.isRunning = false;
    this.positionMode = false;
    this.pidController.reset();
  }

  /**
   * Reset motor angle to zero
   */
  reset(): void {
    this.currentAngle = 0;
    this.targetAngle = null;
    this.stop();
  }

  /**
   * Update motor physics (called every frame)
   * Directly modifies chassis velocity based on wheel rotation
   * Uses differential drive model for tank-style steering
   */
  update(deltaTime: number): void {
    if (!this.chassisBody || deltaTime <= 0) {
      return;
    }

    // Update motor velocity even when not running (for coasting)
    if (!this.isRunning) {
      // Coast to stop
      this.currentVelocity *= 0.95;
      if (Math.abs(this.currentVelocity) < 0.01) {
        this.currentVelocity = 0;
      }
    } else {
      // Position mode: check if target reached
      if (this.positionMode && this.targetAngle !== null) {
        const error = this.targetAngle - this.currentAngle;

        // Slow down as we approach target
        if (Math.abs(error) < 0.5) { // ~30 degrees
          const slowdownFactor = Math.abs(error) / 0.5;
          this.targetVelocity = this.targetVelocity * slowdownFactor;
        }

        // Stop if reached
        if (Math.abs(error) < 0.05) {
          this.stop();
          return;
        }
      }

      // Calculate PID control for smooth acceleration
      const velocityError = this.targetVelocity - this.currentVelocity;
      const controlOutput = this.pidController.calculate(velocityError, deltaTime);

      // Update velocity with acceleration limits
      const maxAcceleration = 30.0; // rad/s^2 - increased for responsiveness
      const velocityChange = Math.max(-maxAcceleration * deltaTime,
                                     Math.min(maxAcceleration * deltaTime, controlOutput));
      this.currentVelocity += velocityChange;

      // Clamp to max velocity
      this.currentVelocity = Math.max(-this.maxAngularVelocity,
                                     Math.min(this.maxAngularVelocity, this.currentVelocity));
    }

    // Update current angle
    this.currentAngle += this.currentVelocity * deltaTime;

    // Calculate wheel linear velocity: v = ω × r
    const wheelLinearVelocity = this.currentVelocity * this.wheelRadius;

    // Get robot's current orientation
    const robotQuat = this.chassisBody.quaternion;

    // Forward direction in world space (robot's forward is -Z in local space)
    const forwardDir = new CANNON.Vec3(0, 0, -1);
    robotQuat.vmult(forwardDir, forwardDir);

    // Apply velocity contribution from this wheel
    // For differential drive: each wheel contributes to both linear and angular motion
    const wheelbaseWidth = 0.16; // Distance between wheels (2 * 0.08)

    // Force-based dynamics: F = stallTorque / wheelRadius, limited by mass
    // maxAccel = (StallTorque / WheelRadius) / (TotalMass / NumberOfMotors)
    const maxForcePerMotor = this.stallTorque / this.wheelRadius;
    const maxAccel = maxForcePerMotor / (this.robotMass / this.motorCount);

    // Linear velocity contribution (both wheels push forward)
    const targetLinearVel = wheelLinearVelocity * 0.5;

    // Compute acceleration needed, clamped by max achievable
    const currentForwardVel = forwardDir.x * this.chassisBody.velocity.x +
                              forwardDir.z * this.chassisBody.velocity.z;
    const linearError = targetLinearVel - currentForwardVel * 0.5;
    const linearAccel = Math.max(-maxAccel, Math.min(maxAccel, linearError / deltaTime));
    const clampedLinearDv = linearAccel * deltaTime;

    // Angular velocity contribution (wheels on opposite sides create rotation)
    const angularContribution = wheelLinearVelocity / wheelbaseWidth;
    const angularSign = this.motorSide === 'left' ? 1 : -1;
    const maxAngularAccel = maxAccel / (wheelbaseWidth * 0.5);
    const angularDv = Math.max(-maxAngularAccel * deltaTime,
                      Math.min(maxAngularAccel * deltaTime,
                               angularSign * angularContribution * deltaTime));

    // Apply to chassis velocity
    this.chassisBody.velocity.x += forwardDir.x * clampedLinearDv;
    this.chassisBody.velocity.z += forwardDir.z * clampedLinearDv;

    // Apply angular velocity (rotation around Y axis)
    this.chassisBody.angularVelocity.y += angularDv;
  }

  /**
   * Get current motor angle in degrees
   */
  getAngle(): number {
    return (this.currentAngle * 180) / Math.PI;
  }

  /**
   * Get current motor speed in RPM
   */
  getSpeed(): number {
    return (this.currentVelocity * 60) / (2 * Math.PI);
  }

  /**
   * Get motor state for debugging
   */
  getState() {
    return {
      port: this.port,
      angle: this.getAngle(),
      speed: this.getSpeed(),
      targetSpeed: (this.targetVelocity * 60) / (2 * Math.PI),
      isRunning: this.isRunning,
      positionMode: this.positionMode,
      motorSide: this.motorSide
    };
  }
}
