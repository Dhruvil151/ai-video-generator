import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import React from 'react';
import { BackgroundGradients } from './BackgroundGradients';
// SubtitlesOverlay removed â€” word-level sync unavailable from edge-tts 7.x (no WordBoundary events)
import '../styles/video.css';

interface SummarySceneProps {
  scene: {
    title: string;
    subtitle: string;
    narration: string;
    audioUrl?: string | null;
    actualDurationSec?: number;
    estimatedDurationSec?: number;
    subtitles?: any[];
    payload?: {
      bulletPoints?: Array<{ title: string; description: string }>;
      keyTakeaway?: string;
    };
  };
  bgMusicUrl?: string | null;
}

export const SummaryScene: React.FC<SummarySceneProps> = ({ scene, bgMusicUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationSec = scene.actualDurationSec || scene.estimatedDurationSec || 10;
  const totalFrames = Math.ceil(durationSec * fps);

  const rawPoints = scene.payload?.bulletPoints || [];
  const points = rawPoints.length > 0 ? rawPoints : (() => {
    const sentences = (scene.narration || '').replace(/<[^>]+>/g,'').split(/[.!?]+/).map(s=>s.trim()).filter(s=>s.length>12).slice(0,3);
    return sentences.map((s,i) => ({ title: `Takeaway ${i+1}`, description: s }));
  })();
  const takeaway = scene.payload?.keyTakeaway || '';

  // Subtitles removed â€” will be re-enabled when real word timestamps are available

  const headerSpring  = spring({ frame, fps, config: { damping: 24, stiffness: 120 }, delay: 0 });
  const takeawaySpring = spring({ frame, fps, config: { damping: 16, stiffness: 60 }, delay: 35 + points.length * 7 });

  // Celebration particles
  const confettiOpacity = interpolate(frame, [fps * (durationSec - 1), fps * durationSec], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill className="scene">
      <BackgroundGradients variant="summary" />

      {/* Header */}
      <div style={{
        padding: '52px 80px 40px',
        opacity: headerSpring,
        transform: `translateY(${interpolate(headerSpring, [0, 1], [-30, 0])}px)`,
        textAlign: 'center',
      }}>
        <div className="scene-tag" style={{ justifyContent: 'center' }}>Summary</div>
        <h2 className="scene-title" style={{ textAlign: 'center', fontSize: '80px' }}>{scene.title}</h2>
        <p className="scene-subtitle" style={{ textAlign: 'center', marginTop: '12px' }}>{scene.subtitle}</p>
      </div>

      {/* Checklist */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        gap: '22px', padding: '0 200px 30px',
        justifyContent: 'center',
      }}>
        {points.slice(0, 5).map((pt, i) => {
          const itemSpring = spring({ frame, fps, config: { damping: 20, stiffness: 90 }, delay: 10 + i * 7 });
          // Check mark draws in progressively
          const checkProgress = interpolate(itemSpring, [0, 1], [0, 1]);

          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: '28px',
              padding: '24px 36px',
              background: 'rgba(22, 27, 34, 0.6)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '16px',
              opacity: itemSpring,
              transform: `translateX(${interpolate(itemSpring, [0, 1], [40, 0])}px)`,
            }}>
              {/* Animated check circle */}
              <div style={{
                width: '52px', height: '52px', flexShrink: 0,
                background: 'rgba(16,185,129,0.12)',
                border: `2px solid rgba(16,185,129,${checkProgress})`,
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '28px',
                opacity: checkProgress,
                transform: `scale(${interpolate(checkProgress, [0, 1], [0.5, 1])})`,
              }}>
                âœ“
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: "'Outfit', sans-serif", fontSize: '30px', fontWeight: 700,
                  color: '#E6EDF3', marginBottom: '6px',
                }}>{pt.title}</div>
                <div style={{
                  fontSize: '24px', color: '#8B949E', lineHeight: 1.4,
                }}>{pt.description}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Final takeaway banner â€” grand entrance */}
      {takeaway && (
        <div style={{
          margin: '0 80px 60px',
          padding: '32px 48px',
          background: 'linear-gradient(135deg, rgba(0,217,255,0.12), rgba(139,92,246,0.12))',
          border: '1px solid transparent',
          backgroundClip: 'padding-box',
          borderRadius: '20px',
          position: 'relative',
          opacity: takeawaySpring,
          transform: `scale(${interpolate(takeawaySpring, [0, 1], [0.92, 1])})`,
          textAlign: 'center',
        }}>
          {/* Gradient border */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '20px',
            padding: '1px',
            background: 'linear-gradient(135deg, rgba(0,217,255,0.5), rgba(139,92,246,0.5))',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            pointerEvents: 'none',
          }} />
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>ðŸš€</div>
          <div style={{
            fontFamily: "'Outfit', sans-serif", fontSize: '34px', fontWeight: 700,
            background: 'linear-gradient(135deg, #00D9FF, #8B5CF6)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text', lineHeight: 1.4,
          }}>
            {takeaway}
          </div>
        </div>
      )}

      {/* SubtitlesOverlay + AudioMixer removed â€” will be re-added with real word timestamps */}

      <div className="progress-bar" style={{
        width: `${interpolate(frame, [0, totalFrames], [0, 100])}%`,
      }} />
    </AbsoluteFill>
  );
};

