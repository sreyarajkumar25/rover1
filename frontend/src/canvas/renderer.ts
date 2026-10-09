import { Snapshot } from '../types/snapshot';
import { drawFogOfWar } from './drawFog';
import { drawGridCells } from './drawGrid';
import { drawFrontiers, drawHeatmapOverlay, drawPlannedPath, drawTrail } from './drawPaths';
import { drawRover } from './drawRover';
import { drawBlockedFlash, ParticleSystem } from './effects';

export interface RenderOptions {
  showFog: boolean;
  showFrontiers: boolean;
  showPlannedPath: boolean;
  showHeatmap: boolean;
  groundTruthMap: number[][] | null;
}

export class MissionRenderer {
  private particleSystem = new ParticleSystem();
  private prevRoverPos: [number, number] = [1, 1];
  private targetRoverPos: [number, number] = [1, 1];
  private currentRoverPos: [number, number] = [1, 1];
  private headingAngle: number = 0;
  private lastStepIndex: number = -1;
  private interpolationProgress: number = 1.0;

  public render(
    ctx: CanvasRenderingContext2D,
    snapshot: Snapshot,
    options: RenderOptions,
    width: number,
    height: number,
    timeMs: number,
    zoomScale: number = 1.0,
    panX: number = 0,
    panY: number = 0
  ): void {
    const [gridW, gridH] = snapshot.grid_size || [25, 25];
    const cellSize = Math.min(width / gridW, height / gridH);

    // Center offset
    const offsetX = (width - gridW * cellSize) / 2;
    const offsetY = (height - gridH * cellSize) / 2;

    // Detect step changes to initiate smooth interpolation
    if (snapshot.step !== this.lastStepIndex) {
      this.prevRoverPos = [...this.currentRoverPos];
      this.targetRoverPos = [...snapshot.rover.pos];
      this.interpolationProgress = 0.0;
      this.lastStepIndex = snapshot.step;

      // Update heading angle
      const dx = this.targetRoverPos[0] - this.prevRoverPos[0];
      const dy = this.targetRoverPos[1] - this.prevRoverPos[1];
      if (dx !== 0 || dy !== 0) {
        this.headingAngle = Math.atan2(dy, dx) + Math.PI / 2;
      }

      // Check upload event to trigger particles
      const isUpload = snapshot.events?.some((e) => e.startsWith('upload'));
      if (isUpload) {
        const rcx = (snapshot.rover.pos[0] + 0.5) * cellSize;
        const rcy = (snapshot.rover.pos[1] + 0.5) * cellSize;
        this.particleSystem.spawnUploadParticles(rcx, rcy, 24);
      }
    }

    // Advance interpolation smoothly
    this.interpolationProgress = Math.min(1.0, this.interpolationProgress + 0.16);
    this.currentRoverPos = [
      this.prevRoverPos[0] + (this.targetRoverPos[0] - this.prevRoverPos[0]) * this.interpolationProgress,
      this.prevRoverPos[1] + (this.targetRoverPos[1] - this.prevRoverPos[1]) * this.interpolationProgress,
    ];

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    ctx.save();
    if (zoomScale !== 1.0 || panX !== 0 || panY !== 0) {
      ctx.translate(width / 2 + panX, height / 2 + panY);
      ctx.scale(zoomScale, zoomScale);
      ctx.translate(-width / 2, -height / 2);
    }
    ctx.translate(offsetX, offsetY);

    // 1. Grid Cells
    const baseMap = (options.groundTruthMap || snapshot.true_map) ||
      snapshot.known_map.map((row) => row.map((c) => (c === null ? 0 : c)));

    drawGridCells(ctx, baseMap, cellSize, timeMs);

    // 2. Heatmap overlay if toggled
    if (options.showHeatmap) {
      drawHeatmapOverlay(ctx, baseMap, cellSize);
    }

    // 3. Fog of war if toggled
    if (options.showFog) {
      drawFogOfWar(
        ctx,
        snapshot.known_map,
        cellSize,
        snapshot.rover.pos,
        4
      );
    }

    // 4. Frontiers
    if (options.showFrontiers) {
      drawFrontiers(ctx, snapshot.frontiers, cellSize, timeMs);
    }

    // 5. Historical Path Trail
    drawTrail(ctx, snapshot.trail, cellSize);

    // 6. Planned Path
    if (options.showPlannedPath && snapshot.planned_path.length > 0) {
      drawPlannedPath(
        ctx,
        snapshot.planned_path,
        snapshot.rover.pos,
        cellSize,
        snapshot.rover.mode === 'RETURNING',
        timeMs
      );
    }

    // 7. Dynamic Block Flash
    for (const event of snapshot.events || []) {
      if (event.startsWith('blocked:')) {
        const match = event.match(/blocked:\[(\d+),(\d+)\]/);
        if (match) {
          const bx = parseInt(match[1], 10);
          const by = parseInt(match[2], 10);
          drawBlockedFlash(ctx, bx, by, cellSize, timeMs);
        }
      }
    }

    // 8. Rover
    drawRover(
      ctx,
      this.currentRoverPos[0],
      this.currentRoverPos[1],
      cellSize,
      snapshot.rover.mode,
      this.headingAngle,
      timeMs
    );

    // 9. Particles (drawn in grid coordinates)
    this.particleSystem.updateAndDraw(ctx);

    ctx.restore();
  }
}
