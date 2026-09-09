// Curated, hand-authored knowledge registry — Teaching Quality Phase 6.
// Every entry is manually reviewed; nothing here is model-generated or fetched at
// generation time. Sources are approved by editing this file directly.
//
// The four KNOWLEDGE_SOURCES entries are a direct transcription of the four factual
// issues job-39.observations.md identified in a real generated video
// (server/tests/fixtures/baseline/job-39.observations.md) — not new issues invented
// to fill a quota. They exist so `evidence[].sourceId` (schema v3) can reference
// something real and checkable instead of an arbitrary free-text string.

export const KNOWLEDGE_SOURCES = [
  {
    id: 'elasticsearch-standard-analyzer',
    capability: 'text-analysis',
    topics: ['elasticsearch', 'inverted-index', 'full-text-search', 'analyzer', 'tokenization', 'stemming'],
    product: 'Elasticsearch',
    versionScope: 'default `standard` analyzer, all current versions',
    url: 'https://www.elastic.co/docs/reference/text-analysis/analysis-standard-analyzer',
    reviewedAt: '2026-09-09',
    claimSummary: 'The default `standard` analyzer lowercases and tokenizes text on word boundaries; it does not stem words.',
    limitations: 'Stemming (e.g. "deployments" -> "deploy") only happens with an explicitly configured analyzer (e.g. `snowball`, `porter_stem`) — never assume stemming is the default behavior.',
  },
  {
    id: 'elasticsearch-match-query-operator',
    capability: 'query-semantics',
    topics: ['elasticsearch', 'query-dsl', 'match-query', 'full-text-search', 'boolean-query'],
    product: 'Elasticsearch',
    versionScope: 'match query, all current versions',
    url: 'https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-match-query',
    reviewedAt: '2026-09-09',
    claimSummary: 'The `match` query\'s default operator between terms is OR, not AND.',
    limitations: 'Describing a multi-word match query as "finding documents present in both lists" (an implicit AND/intersection) misstates the default; AND/intersection requires explicitly setting `operator: "and"` or using a `bool`/`must` query.',
  },
  {
    id: 'postgresql-full-text-search-indexes',
    capability: 'comparative-context',
    topics: ['postgresql', 'relational-database', 'full-text-search', 'inverted-index', 'sql'],
    product: 'PostgreSQL',
    versionScope: 'GIN-indexed tsvector full text search, all current versions',
    url: 'https://www.postgresql.org/docs/current/textsearch-indexes.html',
    reviewedAt: '2026-09-09',
    claimSummary: 'PostgreSQL supports GIN-indexed full text search via `tsvector`, which is itself inverted-index-like, inside a relational database.',
    limitations: 'Framing relational databases as limited to full table scans versus dedicated search engines overstates the difference — qualify comparisons involving relational databases and full-text search rather than presenting a strict binary.',
  },
  {
    id: 'illustrative-complexity-claims',
    capability: 'complexity-claims',
    topics: ['elasticsearch', 'inverted-index', 'algorithmic-complexity', 'data-structures'],
    product: null,
    versionScope: null,
    url: null,
    reviewedAt: '2026-09-09',
    claimSummary: 'None of shared/operations.mjs\'s bounded operations (tokenize, normalize, groupTerms, appendPosting, lookup, intersect, union, filter, project) define or measure real-world algorithmic complexity.',
    limitations: 'Any on-screen or narrated complexity/latency claim (e.g. "O(1) dictionary lookup") must not be asserted without a defined operation and input-size model — none of these bounded operations provide one, so such claims are unsupported on their own terms, not backed by a specific external source.',
  },
];

// Real, captured comparisons against an actual system or its own published, versioned
// documentation — never assumed or fabricated. Starts empty: no live Elasticsearch or
// PostgreSQL instance has been captured against yet in this project. Populating this with
// something that only looks like a captured result, without a genuine transcribed
// capture, would be exactly the kind of overclaiming this registry exists to prevent.
export const VERIFIED_FIXTURES = [];

export function findKnowledgeSource(sourceId) {
  return KNOWLEDGE_SOURCES.find(s => s.id === sourceId);
}

export function isVerifiedFixture(sourceId) {
  return VERIFIED_FIXTURES.some(f => f.sourceId === sourceId);
}

export function knowledgeSourcesForTopic(topic) {
  const needle = (topic || '').toLowerCase();
  return KNOWLEDGE_SOURCES.filter(s => s.topics.some(t => needle.includes(t)));
}
