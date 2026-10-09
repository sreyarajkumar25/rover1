import React, { useState } from 'react';
import { useMissionStore } from '../store/useMissionStore';

export const OfflineLoader: React.FC = () => {
  const loadOfflineData = useMissionStore((s) => s.loadOfflineData);
  const setComparisonData = useMissionStore((s) => s.setComparisonData);
  const setActiveTab = useMissionStore((s) => s.setActiveTab);

  const [isDragging, setIsDragging] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const parseAndLoadJson = (content: string) => {
    try {
      const data = JSON.parse(content);
      if (Array.isArray(data)) {
        // Direct list of snapshots
        loadOfflineData(data);
        setStatusMessage(`Loaded ${data.length} mission snapshots!`);
        setTimeout(() => setActiveTab('mission'), 600);
      } else if (data.snapshots && Array.isArray(data.snapshots)) {
        // Object containing snapshots array
        loadOfflineData(data.snapshots, data.config);
        setStatusMessage(`Loaded ${data.snapshots.length} mission snapshots from package!`);
        setTimeout(() => setActiveTab('mission'), 600);
      } else if (data.table && data.strategies) {
        // Comparison benchmark package
        setComparisonData(data);
        setStatusMessage(`Loaded strategy comparison benchmark (${data.strategies.length} strategies)!`);
        setTimeout(() => setActiveTab('comparison'), 600);
      } else {
        setStatusMessage('JSON file parsed, but unrecognized format.');
      }
    } catch (err: any) {
      setStatusMessage(`Parse error: ${err.message}`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        parseAndLoadJson(text);
      };
      reader.readAsText(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        parseAndLoadJson(text);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        height: '100%',
        background: 'var(--bg-space)',
        gap: '20px',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: '540px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '1px' }}>
          💾 OFFLINE REPLAY & ARCHIVE LOADER
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '6px' }}>
          Inspect and playback recorded simulation snapshots without needing a live backend connection.
        </p>
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        style={{
          width: '100%',
          maxWidth: '540px',
          padding: '40px 20px',
          border: `2px dashed ${isDragging ? 'var(--neon-cyan)' : 'var(--border-dim)'}`,
          borderRadius: '12px',
          background: isDragging ? 'rgba(0, 240, 255, 0.05)' : 'var(--bg-panel)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        <span style={{ fontSize: '36px' }}>📂</span>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>
          Drag and drop snapshots.json or comparison.json here
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
          or choose a file from your device
        </div>

        <input
          type="file"
          accept=".json"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          id="offline-file-input"
        />
        <label
          htmlFor="offline-file-input"
          style={{
            marginTop: '8px',
            background: 'var(--bg-card)',
            color: 'var(--neon-cyan)',
            border: '1px solid var(--border-neon)',
            padding: '8px 20px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Select JSON File
        </label>
      </div>

      {statusMessage && (
        <div
          style={{
            padding: '10px 20px',
            borderRadius: '6px',
            background: 'rgba(0, 240, 255, 0.1)',
            border: '1px solid var(--border-neon)',
            color: 'var(--neon-cyan)',
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
          }}
        >
          {statusMessage}
        </div>
      )}
    </div>
  );
};
