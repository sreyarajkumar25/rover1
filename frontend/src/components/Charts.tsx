import React, { useEffect, useRef } from 'react';
import { useMissionStore } from '../store/useMissionStore';

interface MiniLineChartProps {
  title: string;
  data: number[];
  currentStep: number;
  color: string;
  unit: string;
  maxVal?: number;
}

export const MiniLineChart: React.FC<MiniLineChartProps> = ({
  title,
  data,
  currentStep,
  color,
  unit,
  maxVal,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Padding
    const pLeft = 4;
    const pRight = 4;
    const pTop = 6;
    const pBottom = 6;
    const chartW = width - pLeft - pRight;
    const chartH = height - pTop - pBottom;

    const computedMax = maxVal || Math.max(...data, 1);
    const n = Math.max(data.length - 1, 1);

    // Draw background subtle grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(pLeft, pTop + chartH / 2);
    ctx.lineTo(pLeft + chartW, pTop + chartH / 2);
    ctx.stroke();

    // Draw Line
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      const x = pLeft + (i / n) * chartW;
      const y = pTop + chartH - (data[i] / computedMax) * chartH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw Current Step Cursor line
    if (currentStep >= 0 && currentStep < data.length) {
      const curX = pLeft + (currentStep / n) * chartW;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(curX, pTop);
      ctx.lineTo(curX, pTop + chartH);
      ctx.stroke();
      ctx.setLineDash([]);

      // Point at cursor
      const curY = pTop + chartH - (data[currentStep] / computedMax) * chartH;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(curX, curY, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [data, currentStep, color, maxVal]);

  const currentVal = data[currentStep] !== undefined ? data[currentStep] : data[data.length - 1] || 0;

  return (
    <div style={{ background: 'var(--bg-card)', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-dim)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>
        <span style={{ color: 'var(--text-muted)' }}>{title}</span>
        <span style={{ color, fontWeight: 700 }}>
          {currentVal} {unit}
        </span>
      </div>
      <canvas
        ref={canvasRef}
        width={240}
        height={65}
        style={{ width: '100%', height: '65px', display: 'block' }}
      />
    </div>
  );
};

export const LiveCharts: React.FC = () => {
  const snapshots = useMissionStore((s) => s.snapshots);
  const currentStepIndex = useMissionStore((s) => s.currentStepIndex);

  if (snapshots.length === 0) return null;

  const energyData = snapshots.map((s) => s.rover.energy);
  const maxEnergy = snapshots[0]?.rover.max_energy || 220;
  const exploredData = snapshots.map((s) => s.metrics.explored_pct);
  const uploadedData = snapshots.map((s) => s.rover.data_uploaded);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <MiniLineChart
        title="ENERGY DRAIN"
        data={energyData}
        currentStep={currentStepIndex}
        color="var(--neon-cyan)"
        unit="J"
        maxVal={maxEnergy}
      />
      <MiniLineChart
        title="EXPLORED TERRAIN"
        data={exploredData}
        currentStep={currentStepIndex}
        color="var(--neon-green)"
        unit="%"
        maxVal={100}
      />
      <MiniLineChart
        title="DATA COMMITTED"
        data={uploadedData}
        currentStep={currentStepIndex}
        color="var(--neon-amber)"
        unit="pts"
      />
    </div>
  );
};
