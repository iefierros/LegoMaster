/**
 * LDraw Geometry Loader
 * Uses Three.js LDrawLoader to load real LEGO part geometries
 * LDrawLoader is loaded dynamically to avoid blocking initial app render
 */

import * as THREE from 'three';

// Local LDraw parts library served by Vite dev server
const LDRAW_LIBRARY_URL = '/ldraw/';

export interface LoadProgress {
  loaded: number;
  total: number;
  message: string;
}

export type ProgressCallback = (progress: LoadProgress) => void;

class LDrawGeometryLoaderService {
  private loader: any = null;
  private modelCache: Map<string, THREE.Group> = new Map();
  private isInitialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the LDrawLoader with the parts library path
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        console.log('Initializing LDrawLoader...');

        // Dynamic import to avoid blocking initial app load
        const { LDrawLoader } = await import('three/examples/jsm/loaders/LDrawLoader.js');

        this.loader = new LDrawLoader();
        this.loader.setPartsLibraryPath(LDRAW_LIBRARY_URL);
        this.loader.smoothNormals = true;

        console.log('LDrawLoader initialized with library:', LDRAW_LIBRARY_URL);
        this.isInitialized = true;
      } catch (error) {
        console.error('Failed to initialize LDrawLoader:', error);
        this.initPromise = null;
        throw error;
      }
    })();

    return this.initPromise;
  }

  /**
   * Load a complete LDraw model from text content
   */
  async loadModelFromContent(
    ldrContent: string,
    modelName: string,
    onProgress?: ProgressCallback
  ): Promise<THREE.Group> {
    await this.initialize();

    if (!this.loader) {
      throw new Error('LDrawLoader not initialized');
    }

    // Check cache first
    const cacheKey = `model:${modelName}`;
    if (this.modelCache.has(cacheKey)) {
      return this.modelCache.get(cacheKey)!.clone();
    }

    onProgress?.({ loaded: 0, total: 100, message: 'Parsing model...' });

    return new Promise((resolve, reject) => {
      const blob = new Blob([ldrContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);

      this.loader!.load(
        url,
        (group: THREE.Group) => {
          URL.revokeObjectURL(url);

          group.rotation.x = Math.PI;
          const scale = 0.0004;
          group.scale.set(scale, scale, scale);

          const box = new THREE.Box3().setFromObject(group);
          const center = box.getCenter(new THREE.Vector3());
          group.position.sub(center);

          this.modelCache.set(cacheKey, group);
          onProgress?.({ loaded: 100, total: 100, message: 'Model loaded!' });
          resolve(group.clone());
        },
        (xhr: { loaded: number; total: number }) => {
          const percent = xhr.total > 0 ? Math.round((xhr.loaded / xhr.total) * 100) : 0;
          onProgress?.({
            loaded: percent,
            total: 100,
            message: `Loading parts... ${percent}%`
          });
        },
        (error: unknown) => {
          URL.revokeObjectURL(url);
          console.error('Error loading LDraw model:', error);
          reject(error);
        }
      );
    });
  }

  /**
   * Load a single LDraw part by its part ID
   */
  async loadPart(partId: string): Promise<THREE.Group | null> {
    await this.initialize();

    if (!this.loader) {
      throw new Error('LDrawLoader not initialized');
    }

    const normalizedId = partId.toLowerCase().replace(/\.dat$/, '');
    const cacheKey = `part:${normalizedId}`;

    if (this.modelCache.has(cacheKey)) {
      return this.modelCache.get(cacheKey)!.clone();
    }

    const partContent = `0 Single Part
1 16 0 0 0 1 0 0 0 1 0 0 0 1 ${normalizedId}.dat`;

    try {
      const group = await this.loadModelFromContent(partContent, `part_${normalizedId}`);
      this.modelCache.set(cacheKey, group);
      return group.clone();
    } catch (error) {
      console.warn(`Could not load part: ${partId}`, error);
      return null;
    }
  }

  /**
   * Preload common parts for FLL robots
   */
  async preloadCommonParts(): Promise<void> {
    const commonParts = [
      '54696',  // SPIKE Large Motor
      '54675',  // SPIKE Medium Motor
      '56908',  // Common Wheel
      '37308',  // SPIKE Color Sensor
      '37316',  // SPIKE Ultrasonic Sensor
    ];

    for (const partId of commonParts) {
      try {
        await this.loadPart(partId);
      } catch (error) {
        console.warn(`Could not preload part ${partId}:`, error);
      }
    }
  }

  /**
   * Load geometry data (vertices) for collision shape generation
   * Returns merged vertex positions from all meshes in the loaded part
   */
  async loadGeometryData(partId: string): Promise<Float32Array | null> {
    const group = await this.loadPart(partId);
    if (!group) return null;

    const positions: number[] = [];
    group.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry?.attributes?.position) {
        const pos = child.geometry.attributes.position;
        const matrix = child.matrixWorld;
        const v = new THREE.Vector3();
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i).applyMatrix4(matrix);
          positions.push(v.x, v.y, v.z);
        }
      }
    });

    // Dispose the group since we only need the raw data
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        } else if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        }
      }
    });

    return positions.length > 0 ? new Float32Array(positions) : null;
  }

  /**
   * Clear the geometry cache
   */
  clearCache(): void {
    this.modelCache.forEach((group) => {
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          } else if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          }
        }
      });
    });
    this.modelCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { entries: number; modelNames: string[] } {
    return {
      entries: this.modelCache.size,
      modelNames: Array.from(this.modelCache.keys())
    };
  }

  /**
   * Check if LDrawLoader is available
   */
  isAvailable(): boolean {
    return this.isInitialized && this.loader !== null;
  }
}

// Singleton instance
export const ldrawGeometryLoader = new LDrawGeometryLoaderService();
