import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import React, { useMemo } from 'react';
import { BackgroundGradients } from './BackgroundGradients';
import '../styles/video.css';

interface TreeNode {
  name: string;
  type?: 'file' | 'folder';
  highlighted?: boolean;
  children?: TreeNode[];
}

interface FileTreeSceneProps {
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
      rootName?: string;
      tree?: TreeNode[];
    };
  };
  bgMusicUrl?: string | null;
  techPrimary?: string;
  techSecondary?: string;
}

interface FlatNode { node: TreeNode; depth: number; isLast: boolean }

function flatten(nodes: TreeNode[], depth = 0): FlatNode[] {
  const out: FlatNode[] = [];
  nodes.forEach((n, i) => {
    out.push({ node: n, depth, isLast: i === nodes.length - 1 });
    if (n.children && n.children.length > 0) {
      out.push(...flatten(n.children, depth + 1));
    }
  });
  return out;
}

const FolderIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </svg>
);
const FileIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
    <polyline points="13 2 13 9 20 9" />
  </svg>
);

export const FileTreeScene: React.FC<FileTreeSceneProps> = ({ scene, techPrimary }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationSec = scene.actualDurationSec || scene.estimatedDurationSec || 10;
  const totalFrames = Math.ceil(durationSec * fps);

  const rootName = scene.payload?.rootName || 'project/';
  const tree = scene.payload?.tree || [];
  const primary = techPrimary || '#00D9FF';

  const flat = useMemo(() => flatten(tree), [tree]);

  const headerSpring = spring({ frame, fps, config: { damping: 24, stiffness: 120 }, delay: 0 });
  const panelSpring   = spring({ frame, fps, config: { damping: 20, stiffness: 90 },  delay: 6 });

  return (
    <AbsoluteFill className="scene">
      <BackgroundGradients variant="code" techPrimary={techPrimary} />

      <div style={{ padding: '52px 80px 0', opacity: headerSpring, transform: `translateY(${interpolate(headerSpring, [0, 1], [-30, 0])}px)` }}>
        <div className="scene-tag">Project Structure</div>
        <h2 className="scene-title">{scene.title}</h2>
        {scene.subtitle && <p className="scene-subtitle">{scene.subtitle}</p>}
      </div>

      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '24px 80px 60px' }}>
        <div style={{
          opacity: panelSpring, transform: `translateY(${interpolate(panelSpring, [0, 1], [30, 0])}px)`,
          width: '100%', maxWidth: '900px', maxHeight: '100%', overflow: 'hidden',
          background: '#0D1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}>
          <div style={{ padding: '18px 28px', background: '#161B22', borderBottom: '1px solid rgba(255,255,255,0.08)', fontFamily: 'JetBrains Mono, monospace', fontSize: '22px', color: primary, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FolderIcon color={primary} /> {rootName}
          </div>
          <div style={{ padding: '20px 0' }}>
            {flat.map(({ node, depth }, i) => {
              const itemSpring = spring({ frame, fps, config: { damping: 22, stiffness: 130 }, delay: 14 + i * 5 });
              const isFolder = node.type === 'folder';
              const color = node.highlighted ? primary : isFolder ? '#F0B429' : '#8B949E';
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 28px', paddingLeft: `${28 + depth * 36}px`,
                    fontFamily: 'JetBrains Mono, monospace', fontSize: '24px',
                    background: node.highlighted ? 'rgba(0,217,255,0.08)' : 'transparent',
                    borderLeft: node.highlighted ? `3px solid ${primary}` : '3px solid transparent',
                    opacity: itemSpring,
                    transform: `translateX(${interpolate(itemSpring, [0, 1], [-16, 0])}px)`,
                  }}
                >
                  {isFolder ? <FolderIcon color={color} /> : <FileIcon color={color} />}
                  <span style={{ color: node.highlighted ? '#E6EDF3' : '#C9D1D9', fontWeight: node.highlighted ? 700 : 400 }}>{node.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="progress-bar" style={{ width: `${interpolate(frame, [0, totalFrames], [0, 100])}%` }} />
    </AbsoluteFill>
  );
};
