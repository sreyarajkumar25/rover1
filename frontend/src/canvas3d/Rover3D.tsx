import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RunConfig, Snapshot } from '../types/snapshot';

interface Rover3DProps {
  snapshot: Snapshot;
  config: RunConfig;
}

export const Rover3D: React.FC<Rover3DProps> = ({ snapshot, config }) => {
  const [gridW, gridH] = snapshot.grid_size || [25, 25];
  const halfW = (gridW - 1) / 2;
  const halfH = (gridH - 1) / 2;

  const roverGroupRef = useRef<THREE.Group>(null);
  const sensorRingRef = useRef<THREE.Mesh>(null);

  const currentPos = useRef(
    new THREE.Vector3(snapshot.rover.pos[0] - halfW, 0.22, snapshot.rover.pos[1] - halfH)
  );
  const currentRotation = useRef(0);
  const targetRotation = useRef(0);
  const prevTarget = useRef<[number, number]>([...snapshot.rover.pos]);

  // Mode status color
  const statusColor = (() => {
    switch (snapshot.rover.mode) {
      case 'COLLECTING':
        return '#f59e0b';
      case 'RETURNING':
      case 'UPLOADING':
      case 'SUCCESS':
        return '#10b981';
      case 'LOST':
        return '#ef4444';
      default:
        return '#00f0ff';
    }
  })();

  const sensorRadius = config?.sensor_radius || 4;

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    const targetX = snapshot.rover.pos[0] - halfW;
    const targetZ = snapshot.rover.pos[1] - halfH;

    // Detect movement to update target angle
    if (
      snapshot.rover.pos[0] !== prevTarget.current[0] ||
      snapshot.rover.pos[1] !== prevTarget.current[1]
    ) {
      const dx = targetX - currentPos.current.x;
      const dz = targetZ - currentPos.current.z;
      if (Math.hypot(dx, dz) > 0.05) {
        targetRotation.current = Math.atan2(dx, dz) + Math.PI;
      }
      prevTarget.current = [...snapshot.rover.pos];
    }

    // Smooth position lerp (gliding between cells)
    const lerpSpeed = Math.min(1, delta * 9);
    currentPos.current.x += (targetX - currentPos.current.x) * lerpSpeed;
    currentPos.current.z += (targetZ - currentPos.current.z) * lerpSpeed;

    // Shortest-arc angle lerp
    let diff = (targetRotation.current - currentRotation.current) % (Math.PI * 2);
    if (diff < -Math.PI) diff += Math.PI * 2;
    if (diff > Math.PI) diff -= Math.PI * 2;
    currentRotation.current += diff * Math.min(1, delta * 10);

    // Apply to rover group
    if (roverGroupRef.current) {
      roverGroupRef.current.position.set(
        currentPos.current.x,
        0.22 + Math.sin(time * 6) * 0.015, // Subtle chassis vibration
        currentPos.current.z
      );
      roverGroupRef.current.rotation.y = currentRotation.current;
    }

    // Pulse sensor ring
    if (sensorRingRef.current) {
      sensorRingRef.current.position.set(currentPos.current.x, 0.03, currentPos.current.z);
      const ringPulse = 1.0 + 0.04 * Math.sin(time * 3);
      sensorRingRef.current.scale.set(ringPulse, ringPulse, 1);
    }
  });

  return (
    <group>
      {/* Sensor Radius Ring hovering above the ground */}
      <mesh
        ref={sensorRingRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[snapshot.rover.pos[0] - halfW, 0.03, snapshot.rover.pos[1] - halfH]}
      >
        <ringGeometry args={[sensorRadius - 0.05, sensorRadius + 0.05, 64]} />
        <meshBasicMaterial
          color="#00f0ff"
          transparent
          opacity={0.3}
          depthWrite={false}
        />
      </mesh>

      {/* Main 3D Rover Model */}
      <group
        ref={roverGroupRef}
        position={[snapshot.rover.pos[0] - halfW, 0.22, snapshot.rover.pos[1] - halfH]}
      >
        {/* Chassis Body */}
        <mesh castShadow position={[0, 0, 0]}>
          <boxGeometry args={[0.56, 0.2, 0.68]} />
          <meshStandardMaterial
            color="#e2e8f0"
            metalness={0.5}
            roughness={0.3}
          />
        </mesh>

        {/* Solar Panel Deck */}
        <mesh position={[0, 0.11, 0.02]}>
          <boxGeometry args={[0.42, 0.04, 0.44]} />
          <meshStandardMaterial
            color="#0f172a"
            metalness={0.9}
            roughness={0.2}
          />
        </mesh>

        {/* Status Indicator Core Beacon */}
        <mesh position={[0, 0.15, -0.15]}>
          <sphereGeometry args={[0.07, 16, 16]} />
          <meshStandardMaterial
            color={statusColor}
            emissive={statusColor}
            emissiveIntensity={1.2}
            roughness={0.2}
          />
        </mesh>
        <pointLight
          position={[0, 0.2, -0.15]}
          color={statusColor}
          intensity={0.8}
          distance={3}
        />

        {/* Antenna Mast and Dish */}
        <mesh position={[0.18, 0.22, 0.18]}>
          <cylinderGeometry args={[0.015, 0.015, 0.32, 8]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.8} />
        </mesh>
        <mesh position={[0.18, 0.38, 0.18]} rotation={[0.4, 0, 0]}>
          <cylinderGeometry args={[0.07, 0.01, 0.03, 16]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.7} />
        </mesh>

        {/* Headlights pointing forward (-Z) */}
        <mesh position={[-0.18, 0.04, -0.34]} rotation={[-Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.02, 12]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0.18, 0.04, -0.34]} rotation={[-Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.02, 12]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>

        {/* Rover Wheels (4 Cylinders) */}
        {/* Front Left */}
        <mesh
          castShadow
          position={[-0.34, -0.06, -0.22]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <cylinderGeometry args={[0.12, 0.12, 0.1, 16]} />
          <meshStandardMaterial color="#334155" roughness={0.7} />
        </mesh>

        {/* Front Right */}
        <mesh
          castShadow
          position={[0.34, -0.06, -0.22]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <cylinderGeometry args={[0.12, 0.12, 0.1, 16]} />
          <meshStandardMaterial color="#334155" roughness={0.7} />
        </mesh>

        {/* Rear Left */}
        <mesh
          castShadow
          position={[-0.34, -0.06, 0.22]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <cylinderGeometry args={[0.12, 0.12, 0.1, 16]} />
          <meshStandardMaterial color="#334155" roughness={0.7} />
        </mesh>

        {/* Rear Right */}
        <mesh
          castShadow
          position={[0.34, -0.06, 0.22]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <cylinderGeometry args={[0.12, 0.12, 0.1, 16]} />
          <meshStandardMaterial color="#334155" roughness={0.7} />
        </mesh>
      </group>
    </group>
  );
};
