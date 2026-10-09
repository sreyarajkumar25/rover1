import React from 'react';
import { useMissionStore } from '../store/useMissionStore';

export const Hud: React.FC = () => {
  const currentSnapshot = useMissionStore((s) => s.currentSnapshot);
  const connected = useMissionStore((s) => s.connected);
  const offlineMode = useMissionStore((s) => s.offlineMode);
  const totalSteps = useMissionStore((s) => s.snapshots.length);

  if (!currentSnapshot) return null;

  const rover = currentSnapshot.rover;
  const energyPct = Math.max(0, Math.min(100, (rover.energy / rover.max_energy) * 100));
  const returnCost = currentSnapshot.return_cost;
  const returnCostPct = returnCost > 0 ? Math.min(100, (returnCost / rover.max_energy) * 100) : 0;

  // Mode badge styling
  let modeBg = 'rgba(0, 240, 255, 0.2)';
  let modeBorder = 'var(--neon-cyan)';
  let modeColor = 'var(--neon-cyan)';

  if (rover.mode === 'RETURNING') {
    modeBg = 'rgba(16, 185, 129, 0.2)';
    modeBorder = 'var(--neon-green)';
    modeColor = 'var(--neon-green)';
  } else if (rover.mode === 'COLLECTING') {
    modeBg = 'rgba(245, 158, 11, 0.2)';
    modeBorder = 'var(--neon-amber)';
    modeColor = 'var(--neon-amber)';
  } else if (rover.mode === 'SUCCESS') {
    modeBg = 'rgba(16, 185, 129, 0.3)';
    modeBorder = '#34d399';
    modeColor = '#34d399';
  } else if (rover.mode === 'LOST') {
    modeBg = 'rgba(239, 68, 68, 0.3)';
    modeBorder = 'var(--neon-red)';
    modeColor = 'var(--neon-red)';
  }

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 24px',
        background: 'var(--bg-panel)',
        borderBottom: '1px solid var(--border-dim)',
        gap: '24px',
        flexWrap: 'wrap',
      }}
    >
      {/* Title & Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <h1
          style={{
            fontSize: '18px',
            fontWeight: 700,
            letterSpacing: '1px',
            color: 'var(--text-main)',
            textTransform: 'uppercase',
          }}
        >
          🚀 LOST IN SPACE <span style={{ color: 'var(--neon-cyan)', fontSize: '13px' }}>v1.0</span>
        </h1>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            padding: '4px 10px',
            borderRadius: '12px',
            background: offlineMode ? 'rgba(192, 132, 252, 0.15)' : connected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            color: offlineMode ? 'var(--neon-purple)' : connected ? 'var(--neon-green)' : 'var(--neon-red)',
            border: `1px solid ${offlineMode ? 'var(--neon-purple)' : connected ? 'var(--neon-green)' : 'var(--neon-red)'}`,
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'currentColor',
              display: 'inline-block',
            }}
          />
          {offlineMode ? 'OFFLINE REPLAY' : connected ? 'LIVE TELEMETRY' : 'CONNECTING'}
        </div>
      </div>

      {/* Energy Bar & Safety Return Marker */}
      <div style={{ flex: '1 1 260px', maxWidth: '380px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            marginBottom: '4px',
          }}
        >
          <span style={{ color: 'var(--text-muted)' }}>ENERGY BUFFER</span>
          <span style={{ color: rover.energy <= returnCost ? 'var(--neon-red)' : 'var(--neon-cyan)' }}>
            {rover.energy} / {rover.max_energy} J
          </span>
        </div>
        <div
          style={{
            position: 'relative',
            height: '10px',
            background: '#1e293b',
            borderRadius: '5px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${energyPct}%`,
              height: '100%',
              background: rover.energy <= returnCost ? 'var(--neon-red)' : 'linear-gradient(90deg, #00f0ff, #10b981)',
              transition: 'width 0.2s ease',
            }}
          />
          {/* Minimum Return Cost Marker */}
          {returnCost > 0 && (
            <div
              title={`Return Cost Threshold: ${returnCost} J`}
              style={{
                position: 'absolute',
                left: `${returnCostPct}%`,
                top: 0,
                bottom: 0,
                width: '3px',
                background: '#f43f5e',
                boxShadow: '0 0 6px #f43f5e',
                zIndex: 2,
              }}
            />
          )}
        </div>
      </div>

      {/* Data Counters & Step Indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>DATA UPLOADED</div>
          <div style={{ fontSize: '15px', color: 'var(--neon-green)', fontWeight: 700 }}>
            {rover.data_uploaded} <span style={{ fontSize: '12px', color: 'var(--neon-amber)' }}>({rover.data_carried} held)</span>
          </div>
        </div>

        <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>MISSION STEP</div>
          <div style={{ fontSize: '15px', color: 'var(--text-main)', fontWeight: 700 }}>
            {currentSnapshot.step} <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>/ {Math.max(0, totalSteps - 1)}</span>
          </div>
        </div>

        {/* Mission Mode Badge */}
        <div
          style={{
            padding: '6px 14px',
            borderRadius: '6px',
            background: modeBg,
            border: `1px solid ${modeBorder}`,
            color: modeColor,
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
            fontWeight: 700,
            letterSpacing: '1px',
          }}
        >
          {rover.mode}
        </div>
      </div>
    </header>
  );
};
