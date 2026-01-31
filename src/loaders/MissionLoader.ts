import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import type { MissionElement, PartInstance, RobotInstance } from '@/types';
import { ldrawParser } from '@/parsers/LDrawParser';

/**
 * Known mission element part IDs and their configurations
 * These are common LEGO parts used in FLL missions
 */
const MISSION_PART_DEFINITIONS: Record<string, {
  type: MissionElement['type'];
  isMovable: boolean;
  points: number;
  triggerType: 'collision' | 'pressure' | 'proximity';
}> = {
  // Levers and hinges
  '44302': { type: 'lever', isMovable: true, points: 20, triggerType: 'collision' },
  '60478': { type: 'lever', isMovable: true, points: 15, triggerType: 'collision' },

  // Buttons and tiles
  '3070b': { type: 'button', isMovable: false, points: 10, triggerType: 'pressure' },
  '98138': { type: 'button', isMovable: false, points: 10, triggerType: 'pressure' },

  // Gates and doors
  '60596': { type: 'gate', isMovable: false, points: 25, triggerType: 'collision' },
  '60616': { type: 'gate', isMovable: false, points: 25, triggerType: 'collision' },

  // Cargo containers
  '61780': { type: 'cargo', isMovable: true, points: 15, triggerType: 'collision' },
  '4345': { type: 'cargo', isMovable: true, points: 15, triggerType: 'collision' },

  // Default for any unrecognized part in mission zone
  'default': { type: 'cargo', isMovable: true, points: 5, triggerType: 'collision' }
};

/**
 * Mission Loader - loads and parses mission elements from Studio/LDraw files
 */
export class MissionLoader {

  /**
   * Load mission elements from a .io or .ldr file
   */
  async loadFromFile(file: File): Promise<MissionElement[]> {
    console.log('📦 Loading mission from file:', file.name);

    try {
      // Parse the file using LDrawParser
      const model = await ldrawParser.parse(file);

      if (!model || !model.parts || model.parts.length === 0) {
        console.warn('⚠️ No parts found in mission file');
        return [];
      }

      console.log(`📊 Parsed ${model.parts.length} parts from mission file`);

      // Filter parts that are likely mission elements (not robot parts)
      const missionParts = this.filterMissionParts(model.parts);
      console.log(`🎯 Identified ${missionParts.length} potential mission elements`);

      // Convert parts to mission elements
      const elements = missionParts.map(part => this.partToMissionElement(part));

      console.log(`✅ Loaded ${elements.length} mission elements`);
      return elements;

    } catch (error) {
      console.error('❌ Error loading mission file:', error);
      throw error;
    }
  }

  /**
   * Filter parts that are likely mission elements (not robot parts)
   */
  private filterMissionParts(parts: PartInstance[]): PartInstance[] {
    return parts.filter(part => {
      // Exclude robot components
      if (part.category === 'motor' || part.category === 'sensor') {
        return false;
      }

      // Exclude parts near the robot start position (usually 0, 0)
      const distanceFromStart = Math.sqrt(
        part.position.x * part.position.x +
        part.position.z * part.position.z
      );
      if (distanceFromStart < 0.15) {
        return false; // Too close to robot start
      }

      // Include parts that are on the mat surface
      if (part.position.y > 0.3) {
        return false; // Too high, likely not a ground-level mission
      }

      return true;
    });
  }

  /**
   * Convert a part instance to a mission element
   */
  private partToMissionElement(part: PartInstance): MissionElement {
    // Look up part definition
    const partDef = MISSION_PART_DEFINITIONS[part.partId] || MISSION_PART_DEFINITIONS['default'];

    // Create visual mesh placeholder
    const mesh = this.createMeshForPart(part);

    // Create mission element
    const element: MissionElement = {
      id: part.id,
      name: `Mission_${part.partId}_${part.id.substring(0, 8)}`,
      type: partDef.type,
      mesh,
      position: part.position.clone(),
      state: 'inactive',
      points: partDef.points,
      triggers: {
        onCollision: (robot: RobotInstance) => {
          console.log(`🎯 ${element.name} triggered by robot collision`);
        },
        onPressure: partDef.triggerType === 'pressure' ? (force: number) => {
          if (force > 0.1) {
            console.log(`🎯 ${element.name} triggered by pressure: ${force.toFixed(2)}N`);
          }
        } : undefined,
        onProximity: partDef.triggerType === 'proximity' ? (distance: number) => {
          if (distance < 0.05) {
            console.log(`🎯 ${element.name} triggered by proximity: ${(distance * 100).toFixed(1)}cm`);
          }
        } : undefined
      }
    };

    // Create physics body if element is movable
    if (partDef.isMovable) {
      element.physicsBody = this.createPhysicsBody(part, partDef.isMovable);
    }

    return element;
  }

