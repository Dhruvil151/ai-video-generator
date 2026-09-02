import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import React from 'react';
import { BackgroundGradients } from './BackgroundGradients';
// SubtitlesOverlay removed — word-level sync unavailable from edge-tts 7.x (no WordBoundary events)
import '../styles/video.css';

interface BulletPoint {
  icon?: string;
  title: string;
  description: string;
}

interface ConceptCardSceneProps {
  scene: {
    title: string;
    subtitle: string;
    narration: string;
    audioUrl?: string | null;
    actualDurationSec?: number;
    estimatedDurationSec?: number;
    subtitles?: any[];
    payload?: {
      layout?: 'stack' | 'grid';
      bulletPoints?: BulletPoint[];
      badges?: string[];
      keyTakeaway?: string;
    };
  };
  bgMusicUrl?: string | null;
}

const ICON_MAP: Record<string, string> = {
  'zap': '⚡', 'shield': '🛡️', 'layers': '📚', 'globe': '🌐',
  'cpu': '⚙️', 'database': '🗄️', 'server': '🖥️', 'cloud': '☁️',
  'code': '< >', 'lock': '🔒', 'check-circle': '✅', 'activity': '📈',
  'bar-chart': '📊', 'settings': '⚙️', 'refresh-cw': '🔄', 'key': '🔑',
  'package': '📦', 'git-branch': '🌿', 'network': '🔗', 'terminal': '⬛',
  'arrow-right': '→', 'alert-triangle': '⚠️', 'link': '🔗', 'repeat': '🔁',
  'clock': '⏱️', 'box': '📦', 'play': '▶', 'file': '📄',
};

const ACCENT_COLORS = ['cyan', 'purple', 'green', 'amber'];
const ACCENT_HEX = { cyan: '#00D9FF', purple: '#8B5CF6', green: '#10B981', amber: '#F59E0B' };
const ICON_BG = {
  cyan:   'rgba(0,217,255,0.12)',
  purple: 'rgba(139,92,246,0.12)',
  green:  'rgba(16,185,129,0.12)',
  amber:  'rgba(245,158,11,0.12)',
};

export const ConceptCardScene: React.FC<ConceptCardSceneProps> = ({ scene, bgMusicUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationSec = scene.actualDurationSec || scene.estimatedDurationSec || 10;
  const totalFrames = Math.ceil(durationSec * fps);

  const layout   = scene.payload?.layout || 'stack';
  const takeaway = scene.payload?.keyTakeaway || '';

  // Build bullet points — fallback to narration sentences if Gemini sent empty array
  const rawPoints = scene.payload?.bulletPoints || [];
  const points: BulletPoint[] = rawPoints.length > 0 ? rawPoints : (() => {
    const sentences = (scene.narration || '')
      .replace(/<[^>]+>/g, '')
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 12)
      .slice(0, 3);
    return sentences.map((s, i) => ({
      icon: ['zap', 'shield', 'layers', 'cpu'][i] || 'zap',
      title: `Key Point ${i + 1}`,
      description: s,
    }));
  })();

  // Subtitles removed — will be re-enabled when real word timestamps are available

  const headerSpring  = spring({ frame, fps, config: { damping: 24, stiffness: 120 }, delay: 0 });
  const takeawaySpring = spring({ frame, fps, config: { damping: 18, stiffness: 70 }, delay: 30 + points.length * 8 });

  return (
    <AbsoluteFill className="scene">
      <BackgroundGradients variant="concept" />

      {/* Header */}
      <div style={{
        padding: '52px 80px 36px',
        opacity: headerSpring,
        transform: `translateY(${interpolate(headerSpring, [0, 1], [-30, 0])}px)`,
      }}>
        <div className="scene-tag">Core Concepts</div>
        <h2 className="scene-title">{scene.title}</h2>
        <p className="scene-subtitle">{scene.subtitle}</p>
      </div>

      {/* Layout branch */}
      {layout === 'grid'
        ? <GridCards    points={points} frame={frame} fps={fps} />
        : <StackCards   points={points} frame={frame} fps={fps} />}

      {/* Key takeaway */}
      {takeaway && (
        <div style={{
          margin: '0 80px 52px',
          padding: '24px 36px',
          background: 'linear-gradient(135deg, rgba(0,217,255,0.08) 0%, rgba(139,92,246,0.08) 100%)',
          border: '1px solid rgba(0,217,255,0.2)',
          borderRadius: '16px',
          display: 'flex', alignItems: 'center', gap: '20px',
          opacity: takeawaySpring,
          transform: `translateY(${interpolate(takeawaySpring, [0, 1], [20, 0])}px)`,
        }}>
          <span style={{ fontSize: '36px' }}>🎯</span>
          <div>
            <div style={{ fontSize: '20px', color: '#00D9FF', fontFamily: 'JetBrains Mono, monospace', marginBottom: '6px', letterSpacing: '0.08em' }}>KEY TAKEAWAY</div>
            <div style={{ fontSize: '28px', color: '#E6EDF3', lineHeight: 1.4 }}>{takeaway}</div>
          </div>
        </div>
      )}

      {/* SubtitlesOverlay + AudioMixer removed — will be re-added with real word timestamps */}

      <div className="progress-bar" style={{
        width: `${interpolate(frame, [0, totalFrames], [0, 100])}%`,
      }} />
    </AbsoluteFill>
  );
};

