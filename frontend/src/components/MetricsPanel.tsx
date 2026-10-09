import React from 'react';
import { getExportUrl } from '../api/client';
import { useMissionStore } from '../store/useMissionStore';
import { LiveCharts } from './Charts';

export const MetricsPanel: React.FC = () => {
  const currentSnapshot = useMissionStore((s) => s.currentSnapshot);
  const runId = useMissionStore((s) => s.runId);
  const offlineMode = useMissionStore((s) => s.offlineMode);

  if (!currentSnapshot) return null;

  const { rover, metrics, return_cost } = currentSnapshot;
  const safetyBuffer = return_cost > 0 ? rover.energy - return_cost : 0;

  const handleExport = (format: 'json' | 'csv') => {
    if (offlineMode || !runId) {
      // Export current snapshots in memory
      const snapshots = useMissionStore.getState().snapshots;
      const dataStr = format === 'json'
        ? JSON.stringify(snapshots, null, 2)
        : 'step,energy,data_uploaded\n' + snapshots.map((s) => `${s.step},${s.rover.energy},${s.rover.data_uploaded}`).join('\n');
      const blob = new Blob([dataStr], { type: format === 'json' ? 'application/json' : 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mission_${runId || 'replay'}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    window.open(getExportUrl(runId, format), '_blank');
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
        overflowY: 'auto',
      }}
    >
      <div style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '1px', color: 'var(--text-muted)' }}>
        MISSION TELEMETRY
      </div>

      {/* Metric Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div style={{ background: 'var(--bg-card)', padding: '10px', borderRadius: '6px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>EXPLORED</div>
          <div style={{ fontSize: '18px', color: 'var(--neon-green)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
            {metrics.explored_pct}%
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: '10px', borderRadius: '6px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>REPLANS</div>
          <div style={{ fontSize: '18px', color: 'var(--neon-cyan)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
            {metrics.replans}
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: '10px', borderRadius: '6px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>RETURN COST</div>
          <div style={{ fontSize: '18px', color: return_cost > 0 ? 'var(--neon-amber)' : 'var(--text-dim)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
            {return_cost > 0 ? `${return_cost} J` : 'At Base'}
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: '10px', borderRadius: '6px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>SAFETY BUFFER</div>
          <div style={{ fontSize: '18px', color: safetyBuffer > 5 ? 'var(--neon-green)' : 'var(--neon-red)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
            +{safetyBuffer} J
          </div>
        </div>
      </div>

      <div style={{ height: '1px', background: 'var(--border-dim)' }} />

      {/* Live Charts */}
      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
        REAL-TIME TRENDS
      </div>
      <LiveCharts />

      <div style={{ height: '1px', background: 'var(--border-dim)' }} />

      {/* Export Options */}
      <div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>
          EXPORT RESULTS
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <button
            onClick={() => handleExport('json')}
            style={{
              background: 'var(--bg-card)',
              color: 'var(--neon-cyan)',
              border: '1px solid var(--border-neon)',
              padding: '8px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            Export JSON
          </button>
          <button
            onClick={() => handleExport('csv')}
            style={{
              background: 'var(--bg-card)',
              color: 'var(--neon-green)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              padding: '8px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            Export CSV
          </button>
        </div>
      </div>
    </div>
  );
};
