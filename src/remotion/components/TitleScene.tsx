import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import React from 'react';
import { BackgroundGradients } from './BackgroundGradients';
import { SubtitlesOverlay, estimateSubtitles } from './SubtitlesOverlay';
import { AudioMixer } from './AudioMixer';
import '../styles/video.css';

interface TitleSceneProps {
  scene: {
    title: string;
    subtitle: string;
    narration: string;
    audioUrl?: string | null;
    actualDurationSec?: number;
    estimatedDurationSec?: number;
    subtitles?: any[];
    payload?: {
      topicTag?: string;
      badges?: string[];
      keyTakeaway?: string;
    };
  };
  bgMusicUrl?: string | null;
}

const BADGE_COLORS = ['cyan', 'purple', 'green', 'amber'];

export const TitleScene: React.FC<TitleSceneProps> = ({ scene, bgMusicUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationSec = scene.actualDurationSec || scene.estimatedDurationSec || 10;

  const subtitles = (scene.subtitles && scene.subtitles.length > 0)
    ? scene.subtitles
    : estimateSubtitles(scene.narration, durationSec);

  // ── Entrance animations ────────────────────────────────────
  const tagSpring = spring({ frame, fps, config: { damping: 24, stiffness: 120 }, delay: 0 });
  const titleSpring = spring({ frame, fps, config: { damping: 22, stiffness: 100 }, delay: 6 });
  const subtitleSpring = spring({ frame, fps, config: { damping: 20, stiffness: 90 }, delay: 12 });
  const badgeSpring = spring({ frame, fps, config: { damping: 20, stiffness: 90 }, delay: 18 });
  const dividerSpring = spring({ frame, fps, config: { damping: 18, stiffness: 80 }, delay: 24 });
  const takeawaySpring = spring({ frame, fps, config: { damping: 18, stiffness: 80 }, delay: 30 });

  const topicTag  = scene.payload?.topicTag  || scene.title;
  const badges    = scene.payload?.badges    || [];
  const takeaway  = scene.payload?.keyTakeaway || '';

  return (
    <AbsoluteFill className="scene">
      <BackgroundGradients variant="default" />

      {/* Decorative side accent line */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: '6px',
        background: 'linear-gradient(180deg, #00D9FF 0%, #8B5CF6 50%, transparent 100%)',
        opacity: titleSpring,
      }} />

      {/* Main content */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '0 140px',
      }}>
        {/* Topic tag pill */}
        <div style={{
          opacity: tagSpring,
          transform: `translateY(${interpolate(tagSpring, [0, 1], [30, 0])}px)`,
          marginBottom: '40px',
          display: 'flex', alignItems: 'center', gap: '16px',
        }}>
          <div className="badge badge--cyan" style={{ fontSize: '24px', padding: '8px 20px' }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>▶</span>
            {topicTag}
          </div>
        </div>

        {/* Main title */}
        <h1 style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: '128px',
          fontWeight: 900,
          lineHeight: 1.0,
          letterSpacing: '-0.03em',
          color: '#E6EDF3',
          opacity: titleSpring,
          transform: `translateY(${interpolate(titleSpring, [0, 1], [50, 0])}px)`,
          marginBottom: '28px',
          background: 'linear-gradient(135deg, #E6EDF3 0%, #8B949E 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          {scene.title}
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: '40px',
          fontWeight: 400,
          color: '#8B949E',
          lineHeight: 1.4,
          opacity: subtitleSpring,
          transform: `translateY(${interpolate(subtitleSpring, [0, 1], [30, 0])}px)`,
          marginBottom: '52px',
          maxWidth: '900px',
        }}>
          {scene.subtitle}
        </p>

        {/* Divider with glow */}
        <div style={{
          width: `${interpolate(dividerSpring, [0, 1], [0, 240])}px`,
          height: '3px',
          background: 'linear-gradient(90deg, #00D9FF, #8B5CF6)',
          borderRadius: '3px',
          marginBottom: '52px',
          boxShadow: '0 0 16px rgba(0, 217, 255, 0.5)',
        }} />

        {/* Badges */}
        {badges.length > 0 && (
          <div style={{
            display: 'flex', gap: '20px', flexWrap: 'wrap',
            opacity: badgeSpring,
            transform: `translateY(${interpolate(badgeSpring, [0, 1], [20, 0])}px)`,
            marginBottom: takeaway ? '48px' : '0',
          }}>
            {badges.map((badge, i) => (
              <div key={i} className={`badge badge--${BADGE_COLORS[i % BADGE_COLORS.length]}`}
                style={{ fontSize: '26px', padding: '10px 22px' }}>
                {badge}
              </div>
            ))}
          </div>
        )}

        {/* Key takeaway */}
        {takeaway && (
          <div style={{
            opacity: takeawaySpring,
            transform: `translateY(${interpolate(takeawaySpring, [0, 1], [20, 0])}px)`,
            display: 'flex', alignItems: 'center', gap: '16px',
            padding: '20px 28px',
            background: 'rgba(0, 217, 255, 0.06)',
            border: '1px solid rgba(0, 217, 255, 0.2)',
            borderRadius: '12px',
            maxWidth: '900px',
          }}>
            <span style={{ fontSize: '28px', color: '#00D9FF' }}>💡</span>
            <span style={{ fontSize: '28px', color: '#8B949E', lineHeight: 1.4 }}>{takeaway}</span>
          </div>
        )}
      </div>

      {/* Right decorative circuit pattern */}
      <svg style={{ position: 'absolute', right: 60, top: '50%', transform: 'translateY(-50%)', opacity: 0.04 }}
        width="600" height="600" viewBox="0 0 600 600">
        <g stroke="#00D9FF" strokeWidth="1.5" fill="none">
          {[0,60,120,180,240,300,360,420,480,540].map(y => (
            <line key={y} x1="0" y1={y} x2="600" y2={y} />
          ))}
          {[0,60,120,180,240,300,360,420,480,540].map(x => (
            <line key={x} x1={x} y1="0" x2={x} y2="600" />
          ))}
          {[100,200,300,400,500].map((r, i) => (
            <circle key={i} cx="300" cy="300" r={r} />
          ))}
        </g>
      </svg>

      <SubtitlesOverlay subtitles={subtitles} />
      <AudioMixer
        voiceoverUrl={scene.audioUrl || null}
        bgMusicUrl={bgMusicUrl || null}
        subtitles={subtitles}
        sceneDurationSec={durationSec}
      />

      {/* Bottom progress bar */}
      <div className="progress-bar" style={{
        width: `${interpolate(frame, [0, Math.ceil(durationSec * fps)], [0, 100])}%`,
      }} />
    </AbsoluteFill>
  );
};
