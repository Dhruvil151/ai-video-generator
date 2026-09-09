# Teaching Quality Implementation Plan

Status: proposed, not implemented by this document.
Date: 2026-09-09
Scope: improve factual accuracy, worked examples, explanatory animation, continuity, and pacing across generated technical videos.

## 1. Outcome and Constraints

The viewer should be able to predict an operation's result and explain why it happened, not merely recognize its terminology.

- Preserve the existing section-based audio pipeline and satisfactory voice output.
- Preserve Gemini's creative control over story, visual selection, and duration. No compulsory title, summary, scene count, or animation quota.
- Do not add quality-driven LLM retries, a second critic-model call, paid media generation, or paid research dependencies.
- Use deterministic local computation for example results and Remotion for animation.
- Distinguish no new paid service from zero resource usage: local rendering, storage, maintenance, and existing API usage still have costs.
- Keep existing schema-v1/v2 scripts, manifests, six demonstration engines, and editor workflows working.
- Implement and verify locally first. Run one generation E2E only after all phases pass and the user authorizes it. This document does not authorize a run.

## 2. Verified Starting Point

Existing foundations to extend rather than replace:

- `server/services/geminiService.js`: concise creative brief, schema-v2 output, one narration per section, optional titles, narration anchors, engine menu.
- `server/models/Script.js`: persisted script and section/visual models.
- `shared/demonstrations.mjs`: bounded deterministic engines for cache, references, coercion, React state, Docker layers, and event loop.
- `shared/timeline.mjs`: speech-anchor alignment, estimated timing confidence, ordered beats, and result holds.
- `server/services/storyboardValidation.js`: payload checks, engine result checks, and continuity validation.
- `src/remotion/components/MechanismScene.tsx`: state-based rendering, currently dominated by node/value boxes and a Docker-specific layout.
- `server/services/renderManifest.js`: audio assets, script snapshots, source hashes, and replay metadata.
- Local test, fixture render, baseline capture, and preflight scripts already exist.

The reviewed Elasticsearch job39 uses six generic visuals and no mechanism scene. Its title and summary occupy about 31% of its 148.5-second runtime. It describes tokenization and intersections without carrying actual document data through either operation. These are baseline findings, not universal measurements of every output.

## 3. Target Flow

Topic + selected learning outcome
-> relevant local capability/source context
-> one Gemini storyboard response containing reusable example inputs
-> deterministic example execution and contract checks
-> narration-anchor timeline compilation
-> continuous object-level rendering with inspection holds
-> manifest and review diagnostics.

Keep semantic computation separate from visual presentation. Gemini may choose examples and explain them; it must not invent the results of operations for which the system has an executor. Narration still needs factual review: a correct animation does not prove every spoken claim.

## Phase 1: Baselines and Acceptance Fixtures

Work:
- Preserve job39 and its manifest unchanged as a comparison baseline.
- Add a small authored inverted-index storyboard fixture and a general table/filter example before changing generation.
- Extend existing regression fixtures for cache, references, and event loop to catch shared-system regressions.
- Record visual boundaries, meaningful operation events, opening/closing allocation, alignment confidence, and known factual issues.
- Capture initial state, operation midpoint, completed result, and cross-visual boundaries, not only scene midpoints.

Files: `server/tests/fixtures/`, `server/tests/storyboard.test.js`, `scripts/render-fixture.mjs`, `scripts/capture-baseline.mjs`.

Acceptance: baseline artifacts are reproducible without Gemini or new TTS; observations distinguish template duration from genuinely motionless duration.

## Phase 2: Shared Worked-Example Contract

