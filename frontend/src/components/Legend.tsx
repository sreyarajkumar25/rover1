import React from 'react';

export const Legend: React.FC = () => {
  const items = [
    { label: 'Open Ground', color: '#111827', border: '#1f293d' },
    { label: 'Obstacle', color: '#2d1b2d', border: '#dc2626' },
    { label: 'Hazard Zone', color: '#3b2509', border: '#d97706' },
    { label: 'Comm Zone', color: '#064e3b', border: '#10b981' },
    { label: 'Data Site', color: '#451a03', border: '#f59e0b' },
    { label: 'Frontier', color: 'rgba(0, 240, 255, 0.2)', border: '#00f0ff' },
    { label: 'Fog of War', color: '#040711', border: '#0e1628' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
        background: 'var(--bg-panel)',
        padding: '8px 16px',
        borderRadius: '6px',
        border: '1px solid var(--border-dim)',
        fontSize: '11px',
        fontFamily: 'var(--font-mono)',
      }}
    >
      <span style={{ color: 'var(--text-dim)', fontWeight: 700 }}>MAP LEGEND:</span>
      {items.map((item, idx) => (
        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              width: '12px',
              height: '12px',
              background: item.color,
              border: `1px solid ${item.border}`,
              borderRadius: '2px',
              display: 'inline-block',
            }}
          />
          <span style={{ color: 'var(--text-muted)' }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
};
