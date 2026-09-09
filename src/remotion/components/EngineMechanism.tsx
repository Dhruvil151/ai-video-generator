// @ts-nocheck
// The original MechanismScene render body, extracted verbatim (Phase 4) — renders the
// 6 hardcoded shared/demonstrations.mjs engines (cache, references, coercion, react-state,
// docker-layers, event-loop) via payload.engine. Zero behavior change from before the
// extraction; MechanismScene.tsx now just dispatches here vs. ExampleMechanism.tsx.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { buildDemonstration, demonstrationState } from '../../../shared/demonstrations.mjs';
import { motionWindow } from '../../../shared/timeline.mjs';
import type { VideoScene } from '../EducationalVideo';
import { Database, Globe, Layers, Cpu, ShoppingCart } from 'lucide-react';
import { TechLogo } from './TechLogos';

const colors = ['#25856a', '#387abc', '#b36b26', '#82649b'];
export const EngineMechanism: React.FC<{scene:VideoScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const duration = scene.durationFrames || Math.ceil((scene.actualDurationSec || 12) * fps);
  const demo = buildDemonstration(scene.payload?.engine, scene.payload?.inputs);
  const layered = scene.payload?.engine === 'docker-layers';
  const scheduled = scene.beats?.length ? scene.beats.map(b=>({step:b.step!,frame:b.frame}))
    : demo.steps.map((_,i)=>({step:i,frame:Math.round(duration*(i+0.6)/(demo.steps.length+1.4))}));
  const initialCompleted=scheduled[0]?.step || 0;
  const eventFrames=scheduled.map(b=>b.frame);
  let active = -1;
  eventFrames.forEach((f, i) => { if (frame >= f) active = i; });
  const activeStep=active<0 ? initialCompleted-1 : scheduled[active].step;
  const event = active<0 ? null : demo.steps[activeStep];
  const nextFrame = eventFrames[active + 1] ?? duration;
  const motionFrames = motionWindow(eventFrames[active] || 0, nextFrame, fps);
  const progress = active < 0 ? 0 : Math.max(0, Math.min(1, (frame - eventFrames[active]) / motionFrames));
  const values = demonstrationState(demo, active<0 ? initialCompleted : activeStep + (progress >= 0.85 ? 1 : 0));
  const position = (id?:string) => {
    const e = demo.entities.find(e => e.id === id);
    return e ? layered ? {x:1150,y:700-demo.entities.indexOf(e)*145} : {x: 330 + e.x * 620, y: 390 + e.y * 255} : null;
  };
  const from = position(event?.from), to = position(event?.to);
  return <AbsoluteFill style={{background:'#f5f7f8',color:'#17272b',fontFamily:'Inter, sans-serif',padding:64,letterSpacing:0}}>
    <div style={{fontSize:22,color:'#42636a',marginBottom:12}}>{scene.payload?.engine === 'cache' ? 'Redis / cache-aside' : scene.payload?.engine}</div>
    <h1 style={{fontSize:52,lineHeight:1.15,maxWidth:1630,margin:0,overflowWrap:'anywhere'}}>{scene.title}</h1>
    <div style={{position:'absolute',right:64,top:64}}><TechLogo name={layered?'docker':scene.payload?.engine==='cache'?'redis':scene.payload?.engine==='react-state'?'react':'javascript'} size={80}/></div>
    <svg width="1920" height="1080" style={{position:'absolute',inset:0,pointerEvents:'none'}}>
      <defs><marker id="mechanism-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill="#25856a"/></marker></defs>
      {!layered && from && to && <>
        <path d={`M${from.x},${from.y-95} Q${(from.x+to.x)/2},${Math.min(from.y,to.y)-200} ${to.x},${to.y-95}`} fill="none" stroke="#25856a" strokeWidth={4} markerEnd="url(#mechanism-arrow)"/>
        {progress<1 && <circle cx={(1-progress)**2*from.x+2*(1-progress)*progress*(from.x+to.x)/2+progress**2*to.x}
          cy={(1-progress)**2*(from.y-95)+2*(1-progress)*progress*(Math.min(from.y,to.y)-200)+progress**2*(to.y-95)} r={13} fill="#c47624"/>}
      </>}
    </svg>
    {demo.entities.map((e,i) => {
      const pos=position(e.id)!;
      const changed = event && Object.hasOwn(event.changes,e.id);
      const Icon = layered ? Layers : e.id==='client' ? ShoppingCart : e.id==='db' || e.id==='cache' ? Database : e.id==='stack' ? Cpu : Globe;
      return <div key={e.id} data-review-entity style={{position:'absolute',left:pos.x-(layered?410:230),top:pos.y-(layered?55:84),width:layered?820:460,height:layered?110:168,padding:'20px 28px',background:layered?['#e3eaf1','#e4f0eb','#fff0dd','#ece6f4'][i]:'#ffffff',border:`${changed?3:1}px solid ${changed?colors[i%4]:'#b9c8cd'}`,borderRadius:6,display:'flex',flexDirection:'column',justifyContent:'center'}}>
        <div style={{fontSize:25,color:'#476169',marginBottom:layered?8:16,display:'flex',gap:12,alignItems:'center'}}><Icon size={26}/>{e.label}</div>
        <div style={{fontFamily:'JetBrains Mono, monospace',fontSize:25,lineHeight:1.4,overflowWrap:'anywhere'}}>{values[e.id] || '(empty)'}</div>
      </div>;
    })}
    {layered && <div style={{position:'absolute',left:100,top:370,width:450,fontSize:34,lineHeight:1.5}}>Image layers remain unchanged.<br/><span style={{color:'#82649b'}}>Container writes live above them.</span></div>}
    <div style={{position:'absolute',left:100,right:100,bottom:155,borderTop:'2px solid #c0cdd1',paddingTop:28,display:'flex',gap:24,alignItems:'center'}}>
      <span style={{fontSize:28,color:'#25856a',minWidth:90}}>{Math.max(0,activeStep+1)} / {demo.steps.length}</span>
      <div style={{fontSize:34,lineHeight:1.35}}>{event?.label || scene.subtitle || 'Initial state'}</div>
    </div>
    <div style={{position:'absolute',left:100,right:100,bottom:55,fontSize:21,lineHeight:1.4,color:'#52686e'}}>{demo.assumption}</div>
  </AbsoluteFill>;
};
