import * as THREE from 'three';
import JSZip from 'jszip';
import type { LDrawCommand, PartInstance, ParsedModel } from '@/types';

/**
 * Parser for LDraw format files (.ldr, .mpd) and BrickLink Studio files (.io)
 * LDraw format specification: https://www.ldraw.org/article/218.html
 *
 * Supports recursive submodel resolution for MPD files (used by Studio 2.0).
 */
export class LDrawParser {
  private loadedParts: Map<string, THREE.Group> = new Map();
  private partCache: Map<string, PartInstance[]> = new Map();

  /**
   * Parse a .io file (ZIP archive from BrickLink Studio)
   */
  async parseStudioFile(file: File): Promise<ParsedModel> {
    console.log('📦 Starting to parse Studio file:', file.name, 'Size:', file.size, 'bytes');

    try {
      const zip = await JSZip.loadAsync(file);
      console.log('✅ ZIP loaded successfully');

      // List all files in the ZIP for debugging
      const files = Object.keys(zip.files);
      console.log('📁 Files in ZIP:', files);

      // Studio .io files contain a main.ldr or model.ldr file
      const ldrFiles = zip.file(/\.(ldr|mpd)$/i);
      console.log('🔍 Found LDR files:', ldrFiles.map(f => f.name));

      if (ldrFiles.length === 0) {
        throw new Error('No LDR file found in Studio archive. Files found: ' + files.join(', '));
      }

      const ldrFile = ldrFiles[0];
      console.log('📄 Using LDR file:', ldrFile.name);

      const ldrContent = await ldrFile.async('text');
      console.log('✅ LDR content loaded, length:', ldrContent.length);

      const result = this.parseLDraw(ldrContent, file.name.replace('.io', ''));
      console.log('✅ Parsing complete:', {
        partCount: result.parts.length,
        name: result.metadata.name
      });

      return result;

    } catch (error) {
      console.error('❌ Error parsing Studio file:', error);
      throw new Error(`Failed to parse Studio file: ${error}`);
    }
  }

  /**
   * Parse LDraw format text content
   * Handles both simple .ldr files and multi-part .mpd files from Studio.
   * Recursively resolves submodels so all leaf parts are returned with correct transforms.
   */
  parseLDraw(content: string, modelName: string = 'Untitled'): ParsedModel {
    console.log('📝 Parsing LDraw content for model:', modelName);

    const lines = content.split('\n');
    let author: string | undefined;

    // ── Step 1: Split the MPD into submodel sections ─────────────────
    // Map<normalizedName, rawLines[]>
    const submodelLines = new Map<string, string[]>();
    let currentSubmodel: string | null = null;
    let mainModelName: string | null = null;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('0 FILE ')) {
        const fileName = trimmed.substring(7).trim();
        const normalized = fileName.toLowerCase();
        currentSubmodel = normalized;
        if (mainModelName === null) {
          mainModelName = normalized; // First FILE directive = main model
        }
        if (!submodelLines.has(normalized)) {
          submodelLines.set(normalized, []);
        }
        continue;
      }

