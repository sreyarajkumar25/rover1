import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Snapshot } from '../types/snapshot';

interface Effects3DProps {
  snapshot: Snapshot;
  isReplanningBanner: boolean;
}

interface BlockedEventState {
  x: number;
  y: number;
  progress: number; // 0 to 1 falling animation
  flashAlpha: number;
}

export const Effects3D: React.FC<Effects3DProps> = ({ snapshot, isReplanningBanner }) => {
  const [gridW, gridH] = snapshot.grid_size || [25, 25];
  const halfW = (gridW - 1) / 2;
  const halfH = (gridH - 1) / 2;

  // 1. Upload Effect State & Particles
  const isUploading =
    snapshot.rover.mode === 'UPLOADING' ||
    Boolean(snapshot.events?.some((e) => e.startsWith('upload')));

  const particleCount = 45;
  const uploadParticlesRef = useRef<THREE.Points>(null);

  const particleData = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const speeds = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 0.5;
      positions[i * 3 + 1] = Math.random() * 3.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
      speeds[i] = 1.2 + Math.random() * 2.0;
    }
    return { positions, speeds };
  }, []);

  const particleGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(particleData.positions, 3));
    return geo;
  }, [particleData]);

  // 2. Blocked-cell cave-in effect
  const [blockedState, setBlockedState] = useState<BlockedEventState | null>(null);
  const lastStepRef = useRef<number>(-1);

  useEffect(() => {
    if (snapshot.step !== lastStepRef.current) {
      lastStepRef.current = snapshot.step;
      const blockedEvent = snapshot.events?.find((e) => e.startsWith('blocked:'));
      if (blockedEvent) {
        const match = blockedEvent.match(/blocked:\[(\d+),(\d+)\]/);
        if (match) {
          const bx = parseInt(match[1], 10);
          const by = parseInt(match[2], 10);
          setBlockedState({
            x: bx,
            y: by,
            progress: 0.0,
            flashAlpha: 1.0,
          });
        }
      }
    }
  }, [snapshot]);

  // Falling block mesh ref
  const fallingBlockRef = useRef<THREE.Mesh>(null);
  const flashLightRef = useRef<THREE.PointLight>(null);
  const shockwaveRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    // 1. Animate upload particles
    if (isUploading && uploadParticlesRef.current) {
      const posAttr = uploadParticlesRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const array = posAttr.array as Float32Array;

      for (let i = 0; i < particleCount; i++) {
        array[i * 3 + 1] += particleData.speeds[i] * delta;
        // Spiral / float effect
        array[i * 3 + 0] += Math.sin(array[i * 3 + 1] * 3) * delta * 0.2;
        if (array[i * 3 + 1] > 4.0) {
          array[i * 3 + 1] = 0.2;
          array[i * 3 + 0] = (Math.random() - 0.5) * 0.4;
          array[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
        }
      }
      posAttr.needsUpdate = true;
    }

    // 2. Animate cave-in falling block & flash
    if (blockedState) {
      const nextProgress = Math.min(1.0, blockedState.progress + delta * 3.5);
      const nextFlash = Math.max(0, blockedState.flashAlpha - delta * 1.5);

      if (fallingBlockRef.current) {
        // Slam down from y = 6.0 to y = 0.65
        const currentY = 6.0 - Math.pow(nextProgress, 2) * (6.0 - 0.65);
        fallingBlockRef.current.position.y = currentY;
      }

      if (flashLightRef.current) {
        flashLightRef.current.intensity = nextFlash * 5.0;
      }

      if (shockwaveRef.current) {
        if (nextProgress >= 0.8) {
          const waveScale = (nextProgress - 0.8) * 8.0;
          shockwaveRef.current.scale.set(waveScale, waveScale, 1);
          (shockwaveRef.current.material as THREE.Material).opacity = (1.0 - nextProgress) * 4.0;
        }
      }

      if (nextProgress >= 1.0 && nextFlash <= 0.05) {
        // Animation finished
        setBlockedState(null);
      } else {
        setBlockedState((prev) =>
          prev ? { ...prev, progress: nextProgress, flashAlpha: nextFlash } : null
        );
      }
    }
  });

  return (
    <group>
      {/* Upload Particles Stream */}
      {isUploading && (
        <group
          position={[
            snapshot.rover.pos[0] - halfW,
            0,
            snapshot.rover.pos[1] - halfH,
          ]}
        >
          <primitive
            ref={uploadParticlesRef}
            object={
              new THREE.Points(
                particleGeometry,
                new THREE.PointsMaterial({
                  color: '#10b981',
                  size: 0.12,
                  transparent: true,
                  opacity: 0.85,
                  blending: THREE.AdditiveBlending,
                })
              )
            }
          />
          {/* Cyan/Green glow aura under uploading rover */}
          <pointLight color="#10b981" intensity={2.5} distance={4} position={[0, 1.5, 0]} />
        </group>
      )}

      {/* Blocked-Cell Slam Effect */}
      {blockedState && (
        <group position={[blockedState.x - halfW, 0, blockedState.y - halfH]}>
          {/* Falling Obstacle Block */}
          <mesh ref={fallingBlockRef} position={[0, 6.0, 0]}>
            <boxGeometry args={[0.92, 1.3, 0.92]} />
            <meshStandardMaterial
              color="#450a0a"
              emissive="#ef4444"
              emissiveIntensity={0.8}
              roughness={0.4}
            />
          </mesh>

          {/* Red Cave-in Flash Light */}
          <pointLight
            ref={flashLightRef}
            color="#ef4444"
            intensity={4.0}
            distance={8}
            position={[0, 1.2, 0]}
          />

          {/* Impact Shockwave Ring */}
          <mesh
            ref={shockwaveRef}
            position={[0, 0.05, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <ringGeometry args={[0.3, 0.5, 32]} />
            <meshBasicMaterial
              color="#ef4444"
              transparent
              opacity={0.8}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}

      {/* General Replanning Ambient Warning if Active */}
      {isReplanningBanner && (
        <pointLight
          color="#ef4444"
          intensity={1.2}
          distance={20}
          position={[0, 5, 0]}
        />
      )}
    </group>
  );
};
