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
  private skulptLoaded: boolean = false;
  private skulptLoading: Promise<void> | null = null;

  /**
   * Load Skulpt scripts dynamically on first use
   */
  private async loadSkulpt(): Promise<void> {
    if (this.skulptLoaded || typeof (window as any).Sk !== 'undefined') {
      this.skulptLoaded = true;
      return;
    }

    if (this.skulptLoading) return this.skulptLoading;

    this.skulptLoading = new Promise<void>((resolve, reject) => {
      const script1 = document.createElement('script');
      script1.src = 'https://cdn.jsdelivr.net/npm/skulpt@1.2.0/dist/skulpt.min.js';
      script1.onload = () => {
        const script2 = document.createElement('script');
        script2.src = 'https://cdn.jsdelivr.net/npm/skulpt@1.2.0/dist/skulpt-stdlib.js';
        script2.onload = () => {
          this.skulptLoaded = true;
          resolve();
        };
        script2.onerror = () => reject(new Error('Failed to load skulpt-stdlib.js'));
        document.head.appendChild(script2);
      };
      script1.onerror = () => reject(new Error('Failed to load skulpt.min.js'));
      document.head.appendChild(script1);
    });

    return this.skulptLoading;
  }

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

      // Ensure Skulpt is loaded
      await this.loadSkulpt();

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
      // Extract useful error information from Skulpt errors
      let errorMessage = error.toString();

      if (error.traceback) {
        // Skulpt provides detailed traceback
        errorMessage = this.formatSkulptError(error);
      } else if (error.args && error.args.v) {
        // Some Skulpt errors store message in args.v
        errorMessage = error.args.v.toString();
      }

      errors.push(errorMessage);
      console.error('Python execution error:', error);

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
   * Format Skulpt error with traceback
   */
  private formatSkulptError(error: any): string {
    let message = error.toString();

    if (error.traceback && error.traceback.length > 0) {
      const tb = error.traceback[error.traceback.length - 1];
      if (tb.lineno) {
        // Subtract the wrapper lines to get actual user line number
        const userLineNo = tb.lineno - 20; // Wrapper has ~20 lines before user code
        message += `\nLine ${userLineNo > 0 ? userLineNo : tb.lineno}`;
      }
    }

    return message;
  }

  /**
   * Wrap user code with robot API imports
   */
  private wrapCodeWithAPI(userCode: string): string {
    return `
# ============================================================
# SPIKE Prime / EV3 API Wrapper
# Complete API for FLL Robot Simulation
# ============================================================

# -------------------- MOTOR FUNCTIONS --------------------

def motor_run(port, speed):
    """Run motor continuously at given speed (-100 to 100)"""
    __robot_motor_run(port, speed)

def motor_stop(port):
    """Stop motor immediately"""
    __robot_motor_stop(port)

def motor_run_for_rotations(port, rotations, speed=50):
    """Run motor for specific number of rotations"""
    __robot_motor_run_rotations(port, rotations, speed)

def motor_run_for_degrees(port, degrees, speed=50):
    """Run motor for specific degrees"""
    __robot_motor_run_degrees(port, degrees, speed)

def motor_run_for_time(port, milliseconds, speed=50):
    """Run motor for specific time in milliseconds"""
    __robot_motor_run_time(port, milliseconds, speed)

def motor_run_to_position(port, position, speed=50):
    """Run motor to absolute position in degrees"""
    __robot_motor_run_to_position(port, position, speed)

def motor_reset(port):
    """Reset motor angle to zero"""
    __robot_motor_reset(port)

def motor_get_angle(port):
    """Get current motor angle in degrees"""
    return __robot_motor_get_angle(port)

def motor_get_speed(port):
    """Get current motor speed in RPM"""
    return __robot_motor_get_speed(port)

def motor_set_stall_detection(port, enabled=True):
    """Enable/disable stall detection"""
    __robot_motor_stall_detection(port, enabled)

def motor_was_stalled(port):
    """Check if motor was stalled"""
    return __robot_motor_was_stalled(port)

# -------------------- MOTOR PAIR / DRIVE BASE --------------------

def motor_pair_pair(left_port, right_port):
    """Pair two motors for synchronized driving"""
    __robot_motor_pair_pair(left_port, right_port)

def motor_pair_unpair():
    """Unpair the motor pair"""
    __robot_motor_pair_unpair()

def motor_pair_move(distance_cm, speed=50):
    """Move robot forward/backward by distance in cm"""
    __robot_motor_pair_move(distance_cm, speed)

def motor_pair_move_tank(left_speed, right_speed):
    """Tank drive: control each motor independently"""
    __robot_motor_pair_tank(left_speed, right_speed)

def motor_pair_move_for_rotations(rotations, left_speed=50, right_speed=50):
    """Move for rotations with tank steering"""
    __robot_motor_pair_move_rotations(rotations, left_speed, right_speed)

def motor_pair_move_for_degrees(degrees, left_speed=50, right_speed=50):
    """Move for degrees with tank steering"""
    __robot_motor_pair_move_degrees(degrees, left_speed, right_speed)

def motor_pair_move_for_time(milliseconds, left_speed=50, right_speed=50):
    """Move for time with tank steering"""
    __robot_motor_pair_move_time(milliseconds, left_speed, right_speed)

def motor_pair_start(left_speed=50, right_speed=50):
    """Start moving continuously"""
    __robot_motor_pair_start(left_speed, right_speed)

def motor_pair_stop():
    """Stop both motors"""
    __robot_motor_pair_stop()

def drive_straight(distance_cm, speed=50):
    """Drive straight for distance (alias for motor_pair_move)"""
    __robot_motor_pair_move(distance_cm, speed)

def turn_right(degrees, speed=30):
    """Turn right by degrees"""
    __robot_turn(degrees, speed)

def turn_left(degrees, speed=30):
    """Turn left by degrees"""
    __robot_turn(-degrees, speed)

def turn(degrees, speed=30):
    """Turn by degrees (positive=right, negative=left)"""
    __robot_turn(degrees, speed)

def arc_turn(radius_cm, angle_degrees, speed=50):
    """Perform an arc turn with given radius and angle"""
    __robot_arc_turn(radius_cm, angle_degrees, speed)

# -------------------- COLOR SENSOR --------------------

def color_sensor_get_color(port='1'):
    """Get detected color name (black, white, red, green, blue, yellow, etc.)"""
    return __robot_sensor_color(port)

def color_sensor_get_reflected_light(port='1'):
    """Get reflected light intensity (0-100)"""
    return __robot_sensor_reflectance(port)

def color_sensor_get_ambient_light(port='1'):
    """Get ambient light intensity (0-100)"""
    return __robot_sensor_ambient(port)

def color_sensor_get_rgb(port='1'):
    """Get RGB values as tuple (r, g, b) where each is 0-255"""
    return __robot_sensor_rgb(port)

def color_sensor_get_rgbi(port='1'):
    """Get RGBI values as tuple (r, g, b, intensity)"""
    return __robot_sensor_rgbi(port)

def color_sensor_wait_for_color(port='1', color='black'):
    """Wait until specific color is detected"""
    __robot_sensor_wait_color(port, color)

def color_sensor_wait_for_new_color(port='1'):
    """Wait until color changes"""
    return __robot_sensor_wait_new_color(port)

# -------------------- ULTRASONIC / DISTANCE SENSOR --------------------

def ultrasonic_sensor_get_distance(port='2'):
    """Get distance in centimeters (0-200, 255 if no object)"""
    return __robot_sensor_ultrasonic(port)

def distance_sensor_get_distance(port='2'):
    """Alias for ultrasonic_sensor_get_distance"""
    return __robot_sensor_ultrasonic(port)

def ultrasonic_sensor_wait_for_distance_closer_than(port='2', distance_cm=10):
    """Wait until object is closer than distance"""
    __robot_sensor_wait_distance_closer(port, distance_cm)

def ultrasonic_sensor_wait_for_distance_farther_than(port='2', distance_cm=10):
    """Wait until object is farther than distance"""
    __robot_sensor_wait_distance_farther(port, distance_cm)

# -------------------- GYRO / IMU --------------------

def gyro_get_angle(axis='yaw'):
    """Get gyro angle in degrees (yaw, pitch, roll)"""
    return __robot_gyro_angle(axis)

def gyro_get_yaw():
    """Get yaw angle (rotation around vertical axis)"""
    return __robot_gyro_angle('yaw')

def gyro_get_pitch():
    """Get pitch angle (tilt forward/backward)"""
    return __robot_gyro_angle('pitch')

def gyro_get_roll():
    """Get roll angle (tilt left/right)"""
    return __robot_gyro_angle('roll')

def gyro_reset(axis='all'):
    """Reset gyro angle(s) to zero"""
    __robot_gyro_reset(axis)

def gyro_get_rotation_speed():
    """Get angular velocity in degrees per second"""
    return __robot_gyro_speed()

def motion_sensor_get_orientation():
    """Get hub orientation (front, back, up, down, leftside, rightside)"""
    return __robot_orientation()

def motion_sensor_was_gesture(gesture):
    """Check if gesture occurred (shaken, tapped, double-tapped, falling)"""
    return __robot_was_gesture(gesture)

# -------------------- HUB FUNCTIONS --------------------

def hub_light_matrix_write(text):
    """Display text on the light matrix"""
    __robot_hub_display(text)

def hub_light_matrix_show_image(image_name):
    """Show predefined image (HAPPY, SAD, HEART, etc.)"""
    __robot_hub_image(image_name)

def hub_light_matrix_set_pixel(x, y, brightness=100):
    """Set individual pixel (x: 0-4, y: 0-4, brightness: 0-100)"""
    __robot_hub_pixel(x, y, brightness)

def hub_light_matrix_off():
    """Turn off light matrix"""
    __robot_hub_display_off()

def hub_status_light_on(color='white'):
    """Set hub status light color"""
    __robot_hub_light(color)

def hub_status_light_off():
    """Turn off hub status light"""
    __robot_hub_light('off')

def hub_speaker_beep(frequency=440, duration_ms=500):
    """Play beep sound"""
    __robot_hub_beep(frequency, duration_ms)

def hub_speaker_play_tone(frequency, duration_ms):
    """Play tone at frequency for duration"""
    __robot_hub_beep(frequency, duration_ms)

def hub_speaker_volume(volume):
    """Set speaker volume (0-100)"""
    __robot_hub_volume(volume)

def hub_button_is_pressed(button='left'):
    """Check if button is pressed (left, right, center)"""
    return __robot_hub_button(button)

def hub_battery_voltage():
    """Get battery voltage in millivolts"""
    return __robot_hub_battery()

def hub_get_time():
    """Get time since program started in milliseconds"""
    return __robot_hub_time()

# -------------------- UTILITY FUNCTIONS --------------------

def wait(milliseconds):
    """Wait for specified milliseconds"""
    __robot_wait(milliseconds)

def wait_seconds(seconds):
    """Wait for specified seconds"""
    __robot_wait(int(seconds * 1000))

def wait_until(condition_func):
    """Wait until condition function returns True"""
    while not condition_func():
        __robot_wait(50)

def print_robot(message):
    """Print message to console"""
    print(message)
    __robot_print(str(message))

def timer_reset():
    """Reset the program timer"""
    __robot_timer_reset()

def timer_get():
    """Get elapsed time in seconds since last reset"""
    return __robot_timer_get()

# -------------------- LINE FOLLOWING HELPERS --------------------

def follow_line_for_rotations(port='1', rotations=1, speed=30, side='left'):
    """Follow line edge for rotations"""
    __robot_follow_line(port, rotations, speed, side)

def follow_line_until_color(port='1', target_color='black', speed=30, side='left'):
    """Follow line until color detected"""
    __robot_follow_line_until(port, target_color, speed, side)

# -------------------- CONSTANTS --------------------

# Colors
BLACK = 'black'
WHITE = 'white'
RED = 'red'
GREEN = 'green'
BLUE = 'blue'
YELLOW = 'yellow'
ORANGE = 'orange'
VIOLET = 'violet'
CYAN = 'cyan'

# Hub images
HAPPY = 'HAPPY'
SAD = 'SAD'
HEART = 'HEART'
SMILE = 'SMILE'
ANGRY = 'ANGRY'
ARROW_N = 'ARROW_N'
ARROW_S = 'ARROW_S'
ARROW_E = 'ARROW_E'
ARROW_W = 'ARROW_W'

# Ports (for documentation)
PORT_A = 'A'
PORT_B = 'B'
PORT_C = 'C'
PORT_D = 'D'
PORT_E = 'E'
PORT_F = 'F'

# ============================================================
# User code starts here
# ============================================================

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
          console.log('[Python Output]:', text);
        },
        read: (filename: string) => {
          // Provide stub for common modules
          console.log('📦 Python requesting module:', filename);

          // Time module
          if (filename.includes('time.js') || filename.includes('time.py') || filename.includes('time/__init__')) {
            return `
var $builtinmodule = function(name) {
    var mod = {};
    mod.sleep = new Sk.builtin.func(function(seconds) {
        var secs = Sk.ffi.remapToJs(seconds);
        return new Sk.misceval.promiseToSuspension(
            new Promise(function(resolve) {
                setTimeout(function() { resolve(Sk.builtin.none.none$); }, secs * 1000);
            })
        );
    });
    mod.time = new Sk.builtin.func(function() {
        return Sk.ffi.remapToPy(Date.now() / 1000);
    });
    return mod;
};
`;
          }

          // Sys module (minimal stub)
          if (filename.includes('sys.js') || filename.includes('sys.py') || filename.includes('sys/__init__')) {
            return `
var $builtinmodule = function(name) {
    var mod = {};
    mod.version = new Sk.builtin.str("3.10.0 (Skulpt)");
    mod.platform = new Sk.builtin.str("skulpt");
    mod.path = new Sk.builtin.list([]);
    mod.modules = new Sk.builtin.dict([]);
    mod.stdout = Sk.builtin.none.none$;
    mod.stderr = Sk.builtin.none.none$;
    mod.exit = new Sk.builtin.func(function(code) {
        throw new Sk.builtin.SystemExit(code);
    });
    return mod;
};
`;
          }

          // Math module
          if (filename.includes('math.js') || filename.includes('math.py') || filename.includes('math/__init__')) {
            return `
var $builtinmodule = function(name) {
    var mod = {};
    mod.pi = new Sk.builtin.float_(Math.PI);
    mod.e = new Sk.builtin.float_(Math.E);
    mod.sqrt = new Sk.builtin.func(function(x) {
        return new Sk.builtin.float_(Math.sqrt(Sk.ffi.remapToJs(x)));
    });
    mod.sin = new Sk.builtin.func(function(x) {
        return new Sk.builtin.float_(Math.sin(Sk.ffi.remapToJs(x)));
    });
    mod.cos = new Sk.builtin.func(function(x) {
        return new Sk.builtin.float_(Math.cos(Sk.ffi.remapToJs(x)));
    });
    mod.tan = new Sk.builtin.func(function(x) {
        return new Sk.builtin.float_(Math.tan(Sk.ffi.remapToJs(x)));
    });
    mod.atan2 = new Sk.builtin.func(function(y, x) {
        return new Sk.builtin.float_(Math.atan2(Sk.ffi.remapToJs(y), Sk.ffi.remapToJs(x)));
    });
    mod.radians = new Sk.builtin.func(function(deg) {
        return new Sk.builtin.float_(Sk.ffi.remapToJs(deg) * Math.PI / 180);
    });
    mod.degrees = new Sk.builtin.func(function(rad) {
        return new Sk.builtin.float_(Sk.ffi.remapToJs(rad) * 180 / Math.PI);
    });
    mod.abs = new Sk.builtin.func(function(x) {
        return new Sk.builtin.float_(Math.abs(Sk.ffi.remapToJs(x)));
    });
    mod.floor = new Sk.builtin.func(function(x) {
        return new Sk.builtin.int_(Math.floor(Sk.ffi.remapToJs(x)));
    });
    mod.ceil = new Sk.builtin.func(function(x) {
        return new Sk.builtin.int_(Math.ceil(Sk.ffi.remapToJs(x)));
    });
    mod.pow = new Sk.builtin.func(function(x, y) {
        return new Sk.builtin.float_(Math.pow(Sk.ffi.remapToJs(x), Sk.ffi.remapToJs(y)));
    });
    return mod;
};
`;
          }

          // Random module
          if (filename.includes('random.js') || filename.includes('random.py') || filename.includes('random/__init__')) {
            return `
var $builtinmodule = function(name) {
    var mod = {};
    mod.random = new Sk.builtin.func(function() {
        return new Sk.builtin.float_(Math.random());
    });
    mod.randint = new Sk.builtin.func(function(a, b) {
        var min = Sk.ffi.remapToJs(a);
        var max = Sk.ffi.remapToJs(b);
        return new Sk.builtin.int_(Math.floor(Math.random() * (max - min + 1)) + min);
    });
    mod.choice = new Sk.builtin.func(function(seq) {
        var arr = Sk.ffi.remapToJs(seq);
        return Sk.ffi.remapToPy(arr[Math.floor(Math.random() * arr.length)]);
    });
    mod.uniform = new Sk.builtin.func(function(a, b) {
        var min = Sk.ffi.remapToJs(a);
        var max = Sk.ffi.remapToJs(b);
        return new Sk.builtin.float_(Math.random() * (max - min) + min);
    });
    return mod;
};
`;
          }

          // Try Skulpt's built-in library path
          if (Sk.builtinFiles && Sk.builtinFiles['files'][filename]) {
            return Sk.builtinFiles['files'][filename];
          }
          throw new Error(`Module ${filename} not found`);
        },
        execLimit: 30000, // 30 second timeout
        __future__: Sk.python3,
        yieldLimit: 100,
        killableWhile: true,
        killableFor: true
      });

      // Get robot API from window
      const robotAPI = (window as any).robotAPI;

      if (!robotAPI) {
        const errorMsg = 'Robot API not initialized. Please load a robot model first.';
        console.error(errorMsg);
        reject(new Error(errorMsg));
        return;
      }

      console.log('✅ Robot API available:', {
        motor: !!robotAPI.motor,
        sensor: !!robotAPI.sensor,
        wait: !!robotAPI.wait,
        print: !!robotAPI.print
      });

      // Helper to create async suspension using Skulpt's built-in mechanism
      const createAsyncSuspension = (promise: Promise<any>) => {
        return Sk.misceval.promiseToSuspension(
          promise.then((result: any) => {
            return result !== undefined ? Sk.ffi.remapToPy(result) : Sk.builtin.none.none$;
          })
        );
      };

      // Create Python-callable functions that bridge to JavaScript
      const builtinFuncs = {
        // ==================== MOTOR FUNCTIONS ====================
        __robot_motor_run: new Sk.builtin.func((port: any, speed: any) => {
          const portStr = Sk.ffi.remapToJs(port);
          const speedNum = Sk.ffi.remapToJs(speed);
          robotAPI.motor.run(portStr, speedNum);
          return Sk.builtin.none.none$;
        }),

        __robot_motor_stop: new Sk.builtin.func((port: any) => {
          const portStr = Sk.ffi.remapToJs(port);
          robotAPI.motor.stop(portStr);
          return Sk.builtin.none.none$;
        }),

        __robot_motor_run_rotations: new Sk.builtin.func((port: any, rotations: any, speed: any) => {
          const portStr = Sk.ffi.remapToJs(port);
          const rotationsNum = Sk.ffi.remapToJs(rotations);
          const speedNum = Sk.ffi.remapToJs(speed);
          return createAsyncSuspension(robotAPI.motor.runForRotations(portStr, rotationsNum, speedNum));
        }),

        __robot_motor_run_degrees: new Sk.builtin.func((port: any, degrees: any, speed: any) => {
          const portStr = Sk.ffi.remapToJs(port);
          const degreesNum = Sk.ffi.remapToJs(degrees);
          const speedNum = Sk.ffi.remapToJs(speed);
          return createAsyncSuspension(robotAPI.motor.runForDegrees(portStr, degreesNum, speedNum));
        }),

        __robot_motor_run_time: new Sk.builtin.func((port: any, ms: any, speed: any) => {
          const portStr = Sk.ffi.remapToJs(port);
          const msNum = Sk.ffi.remapToJs(ms);
          const speedNum = Sk.ffi.remapToJs(speed);
          return createAsyncSuspension(robotAPI.motor.runForTime(portStr, msNum, speedNum));
        }),

        __robot_motor_run_to_position: new Sk.builtin.func((port: any, position: any, speed: any) => {
          const portStr = Sk.ffi.remapToJs(port);
          const positionNum = Sk.ffi.remapToJs(position);
          const speedNum = Sk.ffi.remapToJs(speed);
          return createAsyncSuspension(robotAPI.motor.runToPosition(portStr, positionNum, speedNum));
        }),

        __robot_motor_reset: new Sk.builtin.func((port: any) => {
          const portStr = Sk.ffi.remapToJs(port);
          robotAPI.motor.reset(portStr);
          return Sk.builtin.none.none$;
        }),

        __robot_motor_get_angle: new Sk.builtin.func((port: any) => {
          const portStr = Sk.ffi.remapToJs(port);
          return Sk.ffi.remapToPy(robotAPI.motor.getAngle(portStr));
        }),

        __robot_motor_get_speed: new Sk.builtin.func((port: any) => {
          const portStr = Sk.ffi.remapToJs(port);
          return Sk.ffi.remapToPy(robotAPI.motor.getSpeed(portStr));
        }),

        __robot_motor_stall_detection: new Sk.builtin.func((port: any, enabled: any) => {
          const portStr = Sk.ffi.remapToJs(port);
          const enabledBool = Sk.ffi.remapToJs(enabled);
          robotAPI.motor.setStallDetection?.(portStr, enabledBool);
          return Sk.builtin.none.none$;
        }),

        __robot_motor_was_stalled: new Sk.builtin.func((port: any) => {
          const portStr = Sk.ffi.remapToJs(port);
          return Sk.ffi.remapToPy(robotAPI.motor.wasStalled?.(portStr) ?? false);
        }),

        // ==================== MOTOR PAIR / DRIVE BASE ====================
        __robot_motor_pair_pair: new Sk.builtin.func((left: any, right: any) => {
          const leftPort = Sk.ffi.remapToJs(left);
          const rightPort = Sk.ffi.remapToJs(right);
          robotAPI.motorPair.pair(leftPort, rightPort);
          return Sk.builtin.none.none$;
        }),

        __robot_motor_pair_unpair: new Sk.builtin.func(() => {
          robotAPI.motorPair.unpair();
          return Sk.builtin.none.none$;
        }),

        __robot_motor_pair_move: new Sk.builtin.func((distance: any, speed: any) => {
          const distanceNum = Sk.ffi.remapToJs(distance);
          const speedNum = Sk.ffi.remapToJs(speed);
          return createAsyncSuspension(robotAPI.motorPair.move(distanceNum, speedNum));
        }),

        __robot_motor_pair_tank: new Sk.builtin.func((leftSpeed: any, rightSpeed: any) => {
          const leftNum = Sk.ffi.remapToJs(leftSpeed);
          const rightNum = Sk.ffi.remapToJs(rightSpeed);
          robotAPI.motorPair.tank(leftNum, rightNum);
          return Sk.builtin.none.none$;
        }),

        __robot_motor_pair_move_rotations: new Sk.builtin.func((rotations: any, left: any, right: any) => {
          const rotNum = Sk.ffi.remapToJs(rotations);
          const leftNum = Sk.ffi.remapToJs(left);
          const rightNum = Sk.ffi.remapToJs(right);
          return createAsyncSuspension(robotAPI.motorPair.moveForRotations(rotNum, leftNum, rightNum));
        }),

        __robot_motor_pair_move_degrees: new Sk.builtin.func((degrees: any, left: any, right: any) => {
          const degNum = Sk.ffi.remapToJs(degrees);
          const leftNum = Sk.ffi.remapToJs(left);
          const rightNum = Sk.ffi.remapToJs(right);
          return createAsyncSuspension(robotAPI.motorPair.moveForDegrees(degNum, leftNum, rightNum));
        }),

        __robot_motor_pair_move_time: new Sk.builtin.func((ms: any, left: any, right: any) => {
          const msNum = Sk.ffi.remapToJs(ms);
          const leftNum = Sk.ffi.remapToJs(left);
          const rightNum = Sk.ffi.remapToJs(right);
          return createAsyncSuspension(robotAPI.motorPair.moveForTime(msNum, leftNum, rightNum));
        }),

        __robot_motor_pair_start: new Sk.builtin.func((left: any, right: any) => {
          const leftNum = Sk.ffi.remapToJs(left);
          const rightNum = Sk.ffi.remapToJs(right);
          robotAPI.motorPair.start(leftNum, rightNum);
          return Sk.builtin.none.none$;
        }),

        __robot_motor_pair_stop: new Sk.builtin.func(() => {
          robotAPI.motorPair.stop();
          return Sk.builtin.none.none$;
        }),

        __robot_turn: new Sk.builtin.func((degrees: any, speed: any) => {
          const degreesNum = Sk.ffi.remapToJs(degrees);
          const speedNum = Sk.ffi.remapToJs(speed);
          return createAsyncSuspension(robotAPI.motorPair.turn(degreesNum, speedNum));
        }),

        __robot_arc_turn: new Sk.builtin.func((radius: any, angle: any, speed: any) => {
          const radiusNum = Sk.ffi.remapToJs(radius);
          const angleNum = Sk.ffi.remapToJs(angle);
          const speedNum = Sk.ffi.remapToJs(speed);
          return createAsyncSuspension(robotAPI.motorPair.arcTurn(radiusNum, angleNum, speedNum));
        }),

        // ==================== COLOR SENSOR ====================
        __robot_sensor_color: new Sk.builtin.func((port: any) => {
          const portStr = Sk.ffi.remapToJs(port);
          return Sk.ffi.remapToPy(robotAPI.sensor.color(portStr));
        }),

        __robot_sensor_reflectance: new Sk.builtin.func((port: any) => {
          const portStr = Sk.ffi.remapToJs(port);
          return Sk.ffi.remapToPy(robotAPI.sensor.reflectance(portStr));
        }),

        __robot_sensor_ambient: new Sk.builtin.func((port: any) => {
          const portStr = Sk.ffi.remapToJs(port);
          return Sk.ffi.remapToPy(robotAPI.sensor.ambient?.(portStr) ?? 50);
        }),

        __robot_sensor_rgb: new Sk.builtin.func((port: any) => {
          const portStr = Sk.ffi.remapToJs(port);
          const rgb = robotAPI.sensor.rgb?.(portStr) ?? [0, 0, 0];
          return new Sk.builtin.tuple(rgb.map((v: number) => Sk.ffi.remapToPy(v)));
        }),

        __robot_sensor_rgbi: new Sk.builtin.func((port: any) => {
          const portStr = Sk.ffi.remapToJs(port);
          const rgbi = robotAPI.sensor.rgbi?.(portStr) ?? [0, 0, 0, 0];
          return new Sk.builtin.tuple(rgbi.map((v: number) => Sk.ffi.remapToPy(v)));
        }),

        __robot_sensor_wait_color: new Sk.builtin.func((port: any, color: any) => {
          const portStr = Sk.ffi.remapToJs(port);
          const colorStr = Sk.ffi.remapToJs(color);
          return createAsyncSuspension(robotAPI.sensor.waitForColor(portStr, colorStr));
        }),

        __robot_sensor_wait_new_color: new Sk.builtin.func((port: any) => {
          const portStr = Sk.ffi.remapToJs(port);
          return createAsyncSuspension(robotAPI.sensor.waitForNewColor(portStr));
        }),

        // ==================== ULTRASONIC SENSOR ====================
        __robot_sensor_ultrasonic: new Sk.builtin.func((port: any) => {
          const portStr = Sk.ffi.remapToJs(port);
          return Sk.ffi.remapToPy(robotAPI.sensor.ultrasonic(portStr));
        }),

        __robot_sensor_wait_distance_closer: new Sk.builtin.func((port: any, distance: any) => {
          const portStr = Sk.ffi.remapToJs(port);
          const distanceNum = Sk.ffi.remapToJs(distance);
          return createAsyncSuspension(robotAPI.sensor.waitDistanceCloser(portStr, distanceNum));
        }),

        __robot_sensor_wait_distance_farther: new Sk.builtin.func((port: any, distance: any) => {
          const portStr = Sk.ffi.remapToJs(port);
          const distanceNum = Sk.ffi.remapToJs(distance);
          return createAsyncSuspension(robotAPI.sensor.waitDistanceFarther(portStr, distanceNum));
        }),

        // ==================== GYRO / IMU ====================
        __robot_gyro_angle: new Sk.builtin.func((axis: any) => {
          const axisStr = Sk.ffi.remapToJs(axis);
          return Sk.ffi.remapToPy(robotAPI.gyro?.getAngle(axisStr) ?? 0);
        }),

        __robot_gyro_reset: new Sk.builtin.func((axis: any) => {
          const axisStr = Sk.ffi.remapToJs(axis);
          robotAPI.gyro?.reset(axisStr);
          return Sk.builtin.none.none$;
        }),

        __robot_gyro_speed: new Sk.builtin.func(() => {
          return Sk.ffi.remapToPy(robotAPI.gyro?.getSpeed() ?? 0);
        }),

        __robot_orientation: new Sk.builtin.func(() => {
          return Sk.ffi.remapToPy(robotAPI.gyro?.getOrientation() ?? 'up');
        }),

        __robot_was_gesture: new Sk.builtin.func((gesture: any) => {
          const gestureStr = Sk.ffi.remapToJs(gesture);
          return Sk.ffi.remapToPy(robotAPI.gyro?.wasGesture(gestureStr) ?? false);
        }),

        // ==================== HUB FUNCTIONS ====================
        __robot_hub_display: new Sk.builtin.func((text: any) => {
          const textStr = Sk.ffi.remapToJs(text);
          robotAPI.hub?.display(textStr);
          return Sk.builtin.none.none$;
        }),

        __robot_hub_image: new Sk.builtin.func((image: any) => {
          const imageStr = Sk.ffi.remapToJs(image);
          robotAPI.hub?.showImage(imageStr);
          return Sk.builtin.none.none$;
        }),

        __robot_hub_pixel: new Sk.builtin.func((x: any, y: any, brightness: any) => {
          const xNum = Sk.ffi.remapToJs(x);
          const yNum = Sk.ffi.remapToJs(y);
          const brightnessNum = Sk.ffi.remapToJs(brightness);
          robotAPI.hub?.setPixel(xNum, yNum, brightnessNum);
          return Sk.builtin.none.none$;
        }),

        __robot_hub_display_off: new Sk.builtin.func(() => {
          robotAPI.hub?.displayOff();
          return Sk.builtin.none.none$;
        }),

        __robot_hub_light: new Sk.builtin.func((color: any) => {
          const colorStr = Sk.ffi.remapToJs(color);
          robotAPI.hub?.setLight(colorStr);
          return Sk.builtin.none.none$;
        }),

        __robot_hub_beep: new Sk.builtin.func((freq: any, duration: any) => {
          const freqNum = Sk.ffi.remapToJs(freq);
          const durationNum = Sk.ffi.remapToJs(duration);
          return createAsyncSuspension(robotAPI.hub?.beep(freqNum, durationNum) ?? Promise.resolve());
        }),

        __robot_hub_volume: new Sk.builtin.func((volume: any) => {
          const volumeNum = Sk.ffi.remapToJs(volume);
          robotAPI.hub?.setVolume(volumeNum);
          return Sk.builtin.none.none$;
        }),

        __robot_hub_button: new Sk.builtin.func((button: any) => {
          const buttonStr = Sk.ffi.remapToJs(button);
          return Sk.ffi.remapToPy(robotAPI.hub?.isButtonPressed(buttonStr) ?? false);
        }),

        __robot_hub_battery: new Sk.builtin.func(() => {
          return Sk.ffi.remapToPy(robotAPI.hub?.getBattery() ?? 8000);
        }),

        __robot_hub_time: new Sk.builtin.func(() => {
          return Sk.ffi.remapToPy(robotAPI.hub?.getTime() ?? Date.now());
        }),

        // ==================== UTILITY FUNCTIONS ====================
        __robot_wait: new Sk.builtin.func((ms: any) => {
          const msNum = Sk.ffi.remapToJs(ms);
          return createAsyncSuspension(robotAPI.wait(msNum));
        }),

        __robot_print: new Sk.builtin.func((message: any) => {
          const messageStr = Sk.ffi.remapToJs(message);
          robotAPI.print(messageStr);
          return Sk.builtin.none.none$;
        }),

        __robot_timer_reset: new Sk.builtin.func(() => {
          robotAPI.timer?.reset();
          return Sk.builtin.none.none$;
        }),

        __robot_timer_get: new Sk.builtin.func(() => {
          return Sk.ffi.remapToPy(robotAPI.timer?.get() ?? 0);
        }),

        // ==================== LINE FOLLOWING ====================
        __robot_follow_line: new Sk.builtin.func((port: any, rotations: any, speed: any, side: any) => {
          const portStr = Sk.ffi.remapToJs(port);
          const rotationsNum = Sk.ffi.remapToJs(rotations);
          const speedNum = Sk.ffi.remapToJs(speed);
          const sideStr = Sk.ffi.remapToJs(side);
          return createAsyncSuspension(
            robotAPI.lineFollower?.followLine(portStr, rotationsNum, speedNum, sideStr) ?? Promise.resolve()
          );
        }),

        __robot_follow_line_until: new Sk.builtin.func((port: any, color: any, speed: any, side: any) => {
          const portStr = Sk.ffi.remapToJs(port);
          const colorStr = Sk.ffi.remapToJs(color);
          const speedNum = Sk.ffi.remapToJs(speed);
          const sideStr = Sk.ffi.remapToJs(side);
          return createAsyncSuspension(
            robotAPI.lineFollower?.followLineUntil(portStr, colorStr, speedNum, sideStr) ?? Promise.resolve()
          );
        })
      };

      // Inject built-in functions into Skulpt's builtin module
      Object.entries(builtinFuncs).forEach(([name, func]) => {
        Sk.builtins[name] = func;
      });

      console.log('🐍 Starting Python execution...');
      console.log('Code to execute:', code.substring(0, 200) + '...');

      // Run the code
      try {
        Sk.misceval
          .asyncToPromise(() => Sk.importMainWithBody('<stdin>', false, code, true))
          .then(() => {
            console.log('✅ Python execution completed successfully');
            resolve();
          })
          .catch((err: any) => {
            console.error('❌ Python execution error:', err);
            // Try to get more error details
            if (err.args) {
              console.error('Error args:', err.args);
              if (err.args.v && err.args.v[0]) {
                console.error('Error message:', Sk.ffi.remapToJs(err.args.v[0]));
              }
            }
            if (err.traceback) {
              console.error('Traceback:', err.traceback);
              err.traceback.forEach((tb: any, i: number) => {
                console.error(`  Frame ${i}: line ${tb.lineno}, ${tb.filename}`);
              });
            }
            reject(err);
          });
      } catch (syncError: any) {
        console.error('❌ Synchronous error during Python execution:', syncError);
        reject(syncError);
      }
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
