import { useRef } from 'react';
import { usePlane, useBox } from '@react-three/cannon';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

/**
 * FLL Competition Mat/Track Component
 * Renders the playing field with physics
 */
export function FLLTrack() {
  // FLL Mat dimensions: 2.4m x 1.2m (approximately 8ft x 4ft)
  const MAT_WIDTH = 2.4;
  const MAT_HEIGHT = 1.2;

  // Physics ground plane
  const [ref] = usePlane<THREE.Mesh>(() => ({
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, 0, 0],
    material: {
      friction: 0.9,
      restitution: 0.1
    },
    userData: { isTrack: true }
  }));

  // For now, we'll use a placeholder texture
  // In production, this would load the actual FLL mat texture
  const matMesh = useRef<THREE.Mesh>(null!);

  return (
    <group>
      {/* Ground Plane with Physics */}
      <mesh ref={ref} receiveShadow userData={{ isTrack: true }}>
        <planeGeometry args={[MAT_WIDTH, MAT_HEIGHT]} />
        <meshStandardMaterial
          color="#1a1a1a"
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Mat Visual (with texture) */}
      <mesh
        ref={matMesh}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.001, 0]}
        receiveShadow
      >
        <planeGeometry args={[MAT_WIDTH, MAT_HEIGHT]} />
        <meshStandardMaterial
          color="#ffffff"
          roughness={0.9}
        >
          {/* Add grid lines for reference */}
          <canvasTexture
            attach="map"
            image={createMatTexture(MAT_WIDTH * 200, MAT_HEIGHT * 200)}
          />
        </meshStandardMaterial>
      </mesh>

      {/* Border Walls */}
      <TrackBorders width={MAT_WIDTH} height={MAT_HEIGHT} />

      {/* Mission Elements (example - would be loaded from track definition) */}
      <MissionElements />
    </group>
  );
}

/**
 * Create a canvas texture for the mat
 */
function createMatTexture(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d')!;

  // White background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Draw grid lines (20cm squares)
  ctx.strokeStyle = '#CCCCCC';
  ctx.lineWidth = 1;

  const gridSize = 40; // pixels per 20cm
  for (let x = 0; x <= width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  for (let y = 0; y <= height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Draw some example lines/zones
  // Black line in the middle (for line following)
  ctx.fillStyle = '#000000';
  ctx.fillRect(width / 2 - 10, 0, 20, height);

  // Color zones (example)
  ctx.fillStyle = '#FF0000';
  ctx.fillRect(100, 100, 80, 80);

  ctx.fillStyle = '#0000FF';
  ctx.fillRect(width - 180, height - 180, 80, 80);

  ctx.fillStyle = '#00FF00';
  ctx.fillRect(width / 2 - 40, height - 180, 80, 80);

  return canvas;
}

/**
 * Track border walls
 */
function TrackBorders({ width, height }: { width: number; height: number }) {
  const wallHeight = 0.1;
  const wallThickness = 0.02;

  return (
    <group>
      {/* North wall */}
      <Wall
        position={[0, wallHeight / 2, -height / 2]}
        args={[width, wallHeight, wallThickness]}
      />

      {/* South wall */}
      <Wall
        position={[0, wallHeight / 2, height / 2]}
        args={[width, wallHeight, wallThickness]}
      />

      {/* East wall */}
      <Wall
        position={[width / 2, wallHeight / 2, 0]}
        args={[wallThickness, wallHeight, height]}
      />

      {/* West wall */}
      <Wall
        position={[-width / 2, wallHeight / 2, 0]}
        args={[wallThickness, wallHeight, height]}
      />
    </group>
  );
}

function Wall({ position, args }: { position: [number, number, number]; args: [number, number, number] }) {
  const [ref] = useBox<THREE.Mesh>(() => ({
    type: 'Static',
    position,
    args,
    material: {
      friction: 0.3,
      restitution: 0.5
    }
  }));

  return (
    <mesh ref={ref} castShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial color="#2C2C2C" />
    </mesh>
  );
}

/**
 * Example mission elements
 */
function MissionElements() {
  return (
    <group>
      {/* Example: A lever/button mission element */}
      <MissionButton position={[0.5, 0.05, 0.3]} />

      {/* Example: A cargo piece */}
      <MissionCargo position={[-0.4, 0.03, 0.5]} />
    </group>
  );
}

function MissionButton({ position }: { position: [number, number, number] }) {
  const [ref] = useBox<THREE.Mesh>(() => ({
    type: 'Static',
    position,
    args: [0.08, 0.05, 0.08],
    userData: { isMissionElement: true, missionId: 'M01', points: 20 }
  }));

  return (
    <mesh ref={ref} castShadow>
      <boxGeometry args={[0.08, 0.05, 0.08]} />
      <meshStandardMaterial color="#FFCB05" metalness={0.3} roughness={0.4} />
    </mesh>
  );
}

function MissionCargo({ position }: { position: [number, number, number] }) {
  const [ref] = useBox<THREE.Mesh>(() => ({
    mass: 0.05, // 50 grams
    position,
    args: [0.04, 0.04, 0.04],
    userData: { isMissionElement: true, missionId: 'M02', points: 15 }
  }));

  return (
    <mesh ref={ref} castShadow>
      <boxGeometry args={[0.04, 0.04, 0.04]} />
      <meshStandardMaterial color="#D01012" />
    </mesh>
  );
}
