import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// ============ LDRAW PARSING TYPES ============

export interface LDrawCommand {
  type: number; // 0=comment, 1=part, 2=line, 3=triangle, 4=quad
  color: number;
  position: THREE.Vector3;
  rotation: THREE.Matrix3;
  partId?: string;
  vertices?: THREE.Vector3[];
}

export interface PartInstance {
  id: string;
  partId: string;
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  color: number;
  category?: 'motor' | 'wheel' | 'sensor' | 'structural';
}

export interface ParsedModel {
  parts: PartInstance[];
  metadata: {
    name: string;
    author?: string;
    partCount: number;
  };
}

// ============ ROBOT RIGGING TYPES ============

export interface WheelAxle {
  centerPoint: THREE.Vector3;
  direction: THREE.Vector3;
  wheels: PartInstance[];
  radius: number;
}

export interface MotorJoint {
  motorId: string;
  motorPartId: string;
  axlePosition: THREE.Vector3;
  axleDirection: THREE.Vector3;
  wheelPartIds: string[];
  gearRatio: number;
  port: string; // 'A', 'B', 'C', 'D'
}

export interface SensorConfig {
  id: string;
  type: 'ultrasonic' | 'color' | 'gyro' | 'touch';
  position: THREE.Vector3;
  direction: THREE.Vector3;
  port: string;
}

export interface ChassisData {
  mass: number; // kg
  centerOfMass: THREE.Vector3;
  collisionShape: {
    type: 'ConvexPolyhedron' | 'Box' | 'Compound';
    vertices?: THREE.Vector3[];
    dimensions?: THREE.Vector3;
  };
  inertia?: CANNON.Vec3;
}

export interface RiggedRobotData {
  id: string;
  name: string;
  chassis: ChassisData;
  motorJoints: MotorJoint[];
  sensors: SensorConfig[];
  visualMesh: THREE.Group;
  partCount: number;
  thumbnail?: string;
}

// ============ PHYSICS TYPES ============

export interface PhysicsConfig {
  gravity: number;
  friction: number;
  restitution: number;
  linearDamping: number;
  angularDamping: number;
}

export interface VelocityCommand {
  port: string;
  velocity: number; // rad/s
  acceleration?: number;
}

export interface PositionCommand {
  port: string;
  targetAngle: number; // degrees
  speed: number; // percentage
}

// ============ SENSOR TYPES ============

export interface SensorReading {
  sensorId: string;
  type: 'ultrasonic' | 'color' | 'gyro' | 'touch';
  timestamp: number;
  value: number | string | { r: number; g: number; b: number };
  raw?: any;
}

export interface ColorSensorReading extends SensorReading {
  type: 'color';
  value: 'black' | 'white' | 'red' | 'blue' | 'green' | 'yellow' | 'unknown';
  raw: { r: number; g: number; b: number };
  reflectance: number; // 0-100
}

export interface UltrasonicReading extends SensorReading {
  type: 'ultrasonic';
  value: number; // cm (0-255)
}

// ============ SIMULATION TYPES ============

export interface SimulationState {
  isRunning: boolean;
  isPaused: boolean;
  elapsedTime: number; // seconds
  robotPosition: THREE.Vector3;
  robotRotation: THREE.Quaternion;
  robotVelocity: THREE.Vector3;
  sensorReadings: SensorReading[];
  tracePath: THREE.Vector3[];
}

export interface MissionElement {
  id: string;
  name: string;
  type: 'lever' | 'button' | 'gate' | 'cargo' | 'zone';
  mesh: THREE.Mesh;
  physicsBody?: CANNON.Body;
  position: THREE.Vector3;
  state: 'inactive' | 'triggered' | 'completed';
  points: number;
  triggers: {
    onCollision?: (robot: RobotInstance) => void;
    onPressure?: (force: number) => void;
    onProximity?: (distance: number) => void;
  };
}

export interface FLLTrack {
  id: string;
  name: string;
  season: string; // "FLL 2024 - MASTERPIECE"
  modelUrl: string;
  matTextureUrl: string;
  matPhysicsMaterial: CANNON.Material;
  dimensions: { width: number; height: number }; // meters
  missionElements: MissionElement[];
}

export interface RobotInstance {
  riggedData: RiggedRobotData;
  physicsBody: CANNON.Body;
  visualGroup: THREE.Group;
  motorControllers: Map<string, VirtualMotorController>;
  sensorSimulators: Map<string, SensorSimulator>;
}

// ============ CODE EXECUTION TYPES ============

export interface CodeExecutionContext {
  robot: RobotInstance;
  sensors: Map<string, SensorSimulator>;
  motors: Map<string, VirtualMotorController>;
  wait: (ms: number) => Promise<void>;
  print: (message: string) => void;
}

