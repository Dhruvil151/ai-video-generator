import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
}

const I: React.FC<IconProps & { children: React.ReactNode }> = ({ size = 24, color = 'currentColor', children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
    {children}
  </svg>
);

const Zap: React.FC<IconProps> = (p) => <I {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill={p.color || 'currentColor'} stroke="none" /></I>;
const Shield: React.FC<IconProps> = (p) => <I {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></I>;
const Layers: React.FC<IconProps> = (p) => <I {...p}><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></I>;
const Globe: React.FC<IconProps> = (p) => <I {...p}><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></I>;
const Cpu: React.FC<IconProps> = (p) => <I {...p}><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /><line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" /><line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" /><line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="14" x2="23" y2="14" /><line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="14" x2="4" y2="14" /></I>;
const Database: React.FC<IconProps> = (p) => <I {...p}><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></I>;
const Server: React.FC<IconProps> = (p) => <I {...p}><rect x="2" y="2" width="20" height="8" rx="2" /><rect x="2" y="14" width="20" height="8" rx="2" /><line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" /></I>;
const Cloud: React.FC<IconProps> = (p) => <I {...p}><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" /></I>;
const Code: React.FC<IconProps> = (p) => <I {...p}><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></I>;
const Lock: React.FC<IconProps> = (p) => <I {...p}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></I>;
const CheckCircle: React.FC<IconProps> = (p) => <I {...p}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></I>;
const Activity: React.FC<IconProps> = (p) => <I {...p}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></I>;
const BarChart: React.FC<IconProps> = (p) => <I {...p}><line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" /></I>;
const Settings: React.FC<IconProps> = (p) => <I {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></I>;
const RefreshCw: React.FC<IconProps> = (p) => <I {...p}><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></I>;
const Key: React.FC<IconProps> = (p) => <I {...p}><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" /></I>;
const Package: React.FC<IconProps> = (p) => <I {...p}><line x1="16.5" y1="9.4" x2="7.5" y2="4.21" /><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></I>;
const GitBranch: React.FC<IconProps> = (p) => <I {...p}><line x1="6" y1="3" x2="6" y2="15" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 0 1-9 9" /></I>;
const Network: React.FC<IconProps> = (p) => <I {...p}><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></I>;
const Terminal: React.FC<IconProps> = (p) => <I {...p}><polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" /></I>;
const ArrowRight: React.FC<IconProps> = (p) => <I {...p}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></I>;
const AlertTriangle: React.FC<IconProps> = (p) => <I {...p}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></I>;
const Link: React.FC<IconProps> = (p) => <I {...p}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></I>;
const Repeat: React.FC<IconProps> = (p) => <I {...p}><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></I>;
const Clock: React.FC<IconProps> = (p) => <I {...p}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></I>;
const Box: React.FC<IconProps> = (p) => <I {...p}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></I>;
const Play: React.FC<IconProps> = (p) => <I {...p}><polygon points="5 3 19 12 5 21 5 3" fill={p.color || 'currentColor'} stroke="none" /></I>;
const File: React.FC<IconProps> = (p) => <I {...p}><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" /></I>;
const StopCircle: React.FC<IconProps> = (p) => <I {...p}><circle cx="12" cy="12" r="10" /><rect x="9" y="9" width="6" height="6" /></I>;
const XCircle: React.FC<IconProps> = (p) => <I {...p}><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></I>;
const Rocket: React.FC<IconProps> = (p) => <I {...p}><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" /><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" /></I>;
const Check: React.FC<IconProps> = (p) => <I {...p}><polyline points="20 6 9 17 4 12" /></I>;

const ICON_COMPONENTS: Record<string, React.FC<IconProps>> = {
  'zap': Zap, 'shield': Shield, 'layers': Layers, 'globe': Globe,
  'cpu': Cpu, 'database': Database, 'server': Server, 'cloud': Cloud,
  'code': Code, 'lock': Lock, 'check-circle': CheckCircle, 'activity': Activity,
  'bar-chart': BarChart, 'settings': Settings, 'refresh-cw': RefreshCw, 'key': Key,
  'package': Package, 'git-branch': GitBranch, 'network': Network, 'terminal': Terminal,
  'arrow-right': ArrowRight, 'alert-triangle': AlertTriangle, 'link': Link, 'repeat': Repeat,
  'clock': Clock, 'box': Box, 'play': Play, 'file': File,
  'stop-circle': StopCircle, 'x-circle': XCircle, 'rocket': Rocket, 'check': Check,
};

export const SvgIcon: React.FC<{ name: string; size?: number; color?: string }> = ({ name, size = 24, color = 'currentColor' }) => {
  const Component = ICON_COMPONENTS[name];
  if (!Component) return <ArrowRight size={size} color={color} />;
  return <Component size={size} color={color} />;
};

export { ICON_COMPONENTS, Rocket, Check, CheckCircle };
