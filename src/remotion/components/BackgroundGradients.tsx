import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import React from 'react';

interface BackgroundGradientsProps {
  variant?: 'default' | 'code' | 'arch' | 'concept' | 'comparison' | 'summary';
  /** Override orb colors with tech brand colors */
  techPrimary?: string;
  techSecondary?: string;
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

function hexToRgba(hex: string, alpha: number): string {
  // Handle named colors that aren't hex
  if (!hex.startsWith('#')) return `rgba(0,217,255,${alpha})`;
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const W = 1920;
const H = 1080;
function px(pct: string, axis: 'x' | 'y'): number {
  const n = parseFloat(pct);
  return (n / 100) * (axis === 'x' ? W : H);
}

export const BackgroundGradients: React.FC<BackgroundGradientsProps> = ({ variant = 'default', techPrimary, techSecondary }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const base = VARIANTS[variant] || VARIANTS.default;

  // If tech brand colors are passed, tint the orbs with them
  const v = techPrimary ? {
    orb1: { ...base.orb1, color: hexToRgba(techPrimary, 0.10) },
    orb2: { ...base.orb2, color: hexToRgba(techSecondary || techPrimary, 0.08) },
    orb3: { ...base.orb3, color: hexToRgba(techPrimary, 0.04) },
  } : base;

  // Slower floating animation using sin waves for ambient particles
  const drift1 = Math.sin(frame / (fps * 3)) * 40;
  const drift2 = Math.cos(frame / (fps * 4)) * 30;
  const drift3 = Math.sin(frame / (fps * 5) + 1) * 20;
  const drift4 = Math.cos(frame / (fps * 2.5)) * 50;

  // Continuous drifting for the perspective grid
  const gridPanY = (frame * 0.5) % 48;
  const gridPanX = (frame * 0.2) % 48;

  // Fade-in opacity
  const sceneOpacity = interpolate(frame, [0, fps * 0.5], [0, 1], { extrapolateRight: 'clamp' });

  const orbFilterId      = `blur-orb-${variant}`;
  const particleFilterId = `blur-particle-${variant}`;

  return (
    <AbsoluteFill style={{ zIndex: -1, opacity: sceneOpacity }}>
      {/* Solid dark base */}
      <div style={{ position: 'absolute', inset: 0, background: '#060810' }} />

      {/* Drifting Perspective Grid */}
      <div
        style={{
          position: 'absolute',
          inset: '-50%', // Oversize to allow panning without clipping
          opacity: 0.15,
          backgroundImage: `
            linear-gradient(to right, ${v.orb1.color} 1px, transparent 1px),
            linear-gradient(to bottom, ${v.orb2.color} 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          transform: `perspective(600px) rotateX(60deg) translateY(${gridPanY}px) translateX(${gridPanX}px)`,
          transformOrigin: 'center center',
          maskImage: 'radial-gradient(ellipse at center, black 10%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 10%, transparent 70%)',
        }}
      />

      {/* Floating Particle Field */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}
        preserveAspectRatio="none"
      >
        <defs>
          <filter id={orbFilterId}>
            <feGaussianBlur in="SourceGraphic" stdDeviation="60" />
          </filter>
          <filter id={particleFilterId}>
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
          </filter>
        </defs>
        
        {/* Deep ambient glow orbs */}
        <circle cx={px(v.orb1.cx, 'x')} cy={px(v.orb1.cy, 'y') + drift1} r={parseInt(v.orb1.r)}
          fill={v.orb1.color} filter={`url(#${orbFilterId})`} opacity={0.6} />
        <circle cx={px(v.orb2.cx, 'x')} cy={px(v.orb2.cy, 'y') + drift2} r={parseInt(v.orb2.r)}
          fill={v.orb2.color} filter={`url(#${orbFilterId})`} opacity={0.6} />
        <circle cx={px(v.orb3.cx, 'x')} cy={px(v.orb3.cy, 'y') + drift3} r={parseInt(v.orb3.r)}
          fill={v.orb3.color} filter={`url(#${orbFilterId})`} opacity={0.6} />

        {/* Sharp floating particles */}
        <circle cx={px(v.orb1.cx, 'x') - W * 0.1 + drift2 * 1.5} cy={px(v.orb1.cy, 'y') - H * 0.15 + drift1} r="4" fill="#00D9FF" opacity={0.4 + Math.sin(frame / 10) * 0.3} filter={`url(#${particleFilterId})`} />
        <circle cx={px(v.orb2.cx, 'x') + W * 0.15 + drift3} cy={px(v.orb2.cy, 'y') - H * 0.1 + drift4} r="6" fill="#8B5CF6" opacity={0.3 + Math.cos(frame / 12) * 0.2} filter={`url(#${particleFilterId})`} />
        <circle cx={px(v.orb3.cx, 'x') - W * 0.2 + drift4 * 0.8} cy={px(v.orb3.cy, 'y') + H * 0.2 + drift2} r="3" fill="#10B981" opacity={0.5 + Math.sin(frame / 8) * 0.4} filter={`url(#${particleFilterId})`} />
        <circle cx={W * 0.5 + drift1 * 2} cy={H * 0.4 + drift3 * 1.5} r="5" fill="#E6EDF3" opacity={0.2 + Math.cos(frame / 15) * 0.2} filter={`url(#${particleFilterId})`} />
      </svg>
    </AbsoluteFill>
  );
};
