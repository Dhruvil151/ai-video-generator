// @ts-nocheck
import React from 'react';

interface LogoProps { size?: number }

// ─── Individual logos ──────────────────────────────────────────────────────────

const JavaScript = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <rect width="32" height="32" fill="#F7DF1E" rx="3" />
    <text x="4" y="26" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="18" fill="#000">JS</text>
  </svg>
);

const TypeScript = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <rect width="32" height="32" fill="#3178C6" rx="3" />
    <text x="3" y="26" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="18" fill="#fff">TS</text>
  </svg>
);

const Python = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <path d="M16 2C9.4 2 10 4.9 10 4.9L10 8h6.2v1H7.5S3 8.4 3 15.1s4 6.9 4 6.9h2.4v-3.3s-.1-4 3.9-4H19s3.7.1 3.7-3.6V6.4S23.3 2 16 2z" fill="#3572A5"/>
    <path d="M16 30c6.6 0 6-2.9 6-2.9L22 24h-6.2v-1h8.7S29 23.6 29 16.9s-4-6.9-4-6.9h-2.4v3.3s.1 4-3.9 4H13s-3.7-.1-3.7 3.6v5.7S8.7 30 16 30z" fill="#FFD43B"/>
    <circle cx="13.5" cy="6" r="1.5" fill="#fff"/>
    <circle cx="18.5" cy="26" r="1.5" fill="#3572A5"/>
  </svg>
);

const ReactLogo = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="3" fill="#61DAFB"/>
    <ellipse cx="16" cy="16" rx="14" ry="5.5" fill="none" stroke="#61DAFB" strokeWidth="1.8"/>
    <ellipse cx="16" cy="16" rx="14" ry="5.5" fill="none" stroke="#61DAFB" strokeWidth="1.8" transform="rotate(60 16 16)"/>
    <ellipse cx="16" cy="16" rx="14" ry="5.5" fill="none" stroke="#61DAFB" strokeWidth="1.8" transform="rotate(120 16 16)"/>
  </svg>
);

const Vue = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <polygon points="16,28 2,4 7,4 16,20 25,4 30,4" fill="#42B883"/>
    <polygon points="16,19 9,7 13,7 16,13 19,7 23,7" fill="#35495E"/>
  </svg>
);

const Angular = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <polygon points="16,2 29,7 27,24 16,30 5,24 3,7" fill="#DD0031"/>
    <polygon points="16,2 16,30 27,24 29,7" fill="#C3002F"/>
    <polygon points="16,6 9,22 11.5,22 13,18 19,18 20.5,22 23,22" fill="#fff"/>
    <polygon points="16,10 14,16 18,16" fill="#DD0031"/>
  </svg>
);

const Svelte = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <path d="M28.6 8.8C26.2 4.4 20.6 2.8 16.2 5.2L7.8 10C5.4 11.4 3.8 13.8 3.6 16.6c-.2 2 .4 4 1.8 5.6-1 1.4-1.4 3.2-1 4.8.6 2.8 2.8 5 5.6 5.6 1 .2 2 .2 3 0l8.4-4.8c2.4-1.4 4-3.8 4.2-6.6.2-2-.4-4-1.8-5.6 1-1.4 1.4-3.2 1-4.8z" fill="#FF3E00"/>
    <path d="M14.2 26.6c-2 .4-4-.6-4.8-2.4-.6-1.2-.4-2.6.4-3.6l.2-.2 5.8-3.4.2-.2c1.6-1 3.6-.6 4.8.8.8 1 1 2.4.4 3.6l-6.6 5.2.4.2z" fill="#fff"/>
    <path d="M17.8 5.4c2-.4 4 .6 4.8 2.4.6 1.2.4 2.6-.4 3.6l-.2.2-5.8 3.4-.2.2c-1.6 1-3.6.6-4.8-.8-.8-1-1-2.4-.4-3.6L17 5.6l.8-.2z" fill="#fff"/>
  </svg>
);

const NextJS = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="15" fill="#000"/>
    <path d="M10 22V10l14 16h-3L10 14v8z" fill="#fff"/>
    <path d="M22 10v7" stroke="#fff" strokeWidth="2.5"/>
  </svg>
);

const NodeJS = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <polygon points="16,2 29,9.5 29,22.5 16,30 3,22.5 3,9.5" fill="#339933"/>
    <text x="9" y="22" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="14" fill="#fff">N</text>
  </svg>
);

const Go = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <rect width="32" height="32" fill="#00ADD8" rx="3"/>
    <text x="3" y="24" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="18" fill="#fff">Go</text>
  </svg>
);

