import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import React from 'react';
import { BackgroundGradients } from './BackgroundGradients';
import { SubtitlesOverlay, estimateSubtitles } from './SubtitlesOverlay';
import { AudioMixer } from './AudioMixer';
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
      leftPoints?: string[];
      rightTitle?: string;
      rightPoints?: string[];
    };
  };
  bgMusicUrl?: string | null;
}

export const ComparisonScene: React.FC<ComparisonSceneProps> = ({ scene, bgMusicUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationSec = scene.actualDurationSec || scene.estimatedDurationSec || 10;
  const totalFrames = Math.ceil(durationSec * fps);

  const leftTitle  = scene.payload?.leftTitle  || 'Before';
  const rightTitle = scene.payload?.rightTitle || 'After';
  const leftPts    = scene.payload?.leftPoints  || [];
  const rightPts   = scene.payload?.rightPoints || [];
  const maxItems   = Math.max(leftPts.length, rightPts.length);

  const subtitles = (scene.subtitles && scene.subtitles.length > 0)
    ? scene.subtitles
    : estimateSubtitles(scene.narration, durationSec);

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

      <SubtitlesOverlay subtitles={subtitles} />
      <AudioMixer voiceoverUrl={scene.audioUrl || null} bgMusicUrl={bgMusicUrl || null}
        subtitles={subtitles} sceneDurationSec={durationSec} />

      <div className="progress-bar" style={{
        width: `${interpolate(frame, [0, totalFrames], [0, 100])}%`,
      }} />
    </AbsoluteFill>
  );
};
