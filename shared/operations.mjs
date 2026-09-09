// Bounded semantic operations over a worked example's corpus (server/models/Script.js's
// ScriptModel.examples[]). Illustrative — NOT a claim to reproduce Elasticsearch analyzer,
// scoring, or query-planner behavior. A closed catalog of 9 composable operations; not an
// unrestricted programming language. No eval, no dynamic Function(), no subprocess, no
// network call anywhere in this file — dispatch is a plain switch over 9 literal strings.
//
// Every operation returns a KINDED result — { kind, values, sourceDocId } — so the executor
// can reject a token array passed where a document-ID array belongs, not just check that
// both happen to be string arrays. References are always tagged objects, never bare
// strings, so "a corpus entry", "the whole corpus", and "a prior operation's output" can
// never be confused with one another.
//
// Bounds are enforced HERE, independent of server/services/storyboardValidation.js's own
// (looser) EXAMPLE_BOUNDS — calling executeOperations() directly, bypassing the normal
// save/validate path entirely, still cannot produce unbounded output.

export const OPERATION_TYPES = [
  'tokenize', 'normalize', 'groupTerms', 'appendPosting', 'lookup',
  'intersect', 'union', 'filter', 'project',
];

// Bump by hand if this catalog's semantics ever change, so a stored manifest can be matched
// against the exact operation semantics that computed it (server/services/renderManifest.js).
export const OPERATIONS_VERSION = 1;

export const OPERATION_BOUNDS = {
  maxCorpusSize: 20,
  maxTokensPerOperation: 200,
  maxPostingListSize: 50,
  maxTraceEntries: 100,
};

const RESULT_KINDS = ['tokens', 'terms', 'documentIds', 'projectedValues'];