export interface PythonCommand {
  type: 'motor_run' | 'motor_stop' | 'sensor_read' | 'wait' | 'print';
  port?: string;
  params?: Record<string, any>;
  timestamp: number;
}

// ============ AUTH TYPES ============

export interface User {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// ============ PROJECT TYPES ============

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  code: string;
  language: 'python' | 'blockly';
  robot_model_id?: string;
  thumbnail_url?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectCreate {
  name: string;
  description?: string;
  code: string;
  language: 'python' | 'blockly';
  robot_model_id?: string;
  is_public?: boolean;
}

export interface ProjectUpdate {
  name?: string;
  description?: string;
  code?: string;
  robot_model_id?: string;
  is_public?: boolean;
}

// ============ DATABASE TYPES ============

export interface DBSession {
  id: string;
  user_id: string;
  robot_model_id: string;
  track_id: string;
  code_snapshot_id: string;
  simulation_state: {
    robot_position: { x: number; y: number; z: number };
    robot_rotation: { x: number; y: number; z: number; w: number };
    mission_scores: Array<{
      mission_id: string;
      completed: boolean;
      points: number;
    }>;
    execution_time: number;
    trace_path: Array<[number, number, number]>;
  };
  created_at: string;
  updated_at: string;
}

export interface DBRobotModel {
  id: string;
  user_id: string;
  name: string;
  source_file_url: string;
  rigged_data: RiggedRobotData;
  thumbnail_url?: string;
  part_count: number;
  created_at: string;
}

export interface DBTrack {
  id: string;
  season: string;
  model_url: string;
  mat_texture_url: string;
  mission_elements: Array<{
    id: string;
    position: { x: number; y: number; z: number };
    type: string;
    trigger_force?: number;
    points: number;
  }>;
}

export interface DBCodeSnapshot {
  id: string;
  session_id: string;
  code: string;
  language: 'python' | 'blockly';
  version: number;
  created_at: string;
}

// ============ CONTROLLER INTERFACES ============

export interface VirtualMotorController {
  port: string;
  maxRPM: number;
  stallTorque: number;
  currentVelocity: number;
  targetVelocity: number;
  setSpeed(percentage: number): void;
  runForRotations(rotations: number, speed: number): Promise<void>;
  stop(): void;
  reset(): void;
  update(deltaTime: number): void;
}

export interface SensorSimulator {
  id: string;
  type: 'ultrasonic' | 'color' | 'gyro' | 'touch';
  port: string;
  update(scene: THREE.Scene, robotBody: CANNON.Body): SensorReading;
  read(): number | string | any;
}

// ============ RENDER MODE TYPES ============

export type RenderMode = 'simple' | 'detailed';

export interface RenderOptions {
  mode: RenderMode;
  showWireframe?: boolean;
  showCollisionShapes?: boolean;
}

export interface LDrawLoadProgress {
  loaded: number;
  total: number;
  message: string;
  currentPart?: string;
}

export interface RigOptions {
  renderMode: RenderMode;
  onProgress?: (progress: LDrawLoadProgress) => void;
}

// ============ PART LIBRARY TYPES ============

export interface PartDefinition {
  id: string;
  name: string;
  category: 'motor' | 'wheel' | 'sensor' | 'beam' | 'connector' | 'gear' | 'axle' | 'other';
  mass?: number; // grams
  dimensions?: { x: number; y: number; z: number }; // LDU
  connectionPoints?: THREE.Vector3[];
  ldrawPath?: string;
}

// Diccionario de piezas críticas
export const CRITICAL_PARTS: Record<string, PartDefinition> = {
  // SPIKE Prime Motors
  '54696': { id: '54696', name: 'SPIKE Large Motor', category: 'motor', mass: 120 },
  '54675': { id: '54675', name: 'SPIKE Medium Motor', category: 'motor', mass: 80 },

  // EV3 Motors
  '99499': { id: '99499', name: 'EV3 Large Motor', category: 'motor', mass: 76 },
  '95658': { id: '95658', name: 'EV3 Medium Motor', category: 'motor', mass: 36 },

  // Ruedas comunes
  '56908': { id: '56908', name: 'Tire 68.7 x 34R', category: 'wheel', mass: 15 },
  '44309': { id: '44309', name: 'Tire 94.8 x 44R', category: 'wheel', mass: 25 },
  '87697': { id: '87697', name: 'Tire 43.2 x 22', category: 'wheel', mass: 8 },

  // Sensores SPIKE
  '37308': { id: '37308', name: 'SPIKE Color Sensor', category: 'sensor', mass: 25 },
  '37316': { id: '37316', name: 'SPIKE Ultrasonic Sensor', category: 'sensor', mass: 30 },

  // Sensores EV3
  '95650': { id: '95650', name: 'EV3 Color Sensor', category: 'sensor', mass: 20 },
  '95652': { id: '95652', name: 'EV3 Ultrasonic Sensor', category: 'sensor', mass: 28 }
};
