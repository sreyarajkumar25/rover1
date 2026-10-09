import React, { useEffect, useRef, useState } from 'react';
import { useMissionStore } from '../store/useMissionStore';
import { MissionRenderer } from './renderer';

export const MapCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<MissionRenderer>(new MissionRenderer());

  const currentSnapshot = useMissionStore((s) => s.currentSnapshot);
  const groundTruthMap = useMissionStore((s) => s.groundTruthMap);
  const showFog = useMissionStore((s) => s.showFog);
  const showFrontiers = useMissionStore((s) => s.showFrontiers);
  const showPlannedPath = useMissionStore((s) => s.showPlannedPath);
  const showHeatmap = useMissionStore((s) => s.showHeatmap);
  const isReplanningBanner = useMissionStore((s) => s.isReplanningBanner);
  const openZoom = useMissionStore((s) => s.openZoom);

  const [hoverInfo, setHoverInfo] = useState<{ x: number; y: number; type: string } | null>(null);
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!pointerDownPos.current) return;
    const dx = Math.abs(e.clientX - pointerDownPos.current.x);
    const dy = Math.abs(e.clientY - pointerDownPos.current.y);
    pointerDownPos.current = null;

    // Only open zoom if movement is minimal (pure click/tap, no drag)
    if (dx < 6 && dy < 6) {
      const rect = containerRef.current?.getBoundingClientRect();
      openZoom(
        rect
          ? {
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
            }
          : null
      );
    }
  };

  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderLoop = (timeMs: number) => {
      if (currentSnapshot) {
        rendererRef.current.render(
          ctx,
          currentSnapshot,
          {
            showFog,
            showFrontiers,
            showPlannedPath,
            showHeatmap,
            groundTruthMap,
          },
          canvas.width,
          canvas.height,
          timeMs
        );
      }
      animationFrameId = requestAnimationFrame(renderLoop);
    };

    animationFrameId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [currentSnapshot, showFog, showFrontiers, showPlannedPath, showHeatmap, groundTruthMap]);

  // Handle ResizeObserver for dynamic container dimensions
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        canvas.width = Math.floor(width);
        canvas.height = Math.floor(height);
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Mouse hover cell inspector
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !currentSnapshot) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const [gridW, gridH] = currentSnapshot.grid_size || [25, 25];
    const cellSize = Math.min(canvasRef.current.width / gridW, canvasRef.current.height / gridH);
    const offsetX = (canvasRef.current.width - gridW * cellSize) / 2;
    const offsetY = (canvasRef.current.height - gridH * cellSize) / 2;

    const cx = Math.floor((mouseX - offsetX) / cellSize);
    const cy = Math.floor((mouseY - offsetY) / cellSize);

    if (cx >= 0 && cx < gridW && cy >= 0 && cy < gridH) {
      const knownVal = currentSnapshot.known_map[cy]?.[cx];
      let typeStr = 'Unexplored (Fog)';
      if (knownVal === 0) typeStr = 'Open Ground (Cost: 1)';
      else if (knownVal === 1) typeStr = 'Obstacle (Impassable)';
      else if (knownVal === 2) typeStr = 'Hazard (Cost: 4)';
      else if (knownVal === 3) typeStr = 'Communication Zone';
      else if (knownVal === 4) typeStr = 'Data Site';

      setHoverInfo({ x: cx, y: cy, type: typeStr });
    } else {
      setHoverInfo(null);
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#070a12',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverInfo(null)}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        style={{ width: '100%', height: '100%', display: 'block', cursor: 'zoom-in' }}
      />

      {/* Click-to-Zoom Badge in top right */}
      <button
        onClick={() => {
          const rect = containerRef.current?.getBoundingClientRect();
          openZoom(
            rect
              ? {
                  top: rect.top,
                  left: rect.left,
                  width: rect.width,
                  height: rect.height,
                }
              : null
          );
        }}
        title="Open Large Zoomed Map & 3D View"
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          background: 'rgba(13, 19, 34, 0.85)',
          border: '1px solid var(--border-neon)',
          color: 'var(--neon-cyan)',
          borderRadius: '6px',
          padding: '6px 10px',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.5px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          cursor: 'pointer',
          zIndex: 10,
        }}
      >
        <span>🔍</span>
        <span>MAGNIFY / 3D</span>
      </button>

      {/* Floating REPLANNING Notification Banner */}
      {isReplanningBanner && (
        <div
          style={{
            position: 'absolute',
            top: '20px',
            padding: '8px 24px',
            background: 'rgba(239, 68, 68, 0.9)',
            color: '#fff',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 'bold',
            letterSpacing: '1px',
            boxShadow: '0 0 20px rgba(239, 68, 68, 0.6)',
            animation: 'pulse-subtle 0.6s infinite ease-in-out',
            pointerEvents: 'none',
          }}
        >
          ⚡ REPLANNING ROUTE: TERRAIN UPDATE / SAFETY TRIGGER
        </div>
      )}

      {/* Cell Inspector Hover Pill */}
      {hoverInfo && (
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '20px',
            background: 'rgba(13, 19, 34, 0.9)',
            border: '1px solid var(--border-neon)',
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--neon-cyan)',
            pointerEvents: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }}
        >
          [{hoverInfo.x}, {hoverInfo.y}] &bull; {hoverInfo.type}
        </div>
      )}
    </div>
  );
};
