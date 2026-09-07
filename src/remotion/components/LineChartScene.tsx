import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import React, { useMemo } from 'react';
import { BackgroundGradients } from './BackgroundGradients';
import '../styles/video.css';

interface ChartSeries {
  name: string;
  color?: string;
  values: number[];
}

interface LineChartSceneProps {
  scene: {
    title: string;
    subtitle: string;
    narration: string;
    audioUrl?: string | null;
    actualDurationSec?: number;
    estimatedDurationSec?: number;
    subtitles?: any[];
    payload?: {
      layout?: 'single' | 'multi';
      xLabels?: string[];
      series?: ChartSeries[];
      yUnit?: string;
    };
  };
  bgMusicUrl?: string | null;
  techPrimary?: string;
  techSecondary?: string;
}

const PALETTE = ['#00D9FF', '#8B5CF6', '#10B981', '#F59E0B'];
const CHART_W = 1560;
const CHART_H = 560;

export const LineChartScene: React.FC<LineChartSceneProps> = ({ scene, techPrimary, techSecondary }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationSec = scene.actualDurationSec || scene.estimatedDurationSec || 10;
  const totalFrames = Math.ceil(durationSec * fps);

  const xLabels = scene.payload?.xLabels || [];
  const series  = scene.payload?.series  || [];
  const yUnit   = scene.payload?.yUnit   || '';

  const colors = useMemo(() => series.map((s, i) => s.color || (i === 0 ? techPrimary : i === 1 ? techSecondary : undefined) || PALETTE[i % PALETTE.length]), [series, techPrimary, techSecondary]);

  const { maxVal, points } = useMemo(() => {
    const allValues = series.flatMap(s => s.values);
    const max = Math.max(1, ...allValues);
    const pts = series.map(s => s.values.map((v, i) => ({
      x: s.values.length > 1 ? (i / (s.values.length - 1)) * CHART_W : 0,
      y: CHART_H - (v / max) * CHART_H,
      v,
    })));
    return { maxVal: max, points: pts };
  }, [series]);

  const headerSpring = spring({ frame, fps, config: { damping: 24, stiffness: 120 }, delay: 0 });
  const chartSpring   = spring({ frame, fps, config: { damping: 20, stiffness: 90 }, delay: 8 });

  const drawStart = 24;
  const drawEnd   = Math.max(drawStart + 10, totalFrames - fps * 0.8);
  const progress  = interpolate(frame, [drawStart, drawEnd], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill className="scene">
      <BackgroundGradients variant="stats" techPrimary={techPrimary} techSecondary={techSecondary} />

      <div style={{ padding: '52px 80px 0', opacity: headerSpring, transform: `translateY(${interpolate(headerSpring, [0, 1], [-30, 0])}px)`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="scene-tag">Metrics</div>
          <h2 className="scene-title">{scene.title}</h2>
          {scene.subtitle && <p className="scene-subtitle">{scene.subtitle}</p>}
        </div>
        <div style={{ display: 'flex', gap: '16px', marginTop: '8px', flexWrap: 'wrap', maxWidth: '440px', justifyContent: 'flex-end' }}>
          {series.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: colors[i] }} />
              <span style={{ fontSize: '20px', color: '#8B949E', fontFamily: 'JetBrains Mono, monospace' }}>{s.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, margin: '20px 80px 40px', opacity: chartSpring, transform: `translateY(${interpolate(chartSpring, [0, 1], [24, 0])}px)`, position: 'relative' }}>
        <svg viewBox={`0 0 ${CHART_W} ${CHART_H + 60}`} width="100%" height="100%" style={{ overflow: 'visible' }}>
          {/* Gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
            <line key={i} x1={0} x2={CHART_W} y1={CHART_H * (1 - f)} y2={CHART_H * (1 - f)} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
          ))}

          {points.map((pts, si) => {
            const exactIdx = progress * (pts.length - 1);
            const fullCount = Math.floor(exactIdx);
            const frac = exactIdx - fullCount;
            const visible = pts.slice(0, fullCount + 1);
            if (frac > 0 && pts[fullCount + 1]) {
              const a = pts[fullCount];
              const b = pts[fullCount + 1];
              visible.push({ x: a.x + (b.x - a.x) * frac, y: a.y + (b.y - a.y) * frac, v: a.v + (b.v - a.v) * frac });
            }
            const pathD = visible.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
            const color = colors[si];
            return (
              <g key={si}>
                <path d={pathD} fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round"
                  style={{ filter: `drop-shadow(0 0 8px ${color}80)` }} />
                {pts.map((p, pi) => pi <= fullCount && (
                  <g key={pi}>
                    <circle cx={p.x} cy={p.y} r={7} fill="#060810" stroke={color} strokeWidth={3} />
                    <text x={p.x} y={p.y - 20} textAnchor="middle" fontSize="20" fontFamily="JetBrains Mono, monospace" fill={color}>
                      {Math.round(p.v * 100) / 100}{yUnit}
                    </text>
                  </g>
                ))}
              </g>
            );
          })}

          {/* X labels */}
          {xLabels.map((label, i) => (
            <text key={i}
              x={xLabels.length > 1 ? (i / (xLabels.length - 1)) * CHART_W : 0}
              y={CHART_H + 40}
              textAnchor={i === 0 ? 'start' : i === xLabels.length - 1 ? 'end' : 'middle'}
              fontSize="22" fontFamily="JetBrains Mono, monospace" fill="#8B949E">
              {label}
            </text>
          ))}
        </svg>
      </div>

      <div className="progress-bar" style={{ width: `${interpolate(frame, [0, totalFrames], [0, 100])}%` }} />
    </AbsoluteFill>
  );
};
