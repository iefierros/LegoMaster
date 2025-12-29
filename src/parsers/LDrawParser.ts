import * as THREE from 'three';
import JSZip from 'jszip';
import type { LDrawCommand, PartInstance, ParsedModel } from '@/types';

/**
 * Parser for LDraw format files (.ldr, .mpd) and BrickLink Studio files (.io)
 * LDraw format specification: https://www.ldraw.org/article/218.html
 */
export class LDrawParser {
  private loadedParts: Map<string, THREE.Group> = new Map();
  private partCache: Map<string, PartInstance[]> = new Map();

  /**
   * Parse a .io file (ZIP archive from BrickLink Studio)
   */
  async parseStudioFile(file: File): Promise<ParsedModel> {
    try {
      const zip = await JSZip.loadAsync(file);

      // Studio .io files contain a main.ldr or model.ldr file
      const ldrFile = zip.file(/\.(ldr|mpd)$/i)[0];

      if (!ldrFile) {
        throw new Error('No LDR file found in Studio archive');
      }

      const ldrContent = await ldrFile.async('text');
      return this.parseLDraw(ldrContent, file.name.replace('.io', ''));

    } catch (error) {
      console.error('Error parsing Studio file:', error);
      throw new Error(`Failed to parse Studio file: ${error}`);
    }
  }

  /**
   * Parse LDraw format text content
   */
  parseLDraw(content: string, modelName: string = 'Untitled'): ParsedModel {
    const lines = content.split('\n');
    const parts: PartInstance[] = [];
    let author: string | undefined;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines
      if (!line) continue;

      const tokens = line.split(/\s+/);
      const lineType = parseInt(tokens[0]);

      switch (lineType) {
        case 0: // Comment/Meta command
          this.parseMetaCommand(tokens, (key, value) => {
            if (key === 'Author') author = value;
          });
          break;

        case 1: // Part/Subfile reference
          const partInstance = this.parsePartLine(tokens, i);
          if (partInstance) {
            parts.push(partInstance);
          }
          break;

        // Lines 2-5 are primitive geometry (triangles, quads) - we skip for now
        // These would be used for custom pieces or detailed rendering
        case 2:
        case 3:
        case 4:
        case 5:
          break;
      }
    }

