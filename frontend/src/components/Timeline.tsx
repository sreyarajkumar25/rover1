import React from 'react';
import { useMissionStore } from '../store/useMissionStore';

export const Timeline: React.FC = () => {
  const snapshots = useMissionStore((s) => s.snapshots);
  const currentStepIndex = useMissionStore((s) => s.currentStepIndex);
  const setStep = useMissionStore((s) => s.setStep);

  const total = snapshots.length;
  if (total === 0) return null;

  return (
    <div
      style={{
        background: 'var(--bg-panel)',
        padding: '12px 24px',
        borderTop: '1px solid var(--border-dim)',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12px',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)',
        }}
      >
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, color: 'var(--neon-cyan)' }}>TIMELINE SCRUBBER</span>
          <span style={{ color: 'var(--text-dim)' }}>
            Step {currentStepIndex} of {total - 1}
          </span>
        </div>

        {/* Legend for timeline ticks */}
        <div style={{ display: 'flex', gap: '12px', fontSize: '11px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', background: 'var(--neon-red)', borderRadius: '2px' }} /> Replan
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', background: 'var(--neon-amber)', borderRadius: '2px' }} /> Collect
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', background: 'var(--neon-green)', borderRadius: '2px' }} /> Upload
          </span>
        </div>
      </div>

      {/* Slider Track with Event Markers */}
      <div style={{ position: 'relative', width: '100%', height: '24px', display: 'flex', alignItems: 'center' }}>
        {/* Event ticks */}
        {snapshots.map((snap, idx) => {
          if (!snap.events || snap.events.length === 0) return null;
          const isReplan = snap.events.some((e) => e.startsWith('replan'));
          const isUpload = snap.events.some((e) => e.startsWith('upload'));
          const isCollect = snap.events.some((e) => e.startsWith('collect'));

          if (!isReplan && !isUpload && !isCollect) return null;

          const leftPct = (idx / (total - 1)) * 100;
          const color = isReplan ? '#ef4444' : isUpload ? '#10b981' : '#f59e0b';

          return (
            <div
              key={idx}
              title={`Step ${idx}: ${snap.events.join(', ')}`}
              onClick={() => setStep(idx)}
              style={{
                position: 'absolute',
                left: `${leftPct}%`,
                top: '4px',
                width: '3px',
                height: '14px',
                background: color,
                borderRadius: '1px',
                zIndex: 2,
                cursor: 'pointer',
                boxShadow: `0 0 4px ${color}`,
              }}
            />
          );
        })}

        <input
          type="range"
          min="0"
          max={total - 1}
          value={currentStepIndex}
          onChange={(e) => setStep(Number(e.target.value))}
          style={{
            width: '100%',
            zIndex: 3,
            accentColor: 'var(--neon-cyan)',
            cursor: 'pointer',
            height: '6px',
            background: 'transparent',
          }}
        />
      </div>
    </div>
  );
};