const Rust = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="14" fill="#CE422B"/>
    <circle cx="16" cy="16" r="10" fill="none" stroke="#fff" strokeWidth="3"/>
    {[0,45,90,135,180,225,270,315].map((a, i) => {
      const r = 10, x1 = 16 + r*Math.cos(a*Math.PI/180), y1 = 16 + r*Math.sin(a*Math.PI/180);
      const x2 = 16 + 14*Math.cos(a*Math.PI/180), y2 = 16 + 14*Math.sin(a*Math.PI/180);
      return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fff" strokeWidth="2.5"/>;
    })}
    <circle cx="16" cy="16" r="4" fill="#fff"/>
  </svg>
);

const Docker = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <rect width="32" height="32" fill="#2496ED" rx="4"/>
    {/* Container boxes — 3 rows, clearly visible */}
    {[6,11,16].map(y => (
      <rect key={`a${y}`} x="6"  y={y} width="5" height="4" rx="1" fill="#fff" opacity="0.95"/>
    ))}
    {[11,16].map(y => (
      <rect key={`b${y}`} x="13" y={y} width="5" height="4" rx="1" fill="#fff" opacity="0.95"/>
    ))}
    <rect x="20" y="16" width="5" height="4" rx="1" fill="#fff" opacity="0.95"/>
    {/* Whale body arc */}
    <path d="M3 24 Q16 29 29 24" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
    {/* Whale tail */}
    <path d="M26 21 Q30 16 31 20" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round"/>
    {/* Spout */}
    <path d="M22 16 Q24 11 26 14" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
  </svg>
);

const Kubernetes = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <polygon points="16,2 28,9 28,23 16,30 4,23 4,9" fill="#326CE5"/>
    <circle cx="16" cy="16" r="5" fill="none" stroke="#fff" strokeWidth="1.5"/>
    {[0,72,144,216,288].map((a, i) => {
      const rad = a * Math.PI / 180;
      const x1 = 16 + 5*Math.cos(rad), y1 = 16 + 5*Math.sin(rad);
      const x2 = 16 + 11*Math.cos(rad), y2 = 16 + 11*Math.sin(rad);
      return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fff" strokeWidth="1.5"/>;
    })}
    {[0,72,144,216,288].map((a, i) => {
      const rad = a * Math.PI / 180;
      const x = 16 + 12*Math.cos(rad), y = 16 + 12*Math.sin(rad);
      return <circle key={i} cx={x} cy={y} r="1.5" fill="#fff"/>;
    })}
  </svg>
);

const Redis = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <ellipse cx="16" cy="26" rx="13" ry="3.5" fill="#8B1A0E"/>
    <rect x="3" y="22.5" width="26" height="3.5" fill="#A52714"/>
    <ellipse cx="16" cy="22.5" rx="13" ry="3.5" fill="#C0392B"/>
    <rect x="3" y="19" width="26" height="3.5" fill="#A52714"/>
    <ellipse cx="16" cy="19" rx="13" ry="3.5" fill="#DC382D"/>
    <rect x="3" y="15.5" width="26" height="3.5" fill="#C0392B"/>
    <ellipse cx="16" cy="15.5" rx="13" ry="3.5" fill="#FF4438"/>
  </svg>
);

const PostgreSQL = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="14" fill="#336791"/>
    {/* Elephant head silhouette */}
    <ellipse cx="16" cy="13" rx="8" ry="8" fill="#fff" opacity="0.9"/>
    <ellipse cx="9" cy="18" rx="4" ry="6" fill="#fff" opacity="0.9"/>
    <circle cx="13" cy="12" r="2" fill="#336791"/>
    <circle cx="19" cy="12" r="2" fill="#336791"/>
    <path d="M12 17 Q16 20 20 17" stroke="#336791" strokeWidth="1.5" fill="none"/>
  </svg>
);

const MySQL = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <rect width="32" height="32" fill="#4479A1" rx="3"/>
    <path d="M5 24 Q8 8 11 20 Q14 8 17 24" stroke="#fff" strokeWidth="2.5" fill="none"/>
    <line x1="21" y1="10" x2="21" y2="24" stroke="#F29111" strokeWidth="2.5"/>
    <path d="M21 10 Q24 8 27 12" stroke="#F29111" strokeWidth="2.5" fill="none"/>
  </svg>
);

