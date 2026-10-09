import { CANVAS_COLORS } from './colors';

export function drawTrail(
  ctx: CanvasRenderingContext2D,
  trail: [number, number][],
  cellSize: number
): void {
  if (trail.length < 2) return;

  ctx.save();
  ctx.beginPath();
  const [firstX, firstY] = trail[0];
  ctx.moveTo((firstX + 0.5) * cellSize, (firstY + 0.5) * cellSize);

  for (let i = 1; i < trail.length; i++) {
    const [x, y] = trail[i];
    ctx.lineTo((x + 0.5) * cellSize, (y + 0.5) * cellSize);
  }

  ctx.strokeStyle = CANVAS_COLORS.TRAIL_LINE;
  ctx.lineWidth = Math.max(1.5, cellSize * 0.12);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Small dots along trail
  for (let i = 0; i < trail.length; i += Math.max(1, Math.floor(trail.length / 20))) {
    const [x, y] = trail[i];
    ctx.beginPath();
    ctx.arc((x + 0.5) * cellSize, (y + 0.5) * cellSize, cellSize * 0.08, 0, Math.PI * 2);
    ctx.fillStyle = CANVAS_COLORS.TRAIL_DOT;
    ctx.fill();
  }
  ctx.restore();
}

export function drawPlannedPath(
  ctx: CanvasRenderingContext2D,
  plannedPath: [number, number][],
  roverPos: [number, number],
  cellSize: number,
  isReturning: boolean,
  timeMs: number
): void {
  if (plannedPath.length === 0) return;

  const color = isReturning ? CANVAS_COLORS.RETURN_PATH : CANVAS_COLORS.PLANNED_PATH;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo((roverPos[0] + 0.5) * cellSize, (roverPos[1] + 0.5) * cellSize);

  for (const [x, y] of plannedPath) {
    ctx.lineTo((x + 0.5) * cellSize, (y + 0.5) * cellSize);
  }

  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, cellSize * 0.15);
  ctx.setLineDash([6, 4]);
  ctx.lineDashOffset = -(timeMs / 40) % 10; // Animated marching dashes
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.stroke();

  // Target destination marker
  const [destX, destY] = plannedPath[plannedPath.length - 1];
  const dcx = (destX + 0.5) * cellSize;
  const dcy = (destY + 0.5) * cellSize;
  const targetR = (cellSize * 0.28) * (0.9 + 0.15 * Math.sin(timeMs / 180));

  ctx.beginPath();
  ctx.arc(dcx, dcy, targetR, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash([]);
  ctx.stroke();
  ctx.restore();
}

export function drawFrontiers(
  ctx: CanvasRenderingContext2D,
  frontiers: [number, number][],
  cellSize: number,
  timeMs: number
): void {
  if (frontiers.length === 0) return;

  const glowAlpha = 0.4 + 0.3 * Math.sin(timeMs / 250);
  ctx.save();
  ctx.fillStyle = `rgba(0, 240, 255, ${glowAlpha * 0.35})`;
  ctx.strokeStyle = `rgba(0, 240, 255, ${glowAlpha})`;
  ctx.lineWidth = 1.5;

  for (const [fx, fy] of frontiers) {
    const px = fx * cellSize;
    const py = fy * cellSize;
    ctx.fillRect(px + 2, py + 2, cellSize - 4, cellSize - 4);
    ctx.strokeRect(px + 2, py + 2, cellSize - 4, cellSize - 4);
  }
  ctx.restore();
}

export function drawHeatmapOverlay(
  ctx: CanvasRenderingContext2D,
  map: number[][],
  cellSize: number
): void {
  const height = map.length;
  if (height === 0) return;
  const width = map[0].length;

  ctx.save();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const type = map[y][x];
      if (type === 2) {
        // Hazard high energy cost
        ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      } else if (type === 1) {
        // Obstacle impassable
        ctx.fillStyle = 'rgba(127, 29, 29, 0.45)';
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }
  }
  ctx.restore();
}
