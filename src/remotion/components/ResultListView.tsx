// @ts-nocheck
// Renders filter/project — filter shows every candidate row checked against the
// condition (matched/unmatched, not just the winners, for surrounding context);
// project shows the final projected values as a settled result strip.
import React from 'react';

export const ResultListView = ({ entry, example, progress, primary }) => {
  if (entry.type === 'filter') {
    // entry.before.input is the resolved candidate pool when args.input was {kind:'operation'}
    // or {kind:'corpus'} (both resolve to a {values:[...]} result); {kind:'corpusEntry'} resolves
    // to the raw corpus entry instead (no .values), so fall back to the single referenced ID.
    const candidateIds = entry.before.input?.values
      || (entry.inputs.input?.kind === 'corpusEntry' ? [entry.inputs.input.id] : []);
    const matched = new Set(entry.output.values);
    const showResult = progress > 0.4;

    return (
      <div data-review-entity style={{ padding: '20px 0', maxWidth: 1380 }}>
        <div style={{ fontSize: 22, color: '#42636a', marginBottom: 16 }}>
          Filter: {entry.inputs.field} = "{String(entry.inputs.equals)}"
        </div>
        {candidateIds.map(id => {
          const row = example.corpus.find(c => c.id === id);
          const isMatch = matched.has(id);
          return (
            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10, opacity: showResult ? 1 : 0.5 }}>
              <span style={{ width: 28, fontSize: 24, color: showResult ? (isMatch ? '#25856a' : '#c0554f') : '#c8ced0' }}>
                {showResult ? (isMatch ? '✓' : '✗') : '·'}
              </span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 22, fontWeight: 700 }}>{id}</span>
              <span style={{ fontSize: 20, color: '#8a9aa0' }}>{JSON.stringify(row?.fields || {})}</span>
            </div>
          );
        })}
      </div>
    );
  }

  // project
  const values = entry.output.values;
  return (
    <div data-review-entity style={{ padding: '20px 0', maxWidth: 1380 }}>
      <div style={{ fontSize: 22, color: '#42636a', marginBottom: 16 }}>Project result{entry.inputs.field ? ` (${entry.inputs.field})` : ''}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        {values.length === 0
          ? <span style={{ color: '#8a9aa0', fontStyle: 'italic' }}>(empty result)</span>
          : values.map((v, i) => (
            <span key={`${v}:${i}`} style={{
              display: 'inline-flex', padding: '10px 20px', margin: '0 10px 10px 0',
              borderRadius: 8, fontFamily: 'JetBrains Mono, monospace', fontSize: 24,
              background: '#e3f3ee', border: `2px solid ${primary}`, color: '#17272b',
            }}>{v}</span>
          ))}
      </div>
    </div>
  );
};
