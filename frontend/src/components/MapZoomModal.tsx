import React, { useEffect, useRef, useState } from 'react';
import { useMissionStore } from '../store/useMissionStore';
import { MissionRenderer } from '../canvas/renderer';
import { Scene3D } from '../canvas3d/Scene3D';
import { CellType } from '../types/snapshot';

export const MapZoomModal: React.FC = () => {
  const isZoomOpen = useMissionStore((s) => s.isZoomOpen);
  const closeZoom = useMissionStore((s) => s.closeZoom);
  const viewMode = useMissionStore((s) => s.viewMode);
  const setViewMode = useMissionStore((s) => s.setViewMode);
  const zoomOriginRect = useMissionStore((s) => s.zoomOriginRect);

  const currentSnapshot = useMissionStore((s) => s.currentSnapshot);
  const groundTruthMap = useMissionStore((s) => s.groundTruthMap);
  const config = useMissionStore((s) => s.config);

  // Playback state & controls
  const isPlaying = useMissionStore((s) => s.isPlaying);
  const setIsPlaying = useMissionStore((s) => s.setIsPlaying);
  const stepForward = useMissionStore((s) => s.stepForward);
  const stepBackward = useMissionStore((s) => s.stepBackward);
  const resetPlayback = useMissionStore((s) => s.resetPlayback);
  const playbackSpeed = useMissionStore((s) => s.playbackSpeed);
  const setPlaybackSpeed = useMissionStore((s) => s.setPlaybackSpeed);
  const currentStepIndex = useMissionStore((s) => s.currentStepIndex);
  const snapshots = useMissionStore((s) => s.snapshots);

  // Visualization toggles
  const showFog = useMissionStore((s) => s.showFog);
  const toggleFog = useMissionStore((s) => s.toggleFog);
  const showFrontiers = useMissionStore((s) => s.showFrontiers);
  const toggleFrontiers = useMissionStore((s) => s.toggleFrontiers);
  const showPlannedPath = useMissionStore((s) => s.showPlannedPath);
  const togglePlannedPath = useMissionStore((s) => s.togglePlannedPath);
  const showHeatmap = useMissionStore((s) => s.showHeatmap);
  const toggleHeatmap = useMissionStore((s) => s.toggleHeatmap);
  const isReplanningBanner = useMissionStore((s) => s.isReplanningBanner);

  // 3D specific toggles
  const revealTrueMap = useMissionStore((s) => s.revealTrueMap);
  const toggleRevealTrueMap = useMissionStore((s) => s.toggleRevealTrueMap);
  const followRover = useMissionStore((s) => s.followRover);
  const toggleFollowRover = useMissionStore((s) => s.toggleFollowRover);

  // 2D Pan and Zoom state
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; panX: number; panY: number }>({
    mouseX: 0,
    mouseY: 0,
    panX: 0,
    panY: 0,
  });

  // 3D Overview camera reset trigger
  const [resetCameraKey, setResetCameraKey] = useState<number>(0);

  // Cell inspector hover state
  const [hoverInfo, setHoverInfo] = useState<{
    x: number;
    y: number;
    type: string;
    cost: string;
    status: string;
  } | null>(null);

  // 2D Canvas refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<MissionRenderer>(new MissionRenderer());

  // Reset 2D View
  const handleResetView = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    setResetCameraKey((k) => k + 1);
  };

  // 2D Canvas Live Render Loop
  useEffect(() => {
    if (!isZoomOpen || viewMode !== '2D') return;

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
          timeMs,
          zoom,
          pan.x,
          pan.y
        );
      }
      animationFrameId = requestAnimationFrame(renderLoop);
    };

    animationFrameId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [
    isZoomOpen,
    viewMode,
    currentSnapshot,
    showFog,
    showFrontiers,
    showPlannedPath,
    showHeatmap,
    groundTruthMap,
    zoom,
    pan,
  ]);

  // ResizeObserver for dynamic 2D canvas sizing
  useEffect(() => {
    if (!isZoomOpen || viewMode !== '2D') return;
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
  }, [isZoomOpen, viewMode]);

  // Calculate cell info helper
  const computeCellDetails = (cx: number, cy: number) => {
    if (!currentSnapshot) return null;
    const [gridW, gridH] = currentSnapshot.grid_size || [25, 25];
    if (cx < 0 || cx >= gridW || cy < 0 || cy >= gridH) return null;

    const knownVal = currentSnapshot.known_map[cy]?.[cx];
    const isExplored = knownVal !== null && knownVal !== undefined;
    const effectiveVal = isExplored ? knownVal : (revealTrueMap ? currentSnapshot.true_map?.[cy]?.[cx] : null);

    let typeStr = 'Unknown (Fog of War)';
    let costStr = 'Unknown';
    const statusStr = isExplored ? 'Explored' : 'Unexplored (Fog)';

    if (effectiveVal === CellType.OPEN) {
      typeStr = 'Open Ground';
      costStr = '1 Energy';
    } else if (effectiveVal === CellType.OBSTACLE) {
      typeStr = 'Obstacle (Rock Basalt)';
      costStr = 'Impassable';
    } else if (effectiveVal === CellType.HAZARD) {
      typeStr = 'Hazard (Rough Terrain)';
      costStr = '4 Energy';
    } else if (effectiveVal === CellType.COMM_ZONE) {
      typeStr = 'Communication Uplink Zone';
      costStr = '1 Energy (Upload Enabled)';
    } else if (effectiveVal === CellType.DATA_SITE) {
      typeStr = 'Scientific Data Cache Site';
      costStr = '1 Energy (Sample Site)';
    }

    return { x: cx, y: cy, type: typeStr, cost: costStr, status: statusStr };
  };

  // 2D Mouse Wheel Zoom handler
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    setZoom((prev) => Math.max(0.5, Math.min(5.0, prev * zoomFactor)));
  };

  // 2D Mouse Drag Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Left click only
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;
      setPan({
        x: dragStartRef.current.panX + dx,
        y: dragStartRef.current.panY + dy,
      });
    }

    // Cell hover calculation taking into account zoom and pan
    if (!canvasRef.current || !currentSnapshot) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const width = canvasRef.current.width;
    const height = canvasRef.current.height;
    const [gridW, gridH] = currentSnapshot.grid_size || [25, 25];
    const cellSize = Math.min(width / gridW, height / gridH);
    const offsetX = (width - gridW * cellSize) / 2;
    const offsetY = (height - gridH * cellSize) / 2;

    const centerX = width / 2;
    const centerY = height / 2;
    const unscaledX = (mouseX - (centerX + pan.x)) / zoom + centerX;
    const unscaledY = (mouseY - (centerY + pan.y)) / zoom + centerY;

    const cx = Math.floor((unscaledX - offsetX) / cellSize);
    const cy = Math.floor((unscaledY - offsetY) / cellSize);

    setHoverInfo(computeCellDetails(cx, cy));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 3D cell hover handler
  const handle3DHoverCell = (x: number | null, y: number | null) => {
    if (x === null || y === null) {
      setHoverInfo(null);
    } else {
      setHoverInfo(computeCellDetails(x, y));
    }
  };

  if (!isZoomOpen) return null;

  // Origin for smooth animated zoom-in transition
  const originStyle = zoomOriginRect
    ? {
        transformOrigin: `${zoomOriginRect.left + zoomOriginRect.width / 2}px ${
          zoomOriginRect.top + zoomOriginRect.height / 2
        }px`,
      }
    : { transformOrigin: 'center center' };

  return (
    <div
      onClick={(e) => {
        // Close modal when clicking dark backdrop
        if (e.target === e.currentTarget) {
          closeZoom();
        }
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(4, 7, 18, 0.88)',
        backdropFilter: 'blur(10px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'zoom-backdrop-fade 300ms ease-out',
      }}
    >
      {/* 90% Screen Modal Container */}
      <div
        style={{
          width: '92vw',
          height: '90vh',
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-neon)',
          borderRadius: '12px',
          boxShadow: '0 0 50px rgba(0, 240, 255, 0.25), 0 25px 60px rgba(0, 0, 0, 0.85)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'zoom-in-modal 300ms cubic-bezier(0.16, 1, 0.3, 1)',
          ...originStyle,
        }}
      >
        {/* Top Header & Tactical Controls */}
        <div
          style={{
            padding: '10px 18px',
            background: 'var(--bg-card)',
            borderBottom: '1px solid var(--border-dim)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          {/* Left: Mission Title & Telemetry Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>🛰</span>
              <span
                style={{
                  fontWeight: 800,
                  letterSpacing: '1.2px',
                  fontSize: '14px',
                  color: 'var(--neon-cyan)',
                }}
              >
                TACTICAL MAP MAGNIFIER
              </span>
            </div>

            {currentSnapshot && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-muted)',
                }}
              >
                <span
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    padding: '3px 8px',
                    borderRadius: '4px',
                  }}
                >
                  STEP: <b style={{ color: '#fff' }}>{currentStepIndex}</b> /{' '}
                  {Math.max(0, snapshots.length - 1)}
                </span>

                <span
                  style={{
                    background: 'rgba(0, 240, 255, 0.12)',
                    color: 'var(--neon-cyan)',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                  }}
                >
                  MODE: {currentSnapshot.rover.mode}
                </span>

                <span
                  style={{
                    background: 'rgba(16, 185, 129, 0.12)',
                    color: 'var(--neon-green)',
                    padding: '3px 8px',
                    borderRadius: '4px',
                  }}
                >
                  ENERGY: {Math.round(currentSnapshot.rover.energy)}/
                  {currentSnapshot.rover.max_energy}
                </span>
              </div>
            )}
          </div>

          {/* Center: 2D | 3D View Switcher */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(7, 10, 18, 0.7)',
              padding: '3px',
              borderRadius: '8px',
              border: '1px solid var(--border-dim)',
            }}
          >
            <button
              onClick={() => setViewMode('2D')}
              style={{
                padding: '6px 16px',
                borderRadius: '6px',
                border: 'none',
                background: viewMode === '2D' ? 'var(--neon-cyan)' : 'transparent',
                color: viewMode === '2D' ? '#070a12' : 'var(--text-muted)',
                fontWeight: 800,
                fontSize: '12px',
                letterSpacing: '1px',
              }}
            >
              2D CANVAS
            </button>
            <button
              onClick={() => setViewMode('3D')}
              style={{
                padding: '6px 16px',
                borderRadius: '6px',
                border: 'none',
                background: viewMode === '3D' ? 'var(--neon-cyan)' : 'transparent',
                color: viewMode === '3D' ? '#070a12' : 'var(--text-muted)',
                fontWeight: 800,
                fontSize: '12px',
                letterSpacing: '1px',
              }}
            >
              3D THREE.JS
            </button>
          </div>

          {/* Right: Quick Action Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {viewMode === '3D' ? (
              <>
                <button
                  onClick={toggleFollowRover}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${
                      followRover ? 'var(--neon-green)' : 'var(--border-dim)'
                    }`,
                    background: followRover
                      ? 'rgba(16, 185, 129, 0.15)'
                      : 'var(--bg-card)',
                    color: followRover ? 'var(--neon-green)' : 'var(--text-muted)',
                    fontSize: '11px',
                    fontWeight: 600,
                  }}
                  title="Keep camera focused on the moving rover"
                >
                  🎯 Follow Rover: {followRover ? 'ON' : 'OFF'}
                </button>

                <button
                  onClick={toggleRevealTrueMap}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${
                      revealTrueMap ? 'var(--neon-amber)' : 'var(--border-dim)'
                    }`,
                    background: revealTrueMap
                      ? 'rgba(245, 158, 11, 0.15)'
                      : 'var(--bg-card)',
                    color: revealTrueMap ? 'var(--neon-amber)' : 'var(--text-muted)',
                    fontSize: '11px',
                    fontWeight: 600,
                  }}
                  title="Toggle true terrain visibility"
                >
                  👁 True Map: {revealTrueMap ? 'REVEALED' : 'FOG'}
                </button>

                <button
                  onClick={() => setResetCameraKey((k) => k + 1)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-dim)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    fontSize: '11px',
                    fontWeight: 600,
                  }}
                  title="Reset 3D camera to top-down isometric overview"
                >
                  🌐 Overview
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={toggleFog}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-dim)',
                    background: showFog ? 'rgba(0, 240, 255, 0.15)' : 'var(--bg-card)',
                    color: showFog ? 'var(--neon-cyan)' : 'var(--text-muted)',
                    fontSize: '11px',
                  }}
                >
                  Fog: {showFog ? 'ON' : 'OFF'}
                </button>
                <button
                  onClick={toggleFrontiers}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-dim)',
                    background: showFrontiers
                      ? 'rgba(0, 240, 255, 0.15)'
                      : 'var(--bg-card)',
                    color: showFrontiers ? 'var(--neon-cyan)' : 'var(--text-muted)',
                    fontSize: '11px',
                  }}
                >
                  Frontiers
                </button>
                <button
                  onClick={togglePlannedPath}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-dim)',
                    background: showPlannedPath
                      ? 'rgba(0, 240, 255, 0.15)'
                      : 'var(--bg-card)',
                    color: showPlannedPath ? 'var(--neon-cyan)' : 'var(--text-muted)',
                    fontSize: '11px',
                  }}
                >
                  Trajectory
                </button>
                <button
                  onClick={toggleHeatmap}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-dim)',
                    background: showHeatmap
                      ? 'rgba(239, 68, 68, 0.2)'
                      : 'var(--bg-card)',
                    color: showHeatmap ? 'var(--neon-red)' : 'var(--text-muted)',
                    fontSize: '11px',
                  }}
                >
                  Heatmap
                </button>
              </>
            )}

            {/* Reset View Button */}
            <button
              onClick={handleResetView}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-dim)',
                background: 'var(--bg-card)',
                color: 'var(--text-muted)',
                fontSize: '11px',
                fontWeight: 600,
              }}
              title="Reset view zoom and pan"
            >
              ⟲ Reset View
            </button>

            {/* Close Button */}
            <button
              onClick={closeZoom}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                border: '1px solid var(--border-neon)',
                background: 'rgba(239, 68, 68, 0.15)',
                color: 'var(--neon-red)',
                fontSize: '16px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Close Zoom View (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Main View Area: 2D Canvas or 3D Scene */}
        <div
          ref={containerRef}
          style={{
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
            background: '#040711',
            cursor: viewMode === '2D' ? (isDragging ? 'grabbing' : 'grab') : 'default',
          }}
          onWheel={viewMode === '2D' ? handleWheel : undefined}
          onMouseDown={viewMode === '2D' ? handleMouseDown : undefined}
          onMouseMove={viewMode === '2D' ? handleMouseMove : undefined}
          onMouseUp={viewMode === '2D' ? handleMouseUp : undefined}
          onMouseLeave={viewMode === '2D' ? handleMouseUp : undefined}
        >
          {viewMode === '2D' ? (
            <canvas
              ref={canvasRef}
              style={{ width: '100%', height: '100%', display: 'block' }}
            />
          ) : currentSnapshot ? (
            <Scene3D
              snapshot={currentSnapshot}
              groundTruthMap={groundTruthMap}
              config={config}
              revealTrueMap={revealTrueMap}
              followRover={followRover}
              showFog={showFog}
              showFrontiers={showFrontiers}
              showPlannedPath={showPlannedPath}
              isReplanningBanner={isReplanningBanner}
              resetCameraKey={resetCameraKey}
              onHoverCell={handle3DHoverCell}
            />
          ) : null}

          {/* Floating Replanning Route Notification */}
          {isReplanningBanner && (
            <div
              style={{
                position: 'absolute',
                top: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                padding: '8px 24px',
                background: 'rgba(239, 68, 68, 0.95)',
                color: '#fff',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 'bold',
                letterSpacing: '1px',
                boxShadow: '0 0 25px rgba(239, 68, 68, 0.7)',
                animation: 'pulse-subtle 0.6s infinite ease-in-out',
                pointerEvents: 'none',
                zIndex: 10,
              }}
            >
              ⚡ REPLANNING ROUTE: TERRAIN UPDATE / SAFETY TRIGGER
            </div>
          )}

          {/* Cell Inspector Tooltip */}
          {hoverInfo && (
            <div
              style={{
                position: 'absolute',
                bottom: '16px',
                left: '20px',
                background: 'rgba(13, 19, 34, 0.92)',
                border: '1px solid var(--border-neon)',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--neon-cyan)',
                pointerEvents: 'none',
                boxShadow: '0 6px 20px rgba(0,0,0,0.6)',
                backdropFilter: 'blur(6px)',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <span>
                POS: <b>[{hoverInfo.x}, {hoverInfo.y}]</b>
              </span>
              <span style={{ color: 'var(--text-dim)' }}>|</span>
              <span style={{ color: '#fff' }}>{hoverInfo.type}</span>
              <span style={{ color: 'var(--text-dim)' }}>|</span>
              <span style={{ color: 'var(--neon-amber)' }}>Cost: {hoverInfo.cost}</span>
              <span style={{ color: 'var(--text-dim)' }}>|</span>
              <span
                style={{
                  color:
                    hoverInfo.status === 'Explored'
                      ? 'var(--neon-green)'
                      : 'var(--text-dim)',
                }}
              >
                {hoverInfo.status}
              </span>
            </div>
          )}

          {/* 2D Zoom/Pan instructions badge */}
          {viewMode === '2D' && (
            <div
              style={{
                position: 'absolute',
                bottom: '16px',
                right: '20px',
                background: 'rgba(13, 19, 34, 0.75)',
                border: '1px solid var(--border-dim)',
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            >
              ZOOM: {Math.round(zoom * 100)}% &bull; WHEEL TO ZOOM &bull; DRAG TO PAN
            </div>
          )}
        </div>

        {/* Bottom Playback Toolbar */}
        <div
          style={{
            padding: '10px 20px',
            background: 'var(--bg-card)',
            borderTop: '1px solid var(--border-dim)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          {/* Playback Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={stepBackward}
              title="Step Backward (ArrowLeft)"
              style={{
                background: 'var(--bg-panel)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-dim)',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            >
              ⏮
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              title="Play / Pause (Space)"
              style={{
                background: isPlaying
                  ? 'rgba(239, 68, 68, 0.2)'
                  : 'rgba(0, 240, 255, 0.2)',
                color: isPlaying ? 'var(--neon-red)' : 'var(--neon-cyan)',
                border: `1px solid ${
                  isPlaying ? 'var(--neon-red)' : 'var(--neon-cyan)'
                }`,
                padding: '8px 24px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 'bold',
              }}
            >
              {isPlaying ? '⏸ PAUSE' : '▶ PLAY'}
            </button>

            <button
              onClick={stepForward}
              title="Step Forward (ArrowRight)"
              style={{
                background: 'var(--bg-panel)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-dim)',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            >
              ⏭
            </button>

            <button
              onClick={resetPlayback}
              title="Reset to Step 0 (R)"
              style={{
                background: 'var(--bg-panel)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border-dim)',
                padding: '8px 14px',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            >
              ↺ RESET
            </button>
          </div>

          {/* Speed Slider */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
            }}
          >
            <span>SIM SPEED:</span>
            <input
              type="range"
              min="15"
              max="350"
              step="10"
              value={365 - playbackSpeed}
              onChange={(e) => setPlaybackSpeed(365 - Number(e.target.value))}
              style={{
                width: '140px',
                accentColor: 'var(--neon-cyan)',
                cursor: 'pointer',
              }}
            />
            <span style={{ color: 'var(--neon-cyan)', minWidth: '70px' }}>
              {Math.round(1000 / playbackSpeed)} steps/s
            </span>
          </div>

          {/* Keyboard shortcut hint */}
          <div
            style={{
              fontSize: '11px',
              color: 'var(--text-dim)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            [SPACE] PLAY/PAUSE &bull; [ARROWS] STEP &bull; [ESC] CLOSE
          </div>
        </div>
      </div>
    </div>
  );
};