    return {
      parts,
      metadata: {
        name: modelName,
        author,
        partCount: parts.length
      }
    };
  }

  /**
   * Parse line type 1: Part reference
   * Format: 1 <color> <x> <y> <z> <a> <b> <c> <d> <e> <f> <g> <h> <i> <partname>
   */
  private parsePartLine(tokens: string[], lineIndex: number): PartInstance | null {
    if (tokens.length < 15) {
      console.warn(`Invalid part line at ${lineIndex}: insufficient tokens`);
      return null;
    }

    try {
      const color = parseInt(tokens[1]);

      // Position (LDraw units - 1 LDU = 0.4mm)
      const position = new THREE.Vector3(
        parseFloat(tokens[2]),
        parseFloat(tokens[3]),
        parseFloat(tokens[4])
      );

      // Rotation matrix (3x3)
      const m = [
        parseFloat(tokens[5]),  parseFloat(tokens[6]),  parseFloat(tokens[7]),
        parseFloat(tokens[8]),  parseFloat(tokens[9]),  parseFloat(tokens[10]),
        parseFloat(tokens[11]), parseFloat(tokens[12]), parseFloat(tokens[13])
      ];

      const rotationMatrix = new THREE.Matrix4().set(
        m[0], m[1], m[2], 0,
        m[3], m[4], m[5], 0,
        m[6], m[7], m[8], 0,
        0, 0, 0, 1
      );

      const rotation = new THREE.Quaternion().setFromRotationMatrix(rotationMatrix);

      // Part name/ID
      const partId = tokens.slice(14).join(' ').replace('.dat', '').trim();

      return {
        id: `${partId}_${lineIndex}`,
        partId: this.normalizePartId(partId),
        position: this.convertLDrawToThreeJS(position),
        rotation,
        color
      };

    } catch (error) {
      console.error(`Error parsing part line ${lineIndex}:`, error);
      return null;
    }
  }

  /**
   * Parse meta commands (line type 0)
   */
  private parseMetaCommand(
    tokens: string[],
    callback: (key: string, value: string) => void
  ): void {
    if (tokens.length < 2) return;

    const command = tokens[1].toUpperCase();

    switch (command) {
      case 'AUTHOR:':
        callback('Author', tokens.slice(2).join(' '));
        break;
      case 'NAME:':
        callback('Name', tokens.slice(2).join(' '));
        break;
      case 'FILE':
        callback('File', tokens.slice(2).join(' '));
        break;
    }
  }

  /**
   * Convert LDraw coordinate system to Three.js
   * LDraw: +X right, +Y down, +Z forward
   * Three.js: +X right, +Y up, +Z toward viewer
   */
  private convertLDrawToThreeJS(ldrawPos: THREE.Vector3): THREE.Vector3 {
    // Convert LDU to meters (1 LDU = 0.4mm = 0.0004m)
    const scale = 0.0004;

    return new THREE.Vector3(
      ldrawPos.x * scale,
      -ldrawPos.y * scale,  // Flip Y axis
      -ldrawPos.z * scale   // Flip Z axis
    );
  }

  /**
   * Normalize part IDs (remove extensions, handle aliases)
   */
  private normalizePartId(partId: string): string {
    return partId
      .toLowerCase()
      .replace(/\.dat$/, '')
      .replace(/^parts\//, '')
      .replace(/^p\//, '')
      .trim();
  }

  /**
   * Estimate mass of a part based on its ID and category
   * This is a simplified approach - real implementation would use a parts database
   */
  estimatePartMass(partId: string, category?: string): number {
    // Default masses in grams
    const massTable: Record<string, number> = {
      // Motors
      '54696': 120, // SPIKE Large Motor
      '54675': 80,  // SPIKE Medium Motor
      '99499': 76,  // EV3 Large Motor
      '95658': 36,  // EV3 Medium Motor

      // Wheels
      '56908': 15,
      '44309': 25,
      '87697': 8,

      // Sensors
      '37308': 25,
      '37316': 30,
      '95650': 20,
      '95652': 28
    };

    if (massTable[partId]) {
      return massTable[partId];
    }

    // Fallback estimates based on category
    switch (category) {
      case 'motor': return 80;
      case 'wheel': return 15;
      case 'sensor': return 25;
      case 'beam':
        // Estimate based on beam length (if part ID contains length)
        const match = partId.match(/(\d+)m/i);
        if (match) {
          const length = parseInt(match[1]);
          return length * 0.5; // ~0.5g per LDU length
        }
        return 5;
      default:
        return 2; // Generic small part
    }
  }

  /**
   * Create a simple bounding box geometry for a part
   * In production, this would load actual LDraw geometry
   */
  createPartGeometry(partId: string, category?: string): THREE.BufferGeometry {
    // Simplified geometries for common parts
    switch (category) {
      case 'motor':
        return new THREE.BoxGeometry(0.032, 0.032, 0.048); // Typical motor size

      case 'wheel':
        return new THREE.CylinderGeometry(0.028, 0.028, 0.012, 16);

      case 'sensor':
        return new THREE.BoxGeometry(0.024, 0.024, 0.020);

      default:
        // Generic beam/brick
        return new THREE.BoxGeometry(0.008, 0.0096, 0.008);
    }
  }

  /**
   * Batch convert multiple part instances into optimized meshes
   * Groups identical parts for instancing
   */
  optimizePartInstances(parts: PartInstance[]): Map<string, THREE.InstancedMesh> {
    const instanceGroups = new Map<string, PartInstance[]>();

    // Group parts by partId
    parts.forEach(part => {
      const key = `${part.partId}_${part.color}`;
      if (!instanceGroups.has(key)) {
        instanceGroups.set(key, []);
      }
      instanceGroups.get(key)!.push(part);
    });

    const instancedMeshes = new Map<string, THREE.InstancedMesh>();

    // Create InstancedMesh for each group
    instanceGroups.forEach((instances, key) => {
      if (instances.length === 0) return;

      const firstPart = instances[0];
      const geometry = this.createPartGeometry(firstPart.partId, firstPart.category);
      const material = new THREE.MeshStandardMaterial({
        color: this.ldrawColorToHex(firstPart.color),
        roughness: 0.7,
        metalness: 0.1
      });

      const instancedMesh = new THREE.InstancedMesh(
        geometry,
        material,
        instances.length
      );

      // Set transforms for each instance
      const matrix = new THREE.Matrix4();
      instances.forEach((part, i) => {
        matrix.compose(part.position, part.rotation, new THREE.Vector3(1, 1, 1));
        instancedMesh.setMatrixAt(i, matrix);
      });

      instancedMesh.instanceMatrix.needsUpdate = true;
      instancedMeshes.set(key, instancedMesh);
    });

    return instancedMeshes;
  }

  /**
   * Convert LDraw color code to Three.js hex color
   * Simplified version - full implementation would use LDraw color table
   */
  private ldrawColorToHex(colorCode: number): number {
    const colorTable: Record<number, number> = {
      0: 0x05131D,  // Black
      1: 0x0055BF,  // Blue
      2: 0x257A3E,  // Green
      4: 0xC91A09,  // Red
      14: 0xF2CD37, // Yellow
      15: 0xFFFFFF, // White
      71: 0x8A928D, // Light Gray
      72: 0x6C6E68, // Dark Gray
    };

    return colorTable[colorCode] ?? 0x808080; // Default gray
  }
}

// Export singleton instance
export const ldrawParser = new LDrawParser();