Work:
- Introduce schema v3 only for newly generated scripts, with adapters retaining v1/v2 behavior.
- Add a script-level example registry: stable example ID, scenario, entities/documents, input data, query/configuration, and explicit assumptions.
- Visuals reference an example ID plus an ordered operation range; avoid copying mutable input data into every payload.
- Give each entity, term, row, and output a stable ID. Labels remain display text, not identity.
- Add scoped evidence references and result provenance: computed locally, externally verified fixture, or illustrative.
- Keep pedagogical intent separate from payload: objective, operation focus, and expected viewer insight are not CSS/layout instructions.
- Define bounds for text length, document count, row count, operation count, numeric values, and payload depth.
- Preserve new fields through model construction, serialization, queue transfer, editor PATCH, and manifest replay.
- Editing shared inputs must invalidate derived traces and affected timing; do not retain stale results or audio after narration edits.

Files: `server/models/Script.js`, `server/services/storyboardValidation.js`, `src/remotion/EducationalVideo.tsx`, shared type declarations, script controllers/editor integration.

Acceptance: two visuals reference the same example without data divergence; round-trip serialization preserves IDs and assumptions; legacy scripts and edit routes still pass.

## Phase 3: Bounded Semantic Operations

Work:
- Extend the demonstration system with reusable operations: tokenize, normalize, group terms, append a posting, lookup, intersect, union, filter, and project results.
- Implement only the operations needed by the first two fixtures; do not build an unrestricted programming language.
- Return a typed trace containing before/after state, affected IDs, inputs, outputs, explanatory labels, and assumptions.
- Separate generic operations from domain adapters. An inverted-index adapter composes operations; it is not a new hardcoded slide sequence for every topic.
- Compute posting lists and set results from source documents. Do not trust model-authored expected results.
- Specify tokenizer semantics precisely. A simplified tokenizer is labelled illustrative, not claimed to reproduce all Elasticsearch analyzers.
- Preserve adapters for the existing six engines while extracting reusable logic only where necessary.
- Reject unsupported operations safely. No `eval`, arbitrary shell execution, network access, or generated JavaScript execution.

Files: `shared/demonstrations.mjs`, `shared/demonstrations.d.mts`; proposed small modules under `shared/operations/` as complexity warrants.

Acceptance: tests cover duplicate tokens, case normalization, empty matches, AND/OR, invalid IDs, deterministic ordering, bounded input rejection, and independent expected results. A second non-search fixture reuses operations without an Elasticsearch-specific code path.

## Phase 4: Explanatory Visual Primitives

Work:
- Add token strips, document panels, posting-list rows, set-operation highlights, result lists, and focused code/output views.
- Render the trace: words separate, tokens move to rows, IDs append, selected lists combine, and a result document appears.
- Reuse the current MechanismScene entry point with a renderer registry; avoid adding another large engine-name conditional chain.
- Keep old node/edge rendering for flows where it is appropriate.
- Assign stable visual identity by entity ID. Use labels and shape/position as well as color.
- Highlight one operation at a time; show enough surrounding state to explain where data came from.
- Provide stable geometry and measured text bounds. Paginate or focus dense data instead of silently clipping or shrinking everything.
- Reserve captions and assumption-label space through a shared layout contract.
- Keep product logos accurate and sourced through the asset registry, but secondary to the mechanism.

Files: `src/remotion/components/MechanismScene.tsx`, proposed mechanism subcomponents, `src/remotion/styles/video.css`, `src/remotion/components/QualityProbe.tsx`.

Acceptance: screenshots show the actual intermediate data, no unintended overlap, readable results at desktop and mobile playback sizes, and nonblank operation frames. Animations are deterministic under out-of-order frame rendering, with no CSS-transition dependency.

## Phase 5: Cross-Shot Continuity and Speech Timing

Work:
- Extend existing continuity IDs to reference shared example traces, not serialized payload equality alone.
- Carry completed state across visuals and narration sections; allow changing focus without reconstructing the entire scene.
- Use existing narration anchors for operation starts. Prefer sentence-start anchors when only sentence timestamps are available.
- Support operation-specific motion and result-inspection holds. Do not cut or speed up narration to satisfy an arbitrary visual cadence.
- Warn when anchors collide, resolve ambiguously, are missing, or leave insufficient time for a result.
- Keep confidence metadata: measured word, sentence boundary, estimated sentence offset, or proportional fallback.
- Treat a static result inspection as legitimate; background drift and cursor blinking do not count as explanatory activity.
- Preserve frame totals and continuous section audio across every visual split.

