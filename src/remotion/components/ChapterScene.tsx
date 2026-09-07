import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import React from 'react';
import { BackgroundGradients } from './BackgroundGradients';
import '../styles/video.css';

interface ChapterSceneProps {
  scene: {
    title: string;
    subtitle: string;
    narration: string;
    audioUrl?: string | null;
    actualDurationSec?: number;
    estimatedDurationSec?: number;
    subtitles?: any[];
    payload?: {
      layout?: 'default';
      chapterNumber?: string | number;
      chapterTitle?: string;
      description?: string;
    };
  };
  bgMusicUrl?: string | null;
  techPrimary?: string;
  techSecondary?: string;
}

export const ChapterScene: React.FC<ChapterSceneProps> = ({ scene, techPrimary, techSecondary }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationSec = scene.actualDurationSec || scene.estimatedDurationSec || 4;
  const totalFrames = Math.ceil(durationSec * fps);

  const chapterNumber = scene.payload?.chapterNumber ?? '';
  const chapterTitle  = scene.payload?.chapterTitle || scene.title;
  const description   = scene.payload?.description || scene.subtitle || '';

  const primary   = techPrimary   || '#00D9FF';
  const secondary = techSecondary || '#8B5CF6';

  const numberSpring = spring({ frame, fps, config: { damping: 22, stiffness: 110 }, delay: 0 });
  const lineSpring    = spring({ frame, fps, config: { damping: 20, stiffness: 90 },  delay: 8 });
  const titleSpring   = spring({ frame, fps, config: { damping: 20, stiffness: 90 },  delay: 12 });
  const descSpring    = spring({ frame, fps, config: { damping: 18, stiffness: 80 },  delay: 20 });

  const idleFloat = Math.sin(frame / 24) * 6;

  return (
    <AbsoluteFill className="scene">
      <BackgroundGradients variant="default" techPrimary={techPrimary} techSecondary={techSecondary} />

      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 160px', textAlign: 'center' }}>
        {chapterNumber !== '' && (
          <div style={{
            opacity: numberSpring,
            transform: `translateY(${interpolate(numberSpring, [0, 1], [24, 0])}px)`,
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '28px',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: primary,
            marginBottom: '28px',
          }}>
            CHAPTER {chapterNumber}
          </div>
        )}

        <div style={{
          width: `${interpolate(lineSpring, [0, 1], [0, 200])}px`,
          height: '3px',
          background: `linear-gradient(90deg, ${primary}, ${secondary})`,
          borderRadius: '3px',
          marginBottom: '44px',
          boxShadow: `0 0 20px ${primary}80`,
        }} />

        <h1 style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: '104px',
          fontWeight: 900,
          lineHeight: 1.08,
          letterSpacing: '-0.02em',
          margin: 0,
          maxWidth: '1400px',
          opacity: titleSpring,
          transform: `translateY(${interpolate(titleSpring, [0, 1], [40, 0]) + idleFloat}px)`,
          background: `linear-gradient(135deg, #E6EDF3 0%, ${secondary} 100%)`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          {chapterTitle}
        </h1>

        {description && (
          <p style={{
            fontSize: '34px',
            color: '#8B949E',
            lineHeight: 1.5,
            maxWidth: '1000px',
            marginTop: '36px',
            opacity: descSpring,
            transform: `translateY(${interpolate(descSpring, [0, 1], [24, 0])}px)`,
          }}>
            {description}
          </p>
        )}
      </div>

      <div className="progress-bar" style={{ width: `${interpolate(frame, [0, totalFrames], [0, 100])}%` }} />
    </AbsoluteFill>
  );
};
