import { create } from 'zustand';
import { ComparisonData, RunConfig, Snapshot } from '../types/snapshot';

interface MissionState {
  runId: string | null;
  config: RunConfig;
  status: string;
  snapshots: Snapshot[];
  currentStepIndex: number;
  currentSnapshot: Snapshot | null;
  groundTruthMap: number[][] | null;

  // Playback settings
  isPlaying: boolean;
  playbackSpeed: number; // ms per frame

  // Visualization toggles
  showFog: boolean;
  showFrontiers: boolean;
  showPlannedPath: boolean;
  showHeatmap: boolean;
  isReplanningBanner: boolean;

  // Navigation & views
  activeTab: 'mission' | 'comparison' | 'offline';
  comparisonData: ComparisonData | null;
  comparisonLoading: boolean;
  connected: boolean;
  offlineMode: boolean;

  // Zoom modal & 3D view
  isZoomOpen: boolean;
  viewMode: '2D' | '3D';
  revealTrueMap: boolean;
  followRover: boolean;
  zoomOriginRect: { top: number; left: number; width: number; height: number } | null;

  // Actions
  setConfig: (config: Partial<RunConfig>) => void;
  setRun: (runId: string, snapshots: Snapshot[], config: RunConfig) => void;
  loadOfflineData: (snapshots: Snapshot[], config?: Partial<RunConfig>) => void;
  setStep: (stepIndex: number) => void;
  stepForward: () => void;
  stepBackward: () => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  toggleFog: () => void;
  toggleFrontiers: () => void;
  togglePlannedPath: () => void;
  toggleHeatmap: () => void;
  setReplanningBanner: (show: boolean) => void;
  setActiveTab: (tab: 'mission' | 'comparison' | 'offline') => void;
  setComparisonData: (data: ComparisonData | null) => void;
  setComparisonLoading: (loading: boolean) => void;
  setConnected: (connected: boolean) => void;
  appendSnapshot: (snapshot: Snapshot) => void;
  resetPlayback: () => void;

  // Zoom & 3D actions
  openZoom: (originRect?: { top: number; left: number; width: number; height: number } | null) => void;
  closeZoom: () => void;
  setViewMode: (mode: '2D' | '3D') => void;
  toggleViewMode: () => void;
  setRevealTrueMap: (reveal: boolean) => void;
  toggleRevealTrueMap: () => void;
  setFollowRover: (follow: boolean) => void;
  toggleFollowRover: () => void;
}

const DEFAULT_CONFIG: RunConfig = {
  seed: 42,
  size: 25,
  strategy: 'greedy',
  max_energy: 220,
  sensor_radius: 4,
  block_rate: 0.04,
  safety_margin: 6,
  hard_mode: false,
};

