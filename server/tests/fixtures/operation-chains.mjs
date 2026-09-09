// Real, executable operation chains — distinct from acceptance-examples.mjs (hand-computed
// expected values, never executed). Running these through shared/operations.mjs's
// executeOperations() must reproduce acceptance-examples.mjs's values exactly.

export const invertedIndexOperationChain = {
  id: 'inverted-index-chain',
  scenario: 'Inverted index over a 3-document corpus',
  assumptions: 'Illustrative bounded model of tokenizing + posting lists + set intersection/union — not a claim to reproduce Elasticsearch analyzer or scoring behavior.',
  corpus: [
    { id: 'D1', fields: { text: 'Docker basics' } },
    { id: 'D2', fields: { text: 'Deployment guide' } },
    { id: 'D3', fields: { text: 'Docker deployment' } },
  ],
  evidence: [], inputData: {}, query: {},
  operations: [
    // D1: "Docker basics" -> docker, basics
    { id: 'd1-tok',   label: 'Tokenize D1',      type: 'tokenize',      args: { source: { kind: 'corpusEntry', id: 'D1' }, field: 'text' } },
    { id: 'd1-norm',  label: 'Normalize D1',     type: 'normalize',     args: { input: { kind: 'operation', id: 'd1-tok' } } },
    { id: 'd1-terms', label: 'Group D1 terms',   type: 'groupTerms',    args: { input: { kind: 'operation', id: 'd1-norm' } } },
    { id: 'd1-post',  label: 'Post D1 terms',    type: 'appendPosting', args: { terms: { kind: 'operation', id: 'd1-terms' }, postingsId: 'main' } },
    // D2: "Deployment guide" -> deployment, guide
    { id: 'd2-tok',   label: 'Tokenize D2',      type: 'tokenize',      args: { source: { kind: 'corpusEntry', id: 'D2' }, field: 'text' } },
    { id: 'd2-norm',  label: 'Normalize D2',     type: 'normalize',     args: { input: { kind: 'operation', id: 'd2-tok' } } },
    { id: 'd2-terms', label: 'Group D2 terms',   type: 'groupTerms',    args: { input: { kind: 'operation', id: 'd2-norm' } } },
    { id: 'd2-post',  label: 'Post D2 terms',    type: 'appendPosting', args: { terms: { kind: 'operation', id: 'd2-terms' }, postingsId: 'main' } },
    // D3: "Docker deployment" -> docker, deployment
    { id: 'd3-tok',   label: 'Tokenize D3',      type: 'tokenize',      args: { source: { kind: 'corpusEntry', id: 'D3' }, field: 'text' } },
    { id: 'd3-norm',  label: 'Normalize D3',     type: 'normalize',     args: { input: { kind: 'operation', id: 'd3-tok' } } },
    { id: 'd3-terms', label: 'Group D3 terms',   type: 'groupTerms',    args: { input: { kind: 'operation', id: 'd3-norm' } } },
    { id: 'd3-post',  label: 'Post D3 terms',    type: 'appendPosting', args: { terms: { kind: 'operation', id: 'd3-terms' }, postingsId: 'main' } },
    // Resolve each term to its posting list BEFORE combining them — the missing step the
    // first draft's flow skipped.
    { id: 'lookup-docker',     label: 'Lookup docker',     type: 'lookup', args: { postingsId: 'main', term: 'docker' } },
    { id: 'lookup-deployment', label: 'Lookup deployment', type: 'lookup', args: { postingsId: 'main', term: 'deployment' } },
    // AND / OR query for "docker deployment"
    { id: 'and-query', label: 'AND query: intersect docker and deployment', type: 'intersect', args: { left: { kind: 'operation', id: 'lookup-docker' }, right: { kind: 'operation', id: 'lookup-deployment' } } },
    { id: 'or-query',  label: 'OR query: union docker and deployment',      type: 'union',     args: { left: { kind: 'operation', id: 'lookup-docker' }, right: { kind: 'operation', id: 'lookup-deployment' } } },
  ],
};

// Uses ONLY filter/union/project — never tokenize/normalize/groupTerms/appendPosting/lookup/
// intersect. The concrete, checkable proof that those operations aren't Elasticsearch-specific.
export const tableFilterOperationChain = {
  id: 'table-filter-chain',
  scenario: 'Filter a small order list by status',
  assumptions: 'Illustrative bounded filter model of scanning rows against one equality condition — not a query planner or general expression evaluator.',
  corpus: [
    { id: 'O1', fields: { customer: 'Alice', status: 'shipped' } },
    { id: 'O2', fields: { customer: 'Bob',   status: 'pending' } },
    { id: 'O3', fields: { customer: 'Cara',  status: 'shipped' } },
  ],
  evidence: [], inputData: {}, query: {},
  operations: [
    // One row at a time, chained through union to accumulate — filter itself has no
    // special accumulation behavior of its own.
    { id: 'check-o1', label: 'Check O1: status = shipped',  type: 'filter', args: { input: { kind: 'corpusEntry', id: 'O1' }, field: 'status', equals: 'shipped' } },
    { id: 'check-o2', label: 'Check O2: status = shipped',  type: 'filter', args: { input: { kind: 'corpusEntry', id: 'O2' }, field: 'status', equals: 'shipped' } },
    { id: 'acc-1',    label: 'Accumulate after O2',         type: 'union',  args: { left: { kind: 'operation', id: 'check-o1' }, right: { kind: 'operation', id: 'check-o2' } } },
    { id: 'check-o3', label: 'Check O3: status = shipped',  type: 'filter', args: { input: { kind: 'corpusEntry', id: 'O3' }, field: 'status', equals: 'shipped' } },
    { id: 'acc-2',    label: 'Accumulate after O3',         type: 'union',  args: { left: { kind: 'operation', id: 'acc-1' }, right: { kind: 'operation', id: 'check-o3' } } },
    { id: 'result',   label: 'Project matching order IDs',  type: 'project', args: { input: { kind: 'operation', id: 'acc-2' } } },
  ],
};