const MongoDB = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <path d="M16 2 C10 2 8 8 8 14 C8 20 12 26 16 30 C20 26 24 20 24 14 C24 8 22 2 16 2Z" fill="#10AA50"/>
    <rect x="14.5" y="18" width="3" height="10" fill="#B8C4BB"/>
    <rect x="14.5" y="14" width="3" height="6" fill="#12924F"/>
  </svg>
);

const GraphQL = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    {/* Hexagonal star pattern */}
    {[0,60,120,180,240,300].map((a, i) => {
      const rad = a * Math.PI / 180;
      const x = 16 + 13*Math.cos(rad), y = 16 + 13*Math.sin(rad);
      const nextRad = ((a+120) % 360) * Math.PI / 180;
      const nx = 16 + 13*Math.cos(nextRad), ny = 16 + 13*Math.sin(nextRad);
      return <line key={i} x1={x} y1={y} x2={nx} y2={ny} stroke="#E535AB" strokeWidth="2"/>;
    })}
    {[0,60,120,180,240,300].map((a, i) => {
      const rad = a * Math.PI / 180;
      const x = 16 + 13*Math.cos(rad), y = 16 + 13*Math.sin(rad);
      return <circle key={i} cx={x} cy={y} r="2.5" fill="#E535AB"/>;
    })}
    <circle cx="16" cy="16" r="4" fill="#E535AB"/>
  </svg>
);

const AWS = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <rect width="32" height="32" fill="#232F3E" rx="3"/>
    <path d="M7 19 L10 12 L13 19" stroke="#FF9900" strokeWidth="2" fill="none"/>
    <line x1="8" y1="17" x2="12" y2="17" stroke="#FF9900" strokeWidth="1.5"/>
    <line x1="14" y1="12" x2="14" y2="19" stroke="#FF9900" strokeWidth="2"/>
    <path d="M16 12 L19 19 L22 12" stroke="#FF9900" strokeWidth="2" fill="none"/>
    <path d="M6 23 Q16 26 26 23" stroke="#FF9900" strokeWidth="2" fill="none"/>
    <polygon points="24,21 27,23 24,25" fill="#FF9900"/>
  </svg>
);

const GCP = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <path d="M20 7H12L8 14l4 7h8l4-7z" fill="#EA4335"/>
    <path d="M8 14l-4 7 4 7h8l-4-7z" fill="#FBBC05"/>
    <path d="M24 14l4 7-4 7h-8l4-7z" fill="#34A853"/>
    <path d="M12 28h8l4-7H8z" fill="#4285F4"/>
    <circle cx="16" cy="16" r="4" fill="#fff"/>
  </svg>
);

const Azure = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <path d="M4 26 L14 6 L20 16 L13 26Z" fill="#0089D6"/>
    <path d="M18 8 L28 26 H18 L13 17Z" fill="#0078D4"/>
    <path d="M14 6 L22 6 L28 26 H18Z" fill="#50B4E8"/>
  </svg>
);

const Vercel = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="15" fill="#000"/>
    <polygon points="16,8 26,24 6,24" fill="#fff"/>
  </svg>
);

const GitHub = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="15" fill="#24292E"/>
    <path d="M16 5C10.5 5 6 9.5 6 15c0 4.4 2.9 8.2 6.8 9.5.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.4-1.1-1.1-1.4-1.1-1.4-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.6.3-1.1.6-1.3-2.2-.3-4.5-1.1-4.5-4.9 0-1.1.4-2 1-2.7-.1-.2-.4-1.3.1-2.6 0 0 .8-.3 2.8 1 .8-.2 1.7-.3 2.5-.3s1.7.1 2.5.3c2-1.3 2.8-1 2.8-1 .5 1.3.2 2.4.1 2.6.6.7 1 1.6 1 2.7 0 3.8-2.3 4.6-4.5 4.9.4.3.7.9.7 1.8v2.7c0 .3.2.6.7.5C23.1 23.2 26 19.4 26 15c0-5.5-4.5-10-10-10z" fill="#fff"/>
  </svg>
);

const Git = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <path d="M29.5 14.5L17.5 2.5a1.7 1.7 0 00-2.4 0L12.7 4.9l3 3a2 2 0 012.6 2.6l2.9 2.9a2 2 0 11-1.2 1.2l-2.7-2.7v7a2 2 0 11-1.6 0V12a2 2 0 01-1.1-2.6l-3-2.9L2.5 15.1a1.7 1.7 0 000 2.4l12 12a1.7 1.7 0 002.4 0l12.6-12.6a1.7 1.7 0 000-2.4z" fill="#F05033"/>
  </svg>
);

