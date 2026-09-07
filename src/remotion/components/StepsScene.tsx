// @ts-nocheck
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import React from 'react';
import { BackgroundGradients } from './BackgroundGradients';
import { SvgIcon } from './SvgIcons';
import '../styles/video.css';
const ACCENTS = ['#00D9FF','#8B5CF6','#10B981','#F59E0B','#EC4899'];

export const StepsScene = ({ scene, bgMusicUrl, techPrimary, techSecondary }: any) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationSec = scene.actualDurationSec || scene.estimatedDurationSec || 10;
  const totalFrames = Math.ceil(durationSec * fps);
  const layout = scene.payload?.layout || 'numbered';
  const steps  = scene.payload?.steps  || [];
  const headerSpring = spring({ frame, fps, config:{ damping:24, stiffness:120 }, delay:0 });

  return (
    <AbsoluteFill className="scene">
      <BackgroundGradients variant="steps" techPrimary={techPrimary} techSecondary={techSecondary} />
      <div style={{ padding:'48px 80px 0', opacity:headerSpring, transform:`translateY(${interpolate(headerSpring,[0,1],[-30,0])}px)` }}>
        <div className="scene-tag">Steps</div>
        <h2 className="scene-title">{scene.title}</h2>
        {scene.subtitle && <p className="scene-subtitle">{scene.subtitle}</p>}
      </div>
      {layout === 'cards'
        ? <CardsLayout    steps={steps} frame={frame} fps={fps} totalFrames={totalFrames} />
        : <NumberedLayout steps={steps} frame={frame} fps={fps} totalFrames={totalFrames} />}
      <div className="progress-bar" style={{ width:`${interpolate(frame,[0,totalFrames],[0,100])}%` }} />
    </AbsoluteFill>
  );
};

const NumberedLayout = ({ steps, frame, fps, totalFrames }: any) => (
  <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', padding:'20px 100px 60px', gap:'0' }}>
    {steps.slice(0,6).map((step,i) => {
      const baseDelay = Math.floor(totalFrames * 0.05);
      const perItem   = Math.floor(totalFrames * 0.08);
      const sp = spring({ frame, fps, config:{ damping:20, stiffness:90 }, delay: baseDelay + i * perItem });
      const accent = ACCENTS[i % ACCENTS.length];
      return (
        <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:'32px', padding:'20px 0', borderBottom: i < steps.length-1 ? '1px solid rgba(255,255,255,0.05)' : 'none', opacity:sp, transform:`translateX(${interpolate(sp,[0,1],[-50,0])}px)` }}>
          {/* Number badge */}
          <div style={{ width:'56px', height:'56px', borderRadius:'14px', background:`${accent}18`, border:`2px solid ${accent}40`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:`0 0 16px ${accent}30` }}>
            <span style={{ fontSize:'26px', fontWeight:900, color:accent, fontFamily:'Outfit,sans-serif' }}>{i+1}</span>
          </div>
          {/* Icon */}
          <div style={{ width:'52px', height:'52px', borderRadius:'12px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'24px', flexShrink:0 }}>
            <SvgIcon name={step.icon || 'arrow-right'} size={24} color={accent} />
          </div>
          {/* Content */}
          <div style={{ flex:1, paddingTop:'4px' }}>
            <div style={{ fontSize:'24px', fontWeight:700, color:'#E6EDF3', fontFamily:'Outfit,sans-serif', marginBottom:'8px' }}>{step.label}</div>
            <div style={{ fontSize:'19px', color:'#8B949E', lineHeight:1.5 }}>{step.description}</div>
          </div>
        </div>
      );
    })}
  </div>
);

const CardsLayout = ({ steps, frame, fps, totalFrames }: any) => (
  <div style={{ flex:1, display:'flex', alignItems:'center', padding:'20px 60px 60px', gap:'24px', flexWrap:'wrap', justifyContent:'center' }}>
    {steps.slice(0,6).map((step,i) => {
      const baseDelay = Math.floor(totalFrames * 0.05);
      const perItem   = Math.floor(totalFrames * 0.08);
      const sp = spring({ frame, fps, config:{ damping:18, stiffness:80 }, delay: baseDelay + i * perItem });
      const accent = ACCENTS[i % ACCENTS.length];
      return (
        <div key={i} style={{ width:'340px', padding:'36px 32px', background:'rgba(255,255,255,0.03)', border:`1px solid ${accent}25`, borderRadius:'16px', backdropFilter:'blur(12px)', boxShadow:`0 8px 32px rgba(0,0,0,0.4)`, opacity:sp, transform:`translateY(${interpolate(sp,[0,1],[60,0])}px)`, position:'relative', overflow:'hidden' }}>
          {/* Step number accent top bar */}
          <div style={{ position:'absolute', top:0, left:0, right:0, height:'3px', background:`linear-gradient(90deg,${accent},transparent)` }} />
          <div style={{ display:'flex', alignItems:'center', gap:'16px', marginBottom:'18px' }}>
            <div style={{ width:'48px', height:'48px', borderRadius:'50%', background:`${accent}18`, border:`2px solid ${accent}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px' }}>
              <SvgIcon name={step.icon || 'arrow-right'} size={24} color={accent} />
            </div>
            <span style={{ fontSize:'32px', fontWeight:900, color:accent, fontFamily:'Outfit,sans-serif' }}>0{i+1}</span>
          </div>
          <div style={{ fontSize:'22px', fontWeight:700, color:'#E6EDF3', fontFamily:'Outfit,sans-serif', marginBottom:'12px' }}>{step.label}</div>
          <div style={{ fontSize:'18px', color:'#8B949E', lineHeight:1.6 }}>{step.description}</div>
        </div>
      );
    })}
  </div>
);


