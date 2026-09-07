import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import React, { useMemo } from 'react';
import { BackgroundGradients } from './BackgroundGradients';
import { SvgIcon } from './SvgIcons';
import '../styles/video.css';

interface CodeLine {
  number: number;
  tokens: Array<{ type: string; text: string }>;
}

interface CodeEditorSceneProps {
  scene: {
    title: string;
    subtitle: string;
    narration: string;
    audioUrl?: string | null;
    actualDurationSec?: number;
    estimatedDurationSec?: number;
    subtitles?: any[];
    payload?: {
      layout?: 'split' | 'fullscreen';
      code?: string;
      language?: string;
      filename?: string;
      highlightLines?: number[];
      callout?: string;
    };
  };
  bgMusicUrl?: string | null;
  techPrimary?: string;
  techSecondary?: string;
}

// ── Fixed pixel geometry for the fullscreen layout (mirrors the CSS in video.css)
// so the callout arrow can be drawn with exact, not estimated, coordinates.
const EDITOR_BOX_W  = 1776; // 1920 - 2*72px scene padding
const EDITOR_BOX_H  = 800;  // fixed height of the fullscreen editor container
const TITLEBAR_H    = 55;  // .code-editor__titlebar rendered height
const BODY_PAD_TOP  = 28;  // .code-editor__body { padding: 28px 0 }
const LINE_HEIGHT   = 42;  // .code-line { min-height: 42px }
const CALLOUT_W     = 480;
const CALLOUT_H     = 150;

// ── Per-language comment/keyword rules ───────────────────────────────────────
const DEFAULT_RULE = {
  comment: /\/\/.*|\/\*[\s\S]*?\*\//,
  keyword: /\b(const|let|var|function|class|return|if|else|for|while|import|export|default|async|await|new|try|catch|throw|typeof|instanceof|from|of|in|extends|this|super|null|undefined|true|false|void|delete)\b/,
};