const Linux = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    {/* Tux penguin — black body, white belly, yellow beak + feet */}
    {/* Body */}
    <ellipse cx="16" cy="19" rx="10" ry="11" fill="#1a1a1a"/>
    {/* White belly patch */}
    <ellipse cx="16" cy="21" rx="6" ry="7.5" fill="#f0f0f0"/>
    {/* Head */}
    <ellipse cx="16" cy="8" rx="7" ry="7" fill="#1a1a1a"/>
    {/* Eyes — white sclera + black pupil */}
    <ellipse cx="13" cy="7" rx="2.2" ry="2.2" fill="#fff"/>
    <ellipse cx="19" cy="7" rx="2.2" ry="2.2" fill="#fff"/>
    <circle cx="13.5" cy="7" r="1" fill="#000"/>
    <circle cx="19.5" cy="7" r="1" fill="#000"/>
    {/* Beak */}
    <ellipse cx="16" cy="11" rx="2.5" ry="1.5" fill="#F5A623"/>
    {/* Feet */}
    <ellipse cx="11" cy="29.5" rx="3.5" ry="1.5" fill="#F5A623"/>
    <ellipse cx="21" cy="29.5" rx="3.5" ry="1.5" fill="#F5A623"/>
    {/* Wing hints */}
    <ellipse cx="6.5" cy="20" rx="2.5" ry="5" fill="#1a1a1a"/>
    <ellipse cx="25.5" cy="20" rx="2.5" ry="5" fill="#1a1a1a"/>
  </svg>
);

const Nginx = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <polygon points="16,2 30,25 2,25" fill="#009900"/>
    <text x="10" y="24" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="12" fill="#fff">N</text>
  </svg>
);

const Kafka = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <rect width="32" height="32" fill="#000" rx="3"/>
    <circle cx="16" cy="8" r="3" fill="#fff"/>
    <circle cx="8" cy="22" r="3" fill="#fff"/>
    <circle cx="24" cy="22" r="3" fill="#fff"/>
    <line x1="16" y1="11" x2="9" y2="20" stroke="#fff" strokeWidth="1.5"/>
    <line x1="16" y1="11" x2="23" y2="20" stroke="#fff" strokeWidth="1.5"/>
    <line x1="9" y1="22" x2="23" y2="22" stroke="#fff" strokeWidth="1.5" strokeDasharray="3 2"/>
  </svg>
);

const Tailwind = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <path d="M16 7c-3.2 0-5.2 1.6-6 4.8 1.2-1.6 2.6-2.2 4.2-1.8.9.2 1.6.9 2.3 1.7 1.2 1.2 2.5 2.6 5.5 2.6 3.2 0 5.2-1.6 6-4.8-1.2 1.6-2.6 2.2-4.2 1.8-.9-.2-1.6-.9-2.3-1.7C20.3 8.4 19 7 16 7z" fill="#38BDF8"/>
    <path d="M10 17c-3.2 0-5.2 1.6-6 4.8 1.2-1.6 2.6-2.2 4.2-1.8.9.2 1.6.9 2.3 1.7 1.2 1.2 2.5 2.6 5.5 2.6 3.2 0 5.2-1.6 6-4.8-1.2 1.6-2.6 2.2-4.2 1.8-.9-.2-1.6-.9-2.3-1.7C14.3 18.4 13 17 10 17z" fill="#38BDF8"/>
  </svg>
);

const Vite = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <polygon points="16,2 30,28 16,24 2,28" fill="#646CFF"/>
    <polygon points="16,4 28,27 16,23" fill="#9B93FF"/>
    <polygon points="16,8 12,20 16,18 20,20" fill="#FFD62E"/>
  </svg>
);

const Terraform = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <polygon points="14,3 4,9 4,21 14,15" fill="#7B42BC"/>
    <polygon points="17,3 27,9 27,21 17,15" fill="#5C4EE5"/>
    <polygon points="4,24 14,30 14,18" fill="#4040B2"/>
    <polygon points="17,18 27,24 17,30" fill="#7B42BC"/>
  </svg>
);

const Firebase = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <path d="M5 24L10 4l6 10z" fill="#F57C00"/>
    <path d="M10 4l7.5 20L27 24 19 9z" fill="#FFA000"/>
    <path d="M5 24L12 18l3 6z" fill="#FF6F00"/>
    <path d="M10 4L5 24l10.5-12.5z" fill="#F57C00" opacity="0.7"/>
    <path d="M17.5 24L27 24 19 9l-1.5 15z" fill="#FFCA28"/>
  </svg>
);

