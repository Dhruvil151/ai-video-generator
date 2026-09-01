import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import React, { useMemo } from 'react';
import { BackgroundGradients } from './BackgroundGradients';
// SubtitlesOverlay removed — word-level sync unavailable from edge-tts 7.x (no WordBoundary events)
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
}

// ── Minimal syntax tokenizer ─────────────────────────────────────────────────
function tokenize(line: string, language: string): Array<{ type: string; text: string }> {
  const tokens: Array<{ type: string; text: string }> = [];

  // Very lightweight tokenizer — covers JS/TS/Python patterns
  const rules: Array<[string, RegExp]> = [
    ['comment',    language === 'python' ? /#.*/ : /\/\/.*|\/\*[\s\S]*?\*\//],
    ['string',     /(['"`])(?:(?!\1)[^\\]|\\.)*\1/],
    ['keyword',    language === 'python'
      ? /\b(def|class|import|from|return|if|elif|else|for|while|in|with|as|try|except|finally|pass|and|or|not|is|None|True|False|async|await|lambda|yield)\b/
      : /\b(const|let|var|function|class|return|if|else|for|while|import|export|default|async|await|new|try|catch|throw|typeof|instanceof|from|of|in|extends|this|super|null|undefined|true|false|void|delete)\b/],
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
      if (m && m.index === 0) {
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
export const CodeEditorScene: React.FC<CodeEditorSceneProps> = ({ scene, bgMusicUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationSec = scene.actualDurationSec || scene.estimatedDurationSec || 10;

  const code         = scene.payload?.code     || '// No code provided';
  const language     = scene.payload?.language || 'javascript';
  const filename     = scene.payload?.filename || 'index.js';
  const highlighted  = scene.payload?.highlightLines || [];
  const callout      = scene.payload?.callout  || '';
  const layout       = scene.payload?.layout   || 'split';

  const codeLines = useMemo(() => parseCode(code, language), [code, language]);

  // Subtitles removed — will be re-enabled when real word timestamps are available

  // Entrance animations
  const headerSpring  = spring({ frame, fps, config: { damping: 24, stiffness: 120 }, delay: 0 });
  const editorSpring  = spring({ frame, fps, config: { damping: 20, stiffness: 90 }, delay: 8 });
  const calloutSpring = spring({ frame, fps, config: { damping: 18, stiffness: 80 }, delay: 14 });

  // Reveal lines one-by-one: each line appears at 3 frames apart
  const visibleLines = Math.min(
    codeLines.length,
    Math.max(1, Math.floor((frame - 10) / 3))
  );

  return (
    <AbsoluteFill className="scene">
      <BackgroundGradients variant="code" />

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
            {/* Full-width editor */}
            <div style={{ flex: 1, opacity: editorSpring, transform: `translateY(${interpolate(editorSpring, [0, 1], [30, 0])}px)`, position: 'relative' }}>
              <div className="code-editor" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div className="code-editor__titlebar">
                  <div className="code-editor__dot code-editor__dot--red" />
                  <div className="code-editor__dot code-editor__dot--yellow" />
                  <div className="code-editor__dot code-editor__dot--green" />
                  <span className="code-editor__filename">{filename}</span>
                </div>
                <div className="code-editor__body" style={{ flex: 1, overflowY: 'hidden' }}>
                  {codeLines.slice(0, visibleLines).map((line, lineIdx) => {
                    const isHighlighted = highlighted.includes(line.number);
                    return (
                      <div key={line.number} className={`code-line${isHighlighted ? ' code-line--highlighted' : ''}`} style={{ opacity: interpolate(frame, [10 + lineIdx * 2, 10 + lineIdx * 2 + 4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
                        <span className="code-line__number">{line.number}</span>
                        <span>{line.tokens.map((t, ti) => <span key={ti} className={`token-${t.type}`}>{t.text}</span>)}</span>
                      </div>
                    );
                  })}
                  {visibleLines < codeLines.length && (
                    <div className="code-line" style={{ opacity: Math.floor(frame / 15) % 2 === 0 ? 1 : 0 }}>
                      <span className="code-line__number">{visibleLines + 1}</span>
                      <span style={{ display: 'inline-block', width: '14px', height: '28px', background: '#00D9FF', verticalAlign: 'middle' }} />
                    </div>
                  )}
                </div>
              </div>
              {/* Floating callout overlay */}
              {callout && (
                <div style={{ position: 'absolute', bottom: '20px', right: '24px', maxWidth: '480px', padding: '20px 28px', background: 'rgba(6,8,16,0.92)', border: '1px solid rgba(0,217,255,0.35)', borderLeft: '4px solid #00D9FF', borderRadius: '12px', backdropFilter: 'blur(16px)', opacity: calloutSpring, transform: `translateY(${interpolate(calloutSpring, [0, 1], [20, 0])}px)` }}>
                  <div style={{ fontSize: '18px', color: '#00D9FF', fontFamily: 'JetBrains Mono, monospace', marginBottom: '8px', letterSpacing: '0.08em' }}>💡 KEY INSIGHT</div>
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
                  <div style={{ fontSize: '20px', color: '#00D9FF', fontFamily: 'JetBrains Mono, monospace', marginBottom: '8px', letterSpacing: '0.08em' }}>💡 NOTE</div>
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
                <div className="code-editor__body" style={{ flex: 1, overflowY: 'hidden' }}>
                  {codeLines.slice(0, visibleLines).map((line, lineIdx) => {
                    const isHighlighted = highlighted.includes(line.number);
                    return (
                      <div key={line.number} className={`code-line${isHighlighted ? ' code-line--highlighted' : ''}`} style={{ opacity: interpolate(frame, [10 + lineIdx * 3, 10 + lineIdx * 3 + 4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
                        <span className="code-line__number">{line.number}</span>
                        <span>{line.tokens.map((t, ti) => <span key={ti} className={`token-${t.type}`}>{t.text}</span>)}</span>
                      </div>
                    );
                  })}
                  {visibleLines < codeLines.length && (
                    <div className="code-line" style={{ opacity: Math.floor(frame / 15) % 2 === 0 ? 1 : 0 }}>
                      <span className="code-line__number">{visibleLines + 1}</span>
                      <span style={{ display: 'inline-block', width: '14px', height: '28px', background: '#00D9FF', verticalAlign: 'middle' }} />
                    </div>
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