  /**
   * Create a visual mesh for a part
   */
  private createMeshForPart(part: PartInstance): THREE.Mesh {
    // Create simple geometry based on assumed part size
    const geometry = new THREE.BoxGeometry(0.04, 0.04, 0.04);
    const material = new THREE.MeshStandardMaterial({
      color: this.colorCodeToHex(part.color),
      roughness: 0.6,
      metalness: 0.1
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(part.position);
    mesh.quaternion.copy(part.rotation);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = {
      partId: part.partId,
      isMissionElement: true
    };

    return mesh;
  }

  /**
   * Create physics body for a mission element
   */
  private createPhysicsBody(part: PartInstance, isMovable: boolean): CANNON.Body {
    const body = new CANNON.Body({
      mass: isMovable ? 0.05 : 0, // 0 = static
      position: new CANNON.Vec3(
        part.position.x,
        part.position.y,
        part.position.z
      ),
      material: new CANNON.Material({
        friction: 0.5,
        restitution: 0.2
      })
    });

    // Add collision shape
    const shape = new CANNON.Box(new CANNON.Vec3(0.02, 0.02, 0.02));
    body.addShape(shape);

    // Set userData for collision identification
    body.userData = {
      isMissionElement: true,
      elementId: part.id,
      partId: part.partId
    };

    return body;
  }

  /**
   * Convert LDraw color code to hex
   */
  private colorCodeToHex(colorCode: number): number {
    const colors: Record<number, number> = {
      0: 0x05131D,   // Black
      1: 0x0055BF,   // Blue
      2: 0x257A3E,   // Green
      4: 0xC91A09,   // Red
      14: 0xF2CD37,  // Yellow
      15: 0xFFFFFF,  // White
      25: 0xFFA531,  // Orange
      71: 0x8A928D,  // Light gray
      72: 0x6C6E68,  // Dark gray
    };
    return colors[colorCode] ?? 0x808080;
  }

  /**
   * Create sample mission elements for testing
   */
  static createSampleMission(): MissionElement[] {
    const elements: MissionElement[] = [];

    // Sample lever
    elements.push({
      id: 'sample-lever-1',
      name: 'Sample Lever',
      type: 'lever',
      mesh: new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.1, 0.02),
        new THREE.MeshStandardMaterial({ color: 0xff6600 })
      ),
      position: new THREE.Vector3(0.5, 0.05, 0.3),
      state: 'inactive',
      points: 20,
      triggers: {
        onCollision: () => console.log('Lever triggered!')
      }
    });

    // Sample button
    elements.push({
      id: 'sample-button-1',
      name: 'Sample Button',
      type: 'button',
      mesh: new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 0.02, 16),
        new THREE.MeshStandardMaterial({ color: 0xff0000 })
      ),
      position: new THREE.Vector3(-0.4, 0.01, 0.4),
      state: 'inactive',
      points: 10,
      triggers: {
        onCollision: () => console.log('Button pressed!')
      }
    });

    // Sample cargo
    elements.push({
      id: 'sample-cargo-1',
      name: 'Sample Cargo',
      type: 'cargo',
      mesh: new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.04, 0.04),
        new THREE.MeshStandardMaterial({ color: 0x9900ff })
      ),
      position: new THREE.Vector3(0.3, 0.02, -0.3),
      state: 'inactive',
      points: 15,
      triggers: {
        onCollision: () => console.log('Cargo picked up!')
      }
    });

    // Sample zone
    elements.push({
      id: 'sample-zone-1',
      name: 'Scoring Zone',
      type: 'zone',
      mesh: new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.01, 0.15),
        new THREE.MeshStandardMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.3 })
      ),
      position: new THREE.Vector3(-0.5, 0.005, -0.4),
      state: 'inactive',
      points: 30,
      triggers: {
        onCollision: () => console.log('Entered scoring zone!')
      }
    });

    return elements;
  }
}

export const missionLoader = new MissionLoader();