const Supabase = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <defs>
      <linearGradient id="sbGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#3ECF8E"/>
        <stop offset="100%" stopColor="#1C9B6B"/>
      </linearGradient>
    </defs>
    <path d="M16 3L4 18h11v11l13-15H17z" fill="url(#sbGrad)"/>
  </svg>
);

const SpringBoot = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="14" fill="#6DB33F"/>
    <path d="M16 7c0 0-4 4-4 9s4 9 4 9M8 16c0 0 4-4 9-4s9 4 9 4" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
  </svg>
);

const FastAPI = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="14" fill="#009688"/>
    <polygon points="16,8 20,16 16,14 12,22 12,16 8,16 16,8" fill="#fff"/>
  </svg>
);

const Express = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <rect width="32" height="32" fill="#353535" rx="3"/>
    <text x="3" y="24" fontFamily="Arial,sans-serif" fontWeight="700" fontSize="13" fill="#fff">expr</text>
  </svg>
);

const Django = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <rect width="32" height="32" fill="#0C4B33" rx="3"/>
    <text x="4" y="24" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="18" fill="#44B78B">D</text>
  </svg>
);

const Cloudflare = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <path d="M20.7 19.8l.4-1.3c.5-1.8-.7-3.5-2.5-3.5H7.3c-.2 0-.3.2-.3.4l-.3 1.2c-.1.3.1.5.4.5h13c.3 0 .5.2.5.5l-.2.9c0 .3.2.5.4.4z" fill="#F6821F"/>
    <path d="M23 13.9c-.1 0-.2 0-.2-.1l-.4-1.3c-.4-1.2-1.5-2-2.8-2H9.1c-.3 0-.5.2-.5.5l-.4 1.5c-.1.3.2.6.5.5h11.5c.3 0 .6.2.6.5l.3 1c0 .3.3.5.6.4z" fill="#FBAD41"/>
    <path d="M7.8 25.3h16.4c.2 0 .4-.2.4-.4l.4-1.4c.1-.3-.1-.5-.4-.5H8.3c-.3 0-.5-.2-.5-.5l.2-1c0-.3-.2-.5-.4-.4l-1.4.4c-.2.1-.4.3-.4.5l-.2.9c-.2 1.2.7 2.4 2.2 2.4z" fill="#F6821F"/>
  </svg>
);

const Prisma = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <rect width="32" height="32" fill="#0C3249" rx="3"/>
    <path d="M6 26 L16 4 L28 22 Z" fill="none" stroke="#5A67D8" strokeWidth="2"/>
    <path d="M6 26 L28 22 L16 4" fill="rgba(90,103,216,0.2)"/>
    <line x1="16" y1="4" x2="17" y2="22" stroke="#5A67D8" strokeWidth="1.5"/>
  </svg>
);

const ElasticSearch = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="14" fill="#FEC514"/>
    <ellipse cx="16" cy="14" rx="9" ry="5" fill="#fff" opacity="0.9"/>
    <ellipse cx="16" cy="18" rx="9" ry="5" fill="#fff" opacity="0.9"/>
    <ellipse cx="16" cy="16" rx="3" ry="8" fill="#00BFB3"/>
  </svg>
);

const Webpack = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <path d="M16 2l13 7.5v15L16 30 3 24.5v-15z" fill="#8DD6F9"/>
    <path d="M16 2l13 7.5-13 7.5L3 9.5z" fill="#1C78C0"/>
    <path d="M3 9.5v15l13 5.5v-15z" fill="#1C78C0" opacity="0.7"/>
    <path d="M29 9.5v15l-13 5.5v-15z" fill="#1C78C0" opacity="0.9"/>
  </svg>
);

const RabbitMQ = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <rect x="6" y="8" width="20" height="18" rx="4" fill="#FF6600"/>
    {/* Ears */}
    <rect x="9" y="2" width="5" height="8" rx="2.5" fill="#FF6600"/>
    <rect x="18" y="2" width="5" height="8" rx="2.5" fill="#FF6600"/>
    {/* Face */}
    <rect x="14" y="15" width="4" height="4" rx="1" fill="#fff"/>
  </svg>
);

const Nuxt = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <polygon points="13,6 2,25 24,25" fill="#00DC82"/>
    <polygon points="21,11 13,25 29,25" fill="#00DC82" opacity="0.7"/>
  </svg>
);

