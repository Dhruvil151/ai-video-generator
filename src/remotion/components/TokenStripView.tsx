// @ts-nocheck
// Renders tokenize/normalize/groupTerms — three sub-cases of "tokens transforming",
// a real shared shape (chips revealing/morphing/collapsing), not an arbitrary merge.
// Deterministic: every reveal/highlight state is a pure function of `progress` (0..1),
// no CSS transitions. Chips are keyed by real token/term id so identity stays stable
// frame to frame.
import React from 'react';

const chip = (bg, border, extra = {}) => ({
  display: 'inline-flex', alignItems: 'center', padding: '10px 20px', margin: '0 10px 10px 0',
  borderRadius: 8, fontFamily: 'JetBrains Mono, monospace', fontSize: 24,
  background: bg, border: `2px solid ${border}`, color: '#17272b', ...extra,
});

export const TokenStripView = ({ entry, progress, primary }) => {
  if (entry.type === 'tokenize') {
    const tokens = entry.output.values; // {id,text}[]
    // No artificial early-reveal bias: genuinely empty at progress=0, matching
    // ExampleMechanism's active=-1 "nothing active yet" state before this entry starts.
    const visibleCount = Math.ceil(tokens.length * Math.max(0, Math.min(1, progress)));
    return (
      <div data-review-entity style={{ padding: '20px 0' }}>
        <div style={{ fontSize: 22, color: '#42636a', marginBottom: 16 }}>Tokenizing document text</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', maxWidth: 1380 }}>
          {tokens.map((t, i) => (
            <span key={t.id} style={chip(i < visibleCount ? '#eef7f5' : '#f1f1f1', i < visibleCount ? primary : '#c8ced0', { opacity: i < visibleCount ? 1 : 0.3 })}>
              {t.text}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (entry.type === 'normalize') {
    const before = entry.before?.input?.values || [];
    const after = entry.output.values; // {id,text}[]
    const showNew = progress > 0.5;
    return (
      <div data-review-entity style={{ padding: '20px 0' }}>
        <div style={{ fontSize: 22, color: '#42636a', marginBottom: 16 }}>Normalizing case</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', maxWidth: 1380 }}>
          {after.map((t, i) => (
            <span key={t.id} style={chip(showNew ? '#eef7f5' : '#fff8ea', showNew ? primary : '#e0b34d')}>
              {showNew ? t.text : (before[i]?.text ?? t.text)}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // groupTerms — deduplicated, sorted unique terms (string[])
  const terms = entry.output.values;
  const revealCount = Math.ceil(terms.length * Math.max(0, Math.min(1, progress)));
  return (
    <div data-review-entity style={{ padding: '20px 0' }}>
      <div style={{ fontSize: 22, color: '#42636a', marginBottom: 16 }}>Grouping into unique terms</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', maxWidth: 1380 }}>
        {terms.map((term, i) => (
          <span key={term} style={chip(i < revealCount ? '#eef7f5' : '#f1f1f1', i < revealCount ? primary : '#c8ced0', { opacity: i < revealCount ? 1 : 0.3, fontWeight: 600 })}>
            {term}
          </span>
        ))}
      </div>
    </div>
  );
};
