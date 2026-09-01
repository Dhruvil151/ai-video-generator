import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import React from 'react';

interface BackgroundGradientsProps {
  variant?: 'default' | 'code' | 'arch' | 'concept' | 'comparison' | 'summary';
}

// Animated gradient orbs — define per scene variant
const VARIANTS = {
  default: {
    orb1: { cx: '15%', cy: '20%', r: '480px', color: 'rgba(0, 217, 255, 0.08)' },
    orb2: { cx: '85%', cy: '80%', r: '420px', color: 'rgba(139, 92, 246, 0.08)' },
    orb3: { cx: '50%', cy: '50%', r: '300px', color: 'rgba(16, 185, 129, 0.04)' },
  },
  code: {
    orb1: { cx: '5%',  cy: '30%', r: '380px', color: 'rgba(139, 92, 246, 0.10)' },
    orb2: { cx: '90%', cy: '60%', r: '350px', color: 'rgba(0, 217, 255, 0.07)' },
    orb3: { cx: '45%', cy: '90%', r: '260px', color: 'rgba(16, 185, 129, 0.05)' },
  },
  arch: {
    orb1: { cx: '20%', cy: '15%', r: '500px', color: 'rgba(0, 217, 255, 0.09)' },
    orb2: { cx: '80%', cy: '85%', r: '450px', color: 'rgba(245, 158, 11, 0.06)' },
    orb3: { cx: '60%', cy: '30%', r: '280px', color: 'rgba(139, 92, 246, 0.06)' },
  },
  concept: {
    orb1: { cx: '10%', cy: '50%', r: '420px', color: 'rgba(16, 185, 129, 0.09)' },
    orb2: { cx: '90%', cy: '40%', r: '380px', color: 'rgba(0, 217, 255, 0.07)' },
    orb3: { cx: '50%', cy: '10%', r: '300px', color: 'rgba(139, 92, 246, 0.06)' },
  },
  comparison: {
    orb1: { cx: '25%', cy: '50%', r: '440px', color: 'rgba(239, 68, 68, 0.06)' },
    orb2: { cx: '75%', cy: '50%', r: '440px', color: 'rgba(16, 185, 129, 0.07)' },
    orb3: { cx: '50%', cy: '0%',  r: '300px', color: 'rgba(139, 92, 246, 0.05)' },
  },
  summary: {
    orb1: { cx: '15%', cy: '20%', r: '500px', color: 'rgba(0, 217, 255, 0.10)' },
    orb2: { cx: '85%', cy: '80%', r: '460px', color: 'rgba(139, 92, 246, 0.10)' },
    orb3: { cx: '50%', cy: '50%', r: '350px', color: 'rgba(16, 185, 129, 0.07)' },
  },
};

export const BackgroundGradients: React.FC<BackgroundGradientsProps> = ({ variant = 'default' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const v = VARIANTS[variant] || VARIANTS.default;

  // Slow floating animation using sin waves — very subtle
  const drift1 = Math.sin(frame / (fps * 3)) * 20;
  const drift2 = Math.cos(frame / (fps * 4)) * 16;
  const drift3 = Math.sin(frame / (fps * 5) + 1) * 12;

  // Subtle grid pattern opacity
  const gridOpacity = interpolate(frame, [0, fps * 0.5], [0, 0.03], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ zIndex: -1 }}>
      {/* Solid dark base */}
      <div style={{ position: 'absolute', inset: 0, background: '#060810' }} />

      {/* Ambient gradient orbs */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}
        preserveAspectRatio="none"
      >
        <defs>
          <filter id="blur-orb">
            <feGaussianBlur in="SourceGraphic" stdDeviation="80" />
          </filter>
        </defs>
        <circle cx={v.orb1.cx} cy={`calc(${v.orb1.cy} + ${drift1}px)`} r={v.orb1.r}
          fill={v.orb1.color} filter="url(#blur-orb)" />
        <circle cx={v.orb2.cx} cy={`calc(${v.orb2.cy} + ${drift2}px)`} r={v.orb2.r}
          fill={v.orb2.color} filter="url(#blur-orb)" />
        <circle cx={v.orb3.cx} cy={`calc(${v.orb3.cy} + ${drift3}px)`} r={v.orb3.r}
          fill={v.orb3.color} filter="url(#blur-orb)" />
      </svg>

      {/* Subtle dot grid */}
      <div style={{
        position: 'absolute', inset: 0,
        opacity: gridOpacity,
        backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)`,
        backgroundSize: '48px 48px',
      }} />
    </AbsoluteFill>
  );
};
