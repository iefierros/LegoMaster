import { Suspense, useState, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/cannon';
import { OrbitControls, Environment, Grid, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { SimulatedRobot } from './SimulatedRobot';
import { FLLTrack } from './FLLTrack';
import type { RiggedRobotData, RobotInstance, SensorReading } from '@/types';

interface SimulationSceneProps {
  riggedRobot: RiggedRobotData | null;
  onRobotReady?: (robot: RobotInstance) => void;
  onSensorUpdate?: (readings: SensorReading[]) => void;
}

export function SimulationScene({
  riggedRobot,
  onRobotReady,
  onSensorUpdate
}: SimulationSceneProps) {
  const [cameraMode, setCameraMode] = useState<'orbit' | 'follow' | 'top'>('orbit');

  return (
    <div className="w-full h-full">
      <Canvas
        shadows
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={50}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />

        {/* Camera Controls */}
        <PerspectiveCamera makeDefault position={[2, 1.5, 2]} fov={60} />
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={0.5}
          maxDistance={10}
          maxPolarAngle={Math.PI / 2}
        />

        {/* Environment */}
        <Environment preset="warehouse" />

        {/* Physics World */}
        <Physics
          gravity={[0, -9.81, 0]}
          defaultContactMaterial={{
            friction: 0.9,
            restitution: 0.1,
            contactEquationStiffness: 1e8,
            contactEquationRelaxation: 3
          }}
          allowSleep={false}
        >
          {/* FLL Track/Mat */}
          <FLLTrack />

          {/* Robot */}
          {riggedRobot && (
            <Suspense fallback={null}>
              <SimulatedRobot
                riggedData={riggedRobot}
                initialPosition={[0, 0.1, -0.5]}
                onRobotReady={onRobotReady}
                onSensorUpdate={onSensorUpdate}
              />
            </Suspense>
          )}
        </Physics>

        {/* Ground Grid */}
        <Grid
          args={[10, 10]}
          cellSize={0.2}
          cellThickness={0.5}
          cellColor="#6b7280"
          sectionSize={1}
          sectionThickness={1}
          sectionColor="#4b5563"
          fadeDistance={10}
          fadeStrength={1}
          followCamera={false}
          position={[0, -0.01, 0]}
        />

        {/* Coordinate Helper (Development) */}
        {process.env.NODE_ENV === 'development' && (
          <axesHelper args={[1]} />
        )}
      </Canvas>

      {/* Camera Mode Switcher */}
      <div className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded space-x-2">
        <button
          onClick={() => setCameraMode('orbit')}
          className={`px-3 py-1 rounded ${cameraMode === 'orbit' ? 'bg-lego-yellow text-black' : 'bg-gray-700'}`}
        >
          Orbit
        </button>
        <button
          onClick={() => setCameraMode('top')}
          className={`px-3 py-1 rounded ${cameraMode === 'top' ? 'bg-lego-yellow text-black' : 'bg-gray-700'}`}
        >
          Top View
        </button>
      </div>
    </div>
  );
}
