// @ts-nocheck
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, OffthreadVideo, staticFile } from 'remotion';
import React from 'react';
import '../styles/video.css';

/**
 * StockVideoScene — full-bleed stock video background with title/subtitle overlay.
 *
 * Uses Pexels B-roll footage (videoUrl from payload) as the full-screen background.
 * Falls back to an animated gradient if no videoUrl is provided.
 * The video plays muted — all audio is handled downstream by FFmpeg.
 */
export const StockVideoScene = ({ scene, techPrimary, techSecondary }: any) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationSec   = scene.actualDurationSec || scene.estimatedDurationSec || 10;
  const totalFrames   = Math.ceil(durationSec * fps);
  const primary       = techPrimary   || '#00D9FF';
  const secondary     = techSecondary || '#8B5CF6';

  const videoUrl   = scene.payload?.videoUrl || null;
  const points     = (scene.payload?.bulletPoints || []).slice(0, 3);

  // Animation springs
  const overlayIn  = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: 'clamp' });
  const contentSp  = spring({ frame, fps, config: { damping: 28, stiffness: 90 }, delay: 12 });
  const tagSp      = spring({ frame, fps, config: { damping: 20, stiffness: 120 }, delay: 6 });

  return (
    <AbsoluteFill className="scene" style={{ background: '#000' }}>

      {/* ── Full-bleed video OR gradient fallback ── */}
      {videoUrl ? (
        <OffthreadVideo
          src={videoUrl.startsWith('broll/') ? staticFile(videoUrl) : videoUrl}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          muted
        />
      ) : (
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(135deg, #050510 0%, ${secondary}22 50%, ${primary}11 100%)`,
        }} />
      )}

      {/* ── Cinematic gradient overlay (dark bottom for text legibility) ── */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(
          to bottom,
          rgba(0,0,0,0.25) 0%,
          rgba(0,0,0,0.45) 40%,
          rgba(0,0,0,0.80) 75%,
          rgba(0,0,0,0.93) 100%
        )`,
        opacity: overlayIn,
      }} />

      {/* ── Accent horizontal bar ── */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 236,
        height: '2px',
        background: `linear-gradient(to right, transparent 0%, ${primary} 30%, ${primary} 70%, transparent 100%)`,
        opacity: contentSp * 0.8,
      }} />

      {/* ── Text content (lower third) ── */}
      <div style={{
        position: 'absolute', bottom: 100, left: 120, right: 120,
        opacity: contentSp,
        transform: `translateY(${interpolate(contentSp, [0, 1], [32, 0])}px)`,
      }}>
        {/* Scene tag */}
        <div style={{
          display: 'inline-block',
          padding: '5px 16px',
          background: `${primary}22`,
          border: `1px solid ${primary}55`,
          borderRadius: '6px',
          fontSize: '20px',
          fontWeight: 700,
          color: primary,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: '16px',
          opacity: tagSp,
          transform: `translateX(${interpolate(tagSp, [0, 1], [-20, 0])}px)`,
        }}>
          B-Roll
        </div>

        {/* Title */}
        <h2 style={{
          fontSize: '68px',
          fontWeight: 800,
          color: '#fff',
          margin: '0 0 10px',
          lineHeight: 1.15,
          textShadow: '0 4px 40px rgba(0,0,0,0.9)',
        }}>
          {scene.title}
        </h2>

        {/* Subtitle */}
        {scene.subtitle && (
          <p style={{
            fontSize: '28px',
            color: 'rgba(255,255,255,0.75)',
            margin: '0 0 20px',
            textShadow: '0 2px 20px rgba(0,0,0,0.8)',
          }}>
            {scene.subtitle}
          </p>
        )}

        {/* Optional bullet chips */}
        {points.length > 0 && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {points.map((p: any, i: number) => {
              const chipSp = spring({ frame, fps, config: { damping: 22, stiffness: 100 }, delay: 20 + i * 10 });
              const label  = typeof p === 'string' ? p : (p.title || p.text || '');
              return (
                <div key={i} style={{
                  padding: '10px 22px',
                  background: 'rgba(0,0,0,0.55)',
                  border: `1px solid ${primary}44`,
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '22px',
                  fontWeight: 500,
                  opacity: chipSp,
                  transform: `translateY(${interpolate(chipSp, [0, 1], [14, 0])}px)`,
                  backdropFilter: 'blur(12px)',
                }}>
                  {label}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Progress bar ── */}
      <div className="progress-bar" style={{ width: `${interpolate(frame, [0, totalFrames], [0, 100])}%`, background: primary }} />
    </AbsoluteFill>
  );
};
