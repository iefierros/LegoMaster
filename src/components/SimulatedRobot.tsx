import { useRef, useEffect, useMemo, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { useCompoundBody } from '@react-three/cannon';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import type { RiggedRobotData, SensorReading, RobotInstance } from '@/types';
import { VirtualSpikeMotor } from '@/physics/VirtualSpikeMotor';
import { createSensorSimulator } from '@/physics/SensorSimulators';
import { CollisionShapeGenerator } from '@/physics/CollisionShapeGenerator';

interface SimulatedRobotProps {
  riggedData: RiggedRobotData;
  initialPosition?: [number, number, number];
  matTexture?: THREE.Texture;
  matDimensions?: { width: number; height: number };
  onSensorUpdate?: (sensorData: SensorReading[]) => void;
  onRobotReady?: (robot: RobotInstance) => void;
  onCollision?: (event: { body: any; target: any }) => void;
}

export function SimulatedRobot({
  riggedData,
  initialPosition = [0, 0.1, 0],
  matTexture,
  matDimensions = { width: 2.4, height: 1.2 },
  onSensorUpdate,
  onRobotReady,
  onCollision
}: SimulatedRobotProps) {

  // Generate collision shapes from rigged data
  const shapes = useMemo(() => {
    const generatedShapes = CollisionShapeGenerator.fromRiggedData(riggedData);
    console.log('🔧 Generated collision shapes:', generatedShapes.length);
    return CollisionShapeGenerator.toCannonHookFormat(generatedShapes);
  }, [riggedData]);

  // Track if we have initialized
  const motorsInitialized = useRef<boolean>(false);
  const bodyRef = useRef<CANNON.Body | null>(null);

  // Motor controllers
  const motorControllersRef = useRef<Map<string, VirtualSpikeMotor>>(new Map());

  // Sensor simulators
  const sensorSimulatorsRef = useRef<Map<string, any>>(new Map());

  // Stable clone of visual mesh (must not recreate on every render)
  const visualMeshClone = useMemo(() => {
    const clone = riggedData.visualMesh.clone();
    // Offset visual mesh by center of mass so it aligns with the physics body origin
    // The compound body is positioned at the center of mass, so shift the visual accordingly
    const com = riggedData.chassis.centerOfMass;
    clone.position.set(-com.x, -com.y, -com.z);
    return clone;
  }, [riggedData.visualMesh, riggedData.chassis.centerOfMass]);

  // Trace path for visualization
  const tracePathRef = useRef<THREE.Vector3[]>([]);
  const lastTraceTime = useRef<number>(0);

  // Store callbacks in refs to avoid dependency issues
  const onRobotReadyRef = useRef(onRobotReady);
  onRobotReadyRef.current = onRobotReady;

  const onCollisionRef = useRef(onCollision);
  onCollisionRef.current = onCollision;

  // State for extended API
  const motorPairRef = useRef<{ left: string; right: string } | null>(null);
  const gyroAngleRef = useRef<{ yaw: number; pitch: number; roll: number }>({ yaw: 0, pitch: 0, roll: 0 });
  const timerStartRef = useRef<number>(Date.now());
  const programStartRef = useRef<number>(Date.now());

  // Handle collision events
  const handleCollision = useCallback((event: { body: any; target: any }) => {
    const otherBody = event.body;

    // Check for mission element collision
    if (otherBody?.userData?.isMissionElement) {
      console.log('🎯 Collision with mission element:', otherBody.userData.elementId);
    }

    // Check for wall collision
    if (otherBody?.userData?.isWall) {
      console.log('🧱 Collision with wall');
    }

    // Call external handler
    onCollisionRef.current?.(event);
  }, []);

  // Create physics body using react-three/cannon
  // This properly integrates with the CANNON.js world
  const [ref, api] = useCompoundBody<THREE.Group>(() => ({
    mass: riggedData.chassis.mass,
    position: initialPosition,
    shapes: shapes,
    material: {
      friction: 0.9,
      restitution: 0.1
    },
    linearDamping: 0.3,
    angularDamping: 0.3,
    userData: {
      isRobot: true,
      robotId: riggedData.id
    },
    onCollide: handleCollision
  }), useRef<THREE.Group>(null));

  // Setup robot API for Python code execution
  const setupRobotAPI = useCallback(() => {
    const wheelRadius = 0.028; // meters
    const wheelCircumference = 2 * Math.PI * wheelRadius * 100; // cm

    (window as any).robotAPI = {
      // ==================== MOTOR API ====================
      motor: {
        run: (port: string, speed: number) => {
          const motor = motorControllersRef.current.get(port);
          if (motor) {
            motor.setSpeed(speed);
          } else {
            console.warn(`Motor not found on port ${port}`);
          }
        },

        stop: (port: string) => {
          const motor = motorControllersRef.current.get(port);
          if (motor) {
            motor.stop();
          } else {
            console.warn(`Motor not found on port ${port}`);
          }
        },

        runForRotations: async (port: string, rotations: number, speed: number = 50) => {
          const motor = motorControllersRef.current.get(port);
          if (motor) {
            await motor.runForRotations(rotations, speed);
          } else {
            console.warn(`Motor not found on port ${port}`);
          }
        },

        runForDegrees: async (port: string, degrees: number, speed: number = 50) => {
          const motor = motorControllersRef.current.get(port);
          if (motor) {
            await motor.runForRotations(degrees / 360, speed);
          } else {
            console.warn(`Motor not found on port ${port}`);
          }
        },

        runForTime: async (port: string, ms: number, speed: number = 50) => {
          const motor = motorControllersRef.current.get(port);
          if (motor) {
            motor.setSpeed(speed);
            await new Promise(resolve => setTimeout(resolve, ms));
            motor.stop();
          } else {
            console.warn(`Motor not found on port ${port}`);
          }
        },

        runToPosition: async (port: string, position: number, speed: number = 50) => {
          const motor = motorControllersRef.current.get(port);
          if (motor) {
            const currentAngle = motor.getAngle();
            const deltaAngle = position - currentAngle;
            await motor.runForRotations(deltaAngle / 360, speed);
          } else {
            console.warn(`Motor not found on port ${port}`);
          }
        },

        reset: (port: string) => {
          const motor = motorControllersRef.current.get(port);
          if (motor) {
            motor.reset();
          } else {
            console.warn(`Motor not found on port ${port}`);
          }
        },

        getAngle: (port: string): number => {
          const motor = motorControllersRef.current.get(port);
          return motor ? motor.getAngle() : 0;
        },

        getSpeed: (port: string): number => {
          const motor = motorControllersRef.current.get(port);
          return motor ? motor.getSpeed() : 0;
        },

        setStallDetection: (port: string, enabled: boolean) => {
          console.log(`Stall detection ${enabled ? 'enabled' : 'disabled'} on port ${port}`);
        },

        wasStalled: (_port: string): boolean => {
          return false;
        }
      },

      // ==================== MOTOR PAIR / DRIVE BASE API ====================
      motorPair: {
        pair: (leftPort: string, rightPort: string) => {
          motorPairRef.current = { left: leftPort, right: rightPort };
          console.log(`Motor pair created: Left=${leftPort}, Right=${rightPort}`);
        },

        unpair: () => {
          motorPairRef.current = null;
        },

        move: async (distanceCm: number, speed: number = 50) => {
          if (!motorPairRef.current) {
            console.warn('Motor pair not configured. Call motor_pair_pair() first.');
            return;
          }
          const rotations = distanceCm / wheelCircumference;
          const leftMotor = motorControllersRef.current.get(motorPairRef.current.left);
          const rightMotor = motorControllersRef.current.get(motorPairRef.current.right);
          if (leftMotor && rightMotor) {
            await Promise.all([
              leftMotor.runForRotations(rotations, speed),
              rightMotor.runForRotations(rotations, speed)
            ]);
          }
        },

        tank: (leftSpeed: number, rightSpeed: number) => {
          if (!motorPairRef.current) {
            console.warn('Motor pair not configured');
            return;
          }
          const leftMotor = motorControllersRef.current.get(motorPairRef.current.left);
          const rightMotor = motorControllersRef.current.get(motorPairRef.current.right);
          leftMotor?.setSpeed(leftSpeed);
          rightMotor?.setSpeed(rightSpeed);
        },

        moveForRotations: async (rotations: number, leftSpeed: number = 50, rightSpeed: number = 50) => {
          if (!motorPairRef.current) return;
          const leftMotor = motorControllersRef.current.get(motorPairRef.current.left);
          const rightMotor = motorControllersRef.current.get(motorPairRef.current.right);
          if (leftMotor && rightMotor) {
            await Promise.all([
              leftMotor.runForRotations(rotations, leftSpeed),
              rightMotor.runForRotations(rotations, rightSpeed)
            ]);
          }
        },

        moveForDegrees: async (degrees: number, leftSpeed: number = 50, rightSpeed: number = 50) => {
          if (!motorPairRef.current) return;
          const leftMotor = motorControllersRef.current.get(motorPairRef.current.left);
          const rightMotor = motorControllersRef.current.get(motorPairRef.current.right);
          if (leftMotor && rightMotor) {
            await Promise.all([
              leftMotor.runForRotations(degrees / 360, leftSpeed),
              rightMotor.runForRotations(degrees / 360, rightSpeed)
            ]);
          }
        },

        moveForTime: async (ms: number, leftSpeed: number = 50, rightSpeed: number = 50) => {
          if (!motorPairRef.current) return;
          const leftMotor = motorControllersRef.current.get(motorPairRef.current.left);
          const rightMotor = motorControllersRef.current.get(motorPairRef.current.right);
          leftMotor?.setSpeed(leftSpeed);
          rightMotor?.setSpeed(rightSpeed);
          await new Promise(resolve => setTimeout(resolve, ms));
          leftMotor?.stop();
          rightMotor?.stop();
        },

        start: (leftSpeed: number = 50, rightSpeed: number = 50) => {
          if (!motorPairRef.current) return;
          const leftMotor = motorControllersRef.current.get(motorPairRef.current.left);
          const rightMotor = motorControllersRef.current.get(motorPairRef.current.right);
          leftMotor?.setSpeed(leftSpeed);
          rightMotor?.setSpeed(rightSpeed);
        },

        stop: () => {
          if (!motorPairRef.current) return;
          const leftMotor = motorControllersRef.current.get(motorPairRef.current.left);
          const rightMotor = motorControllersRef.current.get(motorPairRef.current.right);
          leftMotor?.stop();
          rightMotor?.stop();
        },

        turn: async (degrees: number, speed: number = 30) => {
          if (!motorPairRef.current) return;
          const leftMotor = motorControllersRef.current.get(motorPairRef.current.left);
          const rightMotor = motorControllersRef.current.get(motorPairRef.current.right);
          const rotations = Math.abs(degrees) / 90 * 0.5;
          const direction = degrees > 0 ? 1 : -1;
          if (leftMotor && rightMotor) {
            await Promise.all([
              leftMotor.runForRotations(rotations * direction, speed),
              rightMotor.runForRotations(-rotations * direction, speed)
            ]);
          }
        },

        arcTurn: async (radiusCm: number, angleDegrees: number, speed: number = 50) => {
          if (!motorPairRef.current) return;
          const wheelbaseCm = 16;
          const leftMotor = motorControllersRef.current.get(motorPairRef.current.left);
          const rightMotor = motorControllersRef.current.get(motorPairRef.current.right);

          const angleRad = (angleDegrees * Math.PI) / 180;
          const innerRadius = radiusCm - wheelbaseCm / 2;
          const outerRadius = radiusCm + wheelbaseCm / 2;
          const innerArc = innerRadius * angleRad;
          const outerArc = outerRadius * angleRad;

          const innerRotations = innerArc / wheelCircumference;
          const outerRotations = outerArc / wheelCircumference;
          const speedRatio = innerArc / outerArc;

          if (leftMotor && rightMotor) {
            if (angleDegrees > 0) {
              await Promise.all([
                leftMotor.runForRotations(outerRotations, speed),
                rightMotor.runForRotations(innerRotations, speed * speedRatio)
              ]);
            } else {
              await Promise.all([
                leftMotor.runForRotations(innerRotations, speed * speedRatio),
                rightMotor.runForRotations(outerRotations, speed)
              ]);
            }
          }
        }
      },

      // ==================== SENSOR API ====================
      sensor: {
        color: (port: string = '1'): string => {
          const sensor = sensorSimulatorsRef.current.get(port);
          return sensor ? sensor.read() : 'unknown';
        },

        reflectance: (port: string = '1'): number => {
          const sensor = sensorSimulatorsRef.current.get(port);
          return sensor?.readReflectance ? sensor.readReflectance() : 50;
        },

        ambient: (_port: string = '1'): number => {
          return 50;
        },

        rgb: (port: string = '1'): [number, number, number] => {
          const sensor = sensorSimulatorsRef.current.get(port);
          return sensor?.readRGB ? sensor.readRGB() : [0, 0, 0];
        },

        rgbi: (port: string = '1'): [number, number, number, number] => {
          const sensor = sensorSimulatorsRef.current.get(port);
          const rgb = sensor?.readRGB ? sensor.readRGB() : [0, 0, 0];
          const intensity = (rgb[0] + rgb[1] + rgb[2]) / 3;
          return [...rgb, intensity] as [number, number, number, number];
        },

        ultrasonic: (port: string = '2'): number => {
          const sensor = sensorSimulatorsRef.current.get(port);
          return sensor ? sensor.read() : 255;
        },

        waitForColor: async (port: string, targetColor: string) => {
          const sensor = sensorSimulatorsRef.current.get(port);
          if (!sensor) return;
          while (sensor.read() !== targetColor) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        },

        waitForNewColor: async (port: string): Promise<string> => {
          const sensor = sensorSimulatorsRef.current.get(port);
          if (!sensor) return 'unknown';
          const initialColor = sensor.read();
          while (sensor.read() === initialColor) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
          return sensor.read();
        },

        waitDistanceCloser: async (port: string, distance: number) => {
          const sensor = sensorSimulatorsRef.current.get(port);
          if (!sensor) return;
          while (sensor.read() > distance) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        },

        waitDistanceFarther: async (port: string, distance: number) => {
          const sensor = sensorSimulatorsRef.current.get(port);
          if (!sensor) return;
          while (sensor.read() < distance) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }
      },

      // ==================== GYRO / IMU API ====================
      gyro: {
        getAngle: (axis: string = 'yaw'): number => {
          if (!bodyRef.current) return 0;
          const q = bodyRef.current.quaternion;
          const sinr_cosp = 2 * (q.w * q.x + q.y * q.z);
          const cosr_cosp = 1 - 2 * (q.x * q.x + q.y * q.y);
          const roll = Math.atan2(sinr_cosp, cosr_cosp) * 180 / Math.PI;

          const sinp = 2 * (q.w * q.y - q.z * q.x);
          const pitch = Math.abs(sinp) >= 1
            ? Math.sign(sinp) * 90
            : Math.asin(sinp) * 180 / Math.PI;

          const siny_cosp = 2 * (q.w * q.z + q.x * q.y);
          const cosy_cosp = 1 - 2 * (q.y * q.y + q.z * q.z);
          const yaw = Math.atan2(siny_cosp, cosy_cosp) * 180 / Math.PI;

          switch (axis) {
            case 'yaw': return yaw - gyroAngleRef.current.yaw;
            case 'pitch': return pitch - gyroAngleRef.current.pitch;
            case 'roll': return roll - gyroAngleRef.current.roll;
            default: return yaw - gyroAngleRef.current.yaw;
          }
        },

        reset: (axis: string = 'all') => {
          if (!bodyRef.current) return;
          const q = bodyRef.current.quaternion;
          const sinr_cosp = 2 * (q.w * q.x + q.y * q.z);
          const cosr_cosp = 1 - 2 * (q.x * q.x + q.y * q.y);
          const roll = Math.atan2(sinr_cosp, cosr_cosp) * 180 / Math.PI;
          const sinp = 2 * (q.w * q.y - q.z * q.x);
          const pitch = Math.abs(sinp) >= 1 ? Math.sign(sinp) * 90 : Math.asin(sinp) * 180 / Math.PI;
          const siny_cosp = 2 * (q.w * q.z + q.x * q.y);
          const cosy_cosp = 1 - 2 * (q.y * q.y + q.z * q.z);
          const yaw = Math.atan2(siny_cosp, cosy_cosp) * 180 / Math.PI;

          if (axis === 'all' || axis === 'yaw') gyroAngleRef.current.yaw = yaw;
          if (axis === 'all' || axis === 'pitch') gyroAngleRef.current.pitch = pitch;
          if (axis === 'all' || axis === 'roll') gyroAngleRef.current.roll = roll;
        },

        getSpeed: (): number => {
          if (!bodyRef.current) return 0;
          return bodyRef.current.angularVelocity.y * 180 / Math.PI;
        },

        getOrientation: (): string => {
          if (!bodyRef.current) return 'up';
          const q = bodyRef.current.quaternion;
          const pitch = Math.asin(2 * (q.w * q.y - q.z * q.x)) * 180 / Math.PI;
          const roll = Math.atan2(2 * (q.w * q.x + q.y * q.z), 1 - 2 * (q.x * q.x + q.y * q.y)) * 180 / Math.PI;

          if (Math.abs(pitch) > 60) return pitch > 0 ? 'front' : 'back';
          if (Math.abs(roll) > 60) return roll > 0 ? 'rightside' : 'leftside';
          return 'up';
        },

        wasGesture: (_gesture: string): boolean => {
          return false;
        }
      },

      // ==================== HUB API ====================
      hub: {
        display: (text: string) => {
          console.log(`[Hub Display]: ${text}`);
        },

        showImage: (image: string) => {
          console.log(`[Hub Image]: ${image}`);
        },

        setPixel: (x: number, y: number, brightness: number) => {
          console.log(`[Hub Pixel]: (${x},${y}) = ${brightness}%`);
        },

        displayOff: () => {
          console.log('[Hub Display]: OFF');
        },

        setLight: (color: string) => {
          console.log(`[Hub Light]: ${color}`);
        },

        beep: async (frequency: number, duration: number) => {
          console.log(`[Hub Beep]: ${frequency}Hz for ${duration}ms`);
          await new Promise(resolve => setTimeout(resolve, duration));
        },

        setVolume: (volume: number) => {
          console.log(`[Hub Volume]: ${volume}%`);
        },

        isButtonPressed: (_button: string): boolean => {
          return false;
        },

        getBattery: (): number => {
          return 8000;
        },

        getTime: (): number => {
          return Date.now() - programStartRef.current;
        }
      },

      // ==================== TIMER API ====================
      timer: {
        reset: () => {
          timerStartRef.current = Date.now();
        },

        get: (): number => {
          return (Date.now() - timerStartRef.current) / 1000;
        }
      },

      // ==================== LINE FOLLOWER API ====================
      lineFollower: {
        followLine: async (port: string, rotations: number, speed: number, side: string) => {
          console.log(`[Line Follow]: ${rotations} rotations at speed ${speed} on ${side} side`);
          if (!motorPairRef.current) return;
          const leftMotor = motorControllersRef.current.get(motorPairRef.current.left);
          const rightMotor = motorControllersRef.current.get(motorPairRef.current.right);
          if (!leftMotor || !rightMotor) return;

          const sensor = sensorSimulatorsRef.current.get(port);
          const startAngle = leftMotor.getAngle();
          const targetAngle = startAngle + rotations * 360;

          while (Math.abs(leftMotor.getAngle()) < Math.abs(targetAngle)) {
            const reflectance = sensor?.readReflectance?.() ?? 50;
            const error = reflectance - 50;
            const correction = error * 0.5;

            if (side === 'left') {
              leftMotor.setSpeed(speed - correction);
              rightMotor.setSpeed(speed + correction);
            } else {
              leftMotor.setSpeed(speed + correction);
              rightMotor.setSpeed(speed - correction);
            }
            await new Promise(resolve => setTimeout(resolve, 20));
          }
          leftMotor.stop();
          rightMotor.stop();
        },

        followLineUntil: async (port: string, targetColor: string, speed: number, side: string) => {
          console.log(`[Line Follow Until]: ${targetColor} at speed ${speed} on ${side} side`);
          if (!motorPairRef.current) return;
          const leftMotor = motorControllersRef.current.get(motorPairRef.current.left);
          const rightMotor = motorControllersRef.current.get(motorPairRef.current.right);
          if (!leftMotor || !rightMotor) return;

          const sensor = sensorSimulatorsRef.current.get(port);

          while (sensor?.read() !== targetColor) {
            const reflectance = sensor?.readReflectance?.() ?? 50;
            const error = reflectance - 50;
            const correction = error * 0.5;

            if (side === 'left') {
              leftMotor.setSpeed(speed - correction);
              rightMotor.setSpeed(speed + correction);
            } else {
              leftMotor.setSpeed(speed + correction);
              rightMotor.setSpeed(speed - correction);
            }
            await new Promise(resolve => setTimeout(resolve, 20));
          }
          leftMotor.stop();
          rightMotor.stop();
        }
      },

      // ==================== UTILITY API ====================
      wait: (ms: number): Promise<void> => {
        return new Promise(resolve => setTimeout(resolve, ms));
      },

      print: (message: string): void => {
        console.log('[Robot]:', message);
      }
    };

    programStartRef.current = Date.now();
    timerStartRef.current = Date.now();
  }, []);

  // Initialize motors and sensors with the physics body from cannon world
  useEffect(() => {
    if (motorsInitialized.current) {
      return;
    }

    console.log('🔧 Starting physics initialization...');

    // Subscribe to body reference from cannon world
    // This is the proper way to get the CANNON.Body from react-three/cannon
    let attempts = 0;
    const maxAttempts = 20;

    const tryInitialize = () => {
      attempts++;
      console.log(`⏰ Initialization attempt ${attempts}/${maxAttempts}...`);

      // Try to get the physics body through the API
      // react-three/cannon stores the body reference internally
      if (api && ref.current) {
        // Create a proxy body that follows the cannon world body
        // The actual body is managed by cannon world, we just need a reference for motors
        const proxyBody = new CANNON.Body({
          mass: riggedData.chassis.mass,
          position: new CANNON.Vec3(initialPosition[0], initialPosition[1], initialPosition[2])
        });

        // Subscribe to position and velocity updates from the cannon world
        const unsubPosition = api.position.subscribe((pos: [number, number, number]) => {
          proxyBody.position.set(pos[0], pos[1], pos[2]);
        });

        const unsubVelocity = api.velocity.subscribe((vel: [number, number, number]) => {
          proxyBody.velocity.set(vel[0], vel[1], vel[2]);
        });

        const unsubAngularVelocity = api.angularVelocity.subscribe((angVel: [number, number, number]) => {
          proxyBody.angularVelocity.set(angVel[0], angVel[1], angVel[2]);
        });

        const unsubRotation = api.rotation.subscribe((rot: [number, number, number]) => {
          proxyBody.quaternion.setFromEuler(rot[0], rot[1], rot[2]);
        });

        bodyRef.current = proxyBody;

        // Store unsubscribe functions for cleanup
        (bodyRef as any).unsubscribers = [
          unsubPosition,
          unsubVelocity,
          unsubAngularVelocity,
          unsubRotation
        ];

        console.log('✅ Physics body proxy created');

        // Initialize motors with the physics body
        motorControllersRef.current.clear();
        const driveMotorCount = riggedData.motorJoints.filter(j => j.wheelPartIds.length > 0).length || riggedData.motorJoints.length;
        riggedData.motorJoints.forEach(joint => {
          const motor = new VirtualSpikeMotor(
            joint.port,
            joint,
            'spike-large'
          );
          motor.initialize(proxyBody, riggedData.chassis.mass, driveMotorCount);
          motorControllersRef.current.set(joint.port, motor);
          console.log(`⚙️ Motor ${joint.port} initialized`);
        });

        console.log(`✅ Motors initialized: ${motorControllersRef.current.size}`);
        motorsInitialized.current = true;

        // Create sensor simulators
        riggedData.sensors.forEach(sensorConfig => {
          const simulator = createSensorSimulator(sensorConfig, matTexture, matDimensions);
          sensorSimulatorsRef.current.set(sensorConfig.port, simulator);
        });
        console.log(`✅ Sensors initialized: ${sensorSimulatorsRef.current.size}`);

        // Setup robot API
        setupRobotAPI();

        // Expose robot instance
        const robotInstance: RobotInstance = {
          riggedData,
          physicsBody: proxyBody,
          visualGroup: ref.current!,
          motorControllers: motorControllersRef.current,
          sensorSimulators: sensorSimulatorsRef.current
        };

        if (onRobotReadyRef.current) {
          onRobotReadyRef.current(robotInstance);
        }

        console.log('✅ Robot ready for code execution');

      } else if (attempts < maxAttempts) {
        // Retry with exponential backoff
        console.log(`⏳ API not ready, retrying in ${100 * attempts}ms...`);
        setTimeout(tryInitialize, 100 * attempts);
      } else {
        console.error('❌ Failed to initialize physics after maximum attempts');
      }
    };

    // Start initialization after a short delay
    setTimeout(tryInitialize, 200);

    // Cleanup function
    return () => {
      if ((bodyRef as any).unsubscribers) {
        (bodyRef as any).unsubscribers.forEach((unsub: () => void) => unsub());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riggedData.id, api]);

  // Physics update loop - motor velocity application
  useFrame((state: { scene: THREE.Scene }, delta: number) => {
    if (!ref.current || !bodyRef.current || !motorsInitialized.current) return;

    const dt = Math.min(delta, 0.05);

    // Update motors (they calculate velocity changes)
    motorControllersRef.current.forEach((motor: VirtualSpikeMotor) => {
      motor.update(dt);
    });

    // Apply motor-calculated velocities to the cannon world body through the API
    // This is the key integration - motors modify proxyBody, we push to cannon world
    const body = bodyRef.current;

    // Apply velocity changes to the actual cannon body through the API
    api.velocity.set(body.velocity.x, body.velocity.y, body.velocity.z);
    api.angularVelocity.set(body.angularVelocity.x, body.angularVelocity.y, body.angularVelocity.z);

    // Update sensors with current body state
    const sensorReadings: SensorReading[] = [];
    sensorSimulatorsRef.current.forEach((sensor: { update: (scene: THREE.Scene, body: CANNON.Body) => SensorReading }) => {
      const reading = sensor.update(state.scene, body);
      sensorReadings.push(reading);
    });

    if (onSensorUpdate && sensorReadings.length > 0) {
      onSensorUpdate(sensorReadings);
    }

    // Update trace path (every 100ms)
    const now = Date.now();
    if (now - lastTraceTime.current > 100) {
      const pos = ref.current.position.clone();
      tracePathRef.current.push(pos);

      if (tracePathRef.current.length > 1000) {
        tracePathRef.current.shift();
      }

      lastTraceTime.current = now;
    }
  });

  return (
    <group ref={ref}>
      {/* Visual mesh of the robot */}
      <primitive object={visualMeshClone} />

      {/* Motor axle visualizations (always visible) */}
      {riggedData.motorJoints.map((joint, i) => {
        const relPos = joint.axlePosition.clone().sub(riggedData.chassis.centerOfMass);
        return (
          <group key={`axle-${i}`} position={[relPos.x, relPos.y, relPos.z]}>
            {/* Axle rod */}
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.004, 0.004, 0.12, 8]} />
              <meshStandardMaterial color="#555555" metalness={0.8} roughness={0.2} />
            </mesh>
            {/* Motor hub indicators (left & right) */}
            <mesh position={[-0.05, 0, 0]}>
              <cylinderGeometry args={[0.016, 0.016, 0.014, 12]} />
              <meshStandardMaterial color="#E0E0E0" roughness={0.4} />
            </mesh>
            <mesh position={[0.05, 0, 0]}>
              <cylinderGeometry args={[0.016, 0.016, 0.014, 12]} />
              <meshStandardMaterial color="#E0E0E0" roughness={0.4} />
            </mesh>
          </group>
        );
      })}

      {/* Debug visualizations */}
      {process.env.NODE_ENV === 'development' && (
        <>

          {/* Sensor ray helpers */}
          {riggedData.sensors.map((sensor, i) => (
            <group key={`sensor-${i}`} position={sensor.position.toArray()}>
              <arrowHelper
                args={[
                  sensor.direction,
                  new THREE.Vector3(0, 0, 0),
                  0.15,
                  sensor.type === 'color' ? 0x00ff00 : 0x0000ff
                ]}
              />
            </group>
          ))}

          {/* Center of mass indicator */}
          <mesh position={riggedData.chassis.centerOfMass.toArray()}>
            <sphereGeometry args={[0.01, 8, 8]} />
            <meshBasicMaterial color="yellow" />
          </mesh>
        </>
      )}
    </group>
  );
}
