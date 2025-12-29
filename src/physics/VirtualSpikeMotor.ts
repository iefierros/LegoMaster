import * as CANNON from 'cannon-es';
import type { VirtualMotorController, MotorJoint } from '@/types';
import { PIDController } from './PIDController';

/**
 * Virtual SPIKE Prime/EV3 Motor with realistic physics
 * Simulates the behavior of actual LEGO motors with torque, speed limits, and PID control
 */
export class VirtualSpikeMotor implements VirtualMotorController {
  // Motor specifications (SPIKE Large Motor as reference)
  public readonly maxRPM: number = 175;
  public readonly stallTorque: number = 0.25; // Newton-meters
  private readonly maxAngularVelocity: number; // rad/s

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
  private hingeConstraint: CANNON.HingeConstraint | null = null;
  private bodyA: CANNON.Body; // Chassis
  private bodyB: CANNON.Body; // Wheel axle or motor shaft

  constructor(
    public readonly port: string,
    private joint: MotorJoint,
    private physicsWorld: CANNON.World,
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
    this.pidController = new PIDController(0.8, 0.15, 0.08);

    // Create physics bodies (will be initialized later with actual robot body)
    this.bodyA = new CANNON.Body({ mass: 0 }); // Placeholder
    this.bodyB = new CANNON.Body({ mass: 0.05 }); // Wheel/shaft
  }

  /**
   * Initialize motor with physics bodies
   */
  initialize(chassisBody: CANNON.Body): void {
    this.bodyA = chassisBody;

    // Create wheel axle body
    const wheelShape = new CANNON.Cylinder(0.028, 0.028, 0.012, 16);
    this.bodyB = new CANNON.Body({
      mass: 0.015, // 15 grams per wheel
      position: new CANNON.Vec3(
        this.joint.axlePosition.x,
        this.joint.axlePosition.y,
        this.joint.axlePosition.z
      )
    });
    this.bodyB.addShape(wheelShape);
    this.physicsWorld.addBody(this.bodyB);

    // Create hinge constraint (rotational joint)
    const axisA = new CANNON.Vec3(
      this.joint.axleDirection.x,
      this.joint.axleDirection.y,
      this.joint.axleDirection.z
    );

    this.hingeConstraint = new CANNON.HingeConstraint(this.bodyA, this.bodyB, {
      pivotA: new CANNON.Vec3(
        this.joint.axlePosition.x,
        this.joint.axlePosition.y,
        this.joint.axlePosition.z
      ),
      axisA: axisA,
      pivotB: new CANNON.Vec3(0, 0, 0),
      axisB: new CANNON.Vec3(1, 0, 0),
      maxForce: this.stallTorque
    });

    this.physicsWorld.addConstraint(this.hingeConstraint);
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

    if (this.hingeConstraint) {
      this.hingeConstraint.disableMotor();
    }
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
   */
  update(deltaTime: number): void {
    if (!this.hingeConstraint || !this.isRunning) return;

    // Get current angular velocity from physics
    const angularVel = this.bodyB.angularVelocity;
    this.currentVelocity = angularVel.x; // Assuming rotation around X axis

    // Update current angle
    this.currentAngle += this.currentVelocity * deltaTime;

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

    // Calculate PID control
    const velocityError = this.targetVelocity - this.currentVelocity;
    const controlOutput = this.pidController.calculate(velocityError, deltaTime);

    // Apply torque (limited by stall torque)
    const torque = Math.max(-this.stallTorque, Math.min(this.stallTorque, controlOutput));

    // Enable motor and set parameters
    this.hingeConstraint.enableMotor();
    this.hingeConstraint.setMotorSpeed(this.targetVelocity);
    this.hingeConstraint.setMotorMaxForce(Math.abs(torque) * 100); // Scale for Cannon.js
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
      positionMode: this.positionMode
    };
  }
}
