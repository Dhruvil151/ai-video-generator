import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import React from 'react';
import { BackgroundGradients } from './BackgroundGradients';
// SubtitlesOverlay removed — word-level sync unavailable from edge-tts 7.x (no WordBoundary events)
import '../styles/video.css';

interface ComparisonSceneProps {
  scene: {
    title: string;
    subtitle: string;
    narration: string;
    audioUrl?: string | null;
    actualDurationSec?: number;
    estimatedDurationSec?: number;
    subtitles?: any[];
    payload?: {
      leftTitle?: string;
      leftPoints?: Array<string | { text: string }>;
      rightTitle?: string;
      rightPoints?: Array<string | { text: string }>;
    };
  };
  bgMusicUrl?: string | null;
}

// Normalize: accept both string[] and {text:string}[] from Gemini
function normalizePoints(pts: Array<string | { text: string }> | undefined, fallbackNarration: string, side: 'left' | 'right'): string[] {
  const raw = pts || [];
  const normalized = raw.map(p => typeof p === 'string' ? p : (p as any).text || String(p)).filter(Boolean);
  if (normalized.length > 0) return normalized;
  // Fallback: split narration into bullet sentences
  const sentences = fallbackNarration
    .replace(/<[^>]+>/g, '')
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 10);
  const half = Math.ceil(sentences.length / 2);
  return side === 'left' ? sentences.slice(0, half) : sentences.slice(half, half + 3);
}

export const ComparisonScene: React.FC<ComparisonSceneProps> = ({ scene, bgMusicUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationSec = scene.actualDurationSec || scene.estimatedDurationSec || 10;
  const totalFrames = Math.ceil(durationSec * fps);

  const leftTitle  = scene.payload?.leftTitle  || 'Before';
  const rightTitle = scene.payload?.rightTitle || 'After';
  const leftPts    = normalizePoints(scene.payload?.leftPoints,  scene.narration, 'left');
  const rightPts   = normalizePoints(scene.payload?.rightPoints, scene.narration, 'right');
  const maxItems   = Math.max(leftPts.length, rightPts.length);

  // Subtitles removed — will be re-enabled when real word timestamps are available

  const headerSpring = spring({ frame, fps, config: { damping: 24, stiffness: 120 }, delay: 0 });
  const leftSpring   = spring({ frame, fps, config: { damping: 20, stiffness: 90 }, delay: 10 });
  const rightSpring  = spring({ frame, fps, config: { damping: 20, stiffness: 90 }, delay: 18 });
  const dividerSpring = spring({ frame, fps, config: { damping: 18, stiffness: 80 }, delay: 8 });

  return (
    <AbsoluteFill className="scene">
      <BackgroundGradients variant="comparison" />

      {/* Header */}
      <div style={{
        padding: '52px 80px 36px',
        opacity: headerSpring,
        transform: `translateY(${interpolate(headerSpring, [0, 1], [-30, 0])}px)`,
      }}>
        <div className="scene-tag">Comparison</div>
        <h2 className="scene-title">{scene.title}</h2>
        <p className="scene-subtitle">{scene.subtitle}</p>
      </div>

      {/* Two-column comparison */}
      <div style={{ flex: 1, display: 'flex', gap: '0', padding: '0 80px 80px', alignItems: 'stretch' }}>
        {/* Left column */}
        <div style={{
          flex: 1, padding: '40px',
          background: 'rgba(239,68,68,0.05)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderTop: '3px solid #EF4444',
          borderRadius: '20px 0 0 20px',
          opacity: leftSpring,
          transform: `translateX(${interpolate(leftSpring, [0, 1], [-60, 0])}px)`,
        }}>
          <div style={{
            fontFamily: "'Outfit', sans-serif", fontSize: '38px', fontWeight: 800,
            color: '#EF4444', marginBottom: '32px',
            display: 'flex', alignItems: 'center', gap: '14px',
          }}>
            <span style={{ fontSize: '32px' }}>✗</span> {leftTitle}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {leftPts.slice(0, 5).map((pt, i) => {
              const itemSpring = spring({ frame, fps, config: { damping: 18, stiffness: 80 }, delay: 16 + i * 6 });
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '16px',
                  opacity: itemSpring,
                  transform: `translateX(${interpolate(itemSpring, [0, 1], [-20, 0])}px)`,
                }}>
                  <span style={{ color: '#EF4444', fontSize: '24px', marginTop: '2px', flexShrink: 0 }}>●</span>
                  <span style={{ fontSize: '26px', color: '#8B949E', lineHeight: 1.5 }}>{pt}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center divider */}
        <div style={{
          width: '3px', flexShrink: 0,
          background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.1), transparent)',
          transform: `scaleY(${dividerSpring})`,
          transformOrigin: 'top',
        }} />

        {/* VS badge */}
        <div style={{
          position: 'absolute', left: '50%', top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '80px', height: '80px',
          background: '#0D1117',
          border: '2px solid rgba(255,255,255,0.1)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'JetBrains Mono, monospace', fontSize: '22px', fontWeight: 700,
          color: '#8B949E',
          opacity: dividerSpring,
          zIndex: 10,
        }}>VS</div>

        {/* Right column */}
        <div style={{
          flex: 1, padding: '40px',
          background: 'rgba(16,185,129,0.05)',
          border: '1px solid rgba(16,185,129,0.2)',
          borderTop: '3px solid #10B981',
          borderRadius: '0 20px 20px 0',
          opacity: rightSpring,
          transform: `translateX(${interpolate(rightSpring, [0, 1], [60, 0])}px)`,
        }}>
          <div style={{
            fontFamily: "'Outfit', sans-serif", fontSize: '38px', fontWeight: 800,
            color: '#10B981', marginBottom: '32px',
            display: 'flex', alignItems: 'center', gap: '14px',
          }}>
            <span style={{ fontSize: '32px' }}>✓</span> {rightTitle}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {rightPts.slice(0, 5).map((pt, i) => {
              const itemSpring = spring({ frame, fps, config: { damping: 18, stiffness: 80 }, delay: 24 + i * 6 });
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '16px',
                  opacity: itemSpring,
                  transform: `translateX(${interpolate(itemSpring, [0, 1], [20, 0])}px)`,
                }}>
                  <span style={{ color: '#10B981', fontSize: '24px', marginTop: '2px', flexShrink: 0 }}>●</span>
                  <span style={{ fontSize: '26px', color: '#E6EDF3', lineHeight: 1.5 }}>{pt}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* SubtitlesOverlay + AudioMixer removed — will be re-added with real word timestamps */}

      <div className="progress-bar" style={{
        width: `${interpolate(frame, [0, totalFrames], [0, 100])}%`,
      }} />
    </AbsoluteFill>
  );
};
