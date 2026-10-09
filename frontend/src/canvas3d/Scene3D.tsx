import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { RunConfig, Snapshot } from '../types/snapshot';
import { Effects3D } from './Effects3D';
import { Paths3D } from './Paths3D';
import { Rover3D } from './Rover3D';
import { Terrain3D } from './Terrain3D';

interface Scene3DProps {
  snapshot: Snapshot;
  groundTruthMap: number[][] | null;
  config: RunConfig;
  revealTrueMap: boolean;
  followRover: boolean;
  showFog: boolean;
  showFrontiers: boolean;
  showPlannedPath: boolean;
  isReplanningBanner: boolean;
  resetCameraKey?: number;
  onHoverCell?: (x: number | null, y: number | null) => void;
}

function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

// Internal Camera Manager component inside Canvas
interface CameraManagerProps {
  snapshot: Snapshot;
  followRover: boolean;
  resetCameraKey?: number;
}

const CameraManager: React.FC<CameraManagerProps> = ({
  snapshot,
  followRover,
  resetCameraKey,
}) => {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);

  const [gridW, gridH] = snapshot.grid_size || [25, 25];
  const maxDim = Math.max(gridW, gridH);
  const halfW = (gridW - 1) / 2;
  const halfH = (gridH - 1) / 2;

  // Handle Overview / Reset Camera trigger
  useEffect(() => {
    if (controlsRef.current) {
      camera.position.set(0, maxDim * 0.9, maxDim * 0.9);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  }, [resetCameraKey, maxDim, camera]);

  useFrame((_, delta) => {
    if (followRover && controlsRef.current) {
      const targetX = snapshot.rover.pos[0] - halfW;
      const targetZ = snapshot.rover.pos[1] - halfH;
      const roverTarget = new THREE.Vector3(targetX, 0.2, targetZ);
      controlsRef.current.target.lerp(roverTarget, delta * 4);
      controlsRef.current.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      maxPolarAngle={Math.PI / 2 - 0.05}
      minDistance={4}
      maxDistance={maxDim * 3.5}
    />
  );
};

export const Scene3D: React.FC<Scene3DProps> = ({
  snapshot,
  groundTruthMap,
  config,
  revealTrueMap,
  followRover,
  showFog,
  showFrontiers,
  showPlannedPath,
  isReplanningBanner,
  resetCameraKey,
  onHoverCell,
}) => {
  const [webGLSupported] = useState<boolean>(() => isWebGLAvailable());

  if (!webGLSupported) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#070a12',
          color: 'var(--neon-red)',
          textAlign: 'center',
          padding: '24px',
        }}
      >
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
        <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
          WebGL Not Available
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '400px' }}>
          Hardware acceleration or WebGL is disabled in your browser. Please switch back to
          2D view mode or enable WebGL in browser settings.
        </div>
      </div>
    );
  }

  const [gridW, gridH] = snapshot.grid_size || [25, 25];
  const maxDim = Math.max(gridW, gridH);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: '#040711',
      }}
    >
      <Canvas
        camera={{
          position: [0, maxDim * 0.9, maxDim * 0.9],
          fov: 46,
          near: 0.1,
          far: 1000,
        }}
        shadows
        gl={{ antialias: true, alpha: false }}
        style={{ width: '100%', height: '100%' }}
      >
        {/* Starry Space Background */}
        <Stars
          radius={120}
          depth={50}
          count={3500}
          factor={4}
          saturation={0}
          fade
          speed={0.8}
        />

        {/* Ambient & Directional Lighting */}
        <ambientLight intensity={0.45} color="#e0e7ff" />
        <directionalLight
          position={[maxDim, maxDim * 1.5, maxDim * 0.7]}
          intensity={1.2}
          color="#ffffff"
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        {/* Subtle cyan rim fill light */}
        <pointLight
          position={[-maxDim, maxDim * 0.7, -maxDim]}
          intensity={0.4}
          color="#00f0ff"
        />

        {/* Orbit Camera Controller & Follow Rover logic */}
        <CameraManager
          snapshot={snapshot}
          followRover={followRover}
          resetCameraKey={resetCameraKey}
        />

        {/* 3D Scene Components */}
        <Terrain3D
          snapshot={snapshot}
          groundTruthMap={groundTruthMap}
          revealTrueMap={revealTrueMap}
          showFog={showFog}
          onHoverCell={onHoverCell}
        />

        <Rover3D snapshot={snapshot} config={config} />

        <Paths3D
          snapshot={snapshot}
          showFrontiers={showFrontiers}
          showPlannedPath={showPlannedPath}
        />

        <Effects3D
          snapshot={snapshot}
          isReplanningBanner={isReplanningBanner}
        />
      </Canvas>
    </div>
  );
};
