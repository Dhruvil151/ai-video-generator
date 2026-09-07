import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import React, { useMemo } from 'react';
import { BackgroundGradients } from './BackgroundGradients';
import { SvgIcon } from './SvgIcons';
import { TechLogo, findTechLogoName } from './TechLogos';
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
  techPrimary?: string;
  techSecondary?: string;
}

/**
 * BFS layering over the connection graph so nodes with no incoming edges
 * (sources) reveal first and downstream nodes reveal in data-flow order,
 * instead of all animating in at once by array index.
 */
function computeRevealOrder(nodes: ArchNode[], connections: ArchConnection[]): Map<string, number> {
  const ids = nodes.map(n => n.id);
  const incoming = new Map(ids.map(id => [id, 0]));
  connections.forEach(c => { if (incoming.has(c.to)) incoming.set(c.to, (incoming.get(c.to) || 0) + 1); });
  const adj = new Map<string, string[]>(ids.map(id => [id, []]));
  connections.forEach(c => { if (adj.has(c.from)) adj.get(c.from)!.push(c.to); });

  const order = new Map<string, number>();
  const visited = new Set<string>();
  let queue = ids.filter(id => (incoming.get(id) || 0) === 0);
  if (queue.length === 0 && ids.length > 0) queue = [ids[0]];

  let level = 0;
  while (queue.length > 0) {
    const next: string[] = [];
    for (const id of queue) {
      if (visited.has(id)) continue;
      visited.add(id);
      order.set(id, level);
      for (const n of adj.get(id) || []) if (!visited.has(n)) next.push(n);
    }
    queue = next;
    level++;
  }
  ids.forEach((id, i) => { if (!order.has(id)) order.set(id, level + i); });
  return order;
}

function layoutNodes(nodes: ArchNode[]): Array<ArchNode & { x: number; y: number }> {
  const count = nodes.length;
  if (count === 0) return [];
  const gridW = 1600;
  // Keep nodes within safe zone — subtitle overlay covers bottom ~130px of the scene.
  // Reducing gridH ensures even the bottom-row nodes never render behind the subtitles.
  const gridH = 520;
  const cols = count <= 3 ? count : count <= 6 ? Math.ceil(count / 2) : 4;
  const rows = Math.ceil(count / cols);
  const cellW = gridW / cols;
  const cellH = gridH / rows;
  return nodes.map((n, i) => ({
    ...n,
    x: (i % cols) * cellW + cellW / 2,
    y: Math.floor(i / cols) * cellH + cellH / 2,
  }));
}

export const ArchitectureScene: React.FC<ArchitectureSceneProps> = ({ scene, techPrimary, techSecondary }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationSec = scene.actualDurationSec || scene.estimatedDurationSec || 10;
  const totalFrames = Math.ceil(durationSec * fps);

  const nodes       = scene.payload?.nodes       || [];
  const connections = scene.payload?.connections || [];
  const flowDesc    = scene.payload?.flowDescription || '';
  const layout      = scene.payload?.layout || 'flow';
  const primary     = techPrimary || '#00D9FF';

  const laid = useMemo(() => layoutNodes(nodes), [nodes]);
  const revealOrder = useMemo(() => computeRevealOrder(nodes, connections), [nodes, connections]);

  const headerSpring = spring({ frame, fps, config: { damping: 24, stiffness: 120 }, delay: 0 });
  const nodeById = new Map(laid.map(n => [n.id, n]));

  return (
    <AbsoluteFill className="scene">
      <BackgroundGradients variant="arch" techPrimary={techPrimary} techSecondary={techSecondary} />

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
        ? <RadialDiagram nodes={nodes} connections={connections} frame={frame} fps={fps} flowDesc={flowDesc} primary={primary} />
        : <FlowDiagram   laid={laid}   connections={connections} frame={frame} fps={fps} flowDesc={flowDesc} nodeById={nodeById} revealOrder={revealOrder} primary={primary} />}

      <div className="progress-bar" style={{ width: `${interpolate(frame, [0, totalFrames], [0, 100])}%` }} />
    </AbsoluteFill>
  );
};

// -- FlowDiagram (default layout) ----------------------------------------------
const STATUS_C: any = { active:'#00D9FF', processing:'#8B5CF6', success:'#10B981', idle:'#484F58' };

