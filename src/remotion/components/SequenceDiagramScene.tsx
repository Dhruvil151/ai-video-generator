import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import React, { useMemo } from 'react';
import { BackgroundGradients } from './BackgroundGradients';
import '../styles/video.css';

interface SeqMessage {
  from: string;
  to: string;
  label?: string;
  type?: 'request' | 'response' | 'async';
}

interface SequenceDiagramSceneProps {
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
      actors?: string[];
      messages?: SeqMessage[];
    };
  };
  bgMusicUrl?: string | null;
  techPrimary?: string;
  techSecondary?: string;
}

const TYPE_COLOR: Record<string, string> = {
  request: '#00D9FF',
  response: '#10B981',
  async: '#F59E0B',
};

const DIAGRAM_W = 1680;
const ROW_H = 74;
const TOP_PAD = 130;

export const SequenceDiagramScene: React.FC<SequenceDiagramSceneProps> = ({ scene, techPrimary }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationSec = scene.actualDurationSec || scene.estimatedDurationSec || 10;
  const totalFrames = Math.ceil(durationSec * fps);

  const actors   = scene.payload?.actors   || [];
  const messages = scene.payload?.messages || [];
  const primary  = techPrimary || '#00D9FF';

  const actorX = useMemo(() => {
    const count = Math.max(actors.length, 1);
    return actors.map((_, i) => (count > 1 ? (i / (count - 1)) * DIAGRAM_W : DIAGRAM_W / 2));
  }, [actors]);

  const diagramH = TOP_PAD + messages.length * ROW_H + 60;

  const headerSpring = spring({ frame, fps, config: { damping: 24, stiffness: 120 }, delay: 0 });
  const actorSpring   = spring({ frame, fps, config: { damping: 20, stiffness: 100 }, delay: 8 });

  return (
    <AbsoluteFill className="scene">
      <BackgroundGradients variant="arch" techPrimary={techPrimary} />

      <div style={{ padding: '52px 80px 0', opacity: headerSpring, transform: `translateY(${interpolate(headerSpring, [0, 1], [-30, 0])}px)` }}>
        <div className="scene-tag">Message Flow</div>
        <h2 className="scene-title">{scene.title}</h2>
        {scene.subtitle && <p className="scene-subtitle">{scene.subtitle}</p>}
      </div>

      <div style={{ flex: 1, margin: '20px 120px 60px', position: 'relative' }}>
        <svg viewBox={`0 0 ${DIAGRAM_W} ${diagramH}`} width="100%" height="100%" style={{ overflow: 'visible' }}>
          <defs>
            <marker id="seq-arrow-r" markerWidth="10" markerHeight="8" refX="8" refY="4" orient="auto">
              <polygon points="0 0, 9 4, 0 8" fill="currentColor" />
            </marker>
            <marker id="seq-arrow-l" markerWidth="10" markerHeight="8" refX="1" refY="4" orient="auto">
              <polygon points="9 0, 0 4, 9 8" fill="currentColor" />
            </marker>
          </defs>

          {/* Actor boxes + lifelines */}
          {actors.map((name, ai) => {
            const x = actorX[ai];
            return (
              <g key={ai} opacity={actorSpring} style={{ transform: `translateY(${interpolate(actorSpring, [0, 1], [-16, 0])}px)`, transformOrigin: 'center' }}>
                <line x1={x} y1={70} x2={x} y2={diagramH} stroke="rgba(255,255,255,0.12)" strokeWidth={2} strokeDasharray="6 8" />
                <rect x={x - 100} y={20} width={200} height={54} rx={12} fill="rgba(22,27,34,0.9)" stroke={primary} strokeWidth={1.5} />
                <text x={x} y={54} textAnchor="middle" fontSize="24" fontWeight={700} fontFamily="Inter, sans-serif" fill="#E6EDF3">{name}</text>
              </g>
            );
          })}

          {/* Messages */}
          {messages.map((msg, mi) => {
            const fromIdx = actors.indexOf(msg.from);
            const toIdx   = actors.indexOf(msg.to);
            if (fromIdx === -1 || toIdx === -1) return null;
            const x1 = actorX[fromIdx];
            const x2 = actorX[toIdx];
            const y  = TOP_PAD + mi * ROW_H;
            const color = TYPE_COLOR[msg.type || 'request'];
            const forward = x2 >= x1;
            const msgSpring = spring({ frame, fps, config: { damping: 22, stiffness: 110 }, delay: 20 + mi * 10 });
            const drawn = interpolate(msgSpring, [0, 1], [x1, x2]);
            const dashed = msg.type === 'async';
            return (
              <g key={mi} opacity={msgSpring} color={color}>
                {msg.label && (
                  <text x={(x1 + x2) / 2} y={y - 12} textAnchor="middle" fontSize="19" fontFamily="JetBrains Mono, monospace" fill={color}>
                    {msg.label}
                  </text>
                )}
                <line
                  x1={x1} y1={y}
                  x2={drawn}
                  y2={y}
                  stroke={color} strokeWidth={2.5}
                  strokeDasharray={dashed ? '8 6' : undefined}
                  markerEnd={forward ? 'url(#seq-arrow-r)' : undefined}
                  markerStart={!forward ? 'url(#seq-arrow-l)' : undefined}
                />
              </g>
            );
          })}
        </svg>
      </div>

      <div className="progress-bar" style={{ width: `${interpolate(frame, [0, totalFrames], [0, 100])}%` }} />
    </AbsoluteFill>
  );
};