function sortedUnique(values) {
  return [...new Set(values)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

// ─── Reference resolution ──────────────────────────────────────────────────────
// ref is always one of: {kind:'operation', id} | {kind:'corpus'} | {kind:'corpusEntry', id}
// A corpusEntry ref resolves to the raw corpus entry object ({id, fields}), NOT a kinded
// result — it's a lookup, not a prior computation. Everything else resolves to a kinded
// result, optionally checked against expectedKinds.
export function resolveRef(ref, ctx, expectedKinds) {
  if (!ref || typeof ref !== 'object' || Array.isArray(ref)) throw new Error('Reference must be an object with a kind');
  if (ref.kind === 'operation') {
    const result = ctx.results.get(ref.id);
    if (!result) throw new Error(`Unknown operation reference: "${ref.id}"`);
    if (expectedKinds && !expectedKinds.includes(result.kind)) {
      throw new Error(`Reference "${ref.id}" has kind "${result.kind}", expected ${expectedKinds.join(' or ')}`);
    }
    return result;
  }
  if (ref.kind === 'corpus') {
    return { kind: 'documentIds', values: sortedUnique(ctx.example.corpus.map(c => c.id)), sourceDocId: null };
  }
  if (ref.kind === 'corpusEntry') {
    const entry = ctx.corpusById.get(ref.id);
    if (!entry) throw new Error(`Unknown corpus entry: "${ref.id}"`);
    return entry;
  }
  throw new Error(`Unsupported reference kind: "${ref.kind}"`);
}

// ─── Operation functions ────────────────────────────────────────────────────────
// Tokenizer: split on Unicode letter/digit runs, case and duplicates PRESERVED here —
// normalize()/groupTerms() handle case-folding and dedup as separate, explicit steps.
export function tokenize(args, ctx) {
  const entry = resolveRef(args.source, ctx);
  const text = entry.fields?.[args.field];
  if (typeof text !== 'string') throw new Error(`tokenize: field "${args.field}" is not a string on corpus entry "${entry.id}"`);
  const raw = text.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  if (raw.length > OPERATION_BOUNDS.maxTokensPerOperation) throw new Error(`tokenize: exceeds ${OPERATION_BOUNDS.maxTokensPerOperation} tokens`);
  const values = raw.map((t, i) => ({ id: `${entry.id}:${i}`, text: t }));
  return { kind: 'tokens', values, sourceDocId: entry.id };
}

export function normalize(args, ctx) {
  const input = resolveRef(args.input, ctx, ['tokens']);
  return { kind: 'tokens', values: input.values.map(t => ({ id: t.id, text: t.text.toLowerCase() })), sourceDocId: input.sourceDocId };
}

// Deduplicated, sorted unique terms — this is what stops a repeated word in one document
// from producing a duplicate posting for that document.
export function groupTerms(args, ctx) {
  const input = resolveRef(args.input, ctx, ['tokens']);
  return { kind: 'terms', values: sortedUnique(input.values.map(t => t.text)), sourceDocId: input.sourceDocId };
}

// No separate docId argument — docId comes ONLY from the resolved terms' sourceDocId, so
// there is no field where a mismatched document ID could be written by mistake.
export function appendPosting(args, ctx) {
  const terms = resolveRef(args.terms, ctx, ['terms']);
  if (!terms.sourceDocId) throw new Error('appendPosting: terms must trace back to a single source document');
  const docId = terms.sourceDocId;
  if (!ctx.corpusById.has(docId)) throw new Error(`appendPosting: unknown document "${docId}"`);
  let store = ctx.postingsStores.get(args.postingsId);
  if (!store) { store = new Map(); ctx.postingsStores.set(args.postingsId, store); }
  for (const term of terms.values) {
    const list = store.get(term) || [];
    if (!list.includes(docId)) list.push(docId);
    if (list.length > OPERATION_BOUNDS.maxPostingListSize) throw new Error(`appendPosting: posting list for "${term}" exceeds ${OPERATION_BOUNDS.maxPostingListSize} documents`);
    store.set(term, sortedUnique(list)); // store stays sorted at all times — lookup never needs to sort
  }
  return { kind: 'documentIds', values: sortedUnique([docId]), sourceDocId: docId };
}

// Unknown store (no appendPosting ever created it) throws. Absent term in a KNOWN store
// returns [] — these are deliberately different failure modes.
export function lookup(args, ctx) {
  const store = ctx.postingsStores.get(args.postingsId);
  if (!store) throw new Error(`lookup: unknown postings store "${args.postingsId}"`);
  return { kind: 'documentIds', values: store.get(args.term) || [], sourceDocId: null };
}

export function intersect(args, ctx) {
  const left = resolveRef(args.left, ctx, ['documentIds']);
  const right = resolveRef(args.right, ctx, ['documentIds']);
  const rightSet = new Set(right.values);
  return { kind: 'documentIds', values: sortedUnique(left.values.filter(v => rightSet.has(v))), sourceDocId: null };
}

export function union(args, ctx) {
  const left = resolveRef(args.left, ctx, ['documentIds']);
  const right = resolveRef(args.right, ctx, ['documentIds']);
  return { kind: 'documentIds', values: sortedUnique([...left.values, ...right.values]), sourceDocId: null };
}

export function filter(args, ctx) {
  if (!['string', 'number', 'boolean'].includes(typeof args.equals)) throw new Error('filter: equals must be a string, number, or boolean');
  let candidateIds;
  if (args.input?.kind === 'corpus') candidateIds = ctx.example.corpus.map(c => c.id);
  else if (args.input?.kind === 'corpusEntry') { resolveRef(args.input, ctx); candidateIds = [args.input.id]; }
  else candidateIds = resolveRef(args.input, ctx, ['documentIds']).values;
  const matched = candidateIds.filter(id => {
    const entry = ctx.corpusById.get(id);
    if (!entry) throw new Error(`filter: unknown corpus entry "${id}"`);
    if (!entry.fields || !(args.field in entry.fields)) throw new Error(`filter: field "${args.field}" missing on "${id}"`);
    return entry.fields[args.field] === args.equals;
  });
  return { kind: 'documentIds', values: sortedUnique(matched), sourceDocId: null };
}

export function project(args, ctx) {
  const input = resolveRef(args.input, ctx, ['documentIds']);
  const values = input.values.map(id => {
    const entry = ctx.corpusById.get(id);
    if (!entry) throw new Error(`project: unknown corpus entry "${id}"`);
    if (args.field) {
      if (!entry.fields || !(args.field in entry.fields)) throw new Error(`project: field "${args.field}" missing on "${id}"`);
      return String(entry.fields[args.field]);
    }
    return entry.id;
  });
  return { kind: 'projectedValues', values, sourceDocId: null };
}

const OPERATIONS = {
  tokenize, normalize, groupTerms,
  appendPosting, lookup, intersect,
  union, filter, project,
};

/**
 * Build a standalone execution context for unit-testing an operation function directly,
 * independent of executeOperations()/the script schema. Shares postingsStores/results
 * across calls so a caller can chain a few operations by hand in a test.
 */
export function createContext(example) {
  return {
    example,
    corpusById: new Map((example.corpus || []).map(c => [c.id, c])),
    results: new Map(),
    postingsStores: new Map(),
  };
}

// ─── Executor ────────────────────────────────────────────────────────────────
// Map()s exist only inside the working context — never inside a trace entry, output, or
// finalResults. snapshotStore() is the deliberate Map -> plain-object serialization
// boundary. Every stored/traced value is structuredClone()'d at the moment it's produced,
// so a later operation mutating shared state (a postings store) can never retroactively
// change an earlier trace entry's snapshot.
function snapshotStore(store) {
  return structuredClone(Object.fromEntries(store));
}

// Best-effort snapshot of each ref-shaped arg's resolved value, for a readable "before" on
// operations that don't mutate shared state. Can't itself fail — the operation function
// already resolved (and validated) these same refs successfully by the time this runs.
function describeInputsForTrace(op, ctx) {
  const described = {};
  for (const [key, value] of Object.entries(op.args || {})) {
    if (value && typeof value === 'object' && !Array.isArray(value) && 'kind' in value) {
      try { described[key] = structuredClone(resolveRef(value, ctx)); } catch { /* unreachable: already validated */ }
    }
  }
  return described;
}

function computeAffectedIds(output) {
  if (output.sourceDocId) return [output.sourceDocId];
  if (output.kind === 'documentIds' || output.kind === 'projectedValues') return [...output.values];
  return [];
}

/**
 * Run example.operations[] in order, dispatching each to its typed function, and return
 * a real, immutable, JSON-serializable trace. Throws on any unsupported type, invalid
 * reference, or bound violation — never silently produces a wrong-shaped result.
 */
export function executeOperations(example) {
  if (!example.corpus || example.corpus.length > OPERATION_BOUNDS.maxCorpusSize) {
    throw new Error(`executeOperations: corpus exceeds ${OPERATION_BOUNDS.maxCorpusSize} entries`);
  }
  if (!example.operations || example.operations.length > OPERATION_BOUNDS.maxTraceEntries) {
    throw new Error(`executeOperations: operations exceed ${OPERATION_BOUNDS.maxTraceEntries} entries`);
  }

  const corpusById = new Map(example.corpus.map(c => [c.id, c]));
  const results = new Map();
  const postingsStores = new Map();
  const ctx = { example, corpusById, results, postingsStores };
  const trace = [];

  for (const op of example.operations) {
    const fn = OPERATIONS[op.type];
    if (!fn) throw new Error(`Unsupported operation type: "${op.type}"`);

    const isAppendPosting = op.type === 'appendPosting';
    const storeBefore = isAppendPosting ? snapshotStore(ctx.postingsStores.get(op.args.postingsId) || new Map()) : null;
    const before = isAppendPosting ? { postings: storeBefore } : describeInputsForTrace(op, ctx);

    let output;
    try { output = fn(op.args, ctx); }
    catch (err) { throw new Error(`Operation "${op.id}" (${op.type}) failed: ${err.message}`); }
    if (!RESULT_KINDS.includes(output.kind)) throw new Error(`Operation "${op.id}" (${op.type}) produced an unrecognized result kind: "${output.kind}"`);

    const cloned = structuredClone(output);
    results.set(op.id, cloned);

    const after = isAppendPosting
      ? { postings: snapshotStore(ctx.postingsStores.get(op.args.postingsId)) }
      : { result: structuredClone(output.values) };

    trace.push({
      operationId: op.id, type: op.type, label: op.label,
      inputs: structuredClone(op.args), output: cloned,
      before, after,
      affectedIds: computeAffectedIds(cloned),
    });
  }

  return {
    assumptions: example.assumptions,
    trace,
    finalResults: Object.fromEntries(results),
  };
}