const Bun = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <circle cx="16" cy="18" r="12" fill="#FBF0DF"/>
    <circle cx="11" cy="14" r="3" fill="#FBBA7A"/>
    <circle cx="21" cy="14" r="3" fill="#FBBA7A"/>
    <circle cx="16" cy="10" r="3.5" fill="#FBBA7A"/>
    <circle cx="16" cy="18" r="7" fill="#FBF0DF" stroke="#F5D68F" strokeWidth="1.5"/>
    {/* Eyes */}
    <circle cx="13" cy="17" r="1.5" fill="#000"/>
    <circle cx="19" cy="17" r="1.5" fill="#000"/>
    <path d="M13 21 Q16 23 19 21" stroke="#000" strokeWidth="1" fill="none"/>
  </svg>
);

const Deno = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="14" fill="#13171F"/>
    <circle cx="16" cy="14" r="8" fill="#fff"/>
    {/* Eye */}
    <circle cx="16" cy="13" r="3" fill="#13171F"/>
    <circle cx="17" cy="12" r="1" fill="#fff"/>
    {/* Body */}
    <rect x="12" y="20" width="8" height="6" rx="3" fill="#fff"/>
  </svg>
);

const VSCode = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <defs>
      <linearGradient id="vsGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#2684D4"/>
        <stop offset="100%" stopColor="#0065A9"/>
      </linearGradient>
    </defs>
    <rect width="32" height="32" fill="url(#vsGrad)" rx="6"/>
    <path d="M22 5l-9 9-4-3.5L7 12v8l2 1.5L13 18l9 9 4-2V7z" fill="#fff" opacity="0.9"/>
    <path d="M22 5L13 14l-6-4.5V12l6 4-6 4v2.5L13 18l9 9 4-2V7z" fill="#fff"/>
    <path d="M7 12l2 1.5V18.5L7 20z" fill="#2684D4"/>
  </svg>
);

const Ansible = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="14" fill="#EE0000"/>
    <path d="M16 6l4 20-7-9h11" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinejoin="round"/>
  </svg>
);

const Jenkins = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <rect width="32" height="32" fill="#F0D6B7" rx="3"/>
    <ellipse cx="16" cy="13" rx="8" ry="9" fill="#335061"/>
    <ellipse cx="16" cy="13" rx="6" ry="7" fill="#F0D6B7"/>
    {/* Eyes */}
    <circle cx="13" cy="12" r="1.5" fill="#335061"/>
    <circle cx="19" cy="12" r="1.5" fill="#335061"/>
    {/* Smile */}
    <path d="M12 16 Q16 19 20 16" stroke="#335061" strokeWidth="1.5" fill="none"/>
  </svg>
);

const Netlify = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <path d="M10 16L16 2l6 14H10z" fill="#00C7B7"/>
    <path d="M6 16h20v12H6z" fill="#00AD9F"/>
    <line x1="10" y1="22" x2="22" y2="22" stroke="#fff" strokeWidth="2"/>
    <line x1="10" y1="19" x2="16" y2="19" stroke="#fff" strokeWidth="2"/>
  </svg>
);

const GithubActions = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="14" fill="#24292E"/>
    <circle cx="16" cy="16" r="6" fill="none" stroke="#2088FF" strokeWidth="2"/>
    <circle cx="16" cy="6" r="3" fill="#2088FF"/>
    <circle cx="24.7" cy="11" r="3" fill="#2088FF"/>
    <circle cx="24.7" cy="21" r="3" fill="#2088FF"/>
  </svg>
);

const WebSocket = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="13" fill="none" stroke="#4A90E2" strokeWidth="2"/>
    <path d="M6 22 Q10 12 16 16 Q22 20 26 10" stroke="#4A90E2" strokeWidth="2" fill="none"/>
    <circle cx="6" cy="22" r="2.5" fill="#4A90E2"/>
    <circle cx="26" cy="10" r="2.5" fill="#4A90E2"/>
  </svg>
);

const GRPC = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <rect width="32" height="32" fill="#244C5A" rx="3"/>
    <text x="4" y="22" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="14" fill="#5FC9D8">gRPC</text>
  </svg>
);

const REST = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <rect width="32" height="32" fill="#FF6B35" rx="3"/>
    <text x="2" y="22" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="11" fill="#fff">REST</text>
  </svg>
);

const Kotlin = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <defs>
      <linearGradient id="ktGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#7F52FF"/>
        <stop offset="50%" stopColor="#C811E1"/>
        <stop offset="100%" stopColor="#E54857"/>
      </linearGradient>
    </defs>
    <rect width="32" height="32" fill="url(#ktGrad)" rx="3"/>
    <polygon points="3,3 18,3 3,18" fill="rgba(255,255,255,0.3)"/>
    <polygon points="3,29 18,3 29,29" fill="rgba(255,255,255,0.15)"/>
    <polygon points="3,18 18,3 29,29 3,29" fill="rgba(255,255,255,0.05)"/>
  </svg>
);

