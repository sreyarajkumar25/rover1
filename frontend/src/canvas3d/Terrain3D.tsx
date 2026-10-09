import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { CellType, Snapshot } from '../types/snapshot';

interface Terrain3DProps {
  snapshot: Snapshot;
  groundTruthMap: number[][] | null;
  revealTrueMap: boolean;
  showFog: boolean;
  onHoverCell?: (x: number | null, y: number | null) => void;
}

export const Terrain3D: React.FC<Terrain3DProps> = ({
  snapshot,
  groundTruthMap,
  revealTrueMap,
  showFog,
  onHoverCell,
}) => {
  const [gridW, gridH] = snapshot.grid_size || [25, 25];
  const totalCells = gridW * gridH;
  const halfW = (gridW - 1) / 2;
  const halfH = (gridH - 1) / 2;

  const groundMeshRef = useRef<THREE.InstancedMesh>(null);
  const obstacleMeshRef = useRef<THREE.InstancedMesh>(null);

  // Comm zones and Data sites coordinates
  const specialSites = useMemo(() => {
    const comms: [number, number][] = [];
    const dataSites: [number, number][] = [];

    const activeMap = revealTrueMap
      ? (snapshot.true_map || groundTruthMap || snapshot.known_map)
      : snapshot.known_map;

    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        const val = activeMap?.[y]?.[x];
        if (val === CellType.COMM_ZONE) {
          comms.push([x, y]);
        } else if (val === CellType.DATA_SITE) {
          dataSites.push([x, y]);
        }
      }
    }
    return { comms, dataSites };
  }, [snapshot, groundTruthMap, revealTrueMap, gridW, gridH]);

  // Instanced Meshes Setup and Updates
  useEffect(() => {
    const groundMesh = groundMeshRef.current;
    const obstacleMesh = obstacleMeshRef.current;
    if (!groundMesh || !obstacleMesh) return;

    const dummy = new THREE.Object3D();
    const tempColor = new THREE.Color();

    const activeTrue = snapshot.true_map || groundTruthMap;

    let index = 0;
    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        const wx = x - halfW;
        const wz = y - halfH;

        const knownVal = snapshot.known_map[y]?.[x];
        const isExplored = knownVal !== null && knownVal !== undefined;
        const trueVal = activeTrue?.[y]?.[x] ?? CellType.OPEN;

        const effectiveVal = revealTrueMap ? trueVal : (isExplored ? knownVal : null);

        // 1. Ground Tile transform & color
        dummy.position.set(wx, -0.04, wz);
        dummy.scale.set(1, 1, 1);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        groundMesh.setMatrixAt(index, dummy.matrix);

        if (effectiveVal === null && showFog) {
          // Unexplored fog of war
          tempColor.set('#070a14');
        } else {
          switch (effectiveVal) {
            case CellType.OPEN:
              tempColor.set('#162032');
              break;
            case CellType.OBSTACLE:
              tempColor.set('#2d1624');
              break;
            case CellType.HAZARD:
              tempColor.set('#b45309');
              break;
            case CellType.COMM_ZONE:
              tempColor.set('#047857');
              break;
            case CellType.DATA_SITE:
              tempColor.set('#d97706');
              break;
            default:
              tempColor.set('#111827');
          }
        }
        groundMesh.setColorAt(index, tempColor);

        // 2. Obstacle Block transform
        const isObstacle = effectiveVal === CellType.OBSTACLE;
        if (isObstacle) {
          dummy.position.set(wx, 0.65, wz);
          dummy.scale.set(1, 1, 1);
          dummy.rotation.set(0, 0, 0);
          dummy.updateMatrix();
          obstacleMesh.setMatrixAt(index, dummy.matrix);
        } else {
          dummy.position.set(wx, -10, wz);
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          obstacleMesh.setMatrixAt(index, dummy.matrix);
        }

        index++;
      }
    }

    groundMesh.instanceMatrix.needsUpdate = true;
    if (groundMesh.instanceColor) groundMesh.instanceColor.needsUpdate = true;
    obstacleMesh.instanceMatrix.needsUpdate = true;
  }, [snapshot, groundTruthMap, revealTrueMap, showFog, gridW, gridH, halfW, halfH]);

  // Dynamic animations for Comm Pulse and Rotating Amber Crystals
  const pulseRingRef = useRef<THREE.Group>(null);
  const crystalsGroupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    // Pulse radar ring scale
    if (pulseRingRef.current) {
      const pulseScale = 1.0 + 0.18 * Math.sin(time * 3);
      pulseRingRef.current.children.forEach((child) => {
        child.scale.set(pulseScale, pulseScale, 1);
      });
    }

    // Crystals rotate and bob up/down
    if (crystalsGroupRef.current) {
      crystalsGroupRef.current.children.forEach((child, i) => {
        child.rotation.y = time * 1.5 + i;
        child.position.y = 0.65 + Math.sin(time * 2.5 + i) * 0.08;
      });
    }
  });

  return (
    <group>
      {/* 1. Instanced Ground Blocks */}
      <instancedMesh
        ref={groundMeshRef}
        args={[undefined, undefined, totalCells]}
        receiveShadow
      >
        <boxGeometry args={[0.96, 0.08, 0.96]} />
        <meshStandardMaterial roughness={0.7} metalness={0.15} />
      </instancedMesh>

      {/* 2. Instanced Obstacle Rocks */}
      <instancedMesh
        ref={obstacleMeshRef}
        args={[undefined, undefined, totalCells]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[0.92, 1.3, 0.92]} />
        <meshStandardMaterial
          color="#331422"
          emissive="#dc2626"
          emissiveIntensity={0.15}
          roughness={0.6}
          metalness={0.3}
        />
      </instancedMesh>

      {/* 3. Communication Zone Beams & Pulsing Rings */}
      {specialSites.comms.map(([cx, cy]) => {
        const wx = cx - halfW;
        const wz = cy - halfH;
        return (
          <group key={`comm-${cx}-${cy}`} position={[wx, 0, wz]}>
            {/* Green glowing pad */}
            <mesh position={[0, 0.02, 0]}>
              <cylinderGeometry args={[0.42, 0.42, 0.06, 24]} />
              <meshStandardMaterial
                color="#10b981"
                emissive="#10b981"
                emissiveIntensity={0.6}
                roughness={0.3}
              />
            </mesh>

            {/* Vertical Uplink Beam */}
            <mesh position={[0, 2.0, 0]}>
              <cylinderGeometry args={[0.08, 0.08, 4.0, 16]} />
              <meshBasicMaterial
                color="#34d399"
                transparent
                opacity={0.35}
                depthWrite={false}
              />
            </mesh>
          </group>
        );
      })}

      {/* Pulsing Comm Rings Group */}
      <group ref={pulseRingRef}>
        {specialSites.comms.map(([cx, cy]) => (
          <mesh
            key={`comm-pulse-${cx}-${cy}`}
            position={[cx - halfW, 0.04, cy - halfH]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <ringGeometry args={[0.25, 0.45, 32]} />
            <meshBasicMaterial
              color="#10b981"
              transparent
              opacity={0.6}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>

      {/* 4. Rotating Floating Amber Crystals for Data Sites */}
      <group ref={crystalsGroupRef}>
        {specialSites.dataSites.map(([dx, dy]) => (
          <group key={`data-${dx}-${dy}`} position={[dx - halfW, 0.65, dy - halfH]}>
            <mesh castShadow>
              <octahedronGeometry args={[0.26, 0]} />
              <meshStandardMaterial
                color="#f59e0b"
                emissive="#f59e0b"
                emissiveIntensity={0.8}
                roughness={0.2}
                metalness={0.4}
              />
            </mesh>
            {/* Ambient amber point light around crystal */}
            <pointLight color="#f59e0b" intensity={0.4} distance={2.5} />
          </group>
        ))}
      </group>

      {/* 5. Invisible raycast ground plane for cell hover inspector */}
      <mesh
        position={[0, 0.01, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerMove={(e) => {
          e.stopPropagation();
          const gx = Math.round(e.point.x + halfW);
          const gy = Math.round(e.point.z + halfH);
          if (gx >= 0 && gx < gridW && gy >= 0 && gy < gridH) {
            onHoverCell?.(gx, gy);
          } else {
            onHoverCell?.(null, null);
          }
        }}
        onPointerOut={() => onHoverCell?.(null, null)}
      >
        <planeGeometry args={[gridW, gridH]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </group>
  );
};
