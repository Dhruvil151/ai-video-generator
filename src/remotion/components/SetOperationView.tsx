// @ts-nocheck
// Renders intersect/union — the visual distinction between AND and OR this whole plan
// exists to finally show. Two source lists, a result list. intersect highlights only
// chips present in both sources; union highlights all and merges duplicates into one
// result chip. Deterministic reveal via `progress`, not a CSS transition.
import React from 'react';

const chip = (bg, border) => ({
  display: 'inline-flex', padding: '8px 18px', margin: '0 8px 8px 0', borderRadius: 6,
  fontFamily: 'JetBrains Mono, monospace', fontSize: 22, background: bg, border: `2px solid ${border}`, color: '#17272b',
});

export const SetOperationView = ({ entry, progress, primary }) => {
  const left = entry.before.left?.values || [];
  const right = entry.before.right?.values || [];
  const result = entry.output.values;
  const isIntersect = entry.type === 'intersect';
  const showResult = progress > 0.5;
  const resultSet = new Set(result);

  return (
    <div data-review-entity style={{ padding: '20px 0', maxWidth: 1380 }}>
      <div style={{ fontSize: 22, color: '#42636a', marginBottom: 16 }}>
        {isIntersect ? 'AND — intersect the two lists' : 'OR — union the two lists'}
      </div>
      <div style={{ display: 'flex', gap: 48, marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 18, color: '#8a9aa0', marginBottom: 8 }}>Left</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', maxWidth: 600 }}>
            {left.map(id => <span key={id} style={chip(resultSet.has(id) && showResult ? '#eef7f5' : '#f7f8f8', resultSet.has(id) && showResult ? primary : '#c8ced0')}>{id}</span>)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 18, color: '#8a9aa0', marginBottom: 8 }}>Right</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', maxWidth: 600 }}>
            {right.map(id => <span key={id} style={chip(resultSet.has(id) && showResult ? '#eef7f5' : '#f7f8f8', resultSet.has(id) && showResult ? primary : '#c8ced0')}>{id}</span>)}
          </div>
        </div>
      </div>
      <div style={{ borderTop: '2px solid #d7dee0', paddingTop: 20 }}>
        <div style={{ fontSize: 18, color: '#8a9aa0', marginBottom: 8 }}>Result</div>
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          {!showResult
            ? <span style={{ color: '#c8ced0' }}>{'…'}</span>
            : result.length === 0
              ? <span style={{ color: '#8a9aa0', fontStyle: 'italic' }}>(empty — no overlap)</span>
              : result.map(id => <span key={id} style={chip('#e3f3ee', '#25856a')}>{id}</span>)}
        </div>
      </div>
    </div>
  );
};