// ── Stack layout (default) ────────────────────────────────────────────────────
const StackCards: React.FC<{ points: BulletPoint[]; frame: number; fps: number }> = ({ points, frame, fps }) => (
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', padding: '0 80px 24px', justifyContent: 'center' }}>
    {points.slice(0, 4).map((point, i) => {
      const accentKey = ACCENT_COLORS[i % ACCENT_COLORS.length] as keyof typeof ACCENT_HEX;
      const color  = ACCENT_HEX[accentKey];
      const iconBg = ICON_BG[accentKey];
      const icon   = ICON_MAP[point.icon || ''] || '●';
      const cardSpring = spring({ frame, fps, config: { damping: 20, stiffness: 90 }, delay: 10 + i * 8 });
      return (
        <div key={i} style={{
          opacity: cardSpring,
          transform: `translateX(${interpolate(cardSpring, [0, 1], [-60, 0])}px)`,
          display: 'flex', gap: '24px', alignItems: 'flex-start',
          padding: '28px 36px',
          background: 'rgba(22, 27, 34, 0.65)',
          border: `1px solid rgba(255,255,255,0.06)`,
          borderLeft: `4px solid ${color}`,
          borderRadius: '16px',
          backdropFilter: 'blur(12px)',
        }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '14px', flexShrink: 0, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', border: `1px solid ${color}33` }}>
            {icon}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '30px', fontWeight: 700, color: '#E6EDF3', marginBottom: '8px' }}>{point.title}</div>
            <div style={{ fontSize: '24px', color: '#8B949E', lineHeight: 1.5 }}>{point.description}</div>
          </div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '44px', fontWeight: 700, color: color, opacity: 0.15, flexShrink: 0, alignSelf: 'center' }}>0{i + 1}</div>
        </div>
      );
    })}
  </div>
);

// ── Grid layout (2×2 for 4 concepts of equal weight) ─────────────────────────
const GridCards: React.FC<{ points: BulletPoint[]; frame: number; fps: number }> = ({ points, frame, fps }) => (
  <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', padding: '0 80px 24px', alignContent: 'center' }}>
    {points.slice(0, 4).map((point, i) => {
      const accentKey = ACCENT_COLORS[i % ACCENT_COLORS.length] as keyof typeof ACCENT_HEX;
      const color  = ACCENT_HEX[accentKey];
      const iconBg = ICON_BG[accentKey];
      const icon   = ICON_MAP[point.icon || ''] || '●';
      const cardSpring = spring({ frame, fps, config: { damping: 18, stiffness: 80 }, delay: 8 + i * 10 });
      return (
        <div key={i} style={{
          opacity: cardSpring,
          transform: `translateY(${interpolate(cardSpring, [0, 1], [50, 0])}px)`,
          display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '20px',
          padding: '36px 32px',
          background: 'rgba(22, 27, 34, 0.65)',
          border: `1px solid ${color}25`,
          borderTop: `3px solid ${color}`,
          borderRadius: '16px',
          backdropFilter: 'blur(12px)',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Subtle number watermark */}
          <div style={{ position: 'absolute', top: '12px', right: '20px', fontFamily: 'JetBrains Mono, monospace', fontSize: '64px', fontWeight: 900, color: color, opacity: 0.06 }}>0{i + 1}</div>
          <div style={{ width: '68px', height: '68px', borderRadius: '16px', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', border: `1px solid ${color}33`, flexShrink: 0 }}>{icon}</div>
          <div>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '28px', fontWeight: 700, color: '#E6EDF3', marginBottom: '12px' }}>{point.title}</div>
            <div style={{ fontSize: '22px', color: '#8B949E', lineHeight: 1.5 }}>{point.description}</div>
          </div>
        </div>
      );
    })}
  </div>
);
