// @ts-nocheck
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import React from 'react';
import { BackgroundGradients } from './BackgroundGradients';
import { SvgIcon } from './SvgIcons';
import '../styles/video.css';
const ACCENTS = ['#00D9FF','#10B981','#F59E0B','#8B5CF6'];

function formatCountUp(value: string | number, progress: number): string {
  const str = String(value);
  const match = str.match(/^([^0-9]*)([0-9]+(?:\.[0-9]+)?)(.*)$/);
  if (!match) return str;
  const [, prefix, numStr, suffix] = match;
  const target = parseFloat(numStr);
  const current = target * progress;
  const decimals = numStr.includes('.') ? numStr.split('.')[1].length : 0;
  return prefix + current.toFixed(decimals) + suffix;
}

export const StatsScene = ({ scene, bgMusicUrl, techPrimary, techSecondary }: any) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationSec = scene.actualDurationSec || scene.estimatedDurationSec || 10;
  const totalFrames = Math.ceil(durationSec * fps);
  const layout = scene.payload?.layout || 'counters';
  const stats  = scene.payload?.stats  || [];
  const headerSpring = spring({ frame, fps, config:{ damping:24, stiffness:120 }, delay:0 });

  return (
    <AbsoluteFill className="scene">
      <BackgroundGradients variant="default" techPrimary={techPrimary} techSecondary={techSecondary} />
      <div style={{ padding:'52px 80px 0', opacity:headerSpring, transform:`translateY(${interpolate(headerSpring,[0,1],[-30,0])}px)` }}>
        <div className="scene-tag">By the Numbers</div>
        <h2 className="scene-title">{scene.title}</h2>
        {scene.subtitle && <p className="scene-subtitle">{scene.subtitle}</p>}
      </div>
      {layout === 'counters'
        ? <CountersLayout stats={stats} frame={frame} fps={fps} totalFrames={totalFrames} />
        : <BarLayout      stats={stats} frame={frame} fps={fps} totalFrames={totalFrames} />}
      <div className="progress-bar" style={{ width:`${interpolate(frame,[0,totalFrames],[0,100])}%` }} />
    </AbsoluteFill>
  );
};

const CountersLayout = ({ stats, frame, fps, totalFrames }: any) => (
  <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 80px', gap:'48px' }}>
    {stats.slice(0,4).map((stat,i) => {
      const stagger = Math.floor(totalFrames * 0.05 * i);
      const sp = spring({ frame, fps, config:{ damping:18, stiffness:80 }, delay: Math.floor(totalFrames*0.07) + stagger });
      const accent = ACCENTS[i % ACCENTS.length];
      const countProgress = interpolate(frame,[Math.floor(totalFrames*0.07)+stagger, Math.floor(totalFrames*0.5)+stagger],[0,1],{ extrapolateLeft:'clamp', extrapolateRight:'clamp' });
      return (
        <div key={i} style={{ flex:1, maxWidth:'320px', textAlign:'center', opacity:sp, transform:`translateY(${interpolate(sp,[0,1],[60,0])}px)` }}>
          <div style={{ padding:'48px 32px 40px', background:'rgba(255,255,255,0.03)', border:`1px solid ${accent}30`, borderRadius:'20px', backdropFilter:'blur(12px)', boxShadow:`0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${accent}15` }}>
            <div style={{ marginBottom:'20px', display:'flex', justifyContent:'center' }}><SvgIcon name={stat.icon || 'activity'} size={36} color={accent} /></div>
            <div style={{ fontSize:'72px', fontWeight:900, fontFamily:'Outfit,sans-serif', lineHeight:1, background:`linear-gradient(135deg, ${accent}, white)`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', marginBottom:'8px' }}>
              {formatCountUp(stat.value, countProgress)}
            </div>
            {stat.suffix && <div style={{ fontSize:'24px', color:accent, fontFamily:'JetBrains Mono,monospace', marginBottom:'12px' }}>{stat.suffix}</div>}
            <div style={{ fontSize:'20px', color:'#8B949E', lineHeight:1.4 }}>{stat.label}</div>
            {/* Animated accent bar */}
            <div style={{ marginTop:'24px', height:'3px', background:'rgba(255,255,255,0.08)', borderRadius:'2px', overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${countProgress*100}%`, background:`linear-gradient(90deg,${accent},${accent}80)` }} />
            </div>
          </div>
        </div>
      );
    })}
  </div>
);

const BarLayout = ({ stats, frame, fps, totalFrames }: any) => (
  <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', padding:'40px 120px', gap:'32px' }}>
    {stats.slice(0,5).map((stat,i) => {
      const stagger = Math.floor(totalFrames * 0.04 * i);
      const sp = spring({ frame, fps, config:{ damping:20, stiffness:90 }, delay: Math.floor(totalFrames*0.07) + stagger });
      const accent = ACCENTS[i % ACCENTS.length];
      const barWidth = interpolate(frame,[Math.floor(totalFrames*0.1)+stagger, Math.floor(totalFrames*0.55)+stagger],[0,100],{ extrapolateLeft:'clamp', extrapolateRight:'clamp' });
      const numVal = parseFloat(String(stat.value).replace(/[^0-9.]/g,'')) || 0;
      const maxVal = Math.max(...stats.map(s => parseFloat(String(s.value).replace(/[^0-9.]/g,''))||0), 1);
      const relWidth = (numVal / maxVal) * 100;
      return (
        <div key={i} style={{ opacity:sp, transform:`translateX(${interpolate(sp,[0,1],[-50,0])}px)` }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'10px', alignItems:'center' }}>
            <span style={{ fontSize:'22px', color:'#E6EDF3', fontWeight:600, fontFamily:'Outfit,sans-serif' }}>{stat.label}</span>
            <span style={{ fontSize:'26px', fontWeight:800, color:accent, fontFamily:'Outfit,sans-serif' }}>{stat.value}{stat.suffix||''}</span>
          </div>
          <div style={{ height:'20px', background:'rgba(255,255,255,0.06)', borderRadius:'10px', overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${Math.min(barWidth * relWidth / 100, relWidth)}%`, background:`linear-gradient(90deg,${accent},${accent}80)`, borderRadius:'10px', boxShadow:`0 0 12px ${accent}50` }} />
          </div>
        </div>
      );
    })}
  </div>
);


