import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import React from 'react';
import { BackgroundGradients } from './BackgroundGradients';
import { SvgIcon } from './SvgIcons';
import { TechLogo, findTechLogoName } from './TechLogos';
import '../styles/video.css';

interface TitleSceneProps {
  scene: {
    title: string;
    subtitle: string;
    narration: string;
    audioUrl?: string | null;
    actualDurationSec?: number;
    estimatedDurationSec?: number;
    subtitles?: any[];
    payload?: {
      layout?: 'orbital' | 'minimal';
      topicTag?: string;
      badges?: string[];
      keyTakeaway?: string;
    };
  };
  bgMusicUrl?: string | null;
  techPrimary?: string;
  techSecondary?: string;
}

const BADGE_COLORS = ['cyan', 'purple', 'green', 'amber'];

export const TitleScene: React.FC<TitleSceneProps> = ({ scene, techPrimary, techSecondary }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationSec = scene.actualDurationSec || scene.estimatedDurationSec || 10;

  const layout   = scene.payload?.layout || 'orbital';
  const topicTag = scene.payload?.topicTag  || scene.title;
  const badges   = scene.payload?.badges    || [];
  const takeaway = scene.payload?.keyTakeaway || '';

  const primary   = techPrimary   || '#00D9FF';
  const secondary = techSecondary || '#8B5CF6';
  const logoName  = findTechLogoName([topicTag, scene.title, ...badges]);

  const totalFrames = Math.ceil(durationSec * fps);

  return (
    <AbsoluteFill className="scene">
      <BackgroundGradients variant="default" techPrimary={techPrimary} techSecondary={techSecondary} />
      {layout === 'minimal'
        ? <MinimalTitle scene={scene} frame={frame} fps={fps} topicTag={topicTag} badges={badges} takeaway={takeaway} primary={primary} secondary={secondary} logoName={logoName} />
        : <OrbitalTitle scene={scene} frame={frame} fps={fps} topicTag={topicTag} badges={badges} takeaway={takeaway} primary={primary} secondary={secondary} logoName={logoName} />}
      {/* SubtitlesOverlay + AudioMixer removed */}
      <div className="progress-bar" style={{ width: `${interpolate(frame, [0, totalFrames], [0, 100])}%`, background: `linear-gradient(90deg, ${primary}, ${secondary})` }} />
    </AbsoluteFill>
  );
};

