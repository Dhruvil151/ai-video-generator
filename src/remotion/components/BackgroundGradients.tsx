import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import React from 'react';

interface BackgroundGradientsProps {
  variant?: 'default' | 'code' | 'terminal' | 'arch' | 'concept' | 'comparison' | 'summary' | 'stats' | 'quote' | 'chapter' | 'timeline' | 'steps';
  techPrimary?: string;
  techSecondary?: string;
}

// Each variant: base background + orb colours for visual identity
const VARIANTS: Record<string, { bg: string; orb1: any; orb2: any; orb3: any }> = {
  // ── Title / default — deep space blue-black, cyan + purple orbs ──────────────
  default: {
    bg:   '#040810',
    orb1: { cx: '15%', cy: '20%', r: 480, color: 'rgba(0,217,255,0.10)' },
    orb2: { cx: '85%', cy: '80%', r: 420, color: 'rgba(139,92,246,0.10)' },
    orb3: { cx: '50%', cy: '50%', r: 300, color: 'rgba(16,185,129,0.04)' },
  },
  // ── Code editor — near-black with cool violet tint ──────────────────────────
  code: {
    bg:   '#01020a',
    orb1: { cx: '5%',  cy: '30%', r: 380, color: 'rgba(139,92,246,0.13)' },
    orb2: { cx: '90%', cy: '60%', r: 350, color: 'rgba(0,217,255,0.08)' },
    orb3: { cx: '45%', cy: '90%', r: 260, color: 'rgba(16,185,129,0.05)' },
  },
  // ── Terminal — very dark with deep green tint ────────────────────────────────
  terminal: {
    bg:   '#000e03',
    orb1: { cx: '8%',  cy: '70%', r: 400, color: 'rgba(16,185,129,0.12)' },
    orb2: { cx: '80%', cy: '30%', r: 340, color: 'rgba(0,217,255,0.07)' },
    orb3: { cx: '50%', cy: '10%', r: 240, color: 'rgba(16,185,129,0.05)' },
  },
  // ── Architecture — dark navy, cyan blueprint feel ───────────────────────────
  arch: {
    bg:   '#020814',
    orb1: { cx: '20%', cy: '15%', r: 500, color: 'rgba(0,217,255,0.09)' },
    orb2: { cx: '80%', cy: '85%', r: 450, color: 'rgba(245,158,11,0.06)' },
    orb3: { cx: '60%', cy: '30%', r: 280, color: 'rgba(139,92,246,0.05)' },
  },
  // ── Concept cards — dark indigo, green + purple orbs ────────────────────────
  concept: {
    bg:   '#05060f',
    orb1: { cx: '10%', cy: '50%', r: 420, color: 'rgba(16,185,129,0.10)' },
    orb2: { cx: '90%', cy: '40%', r: 380, color: 'rgba(0,217,255,0.08)' },
    orb3: { cx: '50%', cy: '10%', r: 300, color: 'rgba(139,92,246,0.07)' },
  },
  // ── Comparison — dark neutral with red/green split feel ─────────────────────
  comparison: {
    bg:   '#050608',
    orb1: { cx: '20%', cy: '50%', r: 440, color: 'rgba(239,68,68,0.08)' },
    orb2: { cx: '80%', cy: '50%', r: 440, color: 'rgba(16,185,129,0.08)' },
    orb3: { cx: '50%', cy: '0%',  r: 300, color: 'rgba(139,92,246,0.04)' },
  },
  // ── Summary / closing — teal-tinged, brighter and more open ─────────────────
  summary: {
    bg:   '#040c10',
    orb1: { cx: '15%', cy: '20%', r: 500, color: 'rgba(0,217,255,0.12)' },
    orb2: { cx: '85%', cy: '80%', r: 460, color: 'rgba(139,92,246,0.11)' },
    orb3: { cx: '50%', cy: '50%', r: 350, color: 'rgba(16,185,129,0.08)' },
  },
  // ── Stats — dark with numeric energy, amber + cyan accent ───────────────────
  stats: {
    bg:   '#030509',
    orb1: { cx: '25%', cy: '60%', r: 450, color: 'rgba(245,158,11,0.10)' },
    orb2: { cx: '75%', cy: '40%', r: 400, color: 'rgba(0,217,255,0.09)' },
    orb3: { cx: '50%', cy: '10%', r: 280, color: 'rgba(239,68,68,0.04)' },
  },
  // ── Quote — minimal near-black, very subtle warm orb ────────────────────────
  quote: {
    bg:   '#050507',
    orb1: { cx: '50%', cy: '50%', r: 500, color: 'rgba(139,92,246,0.07)' },
    orb2: { cx: '10%', cy: '90%', r: 300, color: 'rgba(0,217,255,0.04)' },
    orb3: { cx: '90%', cy: '10%', r: 260, color: 'rgba(245,158,11,0.03)' },
  },
  // ── Chapter break — bold deep purple energy ──────────────────────────────────
  chapter: {
    bg:   '#06020e',
    orb1: { cx: '30%', cy: '40%', r: 520, color: 'rgba(139,92,246,0.14)' },
    orb2: { cx: '70%', cy: '60%', r: 460, color: 'rgba(0,217,255,0.08)' },
    orb3: { cx: '50%', cy: '80%', r: 300, color: 'rgba(245,158,11,0.05)' },
  },
  // ── Timeline — deep blue, flowing horizontal energy ──────────────────────────
  timeline: {
    bg:   '#03060e',
    orb1: { cx: '0%',  cy: '50%', r: 460, color: 'rgba(0,217,255,0.10)' },
    orb2: { cx: '100%', cy: '50%', r: 420, color: 'rgba(139,92,246,0.09)' },
    orb3: { cx: '50%',  cy: '50%', r: 280, color: 'rgba(16,185,129,0.05)' },
  },
  // ── Steps / numbered — dark green-black, growth feel ────────────────────────
  steps: {
    bg:   '#030a05',
    orb1: { cx: '15%', cy: '30%', r: 420, color: 'rgba(16,185,129,0.11)' },
    orb2: { cx: '85%', cy: '70%', r: 380, color: 'rgba(0,217,255,0.08)' },
    orb3: { cx: '50%', cy: '90%', r: 260, color: 'rgba(245,158,11,0.04)' },
  },
};

