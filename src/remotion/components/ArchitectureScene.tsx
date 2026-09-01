import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import React, { useMemo } from 'react';
import { BackgroundGradients } from './BackgroundGradients';
import { SubtitlesOverlay, estimateSubtitles } from './SubtitlesOverlay';
import { AudioMixer } from './AudioMixer';
import '../styles/video.css';

interface ArchNode {
  id: string;
  label: string;
  icon?: string;
  status?: 'active' | 'idle' | 'processing' | 'success';
}
interface ArchConnection {
  from: string;
  to: string;
  label?: string;
}

interface ArchitectureSceneProps {
  scene: {
    title: string;
    subtitle: string;
    narration: string;
    audioUrl?: string | null;
    actualDurationSec?: number;
    estimatedDurationSec?: number;
    subtitles?: any[];
    payload?: {
      nodes?: ArchNode[];
      connections?: ArchConnection[];
      flowDescription?: string;
    };
  };
  bgMusicUrl?: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  active:     '#00D9FF',
  processing: '#8B5CF6',
  success:    '#10B981',
  idle:       '#484F58',
};

const ICON_MAP: Record<string, string> = {
  'globe': '🌐', 'cpu': '⚙️', 'database': '🗄️', 'server': '🖥️',
  'cloud': '☁️', 'shield': '🛡️', 'zap': '⚡', 'layers': '📚',
  'code': '< >', 'lock': '🔒', 'network': '🔗', 'terminal': '⬛',
  'package': '📦', 'git-branch': '🌿', 'box': '📦', 'key': '🔑',
  'check-circle': '✅', 'x-circle': '❌', 'activity': '📈',
  'bar-chart': '📊', 'settings': '⚙️', 'refresh-cw': '🔄',
  'arrow-right': '→', 'play': '▶', 'stop-circle': '⬛', 'file': '📄',
  'alert-triangle': '⚠️', 'link': '🔗', 'repeat': '🔁', 'clock': '⏱️',
};

// Auto-layout nodes in a flow layout
function layoutNodes(nodes: ArchNode[]): Array<ArchNode & { x: number; y: number }> {
  const count = nodes.length;
  if (count === 0) return [];

  // Lay out in columns of max 3 rows
  const cols  = Math.ceil(count / 3);
  const rows  = Math.ceil(count / cols);
  const cellW = 1100 / cols;
  const cellH = 700 / rows;

  return nodes.map((n, i) => ({
    ...n,
    x: (i % cols) * cellW + cellW / 2,
    y: Math.floor(i / cols) * cellH + cellH / 2,
  }));
}

export const ArchitectureScene: React.FC<ArchitectureSceneProps> = ({ scene, bgMusicUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationSec = scene.actualDurationSec || scene.estimatedDurationSec || 10;
  const totalFrames = Math.ceil(durationSec * fps);

  const nodes       = scene.payload?.nodes       || [];
  const connections = scene.payload?.connections || [];
  const flowDesc    = scene.payload?.flowDescription || '';

  const laid = useMemo(() => layoutNodes(nodes), [nodes]);

  const subtitles = (scene.subtitles && scene.subtitles.length > 0)
    ? scene.subtitles
    : estimateSubtitles(scene.narration, durationSec);

  // Header entrance
  const headerSpring = spring({ frame, fps, config: { damping: 24, stiffness: 120 }, delay: 0 });

  // Animated connection pulse (0→1 loop over 2 seconds)
  const pulse = (Math.sin(frame / (fps * 2) * Math.PI * 2) + 1) / 2;

  // Sequential node reveal
  const nodeById = new Map(laid.map(n => [n.id, n]));

  return (
    <AbsoluteFill className="scene">
      <BackgroundGradients variant="arch" />

      {/* Header */}
      <div style={{
        padding: '52px 80px 24px',
        opacity: headerSpring,
        transform: `translateY(${interpolate(headerSpring, [0, 1], [-30, 0])}px)`,
      }}>
        <div className="scene-tag">Architecture</div>
        <h2 className="scene-title">{scene.title}</h2>
        <p className="scene-subtitle">{scene.subtitle}</p>
      </div>

      {/* Diagram canvas */}
      <div style={{ flex: 1, position: 'relative', margin: '0 80px 80px', overflow: 'hidden' }}>
        {/* SVG connections */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#00D9FF" opacity="0.7" />
            </marker>
            <filter id="glow-line">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {connections.map((conn, ci) => {
            const from = nodeById.get(conn.from);
            const to   = nodeById.get(conn.to);
            if (!from || !to) return null;

            const revealSpring = spring({ frame, fps, config: { damping: 18, stiffness: 70 }, delay: 20 + ci * 8 });
            const x1 = from.x, y1 = from.y;
            const x2 = to.x,   y2 = to.y;
            const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;

            // Animated packet traveling along the line
            const packetProgress = (pulse + ci * 0.33) % 1;
            const px = x1 + (x2 - x1) * packetProgress;
            const py = y1 + (y2 - y1) * packetProgress;

            return (
              <g key={ci} opacity={revealSpring}>
                <line x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="rgba(0,217,255,0.25)" strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                  filter="url(#glow-line)"
                />
                {/* Moving data packet */}
                <circle cx={px} cy={py} r="6" fill="#00D9FF" opacity={0.8} />
                <circle cx={px} cy={py} r="12" fill="rgba(0,217,255,0.2)" />
                {/* Label */}
                {conn.label && (
                  <text x={mx} y={my - 14} textAnchor="middle"
                    fill="rgba(139,148,158,0.9)" fontSize="22"
                    fontFamily="JetBrains Mono, monospace">
                    {conn.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Nodes */}
        {laid.map((node, ni) => {
          const color  = STATUS_COLORS[node.status || 'idle'];
          const revealSpring = spring({ frame, fps, config: { damping: 20, stiffness: 100 }, delay: 10 + ni * 6 });
          const icon   = ICON_MAP[node.icon || ''] || '●';

          return (
            <div key={node.id} style={{
              position: 'absolute',
              left: node.x - 120, top: node.y - 70,
              width: '240px',
              opacity: revealSpring,
              transform: `scale(${interpolate(revealSpring, [0, 1], [0.6, 1])})`,
            }}>
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
                padding: '24px 20px',
                background: 'rgba(22, 27, 34, 0.85)',
                border: `1.5px solid ${color}`,
                borderRadius: '16px',
                boxShadow: `0 0 24px ${color}33, 0 8px 32px rgba(0,0,0,0.5)`,
              }}>
                <div style={{ fontSize: '40px', lineHeight: 1 }}>{icon}</div>
                <div style={{
                  fontFamily: 'Inter, sans-serif', fontSize: '24px', fontWeight: 600,
                  color: '#E6EDF3', textAlign: 'center', lineHeight: 1.3,
                }}>{node.label}</div>
                <div style={{
                  width: '10px', height: '10px', borderRadius: '50%', background: color,
                  boxShadow: `0 0 8px ${color}`,
                  animation: node.status === 'processing' ? 'pulse 1s infinite' : 'none',
                }} />
              </div>
            </div>
          );
        })}

        {/* Flow description */}
        {flowDesc && (
          <div style={{
            position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
            padding: '14px 32px',
            background: 'rgba(0,217,255,0.06)',
            border: '1px solid rgba(0,217,255,0.2)',
            borderRadius: '100px',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '22px', color: '#00D9FF',
            opacity: spring({ frame, fps, config: { damping: 18, stiffness: 70 }, delay: 40 }),
            whiteSpace: 'nowrap',
          }}>
            ⟳ {flowDesc}
          </div>
        )}
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
