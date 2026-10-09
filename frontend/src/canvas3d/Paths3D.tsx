import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Snapshot } from '../types/snapshot';

interface Paths3DProps {
  snapshot: Snapshot;
  showFrontiers?: boolean;
  showPlannedPath?: boolean;
}

export const Paths3D: React.FC<Paths3DProps> = ({
  snapshot,
  showFrontiers = true,
  showPlannedPath = true,
}) => {
  const [gridW, gridH] = snapshot.grid_size || [25, 25];
  const halfW = (gridW - 1) / 2;
  const halfH = (gridH - 1) / 2;

  // 1. Trail BufferGeometry
  const trailGeometry = useMemo(() => {
    if (!snapshot.trail || snapshot.trail.length < 2) return null;
    const points = snapshot.trail.map(
      ([tx, ty]) => new THREE.Vector3(tx - halfW, 0.05, ty - halfH)
    );
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [snapshot.trail, halfW, halfH]);

  // 2. Planned Path BufferGeometry
  const plannedGeometry = useMemo(() => {
    if (!snapshot.planned_path || snapshot.planned_path.length === 0) return null;
    const points = [
      new THREE.Vector3(snapshot.rover.pos[0] - halfW, 0.07, snapshot.rover.pos[1] - halfH),
      ...snapshot.planned_path.map(
        ([px, py]) => new THREE.Vector3(px - halfW, 0.07, py - halfH)
      ),
    ];
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [snapshot.planned_path, snapshot.rover.pos, halfW, halfH]);

  // Target destination point
  const destPoint = useMemo(() => {
    if (!snapshot.planned_path || snapshot.planned_path.length === 0) return null;
    const [dx, dy] = snapshot.planned_path[snapshot.planned_path.length - 1];
    return [dx - halfW, 0.08, dy - halfH] as [number, number, number];
  }, [snapshot.planned_path, halfW, halfH]);

  const pathColor = snapshot.rover.mode === 'RETURNING' ? '#34d399' : '#00f0ff';

  // Animation for destination marker and frontiers
  const destRingRef = useRef<THREE.Mesh>(null);
  const frontierMeshRef = useRef<THREE.InstancedMesh>(null);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (destRingRef.current) {
      const s = 1.0 + 0.15 * Math.sin(time * 4);
      destRingRef.current.scale.set(s, s, 1);
    }
  });

  // Frontiers InstancedMesh
  const frontierCount = snapshot.frontiers ? snapshot.frontiers.length : 0;
  React.useEffect(() => {
    if (!frontierMeshRef.current || frontierCount === 0) return;
    const dummy = new THREE.Object3D();
    snapshot.frontiers.forEach(([fx, fy], idx) => {
      dummy.position.set(fx - halfW, 0.04, fy - halfH);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      frontierMeshRef.current?.setMatrixAt(idx, dummy.matrix);
    });
    frontierMeshRef.current.instanceMatrix.needsUpdate = true;
  }, [snapshot.frontiers, frontierCount, halfW, halfH]);

  return (
    <group>
      {/* Historical Trail Line */}
      {trailGeometry && (
        <primitive
          object={
            new THREE.Line(
              trailGeometry,
              new THREE.LineBasicMaterial({
                color: '#c084fc',
                linewidth: 2,
                transparent: true,
                opacity: 0.8,
              })
            )
          }
        />
      )}

      {/* Planned Trajectory Line */}
      {showPlannedPath && plannedGeometry && (
        <primitive
          object={
            new THREE.Line(
              plannedGeometry,
              new THREE.LineBasicMaterial({
                color: pathColor,
                linewidth: 3,
                transparent: true,
                opacity: 0.9,
              })
            )
          }
        />
      )}

      {/* Destination Target Marker */}
      {showPlannedPath && destPoint && (
        <group position={destPoint}>
          <mesh ref={destRingRef} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.2, 0.35, 32]} />
            <meshBasicMaterial
              color={pathColor}
              transparent
              opacity={0.8}
              depthWrite={false}
            />
          </mesh>
          <mesh position={[0, 0.25, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.5, 8]} />
            <meshBasicMaterial color={pathColor} transparent opacity={0.6} />
          </mesh>
        </group>
      )}

      {/* Exploration Frontiers */}
      {showFrontiers && frontierCount > 0 && (
        <instancedMesh
          ref={frontierMeshRef}
          args={[undefined, undefined, frontierCount]}
        >
          <planeGeometry args={[0.85, 0.85]} />
          <meshBasicMaterial
            color="#00f0ff"
            transparent
            opacity={0.25}
            depthWrite={false}
          />
        </instancedMesh>
      )}
    </group>
  );
};
