import { RoverMode } from '../types/snapshot';

export function drawRover(
  ctx: CanvasRenderingContext2D,
  currentX: number,
  currentY: number,
  cellSize: number,
  mode: RoverMode,
  headingAngle: number,
  timeMs: number
): void {
  const cx = (currentX + 0.5) * cellSize;
  const cy = (currentY + 0.5) * cellSize;
  const radius = cellSize * 0.42;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(headingAngle);

  // Status color based on mode
  let statusColor = '#00f0ff';
  if (mode === 'COLLECTING') statusColor = '#f59e0b';
  else if (mode === 'RETURNING') statusColor = '#10b981';
  else if (mode === 'UPLOADING') statusColor = '#34d399';
  else if (mode === 'SUCCESS') statusColor = '#10b981';
  else if (mode === 'LOST') statusColor = '#ef4444';

  // Shadow
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.beginPath();
  ctx.arc(1, 2, radius * 0.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Wheels / Treads (4 corner pods)
  const wheelW = radius * 0.45;
  const wheelH = radius * 0.28;
  ctx.fillStyle = '#334155';
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1;

  // Front-Left, Front-Right, Rear-Left, Rear-Right
  const wheelOffsets = [
    [-radius * 0.75, -radius * 0.75],
    [radius * 0.75 - wheelW, -radius * 0.75],
    [-radius * 0.75, radius * 0.75 - wheelH],
    [radius * 0.75 - wheelW, radius * 0.75 - wheelH],
  ];

  for (const [wx, wy] of wheelOffsets) {
    ctx.fillRect(wx, wy, wheelW, wheelH);
    ctx.strokeRect(wx, wy, wheelW, wheelH);
  }

  // Rover Chassis (angular body)
  ctx.beginPath();
  ctx.moveTo(0, -radius * 0.9); // Nose pointer
  ctx.lineTo(radius * 0.7, -radius * 0.4);
  ctx.lineTo(radius * 0.65, radius * 0.7);
  ctx.lineTo(-radius * 0.65, radius * 0.7);
  ctx.lineTo(-radius * 0.7, -radius * 0.4);
  ctx.closePath();

  ctx.fillStyle = '#1e293b';
  ctx.fill();
  ctx.strokeStyle = statusColor;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Solar panel / battery deck
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-radius * 0.35, -radius * 0.2, radius * 0.7, radius * 0.55);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(-radius * 0.35, -radius * 0.2, radius * 0.7, radius * 0.55);

  // Core sensor beacon (pulsing status indicator)
  const corePulse = 0.8 + 0.2 * Math.sin(timeMs / 180);
  ctx.beginPath();
  ctx.arc(0, radius * 0.05, radius * 0.2 * corePulse, 0, Math.PI * 2);
  ctx.fillStyle = statusColor;
  ctx.shadowColor = statusColor;
  ctx.shadowBlur = 10;
  ctx.fill();

  // Headlight rays
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.beginPath();
  ctx.moveTo(0, -radius * 0.9);
  ctx.lineTo(-radius * 0.8, -radius * 2.2);
  ctx.lineTo(radius * 0.8, -radius * 2.2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.restore();
}
