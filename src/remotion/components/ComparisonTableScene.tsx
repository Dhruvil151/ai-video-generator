import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import React from 'react';
import { BackgroundGradients } from './BackgroundGradients';
import '../styles/video.css';

interface ComparisonRow {
  feature: string;
  values: Array<boolean | string>;
}

interface ComparisonTableSceneProps {
  scene: {
    title: string;
    subtitle: string;
    narration: string;
    audioUrl?: string | null;
    actualDurationSec?: number;
    estimatedDurationSec?: number;
    subtitles?: any[];
    payload?: {
      layout?: 'grid';
      headers?: string[];
      rows?: ComparisonRow[];
    };
  };
  bgMusicUrl?: string | null;
  techPrimary?: string;
  techSecondary?: string;
}

const Check: React.FC<{ color: string }> = ({ color }) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const XMark: React.FC<{ color: string }> = ({ color }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const ComparisonTableScene: React.FC<ComparisonTableSceneProps> = ({ scene, techPrimary, techSecondary }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationSec = scene.actualDurationSec || scene.estimatedDurationSec || 10;
  const totalFrames = Math.ceil(durationSec * fps);

  const headers = scene.payload?.headers || [];
  const rows    = scene.payload?.rows    || [];
  const primary = techPrimary || '#00D9FF';

  const headerSpring = spring({ frame, fps, config: { damping: 24, stiffness: 120 }, delay: 0 });
  const tableSpring  = spring({ frame, fps, config: { damping: 20, stiffness: 100 }, delay: 8 });

  const colTemplate = `minmax(240px, 1.4fr) repeat(${Math.max(headers.length, 1)}, 1fr)`;

  return (
    <AbsoluteFill className="scene">
      <BackgroundGradients variant="comparison" techPrimary={techPrimary} techSecondary={techSecondary} />

      <div style={{ padding: '52px 80px 0', opacity: headerSpring, transform: `translateY(${interpolate(headerSpring, [0, 1], [-30, 0])}px)` }}>
        <div className="scene-tag">Comparison</div>
        <h2 className="scene-title">{scene.title}</h2>
        {scene.subtitle && <p className="scene-subtitle">{scene.subtitle}</p>}
      </div>

      <div style={{ flex: 1, margin: '36px 80px 60px', opacity: tableSpring, transform: `translateY(${interpolate(tableSpring, [0, 1], [24, 0])}px)`, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'grid', gridTemplateColumns: colTemplate, borderRadius: '16px 16px 0 0', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none' }}>
          <div style={{ padding: '22px 28px', background: 'rgba(22,27,34,0.9)' }} />
          {headers.map((h, i) => (
            <div key={i} style={{ padding: '22px 20px', background: 'rgba(22,27,34,0.9)', textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: '26px', fontWeight: 700, color: i === 0 ? primary : '#E6EDF3', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
              {h}
            </div>
          ))}
        </div>

        <div style={{ flex: 1, border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0 0 16px 16px', overflow: 'hidden' }}>
          {rows.map((row, ri) => {
            const rowSpring = spring({ frame, fps, config: { damping: 20, stiffness: 100 }, delay: 16 + ri * 8 });
            return (
              <div key={ri} style={{
                display: 'grid', gridTemplateColumns: colTemplate,
                background: ri % 2 === 0 ? 'rgba(22,27,34,0.55)' : 'rgba(13,17,23,0.55)',
                opacity: rowSpring, transform: `translateX(${interpolate(rowSpring, [0, 1], [-20, 0])}px)`,
                borderTop: ri > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              }}>
                <div style={{ padding: '20px 28px', fontSize: '24px', color: '#E6EDF3', fontWeight: 600, display: 'flex', alignItems: 'center' }}>{row.feature}</div>
                {(row.values || []).map((v, ci) => (
                  <div key={ci} style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderLeft: '1px solid rgba(255,255,255,0.04)' }}>
                    {typeof v === 'boolean'
                      ? (v ? <Check color="#10B981" /> : <XMark color="#EF4444" />)
                      : <span style={{ fontSize: '22px', color: '#8B949E', fontFamily: 'JetBrains Mono, monospace' }}>{v}</span>}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <div className="progress-bar" style={{ width: `${interpolate(frame, [0, totalFrames], [0, 100])}%` }} />
    </AbsoluteFill>
  );
};
