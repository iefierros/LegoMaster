/**
 * Python Code Interpreter for robot control
 * Uses Skulpt to execute Python code in the browser
 */

interface CodeExecutionResult {
  success: boolean;
  output: string[];
  errors: string[];
  executionTime: number;
}

export class CodeInterpreter {
  private output: string[] = [];
  private isRunning: boolean = false;
  private stopRequested: boolean = false;

  /**
   * Execute Python code
   */
  async executePython(code: string): Promise<CodeExecutionResult> {
    this.output = [];
    const errors: string[] = [];
    const startTime = Date.now();

    try {
      this.isRunning = true;
      this.stopRequested = false;

      // Build Python module that wraps the robot API
      const wrappedCode = this.wrapCodeWithAPI(code);

      // Execute using Skulpt
      await this.runSkulpt(wrappedCode);

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        output: this.output,
        errors,
        executionTime
      };

    } catch (error: any) {
      errors.push(error.toString());

      return {
        success: false,
        output: this.output,
        errors,
        executionTime: Date.now() - startTime
      };

    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Wrap user code with robot API imports
   */
  private wrapCodeWithAPI(userCode: string): string {
    return `
# SPIKE Prime / EV3 API Wrapper
import time

class Motor:
    def __init__(self, port):
        self.port = port

    def run(self, speed):
        """Run motor at speed (-100 to 100)"""
        js_call('robotAPI.motor.run', self.port, speed)

    def run_for_rotations(self, rotations, speed=50):
        """Run motor for specified rotations"""
        js_call('robotAPI.motor.runForRotations', self.port, rotations, speed)

    def stop(self):
        """Stop the motor"""
        js_call('robotAPI.motor.stop', self.port)

    def reset(self):
        """Reset motor angle to 0"""
        js_call('robotAPI.motor.reset', self.port)

    def get_angle(self):
        """Get current motor angle in degrees"""
        return js_call('robotAPI.motor.getAngle', self.port)

    def get_speed(self):
        """Get current motor speed in RPM"""
        return js_call('robotAPI.motor.getSpeed', self.port)


class ColorSensor:
    def __init__(self, port='1'):
        self.port = port

    def get_color(self):
        """Get detected color name"""
        return js_call('robotAPI.sensor.color', self.port)

    def get_reflectance(self):
        """Get reflected light intensity (0-100)"""
        return js_call('robotAPI.sensor.reflectance', self.port)


class UltrasonicSensor:
    def __init__(self, port='2'):
        self.port = port

    def get_distance(self):
        """Get distance in cm (0-255)"""
        return js_call('robotAPI.sensor.ultrasonic', self.port)


class DriveBase:
    def __init__(self, left_motor_port, right_motor_port):
        self.left_motor = Motor(left_motor_port)
        self.right_motor = Motor(right_motor_port)

    def drive_straight(self, speed):
        """Drive straight at given speed"""
        self.left_motor.run(speed)
        self.right_motor.run(speed)

    def turn(self, speed):
        """Turn in place (positive = right, negative = left)"""
        self.left_motor.run(speed)
        self.right_motor.run(-speed)

    def stop(self):
        """Stop both motors"""
        self.left_motor.stop()
        self.right_motor.stop()


def wait(milliseconds):
    """Wait for specified milliseconds"""
    js_call('robotAPI.wait', milliseconds)


def print_robot(message):
    """Print message to robot console"""
    print(message)
    js_call('robotAPI.print', str(message))


# Helper function to call JavaScript
def js_call(func_path, *args):
    """Call JavaScript function from Python"""
    # This will be handled by Skulpt's external functions
    pass


# User code starts here
${userCode}
`;
  }

  /**
   * Run code using Skulpt Python interpreter
   */
  private async runSkulpt(code: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if Skulpt is loaded
      if (typeof (window as any).Sk === 'undefined') {
        reject(new Error('Skulpt not loaded. Please include Skulpt library.'));
        return;
      }

      const Sk = (window as any).Sk;

      // Configure Skulpt
      Sk.configure({
        output: (text: string) => {
          this.output.push(text);
        },
        read: (filename: string) => {
          // Handle module imports if needed
          throw new Error(`Module ${filename} not found`);
        },
        execLimit: 30000, // 30 second timeout
        __future__: Sk.python3
      });

      // Add external JavaScript function calls
      Sk.externalLibraries = {
        js_call: {
          path: 'js_call.js',
          dependencies: [],
          eval: (funcPath: string, ...args: any[]) => {
            // Call JavaScript functions from Python
            const parts = funcPath.split('.');
            let func: any = window;

            for (const part of parts) {
              func = func[part];
              if (!func) {
                throw new Error(`Function ${funcPath} not found`);
              }
            }

            return func(...args);
          }
        }
      };

      // Run the code
      Sk.misceval
        .asyncToPromise(() => Sk.importMainWithBody('<stdin>', false, code, true))
        .then(() => {
          resolve();
        })
        .catch((err: any) => {
          reject(err);
        });
    });
  }

  /**
   * Stop code execution
   */
  stop(): void {
    this.stopRequested = true;
    this.isRunning = false;
  }

  /**
   * Check if code is currently running
   */
  isExecuting(): boolean {
    return this.isRunning;
  }

  /**
   * Get execution output
   */
  getOutput(): string[] {
    return this.output;
  }

  /**
   * Clear output
   */
  clearOutput(): void {
    this.output = [];
  }
}

// Singleton instance
export const codeInterpreter = new CodeInterpreter();
