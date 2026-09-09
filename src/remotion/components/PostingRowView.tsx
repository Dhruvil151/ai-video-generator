// @ts-nocheck
// Renders appendPosting/lookup — term -> [docId chips] rows. appendPosting highlights
// only the doc ID actually added by THIS operation, on terms it actually changed
// (before/after snapshot lengths differ) — every other term/doc stays visible but dim,
// for surrounding context. lookup shows one resolved list, or an explicit empty state
// (a term that was never posted returns [] — this is a legitimate result, not an error).
import React from 'react';

const chip = (bg, border) => ({
  display: 'inline-flex', padding: '6px 16px', margin: '0 8px 8px 0', borderRadius: 6,
  fontFamily: 'JetBrains Mono, monospace', fontSize: 20, background: bg, border: `2px solid ${border}`, color: '#17272b',
});

export const PostingRowView = ({ entry, progress, primary }) => {
  if (entry.type === 'appendPosting') {
    const store = progress > 0.5 ? entry.after.postings : entry.before.postings;
    const terms = Object.keys(store).sort();
    const newDocId = entry.output.sourceDocId;
    const changedTerms = new Set(terms.filter(t => (entry.after.postings[t] || []).length > (entry.before.postings[t] || []).length));

    return (
      <div data-review-entity style={{ padding: '20px 0', maxWidth: 1380 }}>
        <div style={{ fontSize: 22, color: '#42636a', marginBottom: 16 }}>Posting list (term {'→'} documents)</div>
        {terms.length === 0 && <div style={{ color: '#8a9aa0', fontStyle: 'italic' }}>(empty — no terms posted yet)</div>}
        {terms.map(term => (
          <div key={term} style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ width: 180, fontFamily: 'JetBrains Mono, monospace', fontSize: 24, fontWeight: 700, color: '#17272b' }}>{term}</span>
            <span style={{ marginRight: 12, color: '#8a9aa0' }}>{'→'}</span>
            <div>
              {(store[term] || []).map(id => {
                const isNew = progress > 0.5 && changedTerms.has(term) && id === newDocId;
                return <span key={id} style={chip(isNew ? '#eef7f5' : '#f7f8f8', isNew ? primary : '#c8ced0')}>{id}</span>;
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // lookup — unknown store throws upstream (never reaches here); absent term returns [].
  const values = entry.output.values;
  return (
    <div data-review-entity style={{ padding: '20px 0', maxWidth: 1380 }}>
      <div style={{ fontSize: 22, color: '#42636a', marginBottom: 16 }}>Lookup: "{entry.inputs.term}"</div>
      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        {values.length === 0
          ? <span style={{ color: '#8a9aa0', fontStyle: 'italic' }}>(no documents — empty match)</span>
          : values.map(id => <span key={id} style={chip('#eef7f5', primary)}>{id}</span>)}
      </div>
    </div>
  );
};