const FlowDiagram: React.FC<any> = ({ laid, connections, frame, fps, flowDesc, nodeById, revealOrder, primary }) => (
  <div style={{ flex: 1, position: 'relative', margin: '0 80px 160px', overflow: 'hidden' }}>
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill={primary} opacity="0.7" />
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
        const toOrder = revealOrder.get(conn.to) ?? ci;
        const delay = 8 + toOrder * 14;
        const sp = spring({ frame, fps, config: { damping: 18, stiffness: 70 }, delay });
        const { x: x1, y: y1 } = from;
        const { x: x2, y: y2 } = to;
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
        // Traveling packet — a dot that loops along the connection once the edge is drawn
        const packetT = ((frame - delay) * 0.015 + ci * 0.3) % 1;
        const showPacket = sp > 0.6 && frame > delay;
        const px = x1 + (x2 - x1) * packetT;
        const py = y1 + (y2 - y1) * packetT;
        return (
          <g key={ci} opacity={sp}>
            {/* Base subtle line */}
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={`${primary}26`} strokeWidth="2" />
            {/* Animated data stream dashed line */}
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={primary} strokeWidth="2.5" strokeDasharray="16 24" strokeDashoffset={-frame * 4 - ci * 20} markerEnd="url(#arrowhead)" filter="url(#glow-line)" opacity={0.8} />
            {/* Traveling packet */}
            {showPacket && (
              <circle cx={px} cy={py} r="8" fill="#fff" opacity={0.95} filter="url(#glow-line)" />
            )}
            {conn.label && (
              <g>
                <rect x={mx - conn.label.length * 6 - 8} y={my - 30} width={conn.label.length * 12 + 16} height="24" rx="6" fill="rgba(6,8,16,0.85)" />
                <text x={mx} y={my - 14} textAnchor="middle" fill="rgba(139,148,158,0.9)" fontSize="18" fontFamily="JetBrains Mono, monospace">{conn.label}</text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
    {laid.map((node: any) => {
      const color = STATUS_C[node.status || 'idle'];
      const order = revealOrder.get(node.id) ?? 0;
      const sp = spring({ frame, fps, config: { damping: 20, stiffness: 100 }, delay: 4 + order * 14 });
      const logoName = findTechLogoName([node.label, node.icon]);
      return (
        <div key={node.id} style={{ position: 'absolute', left: node.x - 140, top: node.y - 80, width: '280px', opacity: sp, transform: `scale(${interpolate(sp, [0, 1], [0.6, 1])})` }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', padding: '28px 24px', background: 'rgba(22,27,34,0.85)', border: `1.5px solid ${color}`, borderRadius: '18px', boxShadow: `0 0 28px ${color}33, 0 8px 32px rgba(0,0,0,0.5)` }}>
            {logoName ? <TechLogo name={logoName} size={40} /> : <SvgIcon name={node.icon || 'cpu'} size={40} color={color} />}
            <div style={{ fontFamily: 'Inter,sans-serif', fontSize: '26px', fontWeight: 600, color: '#E6EDF3', textAlign: 'center', lineHeight: 1.3 }}>{node.label}</div>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}` }} />
          </div>
        </div>
      );
    })}
    {flowDesc && (
      <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', padding: '14px 32px', background: `${primary}0f`, border: `1px solid ${primary}33`, borderRadius: '100px', fontFamily: 'JetBrains Mono,monospace', fontSize: '22px', color: primary, opacity: spring({ frame, fps, config: { damping: 18, stiffness: 70 }, delay: 40 }), whiteSpace: 'nowrap' }}>
        {flowDesc}
      </div>
    )}
  </div>
);

// -- RadialDiagram (hub + spokes) ----------------------------------------------
const RadialDiagram: React.FC<any> = ({ nodes, connections, frame, fps, flowDesc, primary }) => {
  const hub       = nodes[0] || { label: 'Core', icon: 'cpu', status: 'active' };
  const satellites = nodes.slice(1, 7);
  const count     = satellites.length || 1;
  const cx = 780, cy = 320, radius = 280;
  const hubSp = spring({ frame, fps, config: { damping: 20, stiffness: 100 }, delay: 5 });
  const hubLogo = findTechLogoName([hub.label, hub.icon]);

  return (
    <div style={{ flex: 1, position: 'relative', margin: '0 60px 160px', overflow: 'hidden' }}>
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
        <defs>
          <radialGradient id="radialGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={primary} stopOpacity="0.12" />
            <stop offset="100%" stopColor={primary} stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cy} r={radius + 40} fill="url(#radialGlow)" opacity={hubSp * 0.6} />
        <circle cx={cx} cy={cy} r={radius} stroke={`${primary}1a`} strokeWidth="1.5" fill="none" strokeDasharray="6 8" />
        {satellites.map((_: any, si: number) => {
          const angle = (si / count) * 2 * Math.PI - Math.PI / 2;
          const sx = cx + radius * Math.cos(angle), sy = cy + radius * Math.sin(angle);
          const delay = 16 + si * 14;
          const sp = spring({ frame, fps, config: { damping: 18, stiffness: 80 }, delay });
          const conn = connections[si];
          const packetT = ((frame - delay) * 0.015) % 1;
          const showPacket = sp > 0.6 && frame > delay;
          const px = cx + (sx - cx) * packetT, py = cy + (sy - cy) * packetT;
          return (
            <g key={si} opacity={sp}>
              {/* Base line */}
              <line x1={cx} y1={cy} x2={sx} y2={sy} stroke={`${primary}1a`} strokeWidth="1.5" />
              {/* Animated stream */}
              <line x1={cx} y1={cy} x2={sx} y2={sy} stroke={primary} strokeWidth="2.5" strokeDasharray="12 24" strokeDashoffset={-frame * 4} opacity={0.8} filter="url(#radialGlow)" />
              {showPacket && <circle cx={px} cy={py} r="8" fill="#fff" opacity={0.95} />}
              {conn?.label && <text x={(cx + sx) / 2} y={(cy + sy) / 2 - 10} textAnchor="middle" fill="rgba(139,148,158,0.8)" fontSize="18" fontFamily="JetBrains Mono,monospace">{conn.label}</text>}
            </g>
          );
        })}
      </svg>
      {/* Hub */}
      <div style={{ position: 'absolute', left: cx - 80, top: cy - 80, width: '160px', height: '160px', borderRadius: '50%', background: `${primary}14`, border: `2px solid ${primary}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: `0 0 40px ${primary}4d`, opacity: hubSp, transform: `scale(${interpolate(hubSp, [0, 1], [0.6, 1])})` }}>
        {hubLogo ? <TechLogo name={hubLogo} size={42} /> : <SvgIcon name={hub.icon || 'cpu'} size={42} color={primary} />}
        <div style={{ fontSize: '20px', fontWeight: 700, color: '#E6EDF3', textAlign: 'center', lineHeight: 1.2, maxWidth: '120px' }}>{hub.label}</div>
      </div>
      {/* Satellites */}
      {satellites.map((node: any, si: number) => {
        const angle = (si / count) * 2 * Math.PI - Math.PI / 2;
        const sx = cx + radius * Math.cos(angle), sy = cy + radius * Math.sin(angle);
        const color = STATUS_C[node.status || 'idle'];
        const sp = spring({ frame, fps, config: { damping: 18, stiffness: 80 }, delay: 10 + si * 14 });
        const logoName = findTechLogoName([node.label, node.icon]);
        return (
          <div key={si} style={{ position: 'absolute', left: sx - 75, top: sy - 65, width: '150px', opacity: sp, transform: `scale(${interpolate(sp, [0, 1], [0.5, 1])})` }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '18px 14px', background: 'rgba(22,27,34,0.9)', border: `1.5px solid ${color}`, borderRadius: '14px', boxShadow: `0 0 18px ${color}25` }}>
              {logoName ? <TechLogo name={logoName} size={30} /> : <SvgIcon name={node.icon || 'cpu'} size={30} color={color} />}
              <div style={{ fontSize: '18px', fontWeight: 600, color: '#E6EDF3', textAlign: 'center', lineHeight: 1.3 }}>{node.label}</div>
            </div>
          </div>
        );
      })}
      {flowDesc && (
        <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', padding: '12px 28px', background: `${primary}0f`, border: `1px solid ${primary}33`, borderRadius: '100px', fontFamily: 'JetBrains Mono,monospace', fontSize: '20px', color: primary, opacity: spring({ frame, fps, config: { damping: 18, stiffness: 70 }, delay: 50 }), whiteSpace: 'nowrap' }}>
          {flowDesc}
        </div>
      )}
    </div>
  );
};