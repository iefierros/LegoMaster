import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useCompoundBody } from '@react-three/cannon';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import type { RiggedRobotData, SensorReading, RobotInstance } from '@/types';
import { VirtualSpikeMotor } from '@/physics/VirtualSpikeMotor';
import { createSensorSimulator } from '@/physics/SensorSimulators';

interface SimulatedRobotProps {
  riggedData: RiggedRobotData;
  initialPosition?: [number, number, number];
  matTexture?: THREE.Texture;
  matDimensions?: { width: number; height: number };
  onSensorUpdate?: (sensorData: SensorReading[]) => void;
  onRobotReady?: (robot: RobotInstance) => void;
}

export function SimulatedRobot({
  riggedData,
  initialPosition = [0, 0.1, 0],
  matTexture,
  matDimensions = { width: 2.4, height: 1.2 },
  onSensorUpdate,
  onRobotReady
}: SimulatedRobotProps) {

  // Create physics shapes for compound body
  const shapes = useMemo(() => {
    const chassisVertices = riggedData.chassis.collisionShape.vertices || [];

    // Main chassis shape (simplified box for now)
    const chassisShapes = [{
      type: 'Box' as const,
      args: [0.15, 0.08, 0.15] as [number, number, number],
      position: [0, 0, 0] as [number, number, number]
    }];

    // Add wheel shapes
    riggedData.motorJoints.forEach(joint => {
      joint.wheelPartIds.forEach((wheelId, index) => {
        const offsetX = index === 0 ? -0.08 : 0.08; // Left/right wheels
        chassisShapes.push({
          type: 'Cylinder' as const,
          args: [0.028, 0.028, 0.012, 16] as [number, number, number, number],
          position: [offsetX, -0.04, 0] as [number, number, number]
        });
      });
    });

    return chassisShapes;
  }, [riggedData]);

  // Create physics body
  const [ref, api] = useCompoundBody<THREE.Group>(() => ({
    mass: riggedData.chassis.mass,
    position: initialPosition,
    shapes: shapes,
    material: {
      friction: 0.9,
      restitution: 0.1
    },
    linearDamping: 0.3,
    angularDamping: 0.3
  }));

  // Motor controllers
  const motorControllersRef = useRef<Map<string, VirtualSpikeMotor>>(new Map());
  const physicsWorldRef = useRef<CANNON.World | null>(null);

  // Sensor simulators
  const sensorSimulatorsRef = useRef<Map<string, any>>(new Map());

  // Trace path for visualization
  const tracePathRef = useRef<THREE.Vector3[]>([]);
  const lastTraceTime = useRef<number>(0);

  // Initialize motors and sensors
  useEffect(() => {
    // Note: In a real implementation, we'd get the physics world from context
    // For now, we'll create controllers that will be initialized when world is available

    riggedData.motorJoints.forEach(joint => {
      const motor = new VirtualSpikeMotor(
        joint.port,
        joint,
        physicsWorldRef.current as any, // Will be set later
        'spike-large'
      );
      motorControllersRef.current.set(joint.port, motor);
    });

    // Create sensor simulators
    riggedData.sensors.forEach(sensorConfig => {
      const simulator = createSensorSimulator(sensorConfig, matTexture, matDimensions);
      sensorSimulatorsRef.current.set(sensorConfig.port, simulator);
    });

    // Expose robot API to global scope for code execution
    const robotInstance: RobotInstance = {
      riggedData,
      physicsBody: null as any, // Will be set when physics is ready
      visualGroup: ref.current!,
      motorControllers: motorControllersRef.current,
      sensorSimulators: sensorSimulatorsRef.current
    };

    if (onRobotReady) {
      onRobotReady(robotInstance);
    }

    // Global API for Python code execution
    (window as any).robotAPI = {
      motor: {
        run: (port: string, speed: number) => {
          const motor = motorControllersRef.current.get(port);
          if (motor) {
            motor.setSpeed(speed);
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

        stop: (port: string) => {
          const motor = motorControllersRef.current.get(port);
          if (motor) {
            motor.stop();
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
        }
      },

      sensor: {
        color: (port: string = '1'): string => {
          const sensor = sensorSimulatorsRef.current.get(port);
          return sensor ? sensor.read() : 'unknown';
        },

        ultrasonic: (port: string = '2'): number => {
          const sensor = sensorSimulatorsRef.current.get(port);
          return sensor ? sensor.read() : 255;
        },

        reflectance: (port: string = '1'): number => {
          const sensor = sensorSimulatorsRef.current.get(port);
          return sensor?.readReflectance ? sensor.readReflectance() : 50;
        }
      },

      wait: (ms: number): Promise<void> => {
        return new Promise(resolve => setTimeout(resolve, ms));
      },

      print: (message: string): void => {
        console.log('[Robot]:', message);
      }
    };

  }, [riggedData, matTexture, matDimensions, onRobotReady]);

  // Physics update loop
  useFrame((state, delta) => {
    if (!ref.current) return;

    // Update motors
    motorControllersRef.current.forEach(motor => {
      motor.update(delta);
    });

    // Update sensors
    const sensorReadings: SensorReading[] = [];
    sensorSimulatorsRef.current.forEach(sensor => {
      // Note: We'd need to pass actual physics body here
      const reading = sensor.update(state.scene, {} as CANNON.Body);
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

      // Limit trace path to last 1000 points
      if (tracePathRef.current.length > 1000) {
        tracePathRef.current.shift();
      }

      lastTraceTime.current = now;
    }
  });

  return (
    <group ref={ref}>
      {/* Visual mesh of the robot */}
      <primitive object={riggedData.visualMesh.clone()} />

      {/* Debug visualizations */}
      {process.env.NODE_ENV === 'development' && (
        <>
          {/* Motor axle helpers */}
          {riggedData.motorJoints.map((joint, i) => (
            <group key={`axle-${i}`} position={joint.axlePosition.toArray()}>
              <mesh>
                <cylinderGeometry args={[0.005, 0.005, 0.15, 8]} />
                <meshBasicMaterial color="red" />
              </mesh>
            </group>
          ))}

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
