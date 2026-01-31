import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import type { PartInstance, RiggedRobotData, ChassisData } from '@/types';
import { CRITICAL_PARTS } from '@/types';

/**
 * Shape definition for react-three/cannon useCompoundBody
 */
export interface CompoundBodyShape {
  type: 'Box' | 'Cylinder' | 'Sphere' | 'ConvexPolyhedron';
  args: number[];
  position: [number, number, number];
  rotation?: [number, number, number];
}

/**
 * Collision shape generation from LDraw geometry and part data
 */
export class CollisionShapeGenerator {

  /**
   * Generate compound body shapes from rigged robot data
   * Uses actual part positions and sizes from LDraw
   */
  static fromRiggedData(riggedData: RiggedRobotData): CompoundBodyShape[] {
    const shapes: CompoundBodyShape[] = [];

    // Use chassis data to create main body shape
    const chassisShape = this.createChassisShape(riggedData.chassis);
    shapes.push(chassisShape);

    // Add wheel shapes relative to chassis center of mass
    const com = riggedData.chassis.centerOfMass;
    riggedData.motorJoints.forEach(joint => {
      const relPos = joint.axlePosition.clone().sub(com);
      const wheelShape = this.createWheelShape(relPos);
      shapes.push(wheelShape);
    });

    return shapes;
  }

  /**
   * Generate collision shapes from parsed parts
   */
  static fromParts(parts: PartInstance[]): CompoundBodyShape[] {
    const shapes: CompoundBodyShape[] = [];

    // Separate wheels from chassis parts
    const wheels = parts.filter(p => p.category === 'wheel');
    const chassisParts = parts.filter(p => p.category !== 'wheel');

    // Create bounding box for chassis
    if (chassisParts.length > 0) {
      const chassisBox = this.computeBoundingBox(chassisParts);
      shapes.push({
        type: 'Box',
        args: [chassisBox.size.x / 2, chassisBox.size.y / 2, chassisBox.size.z / 2],
        position: [chassisBox.center.x, chassisBox.center.y, chassisBox.center.z]
      });
    }

    // Create cylinder for each wheel with actual size
    wheels.forEach(wheel => {
      const wheelDef = CRITICAL_PARTS[wheel.partId];
      const radius = wheelDef?.dimensions?.x ? (wheelDef.dimensions.x / 1000 / 2) : 0.028;
      const width = 0.012; // Standard wheel width

      shapes.push({
        type: 'Cylinder',
        args: [radius, radius, width, 12],
        position: [wheel.position.x, wheel.position.y, wheel.position.z],
        rotation: [0, 0, Math.PI / 2] // Rotate to align with X axis
      });
    });

    return shapes;
  }

  /**
   * Create chassis collision shape from ChassisData
   */
  private static createChassisShape(chassis: ChassisData): CompoundBodyShape {
    if (chassis.collisionShape.dimensions) {
      // Use explicit dimensions if provided
      // Position at origin since the compound body IS the chassis
      const dim = chassis.collisionShape.dimensions;
      return {
        type: 'Box',
        args: [dim.x / 2, dim.y / 2, dim.z / 2],
        position: [0, 0, 0]
      };
    }

    if (chassis.collisionShape.vertices && chassis.collisionShape.vertices.length >= 4) {
      // Compute bounding box from vertices
      const box = new THREE.Box3();
      chassis.collisionShape.vertices.forEach(v => box.expandByPoint(v));
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      return {
        type: 'Box',
        args: [size.x / 2, size.y / 2, size.z / 2],
        position: [center.x, center.y, center.z]
      };
    }

    // Default chassis size (15cm x 8cm x 15cm)
    return {
      type: 'Box',
      args: [0.075, 0.04, 0.075],
      position: [0, 0, 0]
    };
  }

  /**
   * Create wheel collision shape
   */
  private static createWheelShape(position: THREE.Vector3, radius: number = 0.028): CompoundBodyShape {
    return {
      type: 'Cylinder',
      args: [radius, radius, 0.012, 12],
      position: [position.x, position.y, position.z],
      rotation: [0, 0, Math.PI / 2]
    };
  }

  /**
   * Compute bounding box from a list of parts
   */
  static computeBoundingBox(parts: PartInstance[]): { center: THREE.Vector3; size: THREE.Vector3 } {
    if (parts.length === 0) {
      return {
        center: new THREE.Vector3(0, 0, 0),
        size: new THREE.Vector3(0.15, 0.08, 0.15)
      };
    }

    const box = new THREE.Box3();

    parts.forEach(part => {
      // Estimate part size based on category
      let partSize = new THREE.Vector3(0.008, 0.0096, 0.008); // Default brick size

      if (part.category === 'motor') {
        partSize.set(0.032, 0.032, 0.048);
      } else if (part.category === 'sensor') {
        partSize.set(0.024, 0.024, 0.020);
      }

      // Expand box by part position + half size
      const min = part.position.clone().sub(partSize.clone().multiplyScalar(0.5));
      const max = part.position.clone().add(partSize.clone().multiplyScalar(0.5));
      box.expandByPoint(min);
      box.expandByPoint(max);
    });

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // Ensure minimum size
    size.x = Math.max(size.x, 0.05);
    size.y = Math.max(size.y, 0.04);
    size.z = Math.max(size.z, 0.05);

    return { center, size };
  }