function hexToRgba(hex: string, alpha: number): string {
  if (!hex.startsWith('#')) return `rgba(0,217,255,${alpha})`;
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const W = 1920, H = 1080;
function px(pct: string, axis: 'x' | 'y') { return (parseFloat(pct) / 100) * (axis === 'x' ? W : H); }

export const BackgroundGradients: React.FC<BackgroundGradientsProps> = ({ variant = 'default', techPrimary, techSecondary }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const base = VARIANTS[variant] || VARIANTS.default;

  // Override orb colours with tech brand colours when provided
  const v = techPrimary ? {
    ...base,
    orb1: { ...base.orb1, color: hexToRgba(techPrimary, 0.11) },
    orb2: { ...base.orb2, color: hexToRgba(techSecondary || techPrimary, 0.09) },
    orb3: { ...base.orb3, color: hexToRgba(techPrimary, 0.04) },
  } : base;

  // Ambient floating motion
  const drift1 = Math.sin(frame / (fps * 3)) * 40;
  const drift2 = Math.cos(frame / (fps * 4)) * 30;
  const drift3 = Math.sin(frame / (fps * 5) + 1) * 20;
  const drift4 = Math.cos(frame / (fps * 2.5)) * 50;

  // Grid pan
  const gridPanY = (frame * 0.5) % 48;
  const gridPanX = (frame * 0.2) % 48;

  const sceneOpacity = interpolate(frame, [0, fps * 0.5], [0, 1], { extrapolateRight: 'clamp' });
  const orbId  = `blur-orb-${variant}`;
  const partId = `blur-particle-${variant}`;

  // Terminal/code scanlines flicker (subtle)
  const scanlineOpacity = (variant === 'terminal' || variant === 'code')
    ? 0.04 + Math.sin(frame / 2) * 0.01
    : 0;

  // Chapter pulse ring
  const chapterPulse = variant === 'chapter'
    ? 0.06 + Math.sin(frame / (fps * 1.5)) * 0.04
    : 0;

  return (
    <AbsoluteFill style={{ zIndex: -1, opacity: sceneOpacity }}>

      {/* ── Base background colour (unique per variant) ── */}
      <div style={{ position: 'absolute', inset: 0, background: v.bg }} />

      {/* ── Variant-specific overlays ── */}

      {/* Terminal/Code: subtle scanlines */}
      {scanlineOpacity > 0 && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.3) 0px, rgba(0,0,0,0.3) 1px, transparent 1px, transparent 4px)',
          opacity: scanlineOpacity,
          pointerEvents: 'none',
        }} />
      )}

      {/* Architecture: blueprint grid (flat, high contrast) */}
      {variant === 'arch' && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `
            linear-gradient(rgba(0,217,255,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,217,255,0.06) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          opacity: 0.6,
        }} />
      )}

      {/* Stats: subtle large number watermark feeling */}
      {variant === 'stats' && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `radial-gradient(ellipse at 70% 30%, rgba(245,158,11,0.05) 0%, transparent 60%)`,
        }} />
      )}

      {/* Chapter: radial pulse ring */}
      {variant === 'chapter' && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          width: '900px', height: '900px',
          borderRadius: '50%',
          border: `2px solid rgba(139,92,246,${chapterPulse})`,
          transform: 'translate(-50%, -50%)',
          boxShadow: `0 0 80px rgba(139,92,246,${chapterPulse * 0.5})`,
        }} />
      )}

      {/* Timeline: horizontal gradient streak */}
      {variant === 'timeline' && (
        <div style={{
          position: 'absolute', top: '50%', left: 0, right: 0,
          height: '1px',
          background: `linear-gradient(to right, transparent, rgba(0,217,255,0.15) 20%, rgba(0,217,255,0.15) 80%, transparent)`,
          transform: 'translateY(-50%)',
        }} />
      )}

      {/* ── Drifting perspective grid ── */}
      <div style={{
        position: 'absolute', inset: '-50%',
        opacity: 0.12,
        backgroundImage: `
          linear-gradient(to right, ${v.orb1.color} 1px, transparent 1px),
          linear-gradient(to bottom, ${v.orb2.color} 1px, transparent 1px)
        `,
        backgroundSize: '48px 48px',
        transform: `perspective(600px) rotateX(60deg) translateY(${gridPanY}px) translateX(${gridPanX}px)`,
        transformOrigin: 'center center',
        maskImage: 'radial-gradient(ellipse at center, black 10%, transparent 70%)',
        WebkitMaskImage: 'radial-gradient(ellipse at center, black 10%, transparent 70%)',
      }} />

      {/* ── SVG: ambient glow orbs + floating particles ── */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }} preserveAspectRatio="none">
        <defs>
          <filter id={orbId}><feGaussianBlur in="SourceGraphic" stdDeviation="60" /></filter>
          <filter id={partId}><feGaussianBlur in="SourceGraphic" stdDeviation="3" /></filter>
        </defs>

        <circle cx={px(v.orb1.cx, 'x')} cy={px(v.orb1.cy, 'y') + drift1} r={v.orb1.r}
          fill={v.orb1.color} filter={`url(#${orbId})`} opacity={0.65} />
        <circle cx={px(v.orb2.cx, 'x')} cy={px(v.orb2.cy, 'y') + drift2} r={v.orb2.r}
          fill={v.orb2.color} filter={`url(#${orbId})`} opacity={0.65} />
        <circle cx={px(v.orb3.cx, 'x')} cy={px(v.orb3.cy, 'y') + drift3} r={v.orb3.r}
          fill={v.orb3.color} filter={`url(#${orbId})`} opacity={0.65} />

        {/* Floating sharp particles */}
        <circle cx={px(v.orb1.cx, 'x') - W * 0.1 + drift2 * 1.5} cy={px(v.orb1.cy, 'y') - H * 0.15 + drift1} r="4"
          fill="#00D9FF" opacity={0.4 + Math.sin(frame / 10) * 0.3} filter={`url(#${partId})`} />
        <circle cx={px(v.orb2.cx, 'x') + W * 0.15 + drift3} cy={px(v.orb2.cy, 'y') - H * 0.1 + drift4} r="6"
          fill="#8B5CF6" opacity={0.3 + Math.cos(frame / 12) * 0.2} filter={`url(#${partId})`} />
        <circle cx={px(v.orb3.cx, 'x') - W * 0.2 + drift4 * 0.8} cy={px(v.orb3.cy, 'y') + H * 0.2 + drift2} r="3"
          fill="#10B981" opacity={0.5 + Math.sin(frame / 8) * 0.4} filter={`url(#${partId})`} />
        <circle cx={W * 0.5 + drift1 * 2} cy={H * 0.4 + drift3 * 1.5} r="5"
          fill="#E6EDF3" opacity={0.15 + Math.cos(frame / 15) * 0.15} filter={`url(#${partId})`} />
      </svg>
    </AbsoluteFill>
  );
};
