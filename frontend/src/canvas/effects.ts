/** Dynamic particle effects, pulses, and event flashes for Canvas **/

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  color: string;
}

export class ParticleSystem {
  private particles: Particle[] = [];

  public spawnUploadParticles(centerX: number, centerY: number, count: number = 16): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5);
      const speed = 1.0 + Math.random() * 2.5;
      this.particles.push({
        x: centerX + (Math.random() - 0.5) * 8,
        y: centerY + (Math.random() - 0.5) * 8,
        vx: Math.cos(angle) * speed * 0.4,
        vy: -speed * 1.5 - Math.random() * 1.5, // Float upwards
        alpha: 1.0,
        size: 2.0 + Math.random() * 3.0,
        color: Math.random() > 0.4 ? '#10b981' : '#00f0ff',
      });
    }
  }

  public updateAndDraw(ctx: CanvasRenderingContext2D): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.025;
      p.size = Math.max(0.5, p.size * 0.98);

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

export function drawPulseGlow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  color: string,
  timeMs: number
): void {
  const pulseScale = 1.0 + 0.15 * Math.sin(timeMs / 250);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius * pulseScale, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.stroke();
  ctx.restore();
}

export function drawBlockedFlash(
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  timeMs: number
): void {
  const alpha = 0.5 + 0.5 * Math.sin(timeMs / 120);
  ctx.save();
  ctx.fillStyle = `rgba(239, 68, 68, ${alpha * 0.7})`;
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 2.5;
  ctx.shadowColor = '#ef4444';
  ctx.shadowBlur = 12;
  ctx.fillRect(cellX * cellSize, cellY * cellSize, cellSize, cellSize);
  ctx.strokeRect(cellX * cellSize, cellY * cellSize, cellSize, cellSize);
  ctx.restore();
}