  /**
   * Generate ConvexPolyhedron from Three.js mesh
   * For complex shapes that need accurate collision
   */
  static convexHullFromMesh(mesh: THREE.Mesh): CANNON.ConvexPolyhedron | null {
    const geometry = mesh.geometry;

    if (!geometry.attributes.position) {
      return null;
    }

    const positions = geometry.attributes.position;
    const vertices: CANNON.Vec3[] = [];

    // Extract unique vertices
    const seen = new Set<string>();
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      const key = `${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`;

      if (!seen.has(key)) {
        seen.add(key);
        vertices.push(new CANNON.Vec3(x, y, z));
      }
    }

    if (vertices.length < 4) {
      return null;
    }

    try {
      // Create convex hull (CANNON.js will compute faces)
      return new CANNON.ConvexPolyhedron({ vertices });
    } catch (error) {
      console.warn('Failed to create ConvexPolyhedron:', error);
      return null;
    }
  }

  /**
   * Create a convex hull CompoundBodyShape from raw vertex positions
   * Downsamples vertices to keep physics performant, then falls back to bounding box if hull fails
   */
  static convexHullFromVertices(
    vertices: Float32Array,
    position: [number, number, number] = [0, 0, 0]
  ): CompoundBodyShape {
    // Downsample: keep at most ~64 unique vertices for a fast convex hull
    const seen = new Set<string>();
    const unique: CANNON.Vec3[] = [];
    const step = Math.max(1, Math.floor(vertices.length / 3 / 200));

    for (let i = 0; i < vertices.length; i += 3 * step) {
      const x = vertices[i];
      const y = vertices[i + 1];
      const z = vertices[i + 2];
      const key = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(new CANNON.Vec3(x, y, z));
      }
    }

    if (unique.length >= 4) {
      try {
        // Verify CANNON can build a hull from these vertices
        new CANNON.ConvexPolyhedron({ vertices: unique });

        // Compute bounding box to get the center-relative shape size
        const box = new THREE.Box3();
        unique.forEach(v => box.expandByPoint(new THREE.Vector3(v.x, v.y, v.z)));
        const size = box.getSize(new THREE.Vector3());

        // Use a box approximation that tightly fits the hull
        // (react-three/cannon doesn't natively support ConvexPolyhedron in useCompoundBody)
        return {
          type: 'Box',
          args: [size.x / 2, size.y / 2, size.z / 2],
          position
        };
      } catch {
        // Fall through to default
      }
    }

    // Fallback: compute bounding box from all vertices
    const box = new THREE.Box3();
    for (let i = 0; i < vertices.length; i += 3) {
      box.expandByPoint(new THREE.Vector3(vertices[i], vertices[i + 1], vertices[i + 2]));
    }
    const size = box.getSize(new THREE.Vector3());
    size.x = Math.max(size.x, 0.05);
    size.y = Math.max(size.y, 0.04);
    size.z = Math.max(size.z, 0.05);

    return {
      type: 'Box',
      args: [size.x / 2, size.y / 2, size.z / 2],
      position
    };
  }

  /**
   * Create CANNON shapes array from CompoundBodyShape definitions
   * For use with manual CANNON.Body creation
   */
  static toCannonShapes(shapes: CompoundBodyShape[]): Array<{
    shape: CANNON.Shape;
    offset: CANNON.Vec3;
    orientation?: CANNON.Quaternion;
  }> {
    return shapes.map(shape => {
      let cannonShape: CANNON.Shape;

      switch (shape.type) {
        case 'Box':
          cannonShape = new CANNON.Box(new CANNON.Vec3(shape.args[0], shape.args[1], shape.args[2]));
          break;
        case 'Cylinder':
          cannonShape = new CANNON.Cylinder(shape.args[0], shape.args[1], shape.args[2], shape.args[3] || 12);
          break;
        case 'Sphere':
          cannonShape = new CANNON.Sphere(shape.args[0]);
          break;
        default:
          cannonShape = new CANNON.Box(new CANNON.Vec3(0.05, 0.05, 0.05));
      }

      const offset = new CANNON.Vec3(shape.position[0], shape.position[1], shape.position[2]);

      let orientation: CANNON.Quaternion | undefined;
      if (shape.rotation) {
        orientation = new CANNON.Quaternion();
        orientation.setFromEuler(shape.rotation[0], shape.rotation[1], shape.rotation[2]);
      }

      return { shape: cannonShape, offset, orientation };
    });
  }

  /**
   * Convert CompoundBodyShape array to react-three/cannon format
   */
  static toCannonHookFormat(shapes: CompoundBodyShape[]): Array<{
    type: 'Box' | 'Cylinder' | 'Sphere';
    args: [number, number, number] | [number, number, number, number] | [number];
    position: [number, number, number];
    rotation?: [number, number, number];
  }> {
    return shapes.map(shape => ({
      type: shape.type as 'Box' | 'Cylinder' | 'Sphere',
      args: shape.args as any,
      position: shape.position,
      rotation: shape.rotation
    }));
  }
}

export const collisionShapeGenerator = new CollisionShapeGenerator();
