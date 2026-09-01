// @ts-nocheck
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import React from 'react';
import { BackgroundGradients } from './BackgroundGradients';
import '../styles/video.css';

export const QuoteScene = ({ scene, bgMusicUrl }: any) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationSec = scene.actualDurationSec || scene.estimatedDurationSec || 10;
  const totalFrames = Math.ceil(durationSec * fps);
  const layout  = scene.payload?.layout  || 'centered';
  const quote   = scene.payload?.quote   || '';
  const author  = scene.payload?.author  || '';
  const context = scene.payload?.context || '';

  return (
    <AbsoluteFill className="scene">
      <BackgroundGradients variant="concept" />
      {layout === 'centered'
        ? <CenteredQuote  quote={quote} author={author} context={context} title={scene.title} frame={frame} fps={fps} />
        : <LeftAccentQuote quote={quote} author={author} context={context} title={scene.title} frame={frame} fps={fps} />}
      <div className="progress-bar" style={{ width:`${interpolate(frame,[0,totalFrames],[0,100])}%` }} />
    </AbsoluteFill>
  );
};

const CenteredQuote = ({ quote, author, context, title, frame, fps }: any) => {
  const tagSpring    = spring({ frame, fps, config:{ damping:24, stiffness:120 }, delay:0  });
  const quoteSpring  = spring({ frame, fps, config:{ damping:20, stiffness:90  }, delay:12 });
  const authorSpring = spring({ frame, fps, config:{ damping:20, stiffness:100 }, delay:30 });

  // Split quote into words for staggered word reveal
  const words = quote.split(' ');

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'60px 160px', textAlign:'center' }}>
      {title && (
        <div style={{ opacity:tagSpring, transform:`translateY(${interpolate(tagSpring,[0,1],[-20,0])}px)`, marginBottom:'48px' }}>
          <div className="scene-tag">Core Principle</div>
        </div>
      )}
      {/* Large quotation mark */}
      <div style={{ fontSize:'160px', lineHeight:0.6, color:'#00D9FF', opacity:0.15, fontFamily:'Georgia,serif', marginBottom:'20px', opacity:quoteSpring * 0.15 }}>
        "
      </div>
      <div style={{ opacity:quoteSpring, transform:`scale(${interpolate(quoteSpring,[0,1],[0.92,1])})` }}>
        <p style={{ fontSize:'40px', fontWeight:700, lineHeight:1.5, color:'#E6EDF3', fontFamily:'Outfit,sans-serif', maxWidth:'1100px', margin:'0 0 48px' }}>
          "{quote}"
        </p>
      </div>
      <div style={{ opacity:authorSpring, transform:`translateY(${interpolate(authorSpring,[0,1],[20,0])}px)` }}>
        {author && (
          <div style={{ fontSize:'26px', fontWeight:600, color:'#00D9FF', fontFamily:'Outfit,sans-serif', marginBottom:'8px' }}>
            — {author}
          </div>
        )}
        {context && (
          <div style={{ fontSize:'20px', color:'#8B949E', fontStyle:'italic' }}>{context}</div>
        )}
      </div>
    </div>
  );
};

const LeftAccentQuote = ({ quote, author, context, title, frame, fps }: any) => {
  const barSpring    = spring({ frame, fps, config:{ damping:20, stiffness:100 }, delay:8  });
  const quoteSpring  = spring({ frame, fps, config:{ damping:20, stiffness:90  }, delay:16 });
  const authorSpring = spring({ frame, fps, config:{ damping:20, stiffness:100 }, delay:32 });

  return (
    <div style={{ flex:1, display:'flex', alignItems:'center', padding:'60px 120px' }}>
      {/* Accent bar */}
      <div style={{ width:'6px', minHeight:'300px', borderRadius:'3px', background:'linear-gradient(180deg,#00D9FF,#8B5CF6)', marginRight:'60px', flexShrink:0, opacity:barSpring, transform:`scaleY(${barSpring})`, transformOrigin:'top' }} />
      <div style={{ flex:1 }}>
        {title && <div className="scene-tag" style={{ marginBottom:'32px', opacity:barSpring }}>Core Principle</div>}
        <div style={{ opacity:quoteSpring, transform:`translateX(${interpolate(quoteSpring,[0,1],[-40,0])}px)` }}>
          <p style={{ fontSize:'42px', fontWeight:700, lineHeight:1.5, color:'#E6EDF3', fontFamily:'Outfit,sans-serif', margin:'0 0 40px' }}>
            "{quote}"
          </p>
        </div>
        <div style={{ opacity:authorSpring, transform:`translateX(${interpolate(authorSpring,[0,1],[-30,0])}px)` }}>
          {author && <div style={{ fontSize:'26px', fontWeight:600, color:'#00D9FF', fontFamily:'Outfit,sans-serif', marginBottom:'8px' }}>— {author}</div>}
          {context && <div style={{ fontSize:'20px', color:'#8B949E', fontStyle:'italic' }}>{context}</div>}
        </div>
      </div>
    </div>
  );
};