export const useMissionStore = create<MissionState>((set, get) => ({
  runId: null,
  config: DEFAULT_CONFIG,
  status: 'IDLE',
  snapshots: [],
  currentStepIndex: 0,
  currentSnapshot: null,
  groundTruthMap: null,

  isPlaying: false,
  playbackSpeed: 100,

  showFog: true,
  showFrontiers: true,
  showPlannedPath: true,
  showHeatmap: false,
  isReplanningBanner: false,

  activeTab: 'mission',
  comparisonData: null,
  comparisonLoading: false,
  connected: false,
  offlineMode: false,

  isZoomOpen: false,
  viewMode: '2D',
  revealTrueMap: false,
  followRover: false,
  zoomOriginRect: null,

  setConfig: (partial) =>
    set((state) => ({ config: { ...state.config, ...partial } })),

  setRun: (runId, snapshots, config) => {
    const firstMap = snapshots.length > 0 ? snapshots[0].true_map : null;
    set({
      runId,
      snapshots,
      config,
      status: 'LOADED',
      currentStepIndex: 0,
      currentSnapshot: snapshots[0] || null,
      groundTruthMap: firstMap,
      isPlaying: false,
      offlineMode: false,
    });
  },

  loadOfflineData: (snapshots, customConfig) => {
    if (!snapshots || snapshots.length === 0) return;
    const firstMap = snapshots[0].true_map;
    const size = snapshots[0].grid_size ? snapshots[0].grid_size[0] : 25;

    set((state) => ({
      runId: 'offline_replay',
      snapshots,
      currentStepIndex: 0,
      currentSnapshot: snapshots[0],
      groundTruthMap: firstMap,
      status: 'OFFLINE_REPLAY',
      isPlaying: false,
      offlineMode: true,
      activeTab: 'mission',
      config: {
        ...state.config,
        size,
        ...customConfig,
      },
    }));
  },

  setStep: (stepIndex) => {
    const { snapshots } = get();
    if (stepIndex >= 0 && stepIndex < snapshots.length) {
      const snap = snapshots[stepIndex];
      const hasReplan = snap.events?.some((e) => e.startsWith('replan'));
      set({
        currentStepIndex: stepIndex,
        currentSnapshot: snap,
        isReplanningBanner: hasReplan,
      });
    }
  },

  stepForward: () => {
    const { currentStepIndex, snapshots } = get();
    if (currentStepIndex < snapshots.length - 1) {
      get().setStep(currentStepIndex + 1);
    } else {
      set({ isPlaying: false });
    }
  },

  stepBackward: () => {
    const { currentStepIndex } = get();
    if (currentStepIndex > 0) {
      get().setStep(currentStepIndex - 1);
    }
  },

  setIsPlaying: (playing) => set({ isPlaying: playing }),

  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),

  toggleFog: () => set((state) => ({ showFog: !state.showFog })),

  toggleFrontiers: () => set((state) => ({ showFrontiers: !state.showFrontiers })),

  togglePlannedPath: () =>
    set((state) => ({ showPlannedPath: !state.showPlannedPath })),

  toggleHeatmap: () => set((state) => ({ showHeatmap: !state.showHeatmap })),

  setReplanningBanner: (show) => set({ isReplanningBanner: show }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  setComparisonData: (data) => set({ comparisonData: data }),

  setComparisonLoading: (loading) => set({ comparisonLoading: loading }),

  setConnected: (connected) => set({ connected }),

  appendSnapshot: (snapshot) => {
    const { snapshots, groundTruthMap } = get();
    let updatedTrueMap = groundTruthMap;
    if (snapshot.true_map) {
      updatedTrueMap = snapshot.true_map;
    } else if (snapshot.map_diffs && updatedTrueMap) {
      // Apply diffs to ground truth map
      updatedTrueMap = updatedTrueMap.map((row) => [...row]);
      for (const diff of snapshot.map_diffs) {
        const [x, y] = diff.pos;
        if (updatedTrueMap[y] && updatedTrueMap[y][x] !== undefined) {
          updatedTrueMap[y][x] = diff.val;
        }
      }
    }

    const hasReplan = snapshot.events?.some((e) => e.startsWith('replan'));

    set({
      snapshots: [...snapshots, snapshot],
      currentStepIndex: snapshots.length,
      currentSnapshot: snapshot,
      groundTruthMap: updatedTrueMap,
      isReplanningBanner: hasReplan,
    });
  },

  resetPlayback: () => {
    const { snapshots } = get();
    if (snapshots.length > 0) {
      set({
        currentStepIndex: 0,
        currentSnapshot: snapshots[0],
        isPlaying: false,
        isReplanningBanner: false,
      });
    }
  },

  openZoom: (originRect = null) =>
    set({ isZoomOpen: true, zoomOriginRect: originRect || null }),

  closeZoom: () => set({ isZoomOpen: false }),

  setViewMode: (mode) => set({ viewMode: mode }),

  toggleViewMode: () =>
    set((state) => ({ viewMode: state.viewMode === '2D' ? '3D' : '2D' })),

  setRevealTrueMap: (reveal) => set({ revealTrueMap: reveal }),

  toggleRevealTrueMap: () =>
    set((state) => ({ revealTrueMap: !state.revealTrueMap })),

  setFollowRover: (follow) => set({ followRover: follow }),

  toggleFollowRover: () =>
    set((state) => ({ followRover: !state.followRover })),
}));
