import React, { useEffect } from 'react';
import { createRun, getSnapshots } from './api/client';
import { MapCanvas } from './canvas/MapCanvas';
import { ComparisonView } from './components/ComparisonView';
import { ConfigForm } from './components/ConfigForm';
import { ControlPanel } from './components/ControlPanel';
import { EventLog } from './components/EventLog';
import { Hud } from './components/Hud';
import { Legend } from './components/Legend';
import { MetricsPanel } from './components/MetricsPanel';
import { OfflineLoader } from './components/OfflineLoader';
import { Timeline } from './components/Timeline';
import { MapZoomModal } from './components/MapZoomModal';
import { useKeyboard } from './hooks/useKeyboard';
import { usePlayback } from './hooks/usePlayback';
import { useMissionStore } from './store/useMissionStore';

export const App: React.FC = () => {
  const activeTab = useMissionStore((s) => s.activeTab);
  const setActiveTab = useMissionStore((s) => s.setActiveTab);
  const config = useMissionStore((s) => s.config);
  const setRun = useMissionStore((s) => s.setRun);
  const setConnected = useMissionStore((s) => s.setConnected);

  // Activate playback intervals and keyboard shortcuts
  usePlayback();
  useKeyboard();

  // Load initial simulation on mount
  useEffect(() => {
    async function initDefaultMission() {
      try {
        const summary = await createRun(config);
        const snapshots = await getSnapshots(summary.run_id);
        setRun(summary.run_id, snapshots, config);
        setConnected(true);
      } catch (err) {
        console.warn('Backend not detected; falling back to offline readiness mode:', err);
        setConnected(false);
      }
    }
    initDefaultMission();
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        background: 'var(--bg-space)',
        overflow: 'hidden',
      }}
    >
      {/* HUD Header */}
      <Hud />

      {/* Navigation Bar */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 24px',
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--border-dim)',
        }}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('mission')}
            style={{
              padding: '6px 16px',
              borderRadius: '4px',
              border: 'none',
              background: activeTab === 'mission' ? 'var(--neon-cyan)' : 'transparent',
              color: activeTab === 'mission' ? '#070a12' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '12px',
              letterSpacing: '1px',
            }}
          >
            MISSION CONTROL
          </button>

          <button
            onClick={() => setActiveTab('comparison')}
            style={{
              padding: '6px 16px',
              borderRadius: '4px',
              border: 'none',
              background: activeTab === 'comparison' ? 'var(--neon-cyan)' : 'transparent',
              color: activeTab === 'comparison' ? '#070a12' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '12px',
              letterSpacing: '1px',
            }}
          >
            STRATEGY BENCHMARK
          </button>

          <button
            onClick={() => setActiveTab('offline')}
            style={{
              padding: '6px 16px',
              borderRadius: '4px',
              border: 'none',
              background: activeTab === 'offline' ? 'var(--neon-cyan)' : 'transparent',
              color: activeTab === 'offline' ? '#070a12' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '12px',
              letterSpacing: '1px',
            }}
          >
            OFFLINE REPLAY
          </button>
        </div>

        <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
          KEYBOARD: [SPACE] PLAY/PAUSE &bull; [ARROWS] STEP &bull; [R] RESET
        </div>
      </nav>

      {/* Main Tab Content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'comparison' ? (
          <ComparisonView />
        ) : activeTab === 'offline' ? (
          <OfflineLoader />
        ) : (
          /* Mission Control Grid Layout */
          <div
            style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: '290px 1fr 310px',
              gridTemplateRows: '1fr 180px',
              gap: '12px',
              padding: '12px',
              overflow: 'hidden',
              minHeight: 0,
            }}
          >
            {/* Left Column: Controls & Configuration */}
            <div
              style={{
                gridRow: '1 / 3',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                overflowY: 'auto',
              }}
            >
              <ControlPanel />
              <ConfigForm />
            </div>

            {/* Center Top: Mission Map Canvas */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                minHeight: 0,
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid var(--border-dim)',
              }}
            >
              <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
                <MapCanvas />
              </div>
              <Legend />
            </div>

            {/* Right Column: Telemetry & Metrics */}
            <div
              style={{
                gridRow: '1 / 3',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                overflowY: 'auto',
              }}
            >
              <MetricsPanel />
            </div>

            {/* Center Bottom: Timeline & Event Log */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 320px',
                gap: '12px',
                minHeight: 0,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <Timeline />
              </div>
              <div style={{ minHeight: 0 }}>
                <EventLog />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Map Zoom & 3D Tactical Overlay */}
      <MapZoomModal />
    </div>
  );
};
export default App;