Files: `shared/timeline.mjs`, its declarations, `src/remotion/EducationalVideo.tsx`, `server/services/renderPipeline.js`, existing pipeline tests.

Acceptance: adjacent shots have matching state; every essential result remains visible before the next operation; captions stay scene-local; no duplicated, missing, or truncated section audio. Approximate timing is never reported as exact synchronization.

## Phase 6: Factual Context and Evidence

Work:
- Add a small, manually reviewed local source registry keyed by topic/capability, with official URL, product/version scope, review date, claim summary, and limitations.
- Begin with Elasticsearch analyzer behavior, explicit query operators, full-text indexing comparisons, and illustrative-model boundaries.
- Supply only relevant concise source context to Gemini. Avoid embedding the full catalog into every prompt.
- Store source IDs with claims and rendered demonstrations; expose references in the review report and optional end metadata, not constant citation clutter.
- Validate referenced source IDs, declared configurations, and deterministic contradictions. Use warnings for unresolved prose claims rather than pretending regex can fact-check language.
- Label output as verified only when a captured fixture records its command/configuration, relevant runtime version, and result. Otherwise label it illustrative.
- Block clearly invalid semantic inputs before rendering; leave unsupported factual claims visible for human review, without automatic regeneration.
- Do not fetch arbitrary model-provided URLs during generation. Maintain approved sources outside the per-video critical path.

Files: proposed `assets/knowledge/` registry, `server/services/geminiService.js`, `server/services/storyboardValidation.js`, `server/services/renderManifest.js`.

Acceptance: known job39 misconceptions are represented by regression cases; stale or missing evidence is visible; a source link alone does not mark a claim verified.

## Phase 7: Creative, Demonstration-First Script Generation

Work:
- Keep the prompt concise: one useful outcome, concrete inputs, visible transformation, inspectable result, and a relevant limitation.
- Ask Gemini to choose the scope that can actually be explained in the requested duration. Do not require every advanced subtopic.
- Describe renderer capabilities as expressive operations with input contracts, not a long list of required templates.
- Select capability context by declared topic relevance, with a neutral fallback for unknown topics. Avoid forcing cache or search examples into unrelated subjects.
- Provide a compact structural example without a long Redis/Docker narration that encourages imitation across topics.
- Ask for narration tied to the selected example's values and operation order. Derive rendered results locally and flag contradictions in model text.
- Use optional title overlays and result-led endings; no mandatory standalone title or recap scene.
- Keep existing transport/JSON recovery behavior unchanged. Do not add a quality-score retry loop.

Files: `server/services/geminiService.js`, script model/validation, prompt contract tests.

Acceptance: offline prompt tests cover Elasticsearch, cache, references, and an unsupported topic. Generated quality remains unproven until the final authorized trial; prompt snapshots are not evidence that every model output will improve.

## Phase 8: Review Diagnostics and Editor Feedback

Work:
- Extend the manifest with example hashes, executor version, source references, operation timing, provenance, and unresolved warnings.
- Report opening/closing allocation, intervals without meaningful state changes, result-hold duration, text bounds, and anchor confidence.
- Treat pacing thresholds as configurable review hints. Never auto-add cuts, auto-rewrite narration, or impose a universal maximum scene length.
- Show why an example is unsupported, why a result conflicts, or why a beat is too short, with visual/section IDs and suggested action.
- Preserve the original generated script alongside compiled traces so reviewers can distinguish model output from system-derived data.
- Make changing shared example inputs and inspecting derived results possible in the existing editor workflow.

Files: `server/services/renderManifest.js`, `server/services/storyboardValidation.js`, `src/remotion/components/QualityProbe.tsx`, existing script editor, fixture review scripts.

