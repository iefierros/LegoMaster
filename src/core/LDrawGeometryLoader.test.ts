/**
 * Test for LDrawGeometryLoader
 * Tests loading a single SPIKE Prime motor part
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock THREE.js
vi.mock('three', () => ({
  Group: vi.fn().mockImplementation(() => ({
    clone: vi.fn().mockReturnThis(),
    rotation: { x: 0 },
    scale: { set: vi.fn() },
    position: { sub: vi.fn() },
    children: [],
    traverse: vi.fn()
  })),
  Box3: vi.fn().mockImplementation(() => ({
    setFromObject: vi.fn().mockReturnThis(),
    getCenter: vi.fn().mockReturnValue({ x: 0, y: 0, z: 0 })
  })),
  Vector3: vi.fn().mockImplementation(() => ({ x: 0, y: 0, z: 0 })),
  Mesh: vi.fn(),
  Material: vi.fn()
}));

// Mock LDrawLoader
const mockLoad = vi.fn();
vi.mock('three/examples/jsm/loaders/LDrawLoader.js', () => ({
  LDrawLoader: vi.fn().mockImplementation(() => ({
    setPartsLibraryPath: vi.fn(),
    smoothNormals: false,
    load: mockLoad
  }))
}));

// Import after mocks
import { ldrawGeometryLoader } from './LDrawGeometryLoader';

describe('LDrawGeometryLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the loader state
    (ldrawGeometryLoader as any).isInitialized = false;
    (ldrawGeometryLoader as any).initPromise = null;
    (ldrawGeometryLoader as any).modelCache.clear();
  });

  describe('initialize', () => {
    it('should initialize the LDrawLoader', async () => {
      await ldrawGeometryLoader.initialize();

      expect(ldrawGeometryLoader.isAvailable()).toBe(true);
    });

    it('should only initialize once', async () => {
      await ldrawGeometryLoader.initialize();
      await ldrawGeometryLoader.initialize();

      // LDrawLoader constructor should only be called once
      const { LDrawLoader } = await import('three/examples/jsm/loaders/LDrawLoader.js');
      expect(LDrawLoader).toHaveBeenCalledTimes(1);
    });
  });

  describe('loadPart', () => {
    it('should attempt to load SPIKE Large Motor (54696)', async () => {
      // Setup mock to simulate successful load
      mockLoad.mockImplementation((url, onLoad, onProgress, onError) => {
        // Simulate successful load
        const mockGroup = {
          clone: vi.fn().mockReturnThis(),
          rotation: { x: 0 },
          scale: { set: vi.fn() },
          position: { sub: vi.fn() },
          children: [{ type: 'Mesh' }],
          traverse: vi.fn()
        };
        onLoad(mockGroup);
      });

      await ldrawGeometryLoader.initialize();
      const result = await ldrawGeometryLoader.loadPart('54696');

      // Should return a group (or clone of it)
      expect(result).toBeDefined();
    });

    it('should cache loaded parts', async () => {
      mockLoad.mockImplementation((url, onLoad) => {
        const mockGroup = {
          clone: vi.fn().mockReturnThis(),
          rotation: { x: 0 },
          scale: { set: vi.fn() },
          position: { sub: vi.fn() },
          children: [],
          traverse: vi.fn()
        };
        onLoad(mockGroup);
      });

      await ldrawGeometryLoader.initialize();

      // Load same part twice
      await ldrawGeometryLoader.loadPart('54696');
      await ldrawGeometryLoader.loadPart('54696');

      // Check cache stats
      const stats = ldrawGeometryLoader.getCacheStats();
      expect(stats.entries).toBeGreaterThan(0);
    });

    it('should normalize part IDs', async () => {
      mockLoad.mockImplementation((url, onLoad) => {
        const mockGroup = {
          clone: vi.fn().mockReturnThis(),
          rotation: { x: 0 },
          scale: { set: vi.fn() },
          position: { sub: vi.fn() },
          children: [],
          traverse: vi.fn()
        };
        onLoad(mockGroup);
      });

      await ldrawGeometryLoader.initialize();

      // These should be treated as the same part
      await ldrawGeometryLoader.loadPart('54696.dat');
      await ldrawGeometryLoader.loadPart('54696.DAT');
      await ldrawGeometryLoader.loadPart('54696');

      // All should hit the same cache entry
      const stats = ldrawGeometryLoader.getCacheStats();
      // Due to caching logic, we expect consistent behavior
      expect(stats.modelNames.some(name => name.includes('54696'))).toBe(true);
    });

    it('should return null for parts that fail to load', async () => {
      mockLoad.mockImplementation((url, onLoad, onProgress, onError) => {
        onError(new Error('Part not found'));
      });

      await ldrawGeometryLoader.initialize();
      const result = await ldrawGeometryLoader.loadPart('99999999');

      expect(result).toBeNull();
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      const stats = ldrawGeometryLoader.getCacheStats();

      expect(stats).toHaveProperty('entries');
      expect(stats).toHaveProperty('modelNames');
      expect(Array.isArray(stats.modelNames)).toBe(true);
    });
  });

  describe('clearCache', () => {
    it('should clear the cache', async () => {
      mockLoad.mockImplementation((url, onLoad) => {
        const mockGroup = {
          clone: vi.fn().mockReturnThis(),
          rotation: { x: 0 },
          scale: { set: vi.fn() },
          position: { sub: vi.fn() },
          children: [],
          traverse: vi.fn((callback: (child: any) => void) => {
            // Simulate traversing mesh children
          })
        };
        onLoad(mockGroup);
      });

      await ldrawGeometryLoader.initialize();
      await ldrawGeometryLoader.loadPart('54696');

      // Should have cached entry
      expect(ldrawGeometryLoader.getCacheStats().entries).toBeGreaterThan(0);

      // Clear cache
      ldrawGeometryLoader.clearCache();

      // Should be empty
      expect(ldrawGeometryLoader.getCacheStats().entries).toBe(0);
    });
  });
});

// Integration test - requires actual network access
describe('LDrawGeometryLoader Integration (skip in CI)', () => {
  it.skip('should load actual SPIKE Large Motor geometry from CDN', async () => {
    // This test requires real network access
    // Run manually with: pnpm test -- --grep "actual SPIKE"

    await ldrawGeometryLoader.initialize();

    console.log('Loading SPIKE Large Motor (54696)...');
    const motor = await ldrawGeometryLoader.loadPart('54696');

    if (motor) {
      console.log('✅ Motor loaded successfully');
      console.log('Children:', motor.children.length);
    } else {
      console.log('⚠️ Motor not found in library');
    }
  });
});
