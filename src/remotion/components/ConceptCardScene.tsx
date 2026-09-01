import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import React from 'react';
import { BackgroundGradients } from './BackgroundGradients';
import { SubtitlesOverlay, estimateSubtitles } from './SubtitlesOverlay';
import { AudioMixer } from './AudioMixer';
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

  const points   = scene.payload?.bulletPoints || [];
  const takeaway = scene.payload?.keyTakeaway || '';

  const subtitles = (scene.subtitles && scene.subtitles.length > 0)
    ? scene.subtitles
    : estimateSubtitles(scene.narration, durationSec);

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

      {/* Concept cards */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        gap: '24px', padding: '0 80px 24px',
        justifyContent: 'center',
      }}>
        {points.slice(0, 4).map((point, i) => {
          const accentKey = ACCENT_COLORS[i % ACCENT_COLORS.length] as keyof typeof ACCENT_HEX;
          const color = ACCENT_HEX[accentKey];
          const iconBg = ICON_BG[accentKey];
          const icon = ICON_MAP[point.icon || ''] || '●';
          const cardSpring = spring({ frame, fps, config: { damping: 20, stiffness: 90 }, delay: 10 + i * 8 });

          return (
            <div key={i} style={{
              opacity: cardSpring,
              transform: `translateX(${interpolate(cardSpring, [0, 1], [-60, 0])}px)`,
              display: 'flex', gap: '24px', alignItems: 'flex-start',
              padding: '32px 36px',
              background: 'rgba(22, 27, 34, 0.65)',
              border: `1px solid rgba(255,255,255,0.06)`,
              borderLeft: `4px solid ${color}`,
              borderRadius: '16px',
              backdropFilter: 'blur(12px)',
            }}>
              {/* Icon */}
              <div style={{
                width: '64px', height: '64px', borderRadius: '14px', flexShrink: 0,
                background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '32px', border: `1px solid ${color}33`,
              }}>
                {icon}
              </div>

              {/* Text */}
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: "'Outfit', sans-serif", fontSize: '32px', fontWeight: 700,
                  color: '#E6EDF3', marginBottom: '10px',
                }}>{point.title}</div>
                <div style={{
                  fontSize: '26px', color: '#8B949E', lineHeight: 1.5,
                }}>{point.description}</div>
              </div>

              {/* Accent number */}
              <div style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: '48px', fontWeight: 700,
                color: color, opacity: 0.15, flexShrink: 0, alignSelf: 'center',
              }}>
                0{i + 1}
              </div>
            </div>
          );
        })}
      </div>

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

      <SubtitlesOverlay subtitles={subtitles} />
      <AudioMixer voiceoverUrl={scene.audioUrl || null} bgMusicUrl={bgMusicUrl || null}
        subtitles={subtitles} sceneDurationSec={durationSec} />

      <div className="progress-bar" style={{
        width: `${interpolate(frame, [0, totalFrames], [0, 100])}%`,
      }} />
    </AbsoluteFill>
  );
};
