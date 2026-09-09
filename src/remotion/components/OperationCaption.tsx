// @ts-nocheck
// "Focused code/output view" — the active operation's label plus a compact, code-styled
// rendering of its actual condition/args, e.g. `status === "shipped"` for a filter,
// `lookup-docker ∩ lookup-deployment` for an intersect — literally what this operation
// is doing, not just its narrative label.
import React from 'react';

function describeArgs(entry) {
  const { type, inputs } = entry;
  switch (type) {
    case 'tokenize':      return `tokenize(${inputs.source?.id}.${inputs.field})`;
    case 'normalize':     return `normalize(${inputs.input?.id})`;
    case 'groupTerms':    return `groupTerms(${inputs.input?.id})`;
    case 'appendPosting': return `appendPosting(${inputs.terms?.id} → "${inputs.postingsId}")`;
    case 'lookup':        return `lookup("${inputs.postingsId}", "${inputs.term}")`;
    case 'intersect':     return `${inputs.left?.id} ∩ ${inputs.right?.id}`;
    case 'union':         return `${inputs.left?.id} ∪ ${inputs.right?.id}`;
    case 'filter':        return `filter(${inputs.field} === ${JSON.stringify(inputs.equals)})`;
    case 'project':       return `project(${inputs.input?.id}${inputs.field ? ', ' + inputs.field : ''})`;
    default:               return type;
  }
}

export const OperationCaption = ({ entry }) => (
  <div data-review-entity style={{
    display: 'inline-block', padding: '8px 18px', borderRadius: 8,
    background: '#0D1117', color: '#9fe6cf', fontFamily: 'JetBrains Mono, monospace', fontSize: 20,
    marginBottom: 12,
  }}>
    {describeArgs(entry)}
  </div>
);