const Swift = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <rect width="32" height="32" fill="#FA7343" rx="6"/>
    <path d="M26 20c-1.2-3.5-4.5-7.8-8.5-10.5 3.5 5 4.5 9.5 2.5 12C17 25 11 26 8 22.5c4.5 2.5 10.5 1.5 13.5-3l.5 3.5c-4 3.5-10.5 4-15 .5 6 3.5 14.5 1 19-3.5z" fill="#fff"/>
  </svg>
);

const Java = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <path d="M12 22c0 0-2 1.2 1.4 1.6C17 24 19 24 22 23.5c0 0 1 .6 2.3 1.1C18.5 27 10 24.3 12 22z" fill="#EA2D2E"/>
    <path d="M11 19.5c0 0-2.2 1.6 1.2 1.9C16 21.8 20 21.9 23.5 21c0 0 .7.7 1.7 1.1C19 24 9 22.5 11 19.5z" fill="#EA2D2E"/>
    <path d="M18 14c2 2.3-1 4.3-1 4.3s5-2.5 2.7-5.7C17.5 9.5 15.5 8.5 21.5 5 21.5 5 14 6.5 18 14z" fill="#EA2D2E"/>
    <path d="M25.5 25s1.5 1.2-1.6 2.2c-5.7 1.7-23.7 2.2-28.8.1-1.8-.8 1.6-1.8 2.6-2 1.1-.2 1.7-.2 1.7-.2C-2.2 23.7-5 25.4 2 26.2c19.8 3.2 36.1-.7 23.5-1.2z" fill="#EA2D2E"/>
    <path d="M13 17c0 0-8.5 2-3 2.7 2.5.4 7.5.3 12.2-.3 3.8-.5 7.6-1.5 7.6-1.5s-1.3.6-2.3 1.2c-9.2 2.4-27 1.3-21.8-.6 4.4-1.6 7.3-1.5 7.3-1.5z" fill="#5382A1"/>
    <path d="M22 20c9.4-4.9 5-9.6 2-9-.7.1-1 .3-1 .3s.3-.4 .8-.6c5.7-2 10 5.9-1.9 9.1C22.9 19.8 22 20 22 20z" fill="#5382A1"/>
  </svg>
);

const Cassandra = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <rect width="32" height="32" fill="#1287B1" rx="3"/>
    {/* Eye of cassandra */}
    <ellipse cx="16" cy="16" rx="11" ry="6" fill="none" stroke="#fff" strokeWidth="2"/>
    <circle cx="16" cy="16" r="4" fill="#fff"/>
    <circle cx="16" cy="16" r="2" fill="#1287B1"/>
  </svg>
);

const SQLite = ({ size = 32 }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <ellipse cx="12" cy="16" rx="6" ry="13" fill="#003B57"/>
    <path d="M12 3c4 0 14 4 14 13s-10 13-14 13" fill="none" stroke="#0F80CC" strokeWidth="2"/>
    <ellipse cx="12" cy="16" rx="4" ry="11" fill="#0F80CC"/>
  </svg>
);

// ─── Logo registry ─────────────────────────────────────────────────────────────

