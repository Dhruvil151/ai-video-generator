# Job 39 Observations — "Elasticsearch Inverted Index"

Baseline: `job-39.manifest.json`, captured from `public/output/elasticsearch_inverted_index_39.manifest.json`
(`sourceManifestSha256` recorded in the manifest — this is a rewritten derivative of that specific source, not an original).

All figures below were read directly from the manifest's `script` object, not inferred or estimated.

## Structure

schemaVersion 2, 4 sections, 6 visuals, **zero visuals declare mechanism beats** (no `MechanismScene` visual in this job). Zero worked tokenization/intersection was observed in the reviewed narration/payload pairing — this is a statement about what this job's visuals declare and show, not a claim that no other scene type in this job has any animation; `ArchitectureScene`, `StepsScene`, and others have their own entrance/spring animation this pass did not evaluate frame-by-frame.

## Per-visual boundaries and durations

Durations below are each visual's **persisted, compiled** `durationFrames`/`durationSec` (`durationSec = durationFrames/30`, fps 30) — not recomputed from `durationFraction`, which is fallback timing only and is superseded once narration anchors compile.

| Section | Visual | Type | durationFrames | durationSec |
|---|---|---|---:|---:|
| section-1-problem | vis-sec1-title | TitleScene | 389 | 12.97 |
| section-1-problem | vis-sec1-scan | ArchitectureScene | 632 | 21.07 |
| section-2-inverted-index | vis-sec2-pipeline | StepsScene | 760 | 25.33 |
| section-2-inverted-index | vis-sec2-table | ComparisonTableScene | 637 | 21.23 |
| section-3-multi-word-search | vis-sec3-concept | ConceptCardScene | 1060 | 35.33 |
| section-4-limitations-summary | vis-sec4-summary | SummaryScene | 978 | 32.60 |

Total: 148.53s. Title + Summary = 45.57s = **30.7%** of runtime.

This is **compiled/allocated time**. Whether that time is genuinely static past each visual's initial entrance springs was **not verified by frame inspection** in this pass — flagged as a follow-up for when beat-based sampling has real beats to sample in a job shaped like this one (see the Phase 1 tooling changes to `render-fixture.mjs`).

## Alignment confidence

Taken directly from each visual's compiled `alignment` field (not inferred from subtitle cue `type`):

- First visual of every section: `'section-start'`
- Every subsequent visual: `'sentence'`

No visual in this job has `'word'`, `'estimated-sentence'`, or `'proportional'` confidence.

## Factual and teaching issues

Four issues, each with the exact on-screen text (narration or visible payload), why it's inaccurate, a source reference, and one of three labels:
**confirmed error** (categorically false as stated), **missing configuration / misleading generalization** (the operation is valid under a configuration the script never mentions and never claims is default), or **needs qualification** (a framing/completeness gap).

1. **Narration** (`section-2-inverted-index`): *"lowercasing and stemmers normalize words like 'deployments' into 'deploy'"* — presented as part of "an analysis pipeline" with no configuration caveat, but never explicitly claims this is Elasticsearch's default.
   **Missing configuration / misleading generalization**: the default `standard` analyzer lowercases and tokenizes but does not stem; stemming requires an explicitly configured analyzer.
   Source: [Elastic — standard analyzer](https://www.elastic.co/docs/reference/text-analysis/analysis-standard-analyzer)

2. **Narration** (`section-3-multi-word-search`): *"fetches the posting lists for both terms and finds documents present in both lists"* — describes AND/intersection as the general multi-word search behavior with no operator caveat, but doesn't explicitly claim it's the default.
   **Missing configuration / misleading generalization**: the `match` query's default `operator` is `or`; AND/intersection behavior requires explicit configuration.
   Source: [Elastic — match query](https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-match-query)

3. **Narration** (`section-1-problem`): frames relational databases as limited to full scans / exact-match B-Trees, implying only inverted-index architectures solve fast text search.
   **Needs qualification**: PostgreSQL and other RDBMSs support GIN-indexed full-text search (`tsvector`), itself inverted-index-like, inside a relational database.
   Source: [PostgreSQL — full text indexes](https://www.postgresql.org/docs/current/textsearch-indexes.html)

4. **On-screen payload** (`vis-sec2-table`, `ComparisonTableScene`, row "Query Execution"): *"O(1) dictionary lookup returns Doc IDs"* — an explicit, categorical complexity claim, not a config-dependent generalization.
   **Confirmed error**: the video's blanket O(1) claim is unsupported and conflates term lookup with postings retrieval. Complexity requires a defined operation and input-size model, which the script never states.
   (No single external source is cited for this one — it is refuted on its own terms: no model or measurement is given to support "O(1)" for either operation it conflates.)

## Follow-ups (not addressed in this checkpoint)

- Whether allocated visual time (30.7% Title+Summary, per above) is genuinely static or carries unsampled motion requires beat-based frame inspection against a job that actually declares beats — none of job 39's visuals do.
- These four issues become regression cases once Phase 6 (evidence/source registry) exists.
- Worked tokenization/posting-list/set-intersection content — the actual pedagogical gap this job exhibits — is addressed by Phases 2-4 (`invertedIndexExample` in `server/tests/fixtures/acceptance-examples.mjs` is the reference specification those phases will execute and render against).