const LANG_RULES: Record<string, { comment: RegExp; keyword: RegExp; property?: RegExp }> = {
  python:     { comment: /#.*/, keyword: /\b(def|class|import|from|return|if|elif|else|for|while|in|with|as|try|except|finally|pass|and|or|not|is|None|True|False|async|await|lambda|yield)\b/ },
  go:         { comment: /\/\/.*|\/\*[\s\S]*?\*\//, keyword: /\b(func|package|import|return|if|else|for|range|var|const|type|struct|interface|go|chan|select|switch|case|default|defer|nil|true|false|map)\b/ },
  rust:       { comment: /\/\/.*|\/\*[\s\S]*?\*\//, keyword: /\b(fn|let|mut|struct|enum|impl|trait|pub|use|mod|match|if|else|for|while|loop|return|Some|None|Ok|Err|self|Self|async|await|true|false)\b/ },
  sql:        { comment: /--.*/, keyword: /\b(SELECT|FROM|WHERE|INSERT|INTO|VALUES|UPDATE|SET|DELETE|JOIN|LEFT|RIGHT|INNER|OUTER|ON|GROUP|BY|ORDER|HAVING|CREATE|TABLE|ALTER|DROP|INDEX|PRIMARY|KEY|FOREIGN|REFERENCES|AND|OR|NOT|NULL|DEFAULT|LIMIT|AS)\b/i },
  yaml:       { comment: /#.*/, keyword: /\b(true|false|null)\b/, property: /^\s*[\w.-]+(?=\s*:)/ },
  json:       { comment: /$^/, keyword: /\b(true|false|null)\b/ },
  bash:       { comment: /#.*/, keyword: /\b(if|then|else|fi|for|do|done|while|echo|export|function|return|exit|case|esac|in)\b/ },
  shell:      { comment: /#.*/, keyword: /\b(if|then|else|fi|for|do|done|while|echo|export|function|return|exit|case|esac|in)\b/ },
  dockerfile: { comment: /#.*/, keyword: /\b(FROM|RUN|CMD|COPY|ADD|WORKDIR|EXPOSE|ENV|ARG|ENTRYPOINT|VOLUME|USER|LABEL|MAINTAINER)\b/ },
  java:       { comment: /\/\/.*|\/\*[\s\S]*?\*\//, keyword: /\b(public|private|protected|class|interface|extends|implements|static|final|void|new|return|if|else|for|while|try|catch|finally|throw|throws|import|package|this|super|null|true|false)\b/ },
};

// TODO P3: Code morphing — interpolate between two code states character by character using
// Remotion's interpolate() over a 30-60 frame window, replacing static code display with a live rewrite animation

// ── Minimal syntax tokenizer ─────────────────────────────────────────────────
function tokenize(line: string, language: string): Array<{ type: string; text: string }> {
  const tokens: Array<{ type: string; text: string }> = [];

  const rule = LANG_RULES[(language || '').toLowerCase()] || DEFAULT_RULE;
  const rules: Array<[string, RegExp]> = [
    ['comment', rule.comment],
    ['string',  /(['"`])(?:(?!\1)[^\\]|\\.)*\1/],
    ...(rule.property ? [['property', rule.property] as [string, RegExp]] : []),
    ['keyword', rule.keyword],
    ['class',      /\b[A-Z][A-Za-z0-9_]+\b/],
    ['function',   /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/],
    ['number',     /\b\d+\.?\d*\b/],
    ['operator',   /[+\-*/%=<>!&|^~?:]+/],
    ['punctuation',/[{}[\]();.,]/],
  ];

  let rest = line;
  while (rest.length > 0) {
    let matched = false;
    for (const [type, pattern] of rules) {
      const m = rest.match(pattern as RegExp);
      if (m && m.index === 0 && m[0].length > 0) {
        tokens.push({ type, text: m[0] });
        rest = rest.slice(m[0].length);
        matched = true;
        break;
      }
    }
    if (!matched) {
      // Plain char
      const lastToken = tokens[tokens.length - 1];
      if (lastToken && lastToken.type === 'plain') {
        lastToken.text += rest[0];
      } else {
        tokens.push({ type: 'plain', text: rest[0] });
      }
      rest = rest.slice(1);
    }
  }
  return tokens;
}

function parseCode(code: string, language: string): CodeLine[] {
  return code.split('\n').map((line, i) => ({
    number: i + 1,
    tokens: tokenize(line, language),
  }));
}

// ── Component ─────────────────────────────────────────────────────────────────
export const CodeEditorScene: React.FC<CodeEditorSceneProps> = ({ scene, techPrimary, techSecondary }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const glowColor = techPrimary || '#00D9FF';
  const durationSec = scene.actualDurationSec || scene.estimatedDurationSec || 10;

  const code         = scene.payload?.code     || '// No code provided';
  const language     = scene.payload?.language || 'javascript';
  const filename     = scene.payload?.filename || 'index.js';
  const highlighted  = scene.payload?.highlightLines || [];
  const callout      = scene.payload?.callout  || '';
  const layout       = scene.payload?.layout   || 'split';

  const maxLines = layout === 'fullscreen' ? 28 : 22;
  const codeLines = useMemo(() => {
    const all = parseCode(code, language);
    return all.slice(0, maxLines);
  }, [code, language, maxLines]);
  const codeOverflows = parseCode(code, language).length > maxLines;

  // Subtitles removed — will be re-enabled when real word timestamps are available

  // Entrance animations
  const headerSpring  = spring({ frame, fps, config: { damping: 24, stiffness: 120 }, delay: 0 });
  const editorSpring  = spring({ frame, fps, config: { damping: 20, stiffness: 90 }, delay: 8 });
  const calloutSpring = spring({ frame, fps, config: { damping: 18, stiffness: 80 }, delay: 14 });

  const totalFrames = Math.ceil(durationSec * fps);

  // Calculate total characters for typing animation
  const totalChars = useMemo(() => codeLines.reduce((sum, line) => sum + line.tokens.reduce((s, t) => s + t.text.length, 0), 0), [codeLines]);

  // Typing phase: first 35% of the scene (after entrance delay)
  const typingStartFrame = 20;
  const typingDurationFrames = Math.floor(totalFrames * 0.35);
  const visibleChars = Math.floor(interpolate(frame, [typingStartFrame, typingStartFrame + typingDurationFrames], [0, totalChars], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  const typingComplete = visibleChars >= totalChars;

  const postTypingStart = typingStartFrame + typingDurationFrames;
  const activeHighlightIndex = Math.floor(
    interpolate(frame, [postTypingStart, totalFrames], [0, Math.max(1, highlighted.length)], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  );

  // Active highlighted line's row index within the currently visible lines —
  // used to point the fullscreen callout arrow at the right row.
  const activeLineNumber = highlighted.length > 0 ? highlighted[Math.min(activeHighlightIndex, highlighted.length - 1)] : null;
  const activeLineRow = activeLineNumber != null ? codeLines.findIndex(l => l.number === activeLineNumber) : -1;

  return (
    <AbsoluteFill className="scene">
      <BackgroundGradients variant="code" techPrimary={techPrimary} techSecondary={techSecondary} />

      {layout === 'fullscreen'
        ? (
          /* Fullscreen layout — editor takes full width, callout floats as overlay */
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: '48px 72px 60px' }}>
            {/* Header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', opacity: headerSpring, transform: `translateY(${interpolate(headerSpring, [0, 1], [-24, 0])}px)` }}>
              <div>
                <div className="scene-tag">Code Walkthrough</div>
                <h2 className="scene-title" style={{ fontSize: '52px', marginBottom: 0 }}>{scene.title}</h2>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '8px' }}>
                <div className={`badge badge--${language === 'python' ? 'green' : language === 'typescript' ? 'cyan' : 'amber'}`} style={{ fontSize: '22px' }}>{language.toUpperCase()}</div>
              </div>
            </div>
            {/* Full-width editor — fixed height so the callout arrow can target exact pixel coordinates */}
            <div style={{ height: `${EDITOR_BOX_H}px`, opacity: editorSpring, transform: `translateY(${interpolate(editorSpring, [0, 1], [30, 0])}px)`, position: 'relative' }}>
              <div className="code-editor" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div className="code-editor__titlebar">
                  <div className="code-editor__dot code-editor__dot--red" />
                  <div className="code-editor__dot code-editor__dot--yellow" />
                  <div className="code-editor__dot code-editor__dot--green" />
                  <span className="code-editor__filename">{filename}</span>
                </div>
                <div className="code-editor__body" style={{ flex: 1, overflowY: 'hidden', position: 'relative' }}>
                  {(() => {
                    let charsRendered = 0;
                    const focusMode = highlighted.length > 0 && typingComplete;
                    return codeLines.map((line) => {
                      const isHighlighted = highlighted.includes(line.number);
                      const isCurrentlyActive = isHighlighted && highlighted.indexOf(line.number) === Math.min(activeHighlightIndex, highlighted.length - 1);
                      const showGlow = isCurrentlyActive && typingComplete;

                      const glowStyle: React.CSSProperties = showGlow ? {
                        backgroundColor: `${glowColor}1a`,
                        borderLeft: `4px solid ${glowColor}`,
                        boxShadow: `inset 4px 0 8px -4px ${glowColor}`,
                        paddingLeft: '12px',
                        opacity: 1,
                        transition: 'opacity 0.2s',
                      } : {
                        paddingLeft: '16px',
                        borderLeft: '4px solid transparent',
                        opacity: focusMode && !isHighlighted ? 0.25 : 1,
                        transition: 'opacity 0.2s',
                      };

                      const lineChars = line.tokens.reduce((s, t) => s + t.text.length, 0);
                      
                      if (charsRendered >= visibleChars) {
                        return null; 
                      }

                      const isActivelyTypingLine = charsRendered + lineChars >= visibleChars;
                      let currentLineChars = 0;
                      
                      const renderedTokens = line.tokens.map((t, ti) => {
                        if (charsRendered + currentLineChars >= visibleChars) return null;
                        
                        let textToShow = t.text;
                        if (charsRendered + currentLineChars + t.text.length > visibleChars) {
                           const sliceLen = visibleChars - (charsRendered + currentLineChars);
                           textToShow = t.text.slice(0, sliceLen);
                        }
                        currentLineChars += t.text.length;
                        return <span key={ti} className={`token-${t.type}`}>{textToShow}</span>;
                      });
                      
                      charsRendered += lineChars;

                      return (
                        <div key={line.number} className="code-line" style={glowStyle}>
                          <span className="code-line__number">{line.number}</span>
                          <span>{renderedTokens}</span>
                          {isActivelyTypingLine && !typingComplete && (
                            <span style={{ display: 'inline-block', width: '10px', height: '22px', background: glowColor, verticalAlign: 'middle', opacity: Math.floor(frame / 10) % 2 === 0 ? 1 : 0, marginLeft: '4px' }} />
                          )}
                        </div>
                      );
                    });
                  })()}
                  {codeOverflows && typingComplete && (
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60px', background: 'linear-gradient(transparent, #0D1117)', pointerEvents: 'none' }} />
                  )}
                </div>
              </div>
              {/* Callout arrow — points from the callout box toward the active highlighted line.
                  Drawn in real pixel coordinates (matching the fixed EDITOR_BOX_* / CALLOUT_* geometry
                  and the .code-editor CSS metrics) so it reliably connects both anchors. */}
              {callout && activeLineRow >= 0 && typingComplete && (() => {
                const targetX = 90;
                const targetY = TITLEBAR_H + BODY_PAD_TOP + activeLineRow * LINE_HEIGHT + LINE_HEIGHT / 2;
                const sourceX = EDITOR_BOX_W - 24 - CALLOUT_W + 40;
                const sourceY = EDITOR_BOX_H - 20 - CALLOUT_H + 24;
                const midX = (sourceX + targetX) / 2;
                return (
                  <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} viewBox={`0 0 ${EDITOR_BOX_W} ${EDITOR_BOX_H}`}>
                    <defs>
                      <marker id="callout-arrowhead" markerWidth="10" markerHeight="8" refX="8" refY="4" orient="auto">
                        <polygon points="0 0, 9 4, 0 8" fill={glowColor} />
                      </marker>
                    </defs>
                    <path
                      d={`M ${sourceX} ${sourceY} Q ${midX} ${sourceY} ${midX} ${(sourceY + targetY) / 2} Q ${midX} ${targetY} ${targetX + 14} ${targetY}`}
                      fill="none" stroke={glowColor} strokeWidth={2.5} strokeDasharray="2 6" strokeLinecap="round"
                      opacity={calloutSpring * 0.85}
                      markerEnd="url(#callout-arrowhead)"
                    />
                  </svg>
                );
              })()}
              {/* Floating callout overlay */}
              {callout && (
                <div style={{ position: 'absolute', bottom: '20px', right: '24px', width: `${CALLOUT_W}px`, height: `${CALLOUT_H}px`, overflow: 'hidden', padding: '20px 28px', background: 'rgba(6,8,16,0.92)', border: `1px solid ${glowColor}59`, borderLeft: `4px solid ${glowColor}`, borderRadius: '12px', backdropFilter: 'blur(16px)', opacity: calloutSpring, transform: `translateY(${interpolate(calloutSpring, [0, 1], [20, 0])}px)` }}>
                  <div style={{ fontSize: '18px', color: glowColor, fontFamily: 'JetBrains Mono, monospace', marginBottom: '8px', letterSpacing: '0.08em' }}>KEY INSIGHT</div>
                  <div style={{ fontSize: '22px', color: '#E6EDF3', lineHeight: 1.5 }}>{callout}</div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Split layout (default) — left text panel + right editor */
          <div style={{ position: 'absolute', inset: 0, display: 'flex', gap: '60px', padding: '60px 80px', alignItems: 'flex-start' }}>
            {/* Left: header + callout */}
            <div style={{ width: '520px', flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', opacity: headerSpring, transform: `translateX(${interpolate(headerSpring, [0, 1], [-40, 0])}px)` }}>
              <div className="scene-tag">Code Walkthrough</div>
              <h2 className="scene-title" style={{ fontSize: '60px' }}>{scene.title}</h2>
              <p className="scene-subtitle" style={{ marginTop: '20px' }}>{scene.subtitle}</p>
              {callout && (
                <div style={{ marginTop: '48px', padding: '28px 32px', background: 'rgba(0,217,255,0.06)', border: '1px solid rgba(0,217,255,0.25)', borderLeft: '4px solid #00D9FF', borderRadius: '12px', opacity: calloutSpring, transform: `translateY(${interpolate(calloutSpring, [0, 1], [20, 0])}px)` }}>
                  <div style={{ fontSize: '20px', color: '#00D9FF', fontFamily: 'JetBrains Mono, monospace', marginBottom: '8px', letterSpacing: '0.08em' }}>NOTE</div>
                  <div style={{ fontSize: '26px', color: '#8B949E', lineHeight: 1.5 }}>{callout}</div>
                </div>
              )}
              <div style={{ marginTop: '40px' }}>
                <div className={`badge badge--${language === 'python' ? 'green' : language === 'typescript' ? 'cyan' : 'amber'}`} style={{ fontSize: '24px' }}>{language.toUpperCase()}</div>
              </div>
            </div>
            {/* Right: code editor */}
            <div style={{ flex: 1, opacity: editorSpring, transform: `translateY(${interpolate(editorSpring, [0, 1], [40, 0])}px)`, display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div className="code-editor" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div className="code-editor__titlebar">
                  <div className="code-editor__dot code-editor__dot--red" />
                  <div className="code-editor__dot code-editor__dot--yellow" />
                  <div className="code-editor__dot code-editor__dot--green" />
                  <span className="code-editor__filename">{filename}</span>
                </div>
                <div className="code-editor__body" style={{ flex: 1, overflowY: 'hidden', position: 'relative' }}>
                  {(() => {
                    let charsRendered = 0;
                    const focusMode = highlighted.length > 0 && typingComplete;
                    return codeLines.map((line) => {
                      const isHighlighted = highlighted.includes(line.number);
                      const isCurrentlyActive = isHighlighted && highlighted.indexOf(line.number) === Math.min(activeHighlightIndex, highlighted.length - 1);
                      const showGlow = isCurrentlyActive && typingComplete;

                      const glowStyle: React.CSSProperties = showGlow ? {
                        backgroundColor: `${glowColor}1a`,
                        borderLeft: `4px solid ${glowColor}`,
                        boxShadow: `inset 4px 0 8px -4px ${glowColor}`,
                        paddingLeft: '12px',
                        opacity: 1,
                        transition: 'opacity 0.2s',
                      } : {
                        paddingLeft: '16px',
                        borderLeft: '4px solid transparent',
                        opacity: focusMode && !isHighlighted ? 0.25 : 1,
                        transition: 'opacity 0.2s',
                      };

                      const lineChars = line.tokens.reduce((s, t) => s + t.text.length, 0);
                      
                      if (charsRendered >= visibleChars) {
                        return null; 
                      }

                      const isActivelyTypingLine = charsRendered + lineChars >= visibleChars;
                      let currentLineChars = 0;
                      
                      const renderedTokens = line.tokens.map((t, ti) => {
                        if (charsRendered + currentLineChars >= visibleChars) return null;
                        
                        let textToShow = t.text;
                        if (charsRendered + currentLineChars + t.text.length > visibleChars) {
                           const sliceLen = visibleChars - (charsRendered + currentLineChars);
                           textToShow = t.text.slice(0, sliceLen);
                        }
                        currentLineChars += t.text.length;
                        return <span key={ti} className={`token-${t.type}`}>{textToShow}</span>;
                      });
                      
                      charsRendered += lineChars;

                      return (
                        <div key={line.number} className="code-line" style={glowStyle}>
                          <span className="code-line__number">{line.number}</span>
                          <span>{renderedTokens}</span>
                          {isActivelyTypingLine && !typingComplete && (
                            <span style={{ display: 'inline-block', width: '10px', height: '22px', background: glowColor, verticalAlign: 'middle', opacity: Math.floor(frame / 10) % 2 === 0 ? 1 : 0, marginLeft: '4px' }} />
                          )}
                        </div>
                      );
                    });
                  })()}
                  {codeOverflows && typingComplete && (
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60px', background: 'linear-gradient(transparent, #0D1117)', pointerEvents: 'none' }} />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      {/* SubtitlesOverlay + AudioMixer removed — will be re-added with real word timestamps */}

      <div className="progress-bar" style={{ width: `${interpolate(frame, [0, Math.ceil(durationSec * fps)], [0, 100])}%` }} />
    </AbsoluteFill>
  );
};
