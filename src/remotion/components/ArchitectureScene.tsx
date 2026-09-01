import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import React, { useMemo } from 'react';
import { BackgroundGradients } from './BackgroundGradients';
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
      layout?: 'flow' | 'radial';
      nodes?: ArchNode[];
      connections?: ArchConnection[];
      flowDescription?: string;
    };
  };
  bgMusicUrl?: string | null;
}

// Auto-layout nodes in a flow layout
function layoutNodes(nodes: ArchNode[]): Array<ArchNode & { x: number; y: number }> {
  const count = nodes.length;
  if (count === 0) return [];
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
  const layout      = scene.payload?.layout || 'flow';

  const laid = useMemo(() => layoutNodes(nodes), [nodes]);

  const headerSpring = spring({ frame, fps, config: { damping: 24, stiffness: 120 }, delay: 0 });
  const pulse = (Math.sin(frame / (fps * 2) * Math.PI * 2) + 1) / 2;
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
        {scene.subtitle && <p className="scene-subtitle">{scene.subtitle}</p>}
      </div>

      {layout === 'radial'
        ? <RadialDiagram nodes={nodes} connections={connections} frame={frame} fps={fps} flowDesc={flowDesc} pulse={pulse} />
        : <FlowDiagram   laid={laid}   connections={connections} frame={frame} fps={fps} flowDesc={flowDesc} pulse={pulse} nodeById={nodeById} />}

      <div className="progress-bar" style={{ width: `${interpolate(frame, [0, totalFrames], [0, 100])}%` }} />
    </AbsoluteFill>
  );
};

// -- FlowDiagram (default layout) ----------------------------------------------
const ICONS: any = {
  globe:'🌐',cpu:'⚙️',database:'🗄️',server:'🖥️',cloud:'☁️',shield:'🛡️',
  zap:'⚡',layers:'📚',code:'<>',lock:'🔒',network:'🔗',terminal:'⬛',
  package:'📦','git-branch':'🌿',box:'📦',key:'🔑','check-circle':'✅',
  'x-circle':'❌',activity:'📈','bar-chart':'📊',settings:'⚙️','refresh-cw':'🔄',
  'arrow-right':'→',play:'▶','stop-circle':'⬛',file:'📄','alert-triangle':'⚠️',
  link:'🔗',repeat:'🔁',clock:'⏱️',
};
const STATUS_C: any = { active:'#00D9FF', processing:'#8B5CF6', success:'#10B981', idle:'#484F58' };

