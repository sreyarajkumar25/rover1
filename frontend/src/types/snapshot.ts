export type RoverMode =
  | 'EXPLORING'
  | 'COLLECTING'
  | 'RETURNING'
  | 'UPLOADING'
  | 'SUCCESS'
  | 'LOST';

export enum CellType {
  OPEN = 0,
  OBSTACLE = 1,
  HAZARD = 2,
  COMM_ZONE = 3,
  DATA_SITE = 4,
}

export interface RoverState {
  pos: [number, number];
  energy: number;
  max_energy: number;
  data_carried: number;
  data_uploaded: number;
  mode: RoverMode;
}

export interface SnapshotMetrics {
  explored_pct: number;
  replans: number;
  energy_used: number;
  data_collected: number;
}

export interface MapDiff {
  pos: [number, number];
  val: number;
}

export interface Snapshot {
  step: number;
  grid_size: [number, number];
  true_map: number[][] | null;
  known_map: (number | null)[][];
  rover: RoverState;
  planned_path: [number, number][];
  trail: [number, number][];
  frontiers: [number, number][];
  return_cost: number;
  events: string[];
  metrics: SnapshotMetrics;
  map_diffs?: MapDiff[];
}

export interface RunConfig {
  seed: number;
  size: number;
  strategy: string;
  max_energy: number;
  sensor_radius: number;
  block_rate: number;
  safety_margin: number;
  hard_mode: boolean;
}

export interface RunSummary {
  run_id: string;
  status: string;
  config: RunConfig;
  metrics?: {
    explored_pct: number;
    data_collected: number;
    data_uploaded: number;
    upload_efficiency: number;
    energy_used: number;
    energy_remaining: number;
    steps: number;
    replans: number;
    blocked_events: number;
    mission_outcome: string;
    time_to_first_upload?: number | null;
  };
}

export interface StrategyInfo {
  id: string;
  name: string;
  description: string;
}

export interface ComparisonTableRow {
  strategy: string;
  success_rate: string;
  explored_pct: string;
  data_uploaded: string;
  energy_used: string;
  steps: string;
  replans: string;
}

export interface ComparisonData {
  seeds: number[];
  strategies: string[];
  table: ComparisonTableRow[];
  details: Record<string, any>;
}
