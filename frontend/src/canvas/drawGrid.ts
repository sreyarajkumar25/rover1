import { CANVAS_COLORS } from './colors';
import { CellType } from '../types/snapshot';

export function drawGridCells(
  ctx: CanvasRenderingContext2D,
  map: number[][],
  cellSize: number,
  timeMs: number
): void {
  const height = map.length;
  if (height === 0) return;
  const width = map[0].length;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const type = map[y][x];
      const px = x * cellSize;
      const py = y * cellSize;

      switch (type) {
        case CellType.OPEN:
          ctx.fillStyle = CANVAS_COLORS.OPEN_CELL;
          ctx.fillRect(px, py, cellSize, cellSize);
          ctx.strokeStyle = CANVAS_COLORS.OPEN_BORDER;
          ctx.lineWidth = 0.5;
          ctx.strokeRect(px, py, cellSize, cellSize);
          break;

        case CellType.OBSTACLE:
          ctx.fillStyle = CANVAS_COLORS.OBSTACLE_FILL;
          ctx.fillRect(px, py, cellSize, cellSize);
          ctx.strokeStyle = CANVAS_COLORS.OBSTACLE_BORDER;
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 1, py + 1, cellSize - 2, cellSize - 2);

          // Diagonal rocky hash mark inside obstacle
          ctx.beginPath();
          ctx.moveTo(px + 2, py + 2);
          ctx.lineTo(px + cellSize - 2, py + cellSize - 2);
          ctx.strokeStyle = 'rgba(220, 38, 38, 0.35)';
          ctx.stroke();
          break;

        case CellType.HAZARD:
          ctx.fillStyle = CANVAS_COLORS.HAZARD_FILL;
          ctx.fillRect(px, py, cellSize, cellSize);
          ctx.strokeStyle = CANVAS_COLORS.HAZARD_BORDER;
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 1, py + 1, cellSize - 2, cellSize - 2);

          // Hazard diagonal stripe
          ctx.save();
          ctx.strokeStyle = CANVAS_COLORS.HAZARD_STRIPE;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(px, py + cellSize);
          ctx.lineTo(px + cellSize, py);
          ctx.stroke();
          ctx.restore();
          break;

        case CellType.COMM_ZONE:
          ctx.fillStyle = CANVAS_COLORS.COMM_ZONE_FILL;
          ctx.fillRect(px, py, cellSize, cellSize);
          ctx.strokeStyle = CANVAS_COLORS.COMM_ZONE_BORDER;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(px + 1, py + 1, cellSize - 2, cellSize - 2);

          // Pulsing radar ring
          const cx = px + cellSize / 2;
          const cy = py + cellSize / 2;
          const pulseR = (cellSize * 0.35) * (0.8 + 0.2 * Math.sin(timeMs / 300));
          ctx.beginPath();
          ctx.arc(cx, cy, pulseR, 0, Math.PI * 2);
          ctx.strokeStyle = CANVAS_COLORS.COMM_ZONE_PULSE;
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Center antenna point
          ctx.fillStyle = '#34d399';
          ctx.beginPath();
          ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
          ctx.fill();
          break;

        case CellType.DATA_SITE:
          ctx.fillStyle = CANVAS_COLORS.DATA_SITE_FILL;
          ctx.fillRect(px, py, cellSize, cellSize);
          ctx.strokeStyle = CANVAS_COLORS.DATA_SITE_BORDER;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(px + 1, py + 1, cellSize - 2, cellSize - 2);

          // Diamond shape for valuable data site
          const dx = px + cellSize / 2;
          const dy = py + cellSize / 2;
          const rad = cellSize * 0.32;
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(dx, dy - rad);
          ctx.lineTo(dx + rad, dy);
          ctx.lineTo(dx, dy + rad);
          ctx.lineTo(dx - rad, dy);
          ctx.closePath();
          ctx.fillStyle = '#f59e0b';
          ctx.shadowColor = CANVAS_COLORS.DATA_SITE_GLOW;
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.restore();
          break;
      }
    }
  }
}
