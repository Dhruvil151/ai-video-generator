// @ts-nocheck
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import React from 'react';
import { BackgroundGradients } from './BackgroundGradients';
import '../styles/video.css';

export const TerminalScene = ({ scene, bgMusicUrl }: any) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationSec = scene.actualDurationSec || scene.estimatedDurationSec || 10;
  const totalFrames = Math.ceil(durationSec * fps);
  const layout   = scene.payload?.layout   || 'typed';
  const commands = scene.payload?.commands || [];
  const termTitle = scene.payload?.termTitle || 'bash';
  const headerSpring = spring({ frame, fps, config:{ damping:24, stiffness:120 }, delay:0 });

  return (
    <AbsoluteFill className="scene">
      <BackgroundGradients variant="code" />
      <div style={{ padding:'48px 80px 0', opacity:headerSpring, transform:`translateY(${interpolate(headerSpring,[0,1],[-30,0])}px)` }}>
        <div className="scene-tag">Terminal</div>
        <h2 className="scene-title">{scene.title}</h2>
        {scene.subtitle && <p className="scene-subtitle">{scene.subtitle}</p>}
      </div>

      {layout === 'split'
        ? <SplitTerminal  commands={commands} termTitle={termTitle} narration={scene.narration} frame={frame} fps={fps} />
        : <TypedTerminal  commands={commands} termTitle={termTitle} frame={frame} fps={fps} totalFrames={totalFrames} />}

      <div className="progress-bar" style={{ width:`${interpolate(frame,[0,totalFrames],[0,100])}%` }} />
    </AbsoluteFill>
  );
};

const TerminalWindow = ({ title, commands, frame, fps, startDelay = 10, style = {} }) => {
  const totalCommandFrames = Math.max(commands.reduce((a,c) => a + c.input.length * 2 + (c.output?.length||0) * 20, 0), 60);
  let frameCounter = startDelay;
  const renderedCommands = commands.map((cmd) => {
    const inputFrames = cmd.input.length * 2;
    const outputFrames = (cmd.output?.length || 0) * 20;
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
                <span style={{ color:'#00D9FF', opacity: cursorBlink ? 1 : 0 }}>▋</span>
              )}
            </div>
            {showOutput && (cmd.output||[]).map((line, j) => (
              <div key={j} style={{ color:'#8B949E', paddingLeft:'4px' }}>{line}</div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

const TypedTerminal = ({ commands, termTitle, frame, fps, totalFrames }: any) => {
  const termSpring = spring({ frame, fps, config:{ damping:20, stiffness:100 }, delay:15 });
  return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px 80px 60px' }}>
      <TerminalWindow
        title={termTitle}
        commands={commands}
        frame={frame}
        fps={fps}
        startDelay={18}
        style={{ width:'100%', maxWidth:'1200px' }}
      />
    </div>
  );
};

const SplitTerminal = ({ commands, termTitle, narration, frame, fps }: any) => {
  const leftSpring  = spring({ frame, fps, config:{ damping:20, stiffness:100 }, delay:10 });
  const rightSpring = spring({ frame, fps, config:{ damping:20, stiffness:90 },  delay:18 });
  const lines = narration.replace(/<[^>]+>/g,'').split(/[.!?]+/).filter(Boolean).slice(0,4);
  return (
    <div style={{ flex:1, display:'flex', gap:'48px', padding:'24px 80px 60px', alignItems:'stretch' }}>
      <div style={{ flex:'0 0 42%', display:'flex', flexDirection:'column', justifyContent:'center', gap:'24px', opacity:leftSpring, transform:`translateX(${interpolate(leftSpring,[0,1],[-40,0])}px)` }}>
        {lines.map((line,i) => (
          <div key={i} style={{ fontSize:'22px', color:'#8B949E', lineHeight:1.6, borderLeft:'3px solid #00D9FF30', paddingLeft:'20px' }}>
            {line.trim()}.
          </div>
        ))}
      </div>
      <div style={{ flex:1, display:'flex', alignItems:'center', opacity:rightSpring, transform:`translateX(${interpolate(rightSpring,[0,1],[40,0])}px)` }}>
        <TerminalWindow title={termTitle} commands={commands} frame={frame} fps={fps} startDelay={22} style={{ width:'100%' }} />
      </div>
    </div>
  );
};


