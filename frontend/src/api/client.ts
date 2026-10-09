import { ComparisonData, RunConfig, RunSummary, Snapshot, StrategyInfo } from '../types/snapshot';

const API_BASE = '/api';

export async function createRun(config: RunConfig): Promise<RunSummary> {
  const res = await fetch(`${API_BASE}/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to create run (${res.status})`);
  }
  return res.json();
}

export async function getRun(runId: string): Promise<RunSummary> {
  const res = await fetch(`${API_BASE}/runs/${runId}`);
  if (!res.ok) throw new Error(`Run ${runId} not found`);
  return res.json();
}

export async function getSnapshots(runId: string): Promise<Snapshot[]> {
  const res = await fetch(`${API_BASE}/runs/${runId}/snapshots`);
  if (!res.ok) throw new Error(`Failed to load snapshots for ${runId}`);
  return res.json();
}

export async function getStrategies(): Promise<StrategyInfo[]> {
  const res = await fetch(`${API_BASE}/strategies`);
  if (!res.ok) throw new Error('Failed to fetch strategies');
  return res.json();
}

export async function runComparison(
  strategies: string[],
  seeds: number[],
  config?: RunConfig
): Promise<ComparisonData> {
  const res = await fetch(`${API_BASE}/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ strategies, seeds, config }),
  });
  if (!res.ok) throw new Error('Failed to execute comparison');
  return res.json();
}

export function getExportUrl(runId: string, format: 'json' | 'csv'): string {
  return `${API_BASE}/runs/${runId}/export?format=${format}`;
}
