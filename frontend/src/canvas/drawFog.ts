import { CANVAS_COLORS } from './colors';

export function drawFogOfWar(
  ctx: CanvasRenderingContext2D,
  knownMap: (number | null)[][],
  cellSize: number,
  roverPos: [number, number],
  sensorRadius: number
): void {
  const height = knownMap.length;
  if (height === 0) return;
  const width = knownMap[0].length;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (knownMap[y][x] === null) {
        const px = x * cellSize;
        const py = y * cellSize;
        ctx.fillStyle = CANVAS_COLORS.FOG_OF_WAR;
        ctx.fillRect(px, py, cellSize, cellSize);

        // Faint border for unexplored cell
        ctx.strokeStyle = '#0e1628';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(px, py, cellSize, cellSize);
      }
    }
  }

  // Soft vision light field around rover's current sensor radius
  const [rx, ry] = roverPos;
  const cx = (rx + 0.5) * cellSize;
  const cy = (ry + 0.5) * cellSize;
  const visionRadius = (sensorRadius + 0.5) * cellSize;

  ctx.save();
  const grad = ctx.createRadialGradient(cx, cy, visionRadius * 0.4, cx, cy, visionRadius);
  grad.addColorStop(0, 'rgba(0, 240, 255, 0.05)');
  grad.addColorStop(0.7, 'rgba(0, 240, 255, 0.02)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, visionRadius, 0, Math.PI * 2);
  ctx.fill();

  // Subtle sensor perimeter circle
  ctx.beginPath();
  ctx.arc(cx, cy, visionRadius, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.stroke();
  ctx.restore();
}
