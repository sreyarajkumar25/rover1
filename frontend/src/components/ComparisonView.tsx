import React, { useState } from 'react';
import { runComparison } from '../api/client';
import { useMissionStore } from '../store/useMissionStore';

export const ComparisonView: React.FC = () => {
  const config = useMissionStore((s) => s.config);
  const comparisonData = useMissionStore((s) => s.comparisonData);
  const setComparisonData = useMissionStore((s) => s.setComparisonData);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRunBenchmark = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await runComparison(
        ['greedy', 'frontier', 'risk_aware', 'value_aware'],
        [42, 101, 202, 303, 404],
        config
      );
      setComparisonData(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to execute strategy comparison benchmark.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        padding: '24px',
        height: '100%',
        overflowY: 'auto',
        background: 'var(--bg-space)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '1px' }}>
            📊 STRATEGY BENCHMARKING & COMPARISON
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Multi-seed empirical evaluation measuring exploration coverage, upload efficiency, and safety.
          </p>
        </div>

        <button
          onClick={handleRunBenchmark}
          disabled={loading}
          style={{
            background: 'linear-gradient(135deg, #00f0ff, #10b981)',
            color: '#070a12',
            border: 'none',
            padding: '10px 24px',
            borderRadius: '6px',
            fontWeight: 700,
            fontSize: '13px',
            letterSpacing: '1px',
            boxShadow: '0 0 15px rgba(0, 240, 255, 0.4)',
          }}
        >
          {loading ? 'RUNNING BENCHMARKS...' : '⚡ RUN 5-SEED BENCHMARK'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--neon-red)', borderRadius: '6px', color: 'var(--neon-red)', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {/* Comparative Visual Bar Charts */}
      {comparisonData && comparisonData.details && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '16px',
          }}
        >
          {/* Uploaded Data Comparison */}
          <div style={{ background: 'var(--bg-panel)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-dim)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 600 }}>
              MEAN DATA COMMITTED (HIGHER IS BETTER)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {Object.entries(comparisonData.details).map(([strat, item]: [string, any]) => {
                const meanVal = item.summary.data_uploaded.mean;
                const maxExpected = 400;
                const widthPct = Math.min(100, (meanVal / maxExpected) * 100);
                return (
                  <div key={strat}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>
                      <span style={{ textTransform: 'uppercase' }}>{strat}</span>
                      <span style={{ color: 'var(--neon-green)', fontWeight: 700 }}>{meanVal} pts</span>
                    </div>
                    <div style={{ height: '10px', background: '#1e293b', borderRadius: '5px', overflow: 'hidden' }}>
                      <div style={{ width: `${widthPct}%`, height: '100%', background: 'var(--neon-green)' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Energy Consumed Comparison */}
          <div style={{ background: 'var(--bg-panel)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-dim)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 600 }}>
              MEAN ENERGY EXPENDITURE (LOWER IS MORE CONSERVATIVE)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {Object.entries(comparisonData.details).map(([strat, item]: [string, any]) => {
                const meanVal = item.summary.energy_used.mean;
                const maxExpected = 250;
                const widthPct = Math.min(100, (meanVal / maxExpected) * 100);
                return (
                  <div key={strat}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>
                      <span style={{ textTransform: 'uppercase' }}>{strat}</span>
                      <span style={{ color: 'var(--neon-cyan)', fontWeight: 700 }}>{meanVal} J</span>
                    </div>
                    <div style={{ height: '10px', background: '#1e293b', borderRadius: '5px', overflow: 'hidden' }}>
                      <div style={{ width: `${widthPct}%`, height: '100%', background: 'var(--neon-cyan)' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Statistical Summary Table */}
      {comparisonData ? (
        <div style={{ background: 'var(--bg-panel)', borderRadius: '8px', border: '1px solid var(--border-dim)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-dim)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px 16px' }}>STRATEGY</th>
                <th style={{ padding: '12px 16px' }}>SUCCESS RATE</th>
                <th style={{ padding: '12px 16px' }}>EXPLORED %</th>
                <th style={{ padding: '12px 16px' }}>DATA UPLOADED</th>
                <th style={{ padding: '12px 16px' }}>ENERGY USED</th>
                <th style={{ padding: '12px 16px' }}>STEPS</th>
                <th style={{ padding: '12px 16px' }}>REPLANS</th>
              </tr>
            </thead>
            <tbody>
              {comparisonData.table.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border-dim)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--neon-cyan)', textTransform: 'uppercase' }}>
                    {row.strategy}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--neon-green)', fontWeight: 700 }}>
                    {row.success_rate}
                  </td>
                  <td style={{ padding: '12px 16px' }}>{row.explored_pct}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--neon-amber)' }}>{row.data_uploaded}</td>
                  <td style={{ padding: '12px 16px' }}>{row.energy_used}</td>
                  <td style={{ padding: '12px 16px' }}>{row.steps}</td>
                  <td style={{ padding: '12px 16px' }}>{row.replans}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          style={{
            background: 'var(--bg-panel)',
            padding: '40px',
            textAlign: 'center',
            borderRadius: '8px',
            border: '1px dashed var(--border-dim)',
            color: 'var(--text-muted)',
          }}
        >
          Click "RUN 5-SEED BENCHMARK" above or load comparison demo data to compare strategy performance.
        </div>
      )}
    </div>
  );
};
