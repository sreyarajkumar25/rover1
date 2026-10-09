import React, { useState } from 'react';
import { createRun, getSnapshots } from '../api/client';
import { useMissionStore } from '../store/useMissionStore';

export const ConfigForm: React.FC = () => {
  const config = useMissionStore((s) => s.config);
  const setConfig = useMissionStore((s) => s.setConfig);
  const setRun = useMissionStore((s) => s.setRun);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLaunch = async () => {
    setLoading(true);
    setError(null);
    try {
      const summary = await createRun(config);
      const snapshots = await getSnapshots(summary.run_id);
      setRun(summary.run_id, snapshots, config);
    } catch (err: any) {
      setError(err?.message || 'Failed to start simulation');
    } finally {
      setLoading(false);
    }
  };

  const handleRandomizeSeed = () => {
    setConfig({ seed: Math.floor(Math.random() * 90000) + 1000 });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        background: 'var(--bg-panel)',
        padding: '16px',
        borderRadius: '8px',
        border: '1px solid var(--border-dim)',
      }}
    >
      <div style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '1px', color: 'var(--text-muted)' }}>
        MISSION CONFIGURATION
      </div>

      {error && (
        <div style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--neon-red)', borderRadius: '6px', fontSize: '12px', color: 'var(--neon-red)' }}>
          {error}
        </div>
      )}

      {/* Seed */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}>
          <span style={{ color: 'var(--text-muted)' }}>SEED</span>
          <button
            onClick={handleRandomizeSeed}
            style={{ background: 'none', border: 'none', color: 'var(--neon-cyan)', fontSize: '11px', textDecoration: 'underline' }}
          >
            Randomize
          </button>
        </div>
        <input
          type="number"
          value={config.seed}
          onChange={(e) => setConfig({ seed: Number(e.target.value) })}
          style={{ width: '100%' }}
        />
      </div>

      {/* Strategy */}
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>
          STRATEGY
        </label>
        <select
          value={config.strategy}
          onChange={(e) => setConfig({ strategy: e.target.value })}
          style={{ width: '100%' }}
        >
          <option value="greedy">Greedy Target Selection</option>
          <option value="frontier">Frontier-Based (Max Info Gain)</option>
          <option value="risk_aware">Risk-Aware (Adaptive Buffer)</option>
          <option value="value_aware">Value-Aware (ROI Net Utility)</option>
        </select>
      </div>

      {/* Grid Size & Battery Capacity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
            GRID SIZE
          </label>
          <input
            type="number"
            min="12"
            max="60"
            value={config.size}
            onChange={(e) => setConfig({ size: Number(e.target.value) })}
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
            MAX ENERGY
          </label>
          <input
            type="number"
            min="50"
            max="1000"
            step="10"
            value={config.max_energy}
            onChange={(e) => setConfig({ max_energy: Number(e.target.value) })}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      {/* Sensor Radius & Block Rate */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
            SENSOR RADIUS
          </label>
          <input
            type="number"
            min="2"
            max="10"
            value={config.sensor_radius}
            onChange={(e) => setConfig({ sensor_radius: Number(e.target.value) })}
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
            SAFETY MARGIN
          </label>
          <input
            type="number"
            min="0"
            max="30"
            value={config.safety_margin}
            onChange={(e) => setConfig({ safety_margin: Number(e.target.value) })}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      {/* Dynamic Block Rate */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
          <span>DYNAMIC BLOCK RATE</span>
          <span style={{ color: 'var(--neon-cyan)' }}>{Math.round(config.block_rate * 100)}% / step</span>
        </div>
        <input
          type="range"
          min="0"
          max="0.2"
          step="0.01"
          value={config.block_rate}
          onChange={(e) => setConfig({ block_rate: Number(e.target.value) })}
          style={{ width: '100%', accentColor: 'var(--neon-cyan)', cursor: 'pointer' }}
        />
      </div>

      {/* Hard Mode Toggle */}
      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', cursor: 'pointer' }}>
        <span style={{ color: config.hard_mode ? 'var(--neon-red)' : 'var(--text-main)', fontWeight: config.hard_mode ? 'bold' : 'normal' }}>
          ⚠️ Hard Mode (Hazard Shields)
        </span>
        <input
          type="checkbox"
          checked={config.hard_mode}
          onChange={(e) => setConfig({ hard_mode: e.target.checked })}
          style={{ accentColor: 'var(--neon-red)' }}
        />
      </label>

      {/* Launch Mission Button */}
      <button
        onClick={handleLaunch}
        disabled={loading}
        style={{
          marginTop: '6px',
          background: 'linear-gradient(135deg, #00f0ff, #10b981)',
          color: '#070a12',
          border: 'none',
          padding: '12px',
          borderRadius: '6px',
          fontWeight: 700,
          letterSpacing: '1px',
          fontSize: '13px',
          boxShadow: '0 0 15px rgba(0, 240, 255, 0.4)',
        }}
      >
        {loading ? 'SIMULATING MISSION...' : '⚡ LAUNCH MISSION'}
      </button>
    </div>
  );
};