Acceptance: a polished but data-free lecture receives useful warnings; a deliberate static inspection hold is not falsely classified as broken; prior manifests still load.

## Phase 9: Integrated Verification and Release Gate

Before any generation E2E:
- Run `npm run test:local`, `npx tsc --noEmit`, and `npm run build`.
- Render authored fixtures using the existing fixture workflow; inspect operation start/mid/end frames and cross-shot boundaries.
- Exercise the editor with shared-input changes, invalid references, and legacy scripts.
- Verify audio continuity using cached or synthetic local audio; check frame sums, subtitle bounds, media decode, duration, and sample rate.
- Review both desktop and reduced mobile playback for legibility, caption collisions, and result visibility.
- Confirm no new mandatory paid API, automatic quality regeneration, or arbitrary-code execution path was introduced.

After all local gates pass and the user authorizes the run:
- Run `node temp/test_e2e.mjs "elastic search reverse index" short` exactly once.
- Compare the result with job39 at equivalent teaching moments, not just filesize or render success.
- Confirm the returned video builds an index from actual documents, performs an explicit query, shows its result, and states relevant assumptions accurately.
- Report factual correctness, worked-example completeness, continuity, readability, pacing, timing confidence, and remaining defects separately.
- If the E2E fails, report the failure and fix locally; do not silently launch another generation run.

Acceptance: functioning export plus a human teaching-quality review. A successful E2E alone does not prove YouTube-standard content or cross-topic generalization.

## 4. First Acceptance Story: Inverted Index

Use a bounded illustrative corpus:
- D1: Docker basics
- D2: Deployment guide
- D3: Docker deployment

The viewer sees the same documents become tokens, then postings: docker -> [D1,D3], deployment -> [D2,D3]. An explicitly configured AND query yields [D3]; switching to OR yields [D1,D2,D3]. The matching documents appear in a result view. Explain that this is a small model of term retrieval, not a complete Lucene implementation.

If showing a real Elasticsearch request, state its analyzer and operator. Use official source material and verified fixtures, or clearly mark the output illustrative. Do not introduce stemming silently, imply all SQL queries scan every row, claim complete retrieval is O(1), or present unmeasured latency guarantees.

Suggested editorial allocation for a roughly 150-second fixture, not a generation rule: 8 seconds for the problem, 17 for documents, 30 for building the index, 35 for lookup/results, 25 for a practical request, 27 for a limitation or contrast, and 8 for the closing takeaway. Adjust when narration or complexity warrants it.

## 5. Delivery Order and Deferred Work

Deliver in small checkpoints: Phase 1 baseline; Phases 2-3 contracts/execution; Phases 4-5 visual proof; Phases 6-7 accuracy/generation; Phase 8 review; Phase 9 verification.

The first complete vertical slice must demonstrate corpus -> index -> query -> result before expanding the operation catalog. This avoids another cycle where many scene types exist but none teaches the mechanism well.

Deferred: paid avatars, generated stock footage, aggressive meme cuts, automatic critic agents, voice replacement, hundreds of bespoke topic engines, and automated ranking/performance benchmarks. None addresses the primary gap as directly as accurate, continuous worked examples.

## 6. Reference Material

- Arpit Bhayani's concrete posting-list comparison: https://www.youtube.com/watch?v=iHHqnyThrqE&t=530s
- Elasticsearch from the bottom up, conference outline: https://pyvideo.org/europython-2014/elasticsearch-from-the-bottom-up.html
- Default analyzer behavior: https://www.elastic.co/docs/reference/text-analysis/analysis-standard-analyzer
- Explicit match operators: https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-match-query
- Relational full-text index comparison: https://www.postgresql.org/docs/current/textsearch-indexes.html
- Elastic's index mechanics explanation: https://www.elastic.co/blog/found-elasticsearch-from-the-bottom-up

These references inform the initial acceptance cases. Recheck version-sensitive details when implementing evidence fixtures; creator style is inspiration, not a template to copy or a guarantee of viewer retention.