const LOGOS: Record<string, React.FC<LogoProps>> = {
  javascript: JavaScript, js: JavaScript,
  typescript: TypeScript, ts: TypeScript,
  python: Python,
  react: ReactLogo,
  vue: Vue, vuejs: Vue, 'vue.js': Vue,
  angular: Angular,
  svelte: Svelte,
  nextjs: NextJS, next: NextJS, 'next.js': NextJS,
  nodejs: NodeJS, node: NodeJS, 'node.js': NodeJS,
  go: Go, golang: Go,
  rust: Rust,
  docker: Docker,
  kubernetes: Kubernetes, k8s: Kubernetes,
  redis: Redis,
  postgresql: PostgreSQL, postgres: PostgreSQL,
  mysql: MySQL,
  mongodb: MongoDB, mongo: MongoDB,
  graphql: GraphQL,
  aws: AWS, amazon: AWS,
  gcp: GCP, 'google cloud': GCP,
  azure: Azure, microsoft: Azure,
  vercel: Vercel,
  github: GitHub,
  git: Git,
  linux: Linux, ubuntu: Linux, debian: Linux,
  nginx: Nginx,
  kafka: Kafka,
  tailwind: Tailwind, tailwindcss: Tailwind,
  vite: Vite,
  terraform: Terraform,
  firebase: Firebase,
  supabase: Supabase,
  spring: SpringBoot, springboot: SpringBoot, 'spring boot': SpringBoot,
  fastapi: FastAPI,
  express: Express, expressjs: Express,
  django: Django,
  cloudflare: Cloudflare,
  prisma: Prisma,
  elasticsearch: ElasticSearch, elastic: ElasticSearch,
  webpack: Webpack,
  rabbitmq: RabbitMQ, rabbit: RabbitMQ,
  nuxt: Nuxt, nuxtjs: Nuxt,
  bun: Bun,
  deno: Deno,
  vscode: VSCode, 'vs code': VSCode,
  ansible: Ansible,
  jenkins: Jenkins,
  netlify: Netlify,
  'github actions': GithubActions, githubactions: GithubActions,
  websocket: WebSocket, websockets: WebSocket,
  grpc: GRPC,
  rest: REST, restapi: REST,
  kotlin: Kotlin,
  swift: Swift,
  java: Java,
  cassandra: Cassandra,
  sqlite: SQLite,
  firebase2: Firebase,
};

/**
 * Get a tech logo SVG for a given technology name.
 * Returns null if no logo is found (caller should fall back to SvgIcon).
 */
export const TechLogo: React.FC<{ name: string; size?: number }> = ({ name, size = 32 }) => {
  const key = (name || '').toLowerCase().replace(/[^a-z0-9.\s]/g, '').trim();
  const Logo = LOGOS[key];
  if (!Logo) return null;
  return <Logo size={size} />;
};

/**
 * Check if a logo exists for a given tech name.
 */
export function hasTechLogo(name: string): boolean {
  const key = (name || '').toLowerCase().replace(/[^a-z0-9.\s]/g, '').trim();
  return key in LOGOS;
}

/**
 * Scan a list of candidate strings (topic tags, badges, node labels — which may
 * be multi-word phrases like "Redis Internals") and return the first substring
 * that matches a known tech logo, or null if none match.
 */
export function findTechLogoName(candidates: Array<string | undefined | null>): string | null {
  for (const c of candidates) {
    if (!c) continue;
    if (hasTechLogo(c)) return c;
    for (const word of c.split(/[\s/,\-]+/)) {
      if (word && hasTechLogo(word)) return word;
    }
  }
  return null;
}

/**
 * Get the primary brand color for a technology (for theming).
 */
export function getTechColor(name: string): string | null {
  const key = (name || '').toLowerCase().replace(/[^a-z0-9.\s]/g, '').trim();
  const colorMap: Record<string, string> = {
    javascript: '#F7DF1E', js: '#F7DF1E',
    typescript: '#3178C6', ts: '#3178C6',
    python: '#3776AB',
    react: '#61DAFB',
    vue: '#42B883', vuejs: '#42B883',
    angular: '#DD0031',
    svelte: '#FF3E00',
    nextjs: '#ffffff', next: '#ffffff',
    nodejs: '#339933', node: '#339933',
    go: '#00ADD8', golang: '#00ADD8',
    rust: '#CE422B',
    docker: '#2496ED',
    kubernetes: '#326CE5', k8s: '#326CE5',
    redis: '#DC382D',
    postgresql: '#336791', postgres: '#336791',
    mysql: '#4479A1',
    mongodb: '#10AA50', mongo: '#10AA50',
    graphql: '#E535AB',
    aws: '#FF9900', amazon: '#FF9900',
    gcp: '#4285F4', 'google cloud': '#4285F4',
    azure: '#0078D4', microsoft: '#0078D4',
    vercel: '#ffffff',
    github: '#ffffff',
    git: '#F05033',
    linux: '#FFE01B',
    nginx: '#009900',
    kafka: '#ffffff',
    tailwind: '#38BDF8', tailwindcss: '#38BDF8',
    vite: '#646CFF',
    terraform: '#7B42BC',
    firebase: '#FFCA28',
    supabase: '#3ECF8E',
    spring: '#6DB33F', springboot: '#6DB33F',
    fastapi: '#009688',
    django: '#44B78B',
    cloudflare: '#F6821F',
    prisma: '#5A67D8',
    elasticsearch: '#FEC514', elastic: '#FEC514',
    rabbitmq: '#FF6600',
    kotlin: '#7F52FF',
    swift: '#FA7343',
    java: '#EA2D2E',
  };
  return colorMap[key] || null;
}