// ── Orbital layout (default) ──────────────────────────────────────────────────
const OrbitalTitle: React.FC<any> = ({ scene, frame, fps, topicTag, badges, takeaway, primary, secondary, logoName }) => {
  const tagSpring      = spring({ frame, fps, config: { damping: 24, stiffness: 120 }, delay: 0 });
  const titleSpring    = spring({ frame, fps, config: { damping: 22, stiffness: 100 }, delay: 6 });
  const subtitleSpring = spring({ frame, fps, config: { damping: 20, stiffness: 90  }, delay: 12 });
  const badgeSpring    = spring({ frame, fps, config: { damping: 20, stiffness: 90  }, delay: 18 });
  const dividerSpring  = spring({ frame, fps, config: { damping: 18, stiffness: 80  }, delay: 24 });
  const takeawaySpring = spring({ frame, fps, config: { damping: 18, stiffness: 80  }, delay: 30 });

  const idleFloatY = Math.sin(frame / 20) * 8;
  const idleScale = 1 + Math.sin(frame / 30) * 0.02;

  return (
    <>
      {/* Decorative side accent line */}
      <div style={{ position:'absolute', left:0, top:0, bottom:0, width:'6px', background:`linear-gradient(180deg,${primary} 0%,${secondary} 50%,transparent 100%)`, opacity:titleSpring }} />

      {/* Main content */}
      <div style={{ position:'absolute', top:0, left:0, right:0, bottom:0, display:'flex', flexDirection:'column', justifyContent:'center', padding:'0 140px' }}>
        {/* Topic tag */}
        <div style={{ opacity:tagSpring, transform:`translateY(${interpolate(tagSpring,[0,1],[30,0])}px)`, marginBottom:'40px', display:'flex', alignItems:'center', gap:'16px' }}>
          {logoName && (
            <div style={{ width:'52px', height:'52px', borderRadius:'12px', background:'rgba(255,255,255,0.06)', border:`1px solid ${primary}40`, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <TechLogo name={logoName} size={32} />
            </div>
          )}
          <div className="badge" style={{ fontSize:'24px', padding:'8px 20px', background:`${primary}1a`, borderColor:`${primary}66`, color:primary }}>
            <span style={{ fontFamily:'JetBrains Mono,monospace' }}>▶</span>
            {topicTag}
          </div>
        </div>

        {/* Main title */}
        <h1 style={{ fontFamily:"'Outfit',sans-serif", fontSize:'128px', fontWeight:900, lineHeight:1.0, letterSpacing:'-0.03em', color:'#E6EDF3', opacity:titleSpring, transform:`translateY(${interpolate(titleSpring,[0,1],[50,0]) + idleFloatY}px)`, marginBottom:'28px', background:'linear-gradient(135deg,#E6EDF3 0%,#8B949E 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
          {scene.title}
        </h1>

        {/* Subtitle */}
        <p style={{ fontSize:'40px', fontWeight:400, color:'#8B949E', lineHeight:1.4, opacity:subtitleSpring, transform:`translateY(${interpolate(subtitleSpring,[0,1],[30,0])}px)`, marginBottom:'52px', maxWidth:'900px' }}>
          {scene.subtitle}
        </p>

        {/* Divider */}
        <div style={{ width:`${interpolate(dividerSpring,[0,1],[0,240])}px`, height:'3px', background:`linear-gradient(90deg,${primary},${secondary})`, borderRadius:'3px', marginBottom:'52px', boxShadow:`0 0 16px ${primary}80` }} />

        {/* Badges */}
        {badges.length > 0 && (
          <div style={{ display:'flex', gap:'20px', flexWrap:'wrap', opacity:badgeSpring, transform:`translateY(${interpolate(badgeSpring,[0,1],[20,0])}px)`, marginBottom:takeaway?'48px':'0' }}>
            {badges.map((badge: string, i: number) => (
              <div key={i} className={`badge badge--${BADGE_COLORS[i%BADGE_COLORS.length]}`} style={{ fontSize:'26px', padding:'10px 22px' }}>{badge}</div>
            ))}
          </div>
        )}

        {/* Key takeaway */}
        {takeaway && (
          <div style={{ opacity:takeawaySpring, transform:`translateY(${interpolate(takeawaySpring,[0,1],[20,0])}px)`, display:'flex', alignItems:'center', gap:'16px', padding:'20px 28px', background:`${primary}0f`, border:`1px solid ${primary}33`, borderRadius:'12px', maxWidth:'900px' }}>
            <SvgIcon name="zap" size={28} color={primary} />
            <span style={{ fontSize:'28px', color:'#8B949E', lineHeight:1.4 }}>{takeaway}</span>
          </div>
        )}
      </div>

      {/* Right decorative circuit pattern */}
      <svg style={{ position:'absolute', right:60, top:'50%', transform:`translateY(-50%) scale(${idleScale})`, opacity:0.04 }} width="600" height="600" viewBox="0 0 600 600">
        <g stroke={primary} strokeWidth="1.5" fill="none">
          {[0,60,120,180,240,300,360,420,480,540].map(y => <line key={y} x1="0" y1={y} x2="600" y2={y} />)}
          {[0,60,120,180,240,300,360,420,480,540].map(x => <line key={x} x1={x} y1="0" x2={x} y2="600" />)}
          {[100,200,300,400,500].map((r,i) => <circle key={i} cx="300" cy="300" r={r} />)}
        </g>
      </svg>
    </>
  );
};

// ── Minimal layout (clean left-aligned typography, no orbital badges) ─────────
const MinimalTitle: React.FC<any> = ({ scene, frame, fps, topicTag, badges, takeaway, primary, secondary, logoName }) => {
  const tagSp      = spring({ frame, fps, config: { damping: 24, stiffness: 120 }, delay: 0  });
  const titleSp    = spring({ frame, fps, config: { damping: 20, stiffness: 90  }, delay: 8  });
  const lineSp     = spring({ frame, fps, config: { damping: 18, stiffness: 80  }, delay: 16 });
  const subSp      = spring({ frame, fps, config: { damping: 18, stiffness: 80  }, delay: 22 });
  const takeawaySp = spring({ frame, fps, config: { damping: 18, stiffness: 70  }, delay: 32 });

  const idleFloatY = Math.sin(frame / 22) * 6;

  return (
    <>
      {/* Full-bleed gradient background accent */}
      <div style={{ position:'absolute', inset:0, background:`linear-gradient(135deg, ${primary}0a 0%, ${secondary}0a 100%)` }} />

      {/* Central text block — left aligned, generous white space */}
      <div style={{ position:'absolute', top:0, left:0, right:0, bottom:0, display:'flex', flexDirection:'column', justifyContent:'center', padding:'0 140px' }}>
        {/* Mode tag */}
        <div style={{ opacity:tagSp, transform:`translateX(${interpolate(tagSp,[0,1],[-30,0])}px)`, marginBottom:'36px', display:'flex', alignItems:'center', gap:'14px' }}>
          {logoName && <TechLogo name={logoName} size={28} />}
          <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'22px', color:primary, letterSpacing:'0.14em', textTransform:'uppercase' }}>
            ▶ {topicTag}
          </span>
        </div>

        {/* Title — very large, bold, gradient */}
        <h1 style={{ fontFamily:"'Outfit',sans-serif", fontSize:'120px', fontWeight:900, lineHeight:1.05, letterSpacing:'-0.03em', margin:'0 0 20px', background:'linear-gradient(135deg,#FFFFFF 0%,#8B949E 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', opacity:titleSp, transform:`translateY(${interpolate(titleSp,[0,1],[40,0]) + idleFloatY}px)` }}>
          {scene.title}
        </h1>

        {/* Thin animated line */}
        <div style={{ width:`${interpolate(lineSp,[0,1],[0,320])}px`, height:'2px', background:`linear-gradient(90deg,${primary},${secondary})`, borderRadius:'2px', marginBottom:'32px' }} />

        {/* Subtitle */}
        <p style={{ fontSize:'36px', color:'#8B949E', lineHeight:1.5, maxWidth:'820px', margin:'0 0 48px', opacity:subSp, transform:`translateY(${interpolate(subSp,[0,1],[20,0])}px)` }}>
          {scene.subtitle}
        </p>

        {/* Tags as plain monospace list */}
        {badges.length > 0 && (
          <div style={{ display:'flex', gap:'12px', flexWrap:'wrap', opacity:subSp }}>
            {badges.map((b: string, i: number) => (
              <span key={i} style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'20px', color:'#484F58', padding:'6px 16px', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'6px' }}>{b}</span>
            ))}
          </div>
        )}

        {/* Takeaway */}
        {takeaway && (
          <div style={{ marginTop:'40px', opacity:takeawaySp, transform:`translateY(${interpolate(takeawaySp,[0,1],[16,0])}px)` }}>
            <p style={{ fontSize:'30px', color:'#8B949E', fontStyle:'italic', lineHeight:1.5, maxWidth:'820px', borderLeft:`3px solid ${secondary}80`, paddingLeft:'24px', margin:0 }}>"{takeaway}"</p>
          </div>
        )}
      </div>

      {/* Subtle vertical rule on right */}
      <div style={{ position:'absolute', right:120, top:'20%', bottom:'20%', width:'1px', background:`linear-gradient(180deg,transparent,${primary}26,transparent)`, opacity:lineSp }} />
    </>
  );
};
