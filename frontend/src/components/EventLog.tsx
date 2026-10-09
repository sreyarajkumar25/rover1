import React, { useEffect, useRef } from 'react';
import { useMissionStore } from '../store/useMissionStore';

export const EventLog: React.FC = () => {
  const snapshots = useMissionStore((s) => s.snapshots);
  const currentStepIndex = useMissionStore((s) => s.currentStepIndex);
  const setStep = useMissionStore((s) => s.setStep);
  const logContainerRef = useRef<HTMLDivElement | null>(null);

  // Collect all events up to currentStepIndex
  const activeEvents: { step: number; event: string }[] = [];
  for (let i = 0; i <= currentStepIndex && i < snapshots.length; i++) {
    const snap = snapshots[i];
    if (snap.events) {
      for (const ev of snap.events) {
        activeEvents.push({ step: i, event: ev });
      }
    }
  }

  // Auto-scroll to bottom of log when step advances
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [currentStepIndex, activeEvents.length]);

  const formatEventText = (ev: string) => {
    if (ev.startsWith('safety_trigger:')) {
      const match = ev.match(/energy_(\d+)_cost_(\d+)/);
      if (match) {
        return `⚠️ Safety triggered: Rover energy ${match[1]} J ≤ return cost ${match[2]} J + margin. Return initiated!`;
      }
      return `⚠️ Return Safety buffer limit reached.`;
    }
    if (ev.startsWith('mode_change:')) {
      const mode = ev.split(':')[1];
      return `🔄 Mode transition: Rover switched to ${mode}.`;
    }
    if (ev.startsWith('replan:')) {
      const reason = ev.split(':')[1];
      return `⚡ Route Replanned: ${reason.replace(/_/g, ' ')}.`;
    }
    if (ev === 'replan') {
      return `⚡ Route Replanned: Navigating to optimal target.`;
    }
    if (ev.startsWith('collect:')) {
      const val = ev.split(':')[1];
      return `📦 Data Site Harvested: +${val} data units loaded.`;
    }
    if (ev.startsWith('upload:')) {
      const val = ev.split(':')[1];
      return `📡 High-Gain Upload: +${val} data units transmitted to Comm Zone!`;
    }
    if (ev.startsWith('blocked:')) {
      const pos = ev.split(':')[1];
      return `🚨 Dynamic Cave-in: Obstacle blocked path at ${pos}!`;
    }
    if (ev === 'mission_start') {
      return `🚀 Mission commenced from base station.`;
    }
    return ev;
  };

  const getEventBadgeColor = (ev: string) => {
    if (ev.includes('LOST') || ev.includes('blocked') || ev.includes('safety_trigger')) return 'var(--neon-red)';
    if (ev.includes('SUCCESS') || ev.includes('upload')) return 'var(--neon-green)';
    if (ev.includes('collect')) return 'var(--neon-amber)';
    if (ev.includes('replan')) return 'var(--neon-cyan)';
    return 'var(--text-muted)';
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--bg-panel)',
        borderRadius: '8px',
        border: '1px solid var(--border-dim)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-dim)',
          fontSize: '13px',
          fontWeight: 700,
          letterSpacing: '1px',
          color: 'var(--text-muted)',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>MISSION EVENT LOG</span>
        <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
          {activeEvents.length} events logged
        </span>
      </div>

      <div
        ref={logContainerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
        }}
      >
        {activeEvents.length === 0 ? (
          <div style={{ color: 'var(--text-dim)', textAlign: 'center', marginTop: '20px' }}>
            No mission events recorded yet.
          </div>
        ) : (
          activeEvents.map((item, idx) => {
            const badgeColor = getEventBadgeColor(item.event);
            return (
              <div
                key={idx}
                onClick={() => setStep(item.step)}
                style={{
                  display: 'flex',
                  gap: '10px',
                  padding: '6px 10px',
                  background: 'var(--bg-card)',
                  borderRadius: '4px',
                  borderLeft: `3px solid ${badgeColor}`,
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
              >
                <span style={{ color: 'var(--text-dim)', minWidth: '45px' }}>
                  T+{String(item.step).padStart(3, '0')}
                </span>
                <span style={{ color: 'var(--text-main)' }}>
                  {formatEventText(item.event)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