const FlowDiagram: React.FC<any> = ({ laid, connections, frame, fps, flowDesc, pulse, nodeById }) => (
  <div style={{ flex: 1, position: 'relative', margin: '0 80px 80px', overflow: 'hidden' }}>
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
      {connections.map((conn: any, ci: number) => {
        const from = nodeById.get(conn.from);
        const to   = nodeById.get(conn.to);
        if (!from || !to) return null;
        const sp = spring({ frame, fps, config: { damping: 18, stiffness: 70 }, delay: 20 + ci * 8 });
        const { x: x1, y: y1 } = from;
        const { x: x2, y: y2 } = to;
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
        const pp = (pulse + ci * 0.33) % 1;
        const px = x1 + (x2 - x1) * pp, py = y1 + (y2 - y1) * pp;
        return (
          <g key={ci} opacity={sp}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(0,217,255,0.25)" strokeWidth="2" markerEnd="url(#arrowhead)" filter="url(#glow-line)" />
            <circle cx={px} cy={py} r="6" fill="#00D9FF" opacity={0.8} />
            <circle cx={px} cy={py} r="12" fill="rgba(0,217,255,0.2)" />
            {conn.label && <text x={mx} y={my - 14} textAnchor="middle" fill="rgba(139,148,158,0.9)" fontSize="22" fontFamily="JetBrains Mono, monospace">{conn.label}</text>}
          </g>
        );
      })}
    </svg>
    {laid.map((node: any, ni: number) => {
      const color = STATUS_C[node.status || 'idle'];
      const sp = spring({ frame, fps, config: { damping: 20, stiffness: 100 }, delay: 10 + ni * 6 });
      const icon = ICONS[node.icon || ''] || '●';
      return (
        <div key={node.id} style={{ position: 'absolute', left: node.x - 120, top: node.y - 70, width: '240px', opacity: sp, transform: `scale(${interpolate(sp, [0, 1], [0.6, 1])})` }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '24px 20px', background: 'rgba(22,27,34,0.85)', border: `1.5px solid ${color}`, borderRadius: '16px', boxShadow: `0 0 24px ${color}33, 0 8px 32px rgba(0,0,0,0.5)` }}>
            <div style={{ fontSize: '40px', lineHeight: 1 }}>{icon}</div>
            <div style={{ fontFamily: 'Inter,sans-serif', fontSize: '24px', fontWeight: 600, color: '#E6EDF3', textAlign: 'center', lineHeight: 1.3 }}>{node.label}</div>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}` }} />
          </div>
        </div>
      );
    })}
    {flowDesc && (
      <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', padding: '14px 32px', background: 'rgba(0,217,255,0.06)', border: '1px solid rgba(0,217,255,0.2)', borderRadius: '100px', fontFamily: 'JetBrains Mono,monospace', fontSize: '22px', color: '#00D9FF', opacity: spring({ frame, fps, config: { damping: 18, stiffness: 70 }, delay: 40 }), whiteSpace: 'nowrap' }}>
        ⟳ {flowDesc}
      </div>
    )}
  </div>
);

// -- RadialDiagram (hub + spokes) ----------------------------------------------
const RadialDiagram: React.FC<any> = ({ nodes, connections, frame, fps, flowDesc, pulse }) => {
  const hub       = nodes[0] || { label: 'Core', icon: 'cpu', status: 'active' };
  const satellites = nodes.slice(1, 7);
  const count     = satellites.length || 1;
  const cx = 580, cy = 320, radius = 260;
  const hubSp = spring({ frame, fps, config: { damping: 20, stiffness: 100 }, delay: 5 });

  return (
    <div style={{ flex: 1, position: 'relative', margin: '0 60px 60px', overflow: 'hidden' }}>
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
        <defs>
          <radialGradient id="radialGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00D9FF" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#00D9FF" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cy} r={radius + 40} fill="url(#radialGlow)" opacity={hubSp * 0.6} />
        <circle cx={cx} cy={cy} r={radius} stroke="rgba(0,217,255,0.1)" strokeWidth="1.5" fill="none" strokeDasharray="6 8" />
        {satellites.map((_: any, si: number) => {
          const angle = (si / count) * 2 * Math.PI - Math.PI / 2;
          const sx = cx + radius * Math.cos(angle), sy = cy + radius * Math.sin(angle);
          const sp = spring({ frame, fps, config: { damping: 18, stiffness: 80 }, delay: 14 + si * 10 });
          const conn = connections[si];
          const pp = (pulse + si * 0.2) % 1;
          const px = cx + (sx - cx) * pp, py = cy + (sy - cy) * pp;
          return (
            <g key={si} opacity={sp}>
              <line x1={cx} y1={cy} x2={sx} y2={sy} stroke="rgba(0,217,255,0.2)" strokeWidth="1.5" />
              <circle cx={px} cy={py} r="5" fill="#00D9FF" opacity={0.8} />
              {conn?.label && <text x={(cx + sx) / 2} y={(cy + sy) / 2 - 10} textAnchor="middle" fill="rgba(139,148,158,0.8)" fontSize="18" fontFamily="JetBrains Mono,monospace">{conn.label}</text>}
            </g>
          );
        })}
      </svg>
      {/* Hub */}
      <div style={{ position: 'absolute', left: cx - 80, top: cy - 80, width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(0,217,255,0.08)', border: '2px solid #00D9FF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 0 40px rgba(0,217,255,0.3)', opacity: hubSp, transform: `scale(${interpolate(hubSp, [0, 1], [0.6, 1])})` }}>
        <div style={{ fontSize: '42px' }}>{ICONS[hub.icon || 'cpu'] || '⚙️'}</div>
        <div style={{ fontSize: '20px', fontWeight: 700, color: '#E6EDF3', textAlign: 'center', lineHeight: 1.2, maxWidth: '120px' }}>{hub.label}</div>
      </div>
      {/* Satellites */}
      {satellites.map((node: any, si: number) => {
        const angle = (si / count) * 2 * Math.PI - Math.PI / 2;
        const sx = cx + radius * Math.cos(angle), sy = cy + radius * Math.sin(angle);
        const color = STATUS_C[node.status || 'idle'];
        const sp = spring({ frame, fps, config: { damping: 18, stiffness: 80 }, delay: 16 + si * 10 });
        return (
          <div key={si} style={{ position: 'absolute', left: sx - 75, top: sy - 65, width: '150px', opacity: sp, transform: `scale(${interpolate(sp, [0, 1], [0.5, 1])})` }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '18px 14px', background: 'rgba(22,27,34,0.9)', border: `1.5px solid ${color}`, borderRadius: '14px', boxShadow: `0 0 18px ${color}25` }}>
              <div style={{ fontSize: '30px' }}>{ICONS[node.icon || ''] || '●'}</div>
              <div style={{ fontSize: '18px', fontWeight: 600, color: '#E6EDF3', textAlign: 'center', lineHeight: 1.3 }}>{node.label}</div>
            </div>
          </div>
        );
      })}
      {flowDesc && (
        <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', padding: '12px 28px', background: 'rgba(0,217,255,0.06)', border: '1px solid rgba(0,217,255,0.2)', borderRadius: '100px', fontFamily: 'JetBrains Mono,monospace', fontSize: '20px', color: '#00D9FF', opacity: spring({ frame, fps, config: { damping: 18, stiffness: 70 }, delay: 50 }), whiteSpace: 'nowrap' }}>
          ⟳ {flowDesc}
        </div>
      )}
    </div>
  );
};