/**
 * PID (Proportional-Integral-Derivative) Controller
 * Used for smooth motor control with accurate position/velocity tracking
 */
export class PIDController {
  private integral: number = 0;
  private previousError: number = 0;
  private lastTime: number = 0;

  constructor(
    private kp: number = 0.5,  // Proportional gain
    private ki: number = 0.1,  // Integral gain
    private kd: number = 0.05  // Derivative gain
  ) {}

  /**
   * Calculate control output based on error
   * @param error The difference between target and current value
   * @param deltaTime Time since last update (seconds)
   * @returns Control output value
   */
  calculate(error: number, deltaTime: number): number {
    if (deltaTime <= 0) return 0;

    // Proportional term
    const p = this.kp * error;

    // Integral term (with windup protection)
    this.integral += error * deltaTime;
    this.integral = Math.max(-10, Math.min(10, this.integral)); // Clamp integral
    const i = this.ki * this.integral;

    // Derivative term
    const derivative = deltaTime > 0 ? (error - this.previousError) / deltaTime : 0;
    const d = this.kd * derivative;

    this.previousError = error;

    return p + i + d;
  }

  /**
   * Reset controller state (call when changing targets)
   */
  reset(): void {
    this.integral = 0;
    this.previousError = 0;
    this.lastTime = 0;
  }

  /**
   * Set PID gains
   */
  setGains(kp: number, ki: number, kd: number): void {
    this.kp = kp;
    this.ki = ki;
    this.kd = kd;
  }

  /**
   * Get current integral value (useful for debugging)
   */
  getIntegral(): number {
    return this.integral;
  }
}
