// @ts-nocheck
// "Show enough surrounding state to explain where data came from" — grounds a token/
// posting operation in its actual source document, not just an abstract label. Only
// rendered when the active trace entry's output.sourceDocId is set (tokenize/normalize/
// groupTerms/appendPosting) — naturally absent for cross-document operations
// (lookup/intersect/union/filter/project), where there is no single source document.
import React from 'react';

export const DocumentPanel = ({ example, docId, primary }) => {
  if (!docId) return null;
  const doc = example.corpus.find(c => c.id === docId);
  if (!doc) return null;
  const text = doc.fields?.text ?? String(Object.values(doc.fields || {})[0] ?? '');

  return (
    <div data-review-entity style={{
      position: 'absolute', right: 64, top: 200, width: 420, padding: '24px 28px',
      background: '#ffffff', border: '1px solid #d7dee0', borderRadius: 10,
      boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
    }}>
      <div style={{ fontSize: 18, color: '#8a9aa0', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Source document</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: primary, marginBottom: 10 }}>{doc.id}</div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 22, color: '#17272b', lineHeight: 1.5, overflowWrap: 'anywhere' }}>
        {String(text).slice(0, 240)}
      </div>
    </div>
  );
};
