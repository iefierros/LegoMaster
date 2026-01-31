import { useBox, usePlane } from '@react-three/cannon';
import * as THREE from 'three';

interface TrackWallsProps {
  matWidth?: number;
  matHeight?: number;
  wallHeight?: number;
  wallThickness?: number;
  showWalls?: boolean;
}

/**
 * Track boundary walls with physics collision
 * Creates invisible walls around the FLL mat perimeter
 */
export function TrackWalls({
  matWidth = 2.4,
  matHeight = 1.2,
  wallHeight = 0.15,
  wallThickness = 0.02,
  showWalls = false
}: TrackWallsProps) {

  // Ground plane with physics
  const [groundRef] = usePlane<THREE.Mesh>(() => ({
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, 0, 0],
    material: {
      friction: 0.8,
      restitution: 0.1
    },
    userData: {
      isTrack: true,
      type: 'ground'
    }
  }));

  // North wall (positive Z)
  const [northWallRef] = useBox<THREE.Mesh>(() => ({
    args: [matWidth + wallThickness * 2, wallHeight, wallThickness],
    position: [0, wallHeight / 2, matHeight / 2 + wallThickness / 2],
    mass: 0, // Static
    material: {
      friction: 0.5,
      restitution: 0.3
    },
    userData: {
      isTrack: true,
      isWall: true,
      type: 'wall',
      direction: 'north'
    }
  }));

  // South wall (negative Z)
  const [southWallRef] = useBox<THREE.Mesh>(() => ({
    args: [matWidth + wallThickness * 2, wallHeight, wallThickness],
    position: [0, wallHeight / 2, -matHeight / 2 - wallThickness / 2],
    mass: 0,
    material: {
      friction: 0.5,
      restitution: 0.3
    },
    userData: {
      isTrack: true,
      isWall: true,
      type: 'wall',
      direction: 'south'
    }
  }));

  // East wall (positive X)
  const [eastWallRef] = useBox<THREE.Mesh>(() => ({
    args: [wallThickness, wallHeight, matHeight],
    position: [matWidth / 2 + wallThickness / 2, wallHeight / 2, 0],
    mass: 0,
    material: {
      friction: 0.5,
      restitution: 0.3
    },
    userData: {
      isTrack: true,
      isWall: true,
      type: 'wall',
      direction: 'east'
    }
  }));

  // West wall (negative X)
  const [westWallRef] = useBox<THREE.Mesh>(() => ({
    args: [wallThickness, wallHeight, matHeight],
    position: [-matWidth / 2 - wallThickness / 2, wallHeight / 2, 0],
    mass: 0,
    material: {
      friction: 0.5,
      restitution: 0.3
    },
    userData: {
      isTrack: true,
      isWall: true,
      type: 'wall',
      direction: 'west'
    }
  }));

  const wallMaterial = showWalls ? (
    <meshStandardMaterial
      color="#666666"
      transparent
      opacity={0.3}
    />
  ) : (
    <meshBasicMaterial visible={false} />
  );

  return (
    <>
      {/* Ground plane - invisible but has physics */}
      <mesh ref={groundRef} receiveShadow userData={{ isTrack: true, type: 'ground' }}>
        <planeGeometry args={[matWidth * 2, matHeight * 2]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* North wall */}
      <mesh ref={northWallRef} userData={{ isTrack: true, isWall: true, type: 'wall' }}>
        <boxGeometry args={[matWidth + wallThickness * 2, wallHeight, wallThickness]} />
        {wallMaterial}
      </mesh>

      {/* South wall */}
      <mesh ref={southWallRef} userData={{ isTrack: true, isWall: true, type: 'wall' }}>
        <boxGeometry args={[matWidth + wallThickness * 2, wallHeight, wallThickness]} />
        {wallMaterial}
      </mesh>

      {/* East wall */}
      <mesh ref={eastWallRef} userData={{ isTrack: true, isWall: true, type: 'wall' }}>
        <boxGeometry args={[wallThickness, wallHeight, matHeight]} />
        {wallMaterial}
      </mesh>

      {/* West wall */}
      <mesh ref={westWallRef} userData={{ isTrack: true, isWall: true, type: 'wall' }}>
        <boxGeometry args={[wallThickness, wallHeight, matHeight]} />
        {wallMaterial}
      </mesh>
    </>
  );
}

/**
 * Optional corner posts for visual reference
 */
export function TrackCornerPosts({
  matWidth = 2.4,
  matHeight = 1.2,
  postHeight = 0.2,
  postRadius = 0.015
}: {
  matWidth?: number;
  matHeight?: number;
  postHeight?: number;
  postRadius?: number;
}) {
  const corners = [
    [matWidth / 2, matHeight / 2],   // NE
    [-matWidth / 2, matHeight / 2],  // NW
    [matWidth / 2, -matHeight / 2],  // SE
    [-matWidth / 2, -matHeight / 2], // SW
  ];

  return (
    <>
      {corners.map(([x, z], i) => (
        <mesh
          key={`corner-${i}`}
          position={[x, postHeight / 2, z]}
          userData={{ isTrack: true, type: 'cornerPost' }}
        >
          <cylinderGeometry args={[postRadius, postRadius, postHeight, 8]} />
          <meshStandardMaterial color="#ffcc00" />
        </mesh>
      ))}
    </>
  );
}
