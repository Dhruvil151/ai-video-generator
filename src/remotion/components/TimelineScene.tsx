// @ts-nocheck
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import React from 'react';
import { BackgroundGradients } from './BackgroundGradients';
import { SvgIcon } from './SvgIcons';
import '../styles/video.css';
const STEP_ACCENT = ['#00D9FF','#8B5CF6','#10B981','#F59E0B','#EC4899','#EF4444'];

export const TimelineScene = ({ scene, bgMusicUrl, techPrimary, techSecondary }: any) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationSec = scene.actualDurationSec || scene.estimatedDurationSec || 10;
  const totalFrames = Math.ceil(durationSec * fps);
  const layout = scene.payload?.layout || 'horizontal';
  const steps  = scene.payload?.steps  || [];
  const headerSpring = spring({ frame, fps, config:{ damping:24, stiffness:120 }, delay:0 });

  return (
    <AbsoluteFill className="scene">
      <BackgroundGradients variant="arch" techPrimary={techPrimary} techSecondary={techSecondary} />
      <div style={{ padding:'52px 80px 0', opacity:headerSpring, transform:`translateY(${interpolate(headerSpring,[0,1],[-30,0])}px)` }}>
        <div className="scene-tag">Timeline</div>
        <h2 className="scene-title">{scene.title}</h2>
        {scene.subtitle && <p className="scene-subtitle">{scene.subtitle}</p>}
      </div>
      {layout === 'horizontal'
        ? <HorizontalTimeline steps={steps} frame={frame} fps={fps} totalFrames={totalFrames} />
        : <VerticalTimeline   steps={steps} frame={frame} fps={fps} totalFrames={totalFrames} />}
      <div className="progress-bar" style={{ width:`${interpolate(frame,[0,totalFrames],[0,100])}%` }} />
    </AbsoluteFill>
  );
};

const HorizontalTimeline = ({ steps, frame, fps, totalFrames }: any) => {
  const lineProgress = interpolate(frame,[Math.floor(totalFrames*0.08), Math.floor(totalFrames*0.7)],[0,1],{ extrapolateLeft:'clamp', extrapolateRight:'clamp' });
  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', padding:'40px 80px 80px', position:'relative' }}>
      <div style={{ position:'absolute', top:'50%', left:'80px', right:'80px', height:'2px', background:'rgba(255,255,255,0.08)', transform:'translateY(-50%)', zIndex:0 }}>
        <div style={{ height:'100%', width:`${lineProgress*100}%`, background:'linear-gradient(90deg,#00D9FF,#8B5CF6)', boxShadow:'0 0 12px rgba(0,217,255,0.5)' }} />
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'24px', position:'relative', zIndex:1 }}>
        {steps.slice(0,5).map((step,i) => {
          const sp = spring({ frame, fps, config:{ damping:20, stiffness:100 }, delay:20+i*14 });
          const accent = STEP_ACCENT[i % STEP_ACCENT.length];
          return (
            <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'16px', opacity:sp, transform:`translateY(${interpolate(sp,[0,1],[40,0])}px)` }}>
              {step.timestamp && <div style={{ fontSize:'20px', color:accent, fontFamily:'JetBrains Mono,monospace', fontWeight:600 }}>{step.timestamp}</div>}
              <div style={{ width:'68px', height:'68px', borderRadius:'50%', background:`${accent}18`, border:`2px solid ${accent}`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 0 20px ${accent}40` }}><SvgIcon name={step.icon || 'zap'} size={26} color={accent} /></div>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:'22px', fontWeight:700, color:'#E6EDF3', fontFamily:'Outfit,sans-serif', marginBottom:'8px' }}>{step.label}</div>
                <div style={{ fontSize:'17px', color:'#8B949E', lineHeight:1.5, maxWidth:'200px' }}>{step.description}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const VerticalTimeline = ({ steps, frame, fps, totalFrames }: any) => (
  <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', padding:'20px 120px 60px' }}>
    {steps.slice(0,6).map((step,i) => {
      const baseDelay = Math.floor(totalFrames * 0.05);
      const perItem   = Math.floor(totalFrames * 0.08);
      const sp = spring({ frame, fps, config:{ damping:20, stiffness:90 }, delay: baseDelay + i * perItem });
      const accent = STEP_ACCENT[i % STEP_ACCENT.length];
      const isLast = i === Math.min(steps.length,6)-1;
      return (
        <div key={i} style={{ display:'flex', gap:'28px', opacity:sp, transform:`translateX(${interpolate(sp,[0,1],[-40,0])}px)` }}>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', width:'52px', flexShrink:0 }}>
            <div style={{ width:'52px', height:'52px', borderRadius:'50%', background:`${accent}18`, border:`2px solid ${accent}`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 0 16px ${accent}40` }}><SvgIcon name={step.icon || 'arrow-right'} size={20} color={accent} /></div>
            {!isLast && <div style={{ width:'2px', flex:1, minHeight:'20px', background:`${accent}40`, margin:'4px 0' }} />}
          </div>
          <div style={{ paddingBottom:isLast?0:'18px', paddingTop:'6px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'14px', marginBottom:'6px' }}>
              <div style={{ fontSize:'22px', fontWeight:700, color:'#E6EDF3', fontFamily:'Outfit,sans-serif' }}>{step.label}</div>
              {step.timestamp && <div style={{ fontSize:'16px', color:accent, fontFamily:'JetBrains Mono,monospace', fontWeight:600 }}>{step.timestamp}</div>}
            </div>
            <div style={{ fontSize:'18px', color:'#8B949E', lineHeight:1.5 }}>{step.description}</div>
          </div>
        </div>
      );
    })}
  </div>
);


