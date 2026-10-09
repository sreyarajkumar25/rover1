import React from 'react';
import { useMissionStore } from '../store/useMissionStore';

export const ControlPanel: React.FC = () => {
  const isPlaying = useMissionStore((s) => s.isPlaying);
  const setIsPlaying = useMissionStore((s) => s.setIsPlaying);
  const stepForward = useMissionStore((s) => s.stepForward);
  const stepBackward = useMissionStore((s) => s.stepBackward);
  const resetPlayback = useMissionStore((s) => s.resetPlayback);

  const playbackSpeed = useMissionStore((s) => s.playbackSpeed);
  const setPlaybackSpeed = useMissionStore((s) => s.setPlaybackSpeed);

  const showFog = useMissionStore((s) => s.showFog);
  const toggleFog = useMissionStore((s) => s.toggleFog);

  const showFrontiers = useMissionStore((s) => s.showFrontiers);
  const toggleFrontiers = useMissionStore((s) => s.toggleFrontiers);

  const showPlannedPath = useMissionStore((s) => s.showPlannedPath);
  const togglePlannedPath = useMissionStore((s) => s.togglePlannedPath);

  const showHeatmap = useMissionStore((s) => s.showHeatmap);
  const toggleHeatmap = useMissionStore((s) => s.toggleHeatmap);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        background: 'var(--bg-panel)',
        padding: '16px',
        borderRadius: '8px',
        border: '1px solid var(--border-dim)',
      }}
    >
      <div style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '1px', color: 'var(--text-muted)' }}>
        MISSION PLAYBACK
      </div>

      {/* Primary Playback Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
        <button
          onClick={stepBackward}
          title="Step Backward (ArrowLeft)"
          style={{
            background: 'var(--bg-card)',
            color: 'var(--text-main)',
            border: '1px solid var(--border-dim)',
            padding: '10px 0',
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
            background: isPlaying ? 'rgba(239, 68, 68, 0.2)' : 'rgba(0, 240, 255, 0.2)',
            color: isPlaying ? 'var(--neon-red)' : 'var(--neon-cyan)',
            border: `1px solid ${isPlaying ? 'var(--neon-red)' : 'var(--neon-cyan)'}`,
            padding: '10px 0',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 'bold',
          }}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        <button
          onClick={stepForward}
          title="Step Forward (ArrowRight)"
          style={{
            background: 'var(--bg-card)',
            color: 'var(--text-main)',
            border: '1px solid var(--border-dim)',
            padding: '10px 0',
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
            background: 'var(--bg-card)',
            color: 'var(--text-muted)',
            border: '1px solid var(--border-dim)',
            padding: '10px 0',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        >
          ↺
        </button>
      </div>

      {/* Speed Slider */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            marginBottom: '6px',
            color: 'var(--text-muted)',
          }}
        >
          <span>SIM SPEED</span>
          <span style={{ color: 'var(--neon-cyan)' }}>{Math.round(1000 / playbackSpeed)} steps/s</span>
        </div>
        <input
          type="range"
          min="15"
          max="350"
          step="10"
          value={365 - playbackSpeed}
          onChange={(e) => setPlaybackSpeed(365 - Number(e.target.value))}
          style={{ width: '100%', accentColor: 'var(--neon-cyan)', cursor: 'pointer' }}
        />
      </div>

      <div style={{ height: '1px', background: 'var(--border-dim)' }} />

      {/* Layer Visibility Toggles */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
          MAP OVERLAYS
        </div>

        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', cursor: 'pointer' }}>
          <span>Fog of War</span>
          <input type="checkbox" checked={showFog} onChange={toggleFog} style={{ accentColor: 'var(--neon-cyan)' }} />
        </label>

        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', cursor: 'pointer' }}>
          <span>Exploration Frontiers</span>
          <input type="checkbox" checked={showFrontiers} onChange={toggleFrontiers} style={{ accentColor: 'var(--neon-cyan)' }} />
        </label>

        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', cursor: 'pointer' }}>
          <span>Planned Trajectory</span>
          <input type="checkbox" checked={showPlannedPath} onChange={togglePlannedPath} style={{ accentColor: 'var(--neon-cyan)' }} />
        </label>

        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', cursor: 'pointer' }}>
          <span>Hazard Risk Heatmap</span>
          <input type="checkbox" checked={showHeatmap} onChange={toggleHeatmap} style={{ accentColor: 'var(--neon-red)' }} />
        </label>
      </div>
    </div>
  );
};
