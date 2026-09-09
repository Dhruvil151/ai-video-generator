// Phase 4 rendering acceptance fixture — schemaVersion:3 script whose MechanismScene
// visuals slice Phase 3's real executable chains (server/tests/fixtures/operation-chains.mjs)
// across several operationRanges: a continuity-grouped sequence covering the full
// inverted-index chain contiguously, a standalone 'inspect' recap, and a second example
// (table-filter) rendered independently — proving example-driven rendering isn't
// Elasticsearch-specific either. Consumed by scripts/render-fixture.mjs.
import { invertedIndexOperationChain, tableFilterOperationChain } from './operation-chains.mjs';

const mv = (overrides) => ({ type: 'MechanismScene', durationFraction: 1, payload: {}, ...overrides });

export const exampleRenderingFixture = {
  schemaVersion: 3,
  topic: 'example-rendering',
  mode: 'short',
  brief: { audience: 'Developers', learningOutcome: 'See a real inverted index built from real documents', scenario: 'Inverted index + table filter' },
  examples: [invertedIndexOperationChain, tableFilterOperationChain],
  sections: [
    {
      id: 's1-d1', narration: 'Tokenize and post Docker basics.', actualDurationSec: 14,
      visuals: [mv({ id: 'v1', title: 'Indexing D1', continuityId: 'idx-seq', exampleId: invertedIndexOperationChain.id, operationRange: { from: 0, to: 3 },
        // Phase 5: anchored beats (no real subtitle data in this fixture, so these fall back
        // to proportional positions with beat-proportional diagnostics — exercising the
        // "compiled beats present" path in ExampleMechanism regardless of match success).
        beats: [
          { step: 0, narrationAnchor: 'Tokenize' },
          { step: 1, narrationAnchor: 'and post' },
          { step: 2, narrationAnchor: 'Docker' },
          { step: 3, narrationAnchor: 'basics' },
        ] })],
    },
    {
      id: 's2-d2', narration: 'Tokenize and post the deployment guide.', actualDurationSec: 14,
      visuals: [mv({ id: 'v2', title: 'Indexing D2', continuityId: 'idx-seq', exampleId: invertedIndexOperationChain.id, operationRange: { from: 4, to: 7 } })],
    },
    {
      id: 's3-d3', narration: 'Tokenize and post Docker deployment.', actualDurationSec: 14,
      visuals: [mv({ id: 'v3', title: 'Indexing D3', continuityId: 'idx-seq', exampleId: invertedIndexOperationChain.id, operationRange: { from: 8, to: 11 } })],
    },
    {
      id: 's4-query', narration: 'Look up both terms, then intersect and union them.', actualDurationSec: 16,
      visuals: [
        mv({ id: 'v4', title: 'Resolving postings', durationFraction: 0.4, continuityId: 'idx-seq', exampleId: invertedIndexOperationChain.id, operationRange: { from: 12, to: 13 } }),
        mv({ id: 'v5', title: 'AND / OR query', durationFraction: 0.6, continuityId: 'idx-seq', exampleId: invertedIndexOperationChain.id, operationRange: { from: 14, to: 15 } }),
      ],
    },
    {
      id: 's5-recap', narration: 'Recapping the OR query result.', actualDurationSec: 8,
      visuals: [mv({ id: 'v6', title: 'Recap: OR result', exampleId: invertedIndexOperationChain.id, operationRange: { from: 15, to: 15 }, operationMode: 'inspect' })],
    },
    {
      id: 's6-filter', narration: 'A second, unrelated example: filtering orders by status.', actualDurationSec: 16,
      visuals: [mv({ id: 'v7', title: 'Filtering shipped orders', exampleId: tableFilterOperationChain.id, operationRange: { from: 0, to: 5 } })],
    },
  ],
};
