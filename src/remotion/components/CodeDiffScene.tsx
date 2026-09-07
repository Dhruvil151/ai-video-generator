import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import React from 'react';
import { BackgroundGradients } from './BackgroundGradients';
import '../styles/video.css';

interface DiffLine {
  type: 'add' | 'remove' | 'context';
  text: string;
}

interface CodeDiffSceneProps {
  scene: {
    title: string;
    subtitle: string;
    narration: string;
    audioUrl?: string | null;
    actualDurationSec?: number;
    estimatedDurationSec?: number;
    subtitles?: any[];
    payload?: {
      layout?: 'unified';
      language?: string;
      filename?: string;
      diffLines?: DiffLine[];
    };
  };
  bgMusicUrl?: string | null;
  techPrimary?: string;
  techSecondary?: string;
}

const LINE_STYLE: Record<DiffLine['type'], { bg: string; border: string; color: string; prefix: string }> = {
  add:     { bg: 'rgba(16,185,129,0.12)', border: '#10B981', color: '#7EE9C4', prefix: '+' },
  remove:  { bg: 'rgba(239,68,68,0.12)',  border: '#EF4444', color: '#FCA5A5', prefix: '−' },
  context: { bg: 'transparent',           border: 'transparent', color: '#8B949E', prefix: ' ' },
};

export const CodeDiffScene: React.FC<CodeDiffSceneProps> = ({ scene, techPrimary }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationSec = scene.actualDurationSec || scene.estimatedDurationSec || 10;
  const totalFrames = Math.ceil(durationSec * fps);

  const language = scene.payload?.language || 'javascript';
  const filename = scene.payload?.filename || 'index.js';
  const diffLines = scene.payload?.diffLines || [];

  const headerSpring = spring({ frame, fps, config: { damping: 24, stiffness: 120 }, delay: 0 });
  const editorSpring  = spring({ frame, fps, config: { damping: 20, stiffness: 90 }, delay: 8 });

  const addCount = diffLines.filter(l => l.type === 'add').length;
  const removeCount = diffLines.filter(l => l.type === 'remove').length;

  return (
    <AbsoluteFill className="scene">
      <BackgroundGradients variant="code" techPrimary={techPrimary} techSecondary={techPrimary} />

      <div style={{ padding: '52px 80px 0', opacity: headerSpring, transform: `translateY(${interpolate(headerSpring, [0, 1], [-30, 0])}px)`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="scene-tag">Code Diff</div>
          <h2 className="scene-title">{scene.title}</h2>
          {scene.subtitle && <p className="scene-subtitle">{scene.subtitle}</p>}
        </div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          {removeCount > 0 && <div className="badge" style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.4)', color: '#EF4444' }}>− {removeCount}</div>}
          {addCount > 0 && <div className="badge badge--green">+ {addCount}</div>}
        </div>
      </div>

      <div style={{ flex: 1, margin: '32px 80px 60px', opacity: editorSpring, transform: `translateY(${interpolate(editorSpring, [0, 1], [30, 0])}px)` }}>
        <div className="code-editor" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div className="code-editor__titlebar">
            <div className="code-editor__dot code-editor__dot--red" />
            <div className="code-editor__dot code-editor__dot--yellow" />
            <div className="code-editor__dot code-editor__dot--green" />
            <span className="code-editor__filename">{filename}</span>
            <span style={{ marginLeft: 'auto', fontSize: '18px', color: '#484F58', fontFamily: 'JetBrains Mono, monospace' }}>{language}</span>
          </div>
          <div className="code-editor__body" style={{ flex: 1, overflowY: 'hidden' }}>
            {diffLines.map((line, i) => {
              const style = LINE_STYLE[line.type] || LINE_STYLE.context;
              const lineSpring = spring({ frame, fps, config: { damping: 22, stiffness: 130 }, delay: 16 + i * 4 });
              return (
                <div
                  key={i}
                  className="code-line"
                  style={{
                    background: style.bg,
                    borderLeft: `4px solid ${style.border}`,
                    paddingLeft: '20px',
                    opacity: lineSpring,
                    transform: `translateX(${interpolate(lineSpring, [0, 1], [-16, 0])}px)`,
                  }}
                >
                  <span style={{ width: '32px', color: style.color, fontWeight: 700, flexShrink: 0, userSelect: 'none' }}>{style.prefix}</span>
                  <span style={{ color: line.type === 'context' ? '#E6EDF3' : style.color }}>{line.text}</span>
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
