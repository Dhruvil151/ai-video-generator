// @ts-nocheck
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import React from 'react';
import { BackgroundGradients } from './BackgroundGradients';
import '../styles/video.css';

// ── ANSI-style output coloring ────────────────────────────────────────────────
// Gemini outputs plain-text command output (no real ANSI escapes), so we infer
// intent from common CLI prefixes/symbols instead of parsing escape codes.
function parseAnsiLine(line: string, primary = '#00D9FF'): string {
  const trimmed = line.trimStart();
  // Success indicators
  if (/^(✓|SUCCESS|\[OK\]|✔|done|built|pushed|pulled|tagged|container running)/i.test(trimmed)) return '#4EC9B0';
  // Error indicators
  if (/^(✗|ERROR|\[ERROR\]|\[FAIL\]|failed|fatal|error:)/i.test(trimmed)) return '#FF6B6B';
  // Warning indicators
  if (/^(WARNING|\[WARN\]|⚠|warn:)/i.test(trimmed)) return '#FFD700';
  // Shell prompts
  if (/^[$>]/.test(trimmed)) return primary;
  // Docker/build step output (⇒, =>, [1/4], Step N/N)
  if (/^(⇒|=>|\[[\d]+\/[\d]+\]|Step \d+\/\d+)/i.test(trimmed)) return 'rgba(139,148,158,0.75)';
  return '#E6EDF3';
}

export const TerminalScene = ({ scene, techPrimary, techSecondary }: any) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationSec = scene.actualDurationSec || scene.estimatedDurationSec || 10;
  const totalFrames = Math.ceil(durationSec * fps);
  const layout   = scene.payload?.layout   || 'typed';
  const commands = scene.payload?.commands || [];
  const termTitle = scene.payload?.termTitle || 'bash';
  const primary = techPrimary || '#00D9FF';
  const headerSpring = spring({ frame, fps, config:{ damping:24, stiffness:120 }, delay:0 });

  return (
    <AbsoluteFill className="scene">
      <BackgroundGradients variant="code" techPrimary={techPrimary} techSecondary={techSecondary} />
      <div style={{ padding:'48px 80px 0', opacity:headerSpring, transform:`translateY(${interpolate(headerSpring,[0,1],[-30,0])}px)` }}>
        <div className="scene-tag">Terminal</div>
        <h2 className="scene-title">{scene.title}</h2>
        {scene.subtitle && <p className="scene-subtitle">{scene.subtitle}</p>}
      </div>

      {layout === 'split'
        ? <SplitTerminal  commands={commands} termTitle={termTitle} narration={scene.narration} frame={frame} fps={fps} primary={primary} />
        : <TypedTerminal  commands={commands} termTitle={termTitle} frame={frame} fps={fps} totalFrames={totalFrames} primary={primary} />}

      <div className="progress-bar" style={{ width:`${interpolate(frame,[0,totalFrames],[0,100])}%` }} />
    </AbsoluteFill>
  );
};

const TerminalWindow = ({ title, commands, frame, fps, startDelay = 10, style = {}, primary = '#00D9FF' }) => {
  let frameCounter = startDelay;
  const renderedCommands = commands.map((cmd) => {
    const inputFrames = cmd.input.length * 2;
    const outputArr    = Array.isArray(cmd.output) ? cmd.output : cmd.output ? [String(cmd.output)] : [];
    const outputFrames = outputArr.length * 20;
    const inputProgress = Math.min(1, Math.max(0, (frame - frameCounter) / inputFrames));
    const charsToShow = Math.floor(inputProgress * cmd.input.length);
    const showOutput  = frame > frameCounter + inputFrames + 8;
    frameCounter += inputFrames + outputFrames + 12;
    return { cmd, charsToShow, showOutput };
  });

  const cursorBlink = Math.floor(frame / 18) % 2 === 0;

  return (
    <div style={{ background:'#0D1117', borderRadius:'14px', border:'1px solid rgba(255,255,255,0.1)', overflow:'hidden', boxShadow:'0 24px 64px rgba(0,0,0,0.7)', ...style }}>
      {/* Title bar */}
      <div style={{ padding:'14px 20px', background:'#161B22', borderBottom:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', gap:'10px' }}>
        <div style={{ width:'12px', height:'12px', borderRadius:'50%', background:'#EF4444' }} />
        <div style={{ width:'12px', height:'12px', borderRadius:'50%', background:'#F59E0B' }} />
        <div style={{ width:'12px', height:'12px', borderRadius:'50%', background:'#10B981' }} />
        <span style={{ marginLeft:'12px', fontSize:'15px', color:'#8B949E', fontFamily:'JetBrains Mono,monospace' }}>{title}</span>
      </div>
      {/* Terminal body */}
      <div style={{ padding:'24px 28px', fontFamily:'JetBrains Mono,monospace', fontSize:'20px', lineHeight:1.7, minHeight:'200px' }}>
        {renderedCommands.map(({ cmd, charsToShow, showOutput }, i) => (
          <div key={i} style={{ marginBottom:'8px' }}>
            <div style={{ display:'flex', alignItems:'center' }}>
              <span style={{ color:'#10B981', marginRight:'4px' }}>{cmd.prompt || '$ '}</span>
              <span style={{ color:'#E6EDF3' }}>{cmd.input.slice(0, charsToShow)}</span>
              {i === renderedCommands.length - 1 && charsToShow < cmd.input.length && (
                <span style={{ color: primary, opacity: cursorBlink ? 1 : 0 }}>▋</span>
              )}
            </div>
            {showOutput && (Array.isArray(cmd.output) ? cmd.output : cmd.output ? [String(cmd.output)] : []).map((line, j) => (
              <div key={j} style={{ color: parseAnsiLine(line, primary), paddingLeft:'4px' }}>{line}</div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

const TypedTerminal = ({ commands, termTitle, frame, fps, primary }: any) => {
  return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px 80px 60px' }}>
      <TerminalWindow
        title={termTitle}
        commands={commands}
        frame={frame}
        fps={fps}
        startDelay={18}
        style={{ width:'100%', maxWidth:'1200px' }}
        primary={primary}
      />
    </div>
  );
};

const SplitTerminal = ({ commands, termTitle, narration, frame, fps, primary }: any) => {
  const leftSpring  = spring({ frame, fps, config:{ damping:20, stiffness:100 }, delay:10 });
  const rightSpring = spring({ frame, fps, config:{ damping:20, stiffness:90 },  delay:18 });
  const lines = narration.replace(/<[^>]+>/g,'').split(/[.!?]+/).filter(Boolean).slice(0,4);
  return (
    <div style={{ flex:1, display:'flex', gap:'48px', padding:'24px 80px 60px', alignItems:'stretch' }}>
      <div style={{ flex:'0 0 42%', display:'flex', flexDirection:'column', justifyContent:'center', gap:'24px', opacity:leftSpring, transform:`translateX(${interpolate(leftSpring,[0,1],[-40,0])}px)` }}>
        {lines.map((line,i) => (
          <div key={i} style={{ fontSize:'22px', color:'#8B949E', lineHeight:1.6, borderLeft:`3px solid ${primary}30`, paddingLeft:'20px' }}>
            {line.trim()}.
          </div>
        ))}
      </div>
      <div style={{ flex:1, display:'flex', alignItems:'center', opacity:rightSpring, transform:`translateX(${interpolate(rightSpring,[0,1],[40,0])}px)` }}>
        <TerminalWindow title={termTitle} commands={commands} frame={frame} fps={fps} startDelay={22} style={{ width:'100%' }} primary={primary} />
      </div>
    </div>
  );
};