      // Also register without extension as alias
      if (currentSubmodel !== null) {
        submodelLines.get(currentSubmodel)!.push(trimmed);
      } else {
        // Lines before any FILE directive belong to the implicit main model
        if (!submodelLines.has('__main__')) {
          submodelLines.set('__main__', []);
        }
        submodelLines.get('__main__')!.push(trimmed);
      }
    }

    // If no FILE directives found, the whole content is the main model
    if (mainModelName === null) {
      mainModelName = '__main__';
      if (!submodelLines.has('__main__')) {
        submodelLines.set('__main__', lines.map(l => l.trim()));
      }
    }

    // Build a quick lookup that also checks without extension
    const resolveSubmodel = (name: string): string[] | null => {
      const n = name.toLowerCase();
      if (submodelLines.has(n)) return submodelLines.get(n)!;
      const noExt = n.replace(/\.(ldr|dat|mpd)$/i, '');
      for (const [key, val] of submodelLines) {
        if (key === noExt || key.replace(/\.(ldr|dat|mpd)$/i, '') === noExt) {
          return val;
        }
      }
      return null;
    };

    console.log(`📄 Found ${submodelLines.size} submodel sections, main="${mainModelName}"`);
    for (const [name, slines] of submodelLines) {
      console.log(`   ↳ "${name}" : ${slines.length} lines`);
    }

    // ── Step 2: Recursively resolve a submodel into leaf parts ────────
    // parentMatrix is a 4x4 that transforms from the submodel's local space
    // into the world (Three.js meters, Y-up) space.
    const resolvedParts: PartInstance[] = [];
    let partIndex = 0;

    const resolveModel = (
      modelLines: string[],
      parentMatrix: THREE.Matrix4,
      parentColor: number,
      depth: number
    ) => {
      if (depth > 20) {
        console.warn('⚠️ Max submodel nesting depth reached');
        return;
      }

      for (const line of modelLines) {
        if (!line) continue;
        const tokens = line.split(/\s+/);
        const lineType = parseInt(tokens[0]);

        if (lineType === 0) {
          // Meta command – extract author
          if (tokens[1]?.toUpperCase() === 'AUTHOR') {
            author = tokens.slice(2).join(' ');
          }
          continue;
        }

        if (lineType !== 1) continue; // Only process type 1 (part/subfile references)
        if (tokens.length < 15) continue;

        // Parse the type 1 line fields (all in LDraw units)
        let color = parseInt(tokens[1]);
        if (color === 16) color = parentColor; // Color 16 = inherit from parent

        const lx = parseFloat(tokens[2]);
        const ly = parseFloat(tokens[3]);
        const lz = parseFloat(tokens[4]);

        const a = parseFloat(tokens[5]),  b = parseFloat(tokens[6]),  c = parseFloat(tokens[7]);
        const d = parseFloat(tokens[8]),  e = parseFloat(tokens[9]),  f = parseFloat(tokens[10]);
        const g = parseFloat(tokens[11]), h = parseFloat(tokens[12]), k = parseFloat(tokens[13]);

        const refName = tokens.slice(14).join(' ').trim();

        // Build local transform matrix (still in LDraw units, Y-down, Z-forward)
        // LDraw type 1 format: position + 3x3 rotation matrix
        const localMatrix = new THREE.Matrix4().set(
          a, b, c, lx,
          d, e, f, ly,
          g, h, k, lz,
          0, 0, 0, 1
        );

        // Compose with parent
        const worldMatrix = new THREE.Matrix4().multiplyMatrices(parentMatrix, localMatrix);

        // Check if this references a submodel we have
        const childLines = resolveSubmodel(refName);
        if (childLines) {
          // Recurse into submodel
          resolveModel(childLines, worldMatrix, color, depth + 1);
        } else {
          // This is a leaf part reference (.dat file)
          // Extract world position and rotation, converting from LDraw to Three.js
          const ldrawPosition = new THREE.Vector3();
          const ldrawQuaternion = new THREE.Quaternion();
          const ldrawScale = new THREE.Vector3();
          worldMatrix.decompose(ldrawPosition, ldrawQuaternion, ldrawScale);

          // Convert LDraw coords to Three.js meters
          const scale = 0.0004; // 1 LDU = 0.4mm
          const position = new THREE.Vector3(
            ldrawPosition.x * scale,
            -ldrawPosition.y * scale,  // Flip Y
            -ldrawPosition.z * scale   // Flip Z
          );

          // Convert LDraw rotation to Three.js (flip Y and Z axes)
          // Apply the axis flip as a pre-rotation
          const flipMatrix = new THREE.Matrix4().makeScale(1, -1, -1);
          const rotMatrix = new THREE.Matrix4().extractRotation(worldMatrix);
          const threeRotMatrix = new THREE.Matrix4().multiplyMatrices(flipMatrix, rotMatrix);
          // Re-flip to get proper handedness
          threeRotMatrix.multiplyMatrices(threeRotMatrix, flipMatrix);
          const rotation = new THREE.Quaternion().setFromRotationMatrix(threeRotMatrix);

          const normalizedId = this.normalizePartId(refName);

          resolvedParts.push({
            id: `${normalizedId}_${partIndex++}`,
            partId: normalizedId,
            position,
            rotation,
            color
          });
        }
      }
    };

    // ── Step 3: Start resolution from the main model ─────────────────
    const mainLines = submodelLines.get(mainModelName) ?? submodelLines.get('__main__') ?? [];
    const identityMatrix = new THREE.Matrix4(); // identity = root transform
    resolveModel(mainLines, identityMatrix, 16, 0);

    console.log('📊 Parse complete:', {
      totalLines: lines.length,
      submodels: submodelLines.size,
      resolvedParts: resolvedParts.length
    });

    if (resolvedParts.length === 0) {
      console.warn('⚠️ No parts found in LDraw file!');
      console.log('💡 Debug: mainModelName =', mainModelName, ', mainLines =', mainLines.length);
    }

    return {
      parts: resolvedParts,
      metadata: {
        name: modelName,
        author,
        partCount: resolvedParts.length
      }
    };
  }

  /**
   * Normalize part IDs (remove extensions, handle aliases, extract numeric IDs)
   */
  private normalizePartId(partId: string): string {
    let normalized = partId
      .toLowerCase()
      .replace(/\.dat$/i, '')
      .replace(/\.ldr$/i, '')
      .replace(/^parts\//i, '')
      .replace(/^p\//i, '')
      .replace(/^s\//i, '')  // Studio subparts
      .trim();

    // Handle Studio-specific formats like "54696.dat" or "parts/54696.dat"
    // Extract just the numeric part ID if present
    const numericMatch = normalized.match(/(\d{4,6}[a-z]?\d*)$/);
    if (numericMatch) {
      normalized = numericMatch[1];
    }

    // Handle color suffix patterns like "54696c01" -> "54696"
    // But keep variant suffixes like "3001a" (brick variant)
    const colorSuffixMatch = normalized.match(/^(\d+)c\d+$/);
    if (colorSuffixMatch) {
      normalized = colorSuffixMatch[1];
    }

    return normalized;
  }

  /**
   * Estimate mass of a part based on its ID and category
   */
  estimatePartMass(partId: string, category?: string): number {
    const massTable: Record<string, number> = {
      '54696': 120, '54675': 80, '99499': 76, '95658': 36,
      '56908': 15, '44309': 25, '87697': 8,
      '37308': 25, '37316': 30, '95650': 20, '95652': 28
    };

    if (massTable[partId]) return massTable[partId];

    switch (category) {
      case 'motor': return 80;
      case 'wheel': return 15;
      case 'sensor': return 25;
      case 'beam': {
        const match = partId.match(/(\d+)m/i);
        return match ? parseInt(match[1]) * 0.5 : 5;
      }
      default: return 2;
    }
  }

  /**
   * Create a simple bounding box geometry for a part
   */
  createPartGeometry(partId: string, category?: string): THREE.BufferGeometry {
    switch (category) {
      case 'motor':
        return new THREE.BoxGeometry(0.032, 0.032, 0.048);
      case 'wheel':
        return new THREE.CylinderGeometry(0.028, 0.028, 0.012, 16);
      case 'sensor':
        return new THREE.BoxGeometry(0.024, 0.024, 0.020);
      default:
        return new THREE.BoxGeometry(0.008, 0.0096, 0.008);
    }
  }

  /**
   * Batch convert multiple part instances into optimized meshes
   */
  optimizePartInstances(parts: PartInstance[]): Map<string, THREE.InstancedMesh> {
    const instanceGroups = new Map<string, PartInstance[]>();

    parts.forEach(part => {
      const key = `${part.partId}_${part.color}`;
      if (!instanceGroups.has(key)) {
        instanceGroups.set(key, []);
      }
      instanceGroups.get(key)!.push(part);
    });

    const instancedMeshes = new Map<string, THREE.InstancedMesh>();

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
   */
  private ldrawColorToHex(colorCode: number): number {
    const colorTable: Record<number, number> = {
      0: 0x05131D,  // Black
      1: 0x0055BF,  // Blue
      2: 0x257A3E,  // Green
      3: 0x00838F,  // Dark Turquoise
      4: 0xC91A09,  // Red
      5: 0xC870A0,  // Dark Pink
      6: 0x583927,  // Brown
      7: 0x9BA19D,  // Light Gray
      8: 0x6D6E5C,  // Dark Gray
      9: 0xB4D2E3,  // Light Blue
      10: 0x4B9F4A, // Bright Green
      11: 0x55A5AF, // Light Turquoise
      12: 0xF2705E, // Salmon
      13: 0xFC97AC, // Pink
      14: 0xF2CD37, // Yellow
      15: 0xFFFFFF, // White
      17: 0xC2DAB8, // Light Green
      18: 0xFBE696, // Light Yellow
      19: 0xE4CD9E, // Tan
      20: 0xC9CAE2, // Light Violet
      22: 0x81007B, // Purple
      25: 0xFE8A18, // Orange
      26: 0x923978, // Magenta
      27: 0xBBE90B, // Lime
      28: 0x958A73, // Dark Tan
      29: 0xE4ADC8, // Bright Pink
      68: 0xF3CF9B, // Very Light Orange
      69: 0xCD6298, // Bright Reddish Lilac
      70: 0x3E3C28, // Reddish Brown
      71: 0xA0A5A9, // Light Bluish Gray
      72: 0x6C6E68, // Dark Bluish Gray
      73: 0x0055BF, // Medium Blue
      74: 0x73DCA1, // Medium Green
      77: 0xFECCCF, // Light Pink
      78: 0xF6D7B3, // Light Nougat
      84: 0xCC702A, // Medium Dark Flesh
      85: 0x3F3691, // Dark Purple
      86: 0x7C503A, // Dark Flesh
      89: 0x4C61DB, // Blue Violet
      92: 0xD09168, // Flesh / Nougat
      100: 0xFEBABD,// Light Salmon
      110: 0x4354A3,// Violet
      112: 0x6874CA,// Medium Violet
      115: 0xC7D23C,// Medium Lime
      118: 0xB3D7D1,// Aqua
      120: 0xD9E4A7,// Light Lime
      125: 0xF9BA61,// Light Orange
      150: 0x767B6A,// Metallic Dark Gray
      151: 0xE6E3DA,// Metallic Silver (flat)
      179: 0x635F52,// Flat Dark Gold
      183: 0xF2F3F2,// Metallic White
      191: 0xF8BB3D,// Flame Yellowish Orange
      212: 0x86C1E1,// Bright Light Blue
      216: 0xB31004,// Dark Red
      226: 0xFFF03A,// Bright Light Yellow
      232: 0x56BED6,// Sky Blue
      272: 0x0D325B,// Dark Blue
      288: 0x184632,// Dark Green
      297: 0xAA7F2E,// Pearl Gold
      308: 0x352100,// Dark Brown
      320: 0xC91A09,// Dark Red
      321: 0x078BC9,// Dark Azure
      322: 0x36AEBF,// Medium Azure
      323: 0xADC3C0,// Light Aqua
      326: 0xDEEA55,// Spring Yellowish Green
      330: 0xF5C189,// Olive Green
      366: 0xFA9C1C,// Earth Orange
      373: 0x845E84,// Sand Purple
      378: 0xA0BCAC,// Sand Green
      379: 0x6074A1,// Sand Blue
      450: 0xB67B50,// Fabuland Brown
      462: 0xFFA70B,// Medium Orange
      484: 0xA95500,// Dark Orange
      503: 0xE6E3DA,// Very Light Gray
    };

    return colorTable[colorCode] ?? 0x808080;
  }
}

// Export singleton instance
export const ldrawParser = new LDrawParser();
