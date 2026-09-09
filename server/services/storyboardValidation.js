import { SCENE_TYPES } from '../config/constants.js';
import { ACTIONS, validateDemonstration } from '../../shared/demonstrations.mjs';
import { executeOperations } from '../../shared/operations.mjs';
import { checkCodeSyntax } from './codeChecks.js';
import { findKnowledgeSource } from '../../assets/knowledge/registry.mjs';

export function validateStoryboard(script) {
  if (![1, 2, 3].includes(script.schemaVersion || 1)) throw new Error('Unsupported storyboard version');
  if (!Array.isArray(script.sections) || !script.sections.length) throw new Error('Storyboard requires sections');
  const usesExampleFields = script.examples.length > 0 || script.sections.some(s => s.visuals.some(v => v.exampleId));
  if (usesExampleFields && (script.schemaVersion || 1) < 3) throw new Error('Worked-example fields require schemaVersion 3');
  const ids = new Set();
  const warnings = [];
  const sectionIds = new Set();
  const continuity = new Map();
  for (const section of script.sections) {
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(section.id) || sectionIds.has(section.id)) throw new Error('Section IDs must be unique safe identifiers');
    sectionIds.add(section.id);
    if (!section.narration?.trim() || !Array.isArray(section.visuals) || !section.visuals.length) throw new Error('Section requires narration and visuals');
    for (const v of section.visuals) {
      if (!v.id || ids.has(v.id)) throw new Error('Visual IDs must be unique');
      ids.add(v.id);
      if (!Object.values(SCENE_TYPES).includes(v.type)) throw new Error(`Unsupported visual type: ${v.type}`);
      const p = v.payload || {};
      for (const key of ['nodes','connections','bulletPoints','steps','stats','commands','diffLines','headers','rows','series','actors','messages','tree']) {
        if (p[key] !== undefined && !Array.isArray(p[key])) throw new Error(`${v.id}: ${key} must be an array`);
      }
      const required={ArchitectureScene:['nodes'],ConceptCardScene:['bulletPoints'],SummaryScene:['bulletPoints'],ComparisonScene:['leftPoints','rightPoints'],TimelineScene:['steps'],StepsScene:['steps'],StatsScene:['stats'],TerminalScene:['commands'],CodeDiffScene:['diffLines'],ComparisonTableScene:['headers','rows'],LineChartScene:['series','xLabels'],FileTreeScene:['tree'],SequenceDiagramScene:['actors','messages']};
      for(const key of required[v.type] || []) if(!Array.isArray(p[key]) || !p[key].length)throw new Error(`${v.id}: empty ${key}`);
      if(v.type==='QuoteScene' && !p.quote?.trim())throw new Error(`${v.id}: empty quote`);
      if(v.type==='ChapterScene' && !p.chapterTitle?.trim())throw new Error(`${v.id}: empty chapter title`);
      if(v.type==='CodeDiffScene' && p.diffLines.some(l=>!['add','remove','context'].includes(l.type) || typeof l.text!=='string'))throw new Error(`${v.id}: invalid diff line`);
      if(v.type==='SequenceDiagramScene' && p.messages.some(m=>!p.actors.includes(m.from) || !p.actors.includes(m.to)))throw new Error(`${v.id}: invalid sequence actor`);
      if(v.type==='StockVideoScene' && !p.videoUrl)warnings.push({code:'missing-footage',visualId:v.id,message:'Stock footage is unavailable; fallback graphics will be used'});
      if (!Array.isArray(v.beats)) throw new Error(`${v.id}: beats must be an array`);
      // Example-driven MechanismScene visuals (exampleId set) use a separate contract —
      // validateExamples()'s exampleId/operationRange checks, not payload.engine+demo.steps.
      // They never populate beats, so the old engine-based check below must not run for them
      // (it would otherwise call validateDemonstration(undefined) and throw).
      if (v.type === 'MechanismScene' && !v.exampleId) {
        const demo=validateDemonstration(p);
        let start=0;
        if (v.continuityId) {
          const previous=continuity.get(v.continuityId);
          if (previous && previous.payload!==JSON.stringify(p)) throw new Error(`${v.id}: continuity requires the same engine and inputs`);
          start=previous?.next || 0;
          continuity.set(v.continuityId,{payload:JSON.stringify(p),next:start+v.beats.length,total:demo.steps.length});
        }
        if ((script.schemaVersion || 1) === 2 && (!v.beats.length || (!v.continuityId && v.beats.length !== demo.steps.length))) throw new Error(`${v.id}: every demonstration step requires a narration beat`);
        v.beats.forEach((beat,i)=>{
          if (beat.step !== start+i || beat.step>=demo.steps.length) throw new Error(`${v.id}: steps must be complete and ordered from zero`);
          if (beat.action && beat.action !== 'execute') throw new Error(`${v.id}: this engine accepts execute beats only`);
          if (beat.expectedResult && typeof beat.expectedResult === 'object') {
            for (const [id,value] of Object.entries(beat.expectedResult)) {
              if (String(demo.steps[beat.step]?.changes[id]) !== String(value)) throw new Error(`${v.id}: expected result contradicts the engine at step ${beat.step}`);
            }
          }
        });
      }
      if (v.type === 'ArchitectureScene') {
        const nodes = new Set(p.nodes.map(n => n.id));
        if (nodes.size !== p.nodes.length || p.connections.some(c => !nodes.has(c.from) || !nodes.has(c.to))) throw new Error(`${v.id}: invalid diagram references`);
      }
      if (v.type === 'CodeEditorScene' && !p.code?.trim()) throw new Error(`${v.id}: missing code`);
      if(v.type==='CodeEditorScene'){
        const check=checkCodeSyntax(p.code,p.language);
        if(check.errors.length)throw new Error(`${v.id}: code syntax: ${check.errors.join('; ')}`);
        warnings.push({code:check.status,visualId:v.id,message:'Generated example is not executed; semantic correctness still requires review'});
      }
      if (v.type === 'ComparisonTableScene') {
        p.rows.forEach((row, index) => {
          if (!Array.isArray(row.values) || row.values.length !== p.headers.length) {
            throw new Error(`${v.id}: table width mismatch at row ${index + 1}; expected ${p.headers.length} values for headers, received ${Array.isArray(row.values) ? row.values.length : 'a non-array'}. The feature column is separate from headers.`);
          }
        });
      }
      if (v.type === 'LineChartScene' && p.series.some(s => !Array.isArray(s.values) || s.values.length !== p.xLabels.length || s.values.some(n => !Number.isFinite(n)))) throw new Error(`${v.id}: invalid chart data`);
      for (const beat of v.beats || []) {
        if (beat.action && !ACTIONS.includes(beat.action)) throw new Error(`${v.id}: unsupported action ${beat.action}`);
        if (beat.step !== undefined && (!Number.isInteger(beat.step) || beat.step < 0)) throw new Error(`${v.id}: invalid step index`);
      }
      if (!v.narrationAnchor) warnings.push({code:'missing-anchor',visualId:v.id});
      if (p.code?.split('\n').some(line => line.length > 90)) warnings.push({code:'long-code-line',visualId:v.id});
      if (v.needsAlignmentReview) warnings.push({code:'needs-alignment-review',visualId:v.id,message:'Narration alignment needs review after an example/operationRange change'});
    }
  }
  for (const group of continuity.values()) if(group.next!==group.total)throw new Error('Continuity group must demonstrate every step');
  const types=script.sections.flatMap(s=>s.visuals.map(v=>v.type));
  const counts=Object.fromEntries([...new Set(types)].map(t=>[t,types.filter(x=>x===t).length]));
  if(types.length>3 && Object.values(counts).some(n=>n/types.length>0.7))warnings.push({code:'repeated-layout',message:'More than 70% of visuals use one scene type; review whether this serves the explanation'});
  validateExamples(script);
  return warnings;
}

// ─── Worked-example registry (schema v3) ──────────────────────────────────────
// Bounds are reasonable, generous defaults, not derived from an existing constraint in
// this codebase (beyond the 1e6 numeric bound, reused from shared/demonstrations.mjs's
// own validateDemonstration) — expect to revisit once Phase 3/6 show what examples need.
const EXAMPLE_BOUNDS = {
  maxExamples: 10, maxCorpusSize: 20, maxOperations: 40, maxEvidence: 10,
  maxTextLength: 600, maxProperties: 40, maxArrayLength: 100, maxDepth: 5,
  maxSerializedSize: 50_000, maxNumeric: 1_000_000,
};
export const EVIDENCE_PROVENANCE = ['computed-locally', 'external-fixture', 'illustrative'];

// Recursively walks corpus/operations/evidence/inputData/query, bounding depth, object
// property count, array length, string-leaf length, and numeric magnitude in one pass.
// Safe against unbounded recursion: JSON-sourced input has no cycles, and depth is
// checked before recursing further regardless of breadth.
function walkExampleBounds(value, label, depth = 0) {
  if (depth > EXAMPLE_BOUNDS.maxDepth) throw new Error(`${label}: nested too deeply`);
  if (Array.isArray(value)) {
    if (value.length > EXAMPLE_BOUNDS.maxArrayLength) throw new Error(`${label}: array exceeds ${EXAMPLE_BOUNDS.maxArrayLength} entries`);
    value.forEach((v, i) => walkExampleBounds(v, `${label}[${i}]`, depth + 1));
  } else if (value && typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length > EXAMPLE_BOUNDS.maxProperties) throw new Error(`${label}: object exceeds ${EXAMPLE_BOUNDS.maxProperties} properties`);
    for (const key of keys) walkExampleBounds(value[key], `${label}.${key}`, depth + 1);
  } else if (typeof value === 'string') {
    if (value.length > EXAMPLE_BOUNDS.maxTextLength) throw new Error(`${label}: text exceeds ${EXAMPLE_BOUNDS.maxTextLength} chars`);
  } else if (typeof value === 'number') {
    if (!Number.isFinite(value) || Math.abs(value) > EXAMPLE_BOUNDS.maxNumeric) throw new Error(`${label}: numeric value out of bounds`);
  }
}

function validateExamples(script) {
  if (script.examples.length > EXAMPLE_BOUNDS.maxExamples) throw new Error(`Script exceeds ${EXAMPLE_BOUNDS.maxExamples} examples`);
  const exampleIds = new Set();
  for (const example of script.examples) {
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(example.id) || exampleIds.has(example.id)) throw new Error('Example IDs must be unique safe identifiers');
    exampleIds.add(example.id);
    if (JSON.stringify(example).length > EXAMPLE_BOUNDS.maxSerializedSize) throw new Error(`${example.id}: exceeds ${EXAMPLE_BOUNDS.maxSerializedSize} serialized chars`);
    if (example.scenario.length > EXAMPLE_BOUNDS.maxTextLength) throw new Error(`${example.id}: scenario exceeds ${EXAMPLE_BOUNDS.maxTextLength} chars`);
    if (example.assumptions.length > EXAMPLE_BOUNDS.maxTextLength) throw new Error(`${example.id}: assumptions exceeds ${EXAMPLE_BOUNDS.maxTextLength} chars`);
    if (example.corpus.length > EXAMPLE_BOUNDS.maxCorpusSize) throw new Error(`${example.id}: corpus exceeds ${EXAMPLE_BOUNDS.maxCorpusSize} entries`);
    if (example.operations.length > EXAMPLE_BOUNDS.maxOperations) throw new Error(`${example.id}: operations exceeds ${EXAMPLE_BOUNDS.maxOperations}`);
    if (example.evidence.length > EXAMPLE_BOUNDS.maxEvidence) throw new Error(`${example.id}: evidence exceeds ${EXAMPLE_BOUNDS.maxEvidence} entries`);

    const corpusIds = new Set();
    for (const entry of example.corpus) {
      if (!entry.id || corpusIds.has(entry.id)) throw new Error(`${example.id}: corpus entries must have unique IDs`);
      corpusIds.add(entry.id);
    }
    const opIds = new Set();
    for (const op of example.operations) {
      if (!op.id || opIds.has(op.id)) throw new Error(`${example.id}: operations must have unique IDs`);
      opIds.add(op.id);
    }
    for (const ev of example.evidence) {
      if (!EVIDENCE_PROVENANCE.includes(ev.provenance)) throw new Error(`${example.id}: evidence provenance must be one of ${EVIDENCE_PROVENANCE.join(', ')}`);
      if (ev.claim.length > EXAMPLE_BOUNDS.maxTextLength) throw new Error(`${example.id}: evidence claim exceeds ${EXAMPLE_BOUNDS.maxTextLength} chars`);
      // sourceId is optional (an evidence entry need not cite anything external), but when
      // present it must resolve to a real, curated registry entry — never an arbitrary string.
      if (ev.sourceId && !findKnowledgeSource(ev.sourceId)) throw new Error(`${example.id}: evidence references unknown source "${ev.sourceId}"`);
    }

    walkExampleBounds(example.corpus, `${example.id}.corpus`);
    walkExampleBounds(example.operations, `${example.id}.operations`);
    walkExampleBounds(example.evidence, `${example.id}.evidence`);
    walkExampleBounds(example.inputData, `${example.id}.inputData`);
    walkExampleBounds(example.query, `${example.id}.query`);

    // Compute real posting lists/set results from the source corpus — unconditionally, not
    // only when an author declares expectedResult. A thrown execution error (unsupported
    // type, invalid reference, bound violation) becomes a clear validation error here rather
    // than surfacing later at render time. Any declared expectedResult is then checked
    // against the REAL computed output, never trusted as-is.
    if (example.operations.length > 0) {
      let execution;
      try { execution = executeOperations(example); }
      catch (err) { throw new Error(`${example.id}: ${err.message}`); }
      for (const entry of execution.trace) {
        const op = example.operations.find(o => o.id === entry.operationId);
        if (op?.expectedResult === undefined) continue;
        const actual = JSON.stringify(entry.output.values);
        const expected = JSON.stringify(op.expectedResult);
        if (actual !== expected) throw new Error(`${example.id}: operation "${op.id}" expectedResult ${expected} contradicts the computed result ${actual}`);
      }
    }
  }

  // Visual-level exampleId/operationRange/operationMode checks + ordering contract.
  // 'inspect' shots may reference any in-bounds index with no sequence-coverage constraint
  // (no executor exists yet to check reachability — deferred to Phase 3). 'execute' shots
  // sharing one continuityId+exampleId form one ordered, contiguous, non-overlapping
  // sequence (generalizing the existing beat.step===start+i contract below); a standalone
  // 'execute' visual (no continuityId) is its own one-visual sequence and must start at 0 —
  // this is what "separate sequences may replay an example" means: replay = start over at 0,
  // independent of what any other sequence elsewhere in the script already covers.
  const sequences = new Map();
  for (const section of script.sections) {
    for (const v of section.visuals) {
      if (v.operationRange && !v.exampleId) throw new Error(`${v.id}: operationRange requires exampleId`);
      if (!v.exampleId) continue;
      const example = script.examples.find(e => e.id === v.exampleId);
      if (!example) throw new Error(`${v.id}: references unknown example "${v.exampleId}"`);
      if (!v.operationRange) continue;

      const { from, to } = v.operationRange;
      if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < from || to >= example.operations.length) {
        throw new Error(`${v.id}: operationRange out of bounds for example "${v.exampleId}"`);
      }
      if (v.operationMode === 'inspect') {
        if (from !== to) throw new Error(`${v.id}: inspect mode requires a single operation index (from === to)`);
        if (v.beats.length > 0) throw new Error(`${v.id}: inspect mode does not use beats — there is no schedule to anchor`);
        continue;
      }
      // Beats are optional (empty stays pure proportional, exactly Phase 4's behavior).
      // If provided, "all or nothing" — one beat per operation in this visual's own
      // operationRange slice, in order — matching the existing engine-path convention.
      // step is LOCAL to the slice (0..rangeLength-1); its absolute operation index is
      // operationRange.from + beat.step. No beat-level expectedResult: example.operations[]
      // already carries the one authoritative expectedResult check (Phase 3).
      if (v.beats.length > 0) {
        const rangeLength = to - from + 1;
        if (v.beats.length !== rangeLength) throw new Error(`${v.id}: beats must cover exactly one entry per operation in its range (${rangeLength}), in order`);
        v.beats.forEach((beat, i) => {
          if (beat.step !== i) throw new Error(`${v.id}: beats must be complete and ordered from zero within the operation range`);
          if (beat.action && beat.action !== 'execute') throw new Error(`${v.id}: this visual accepts execute beats only`);
          if (beat.expectedResult !== undefined) throw new Error(`${v.id}: beat-level expectedResult is not supported here; use example.operations[].expectedResult instead`);
        });
      }
      const seqKey = v.continuityId ? `${v.continuityId}:${v.exampleId}` : `standalone:${v.id}:${v.exampleId}`;
      const seq = sequences.get(seqKey) || { next: 0 };
      if (from !== seq.next) throw new Error(`${v.id}: execute operationRange must start at ${seq.next} within its sequence`);
      seq.next = to + 1;
      sequences.set(seqKey, seq);
    }
  }
}

/**
 * Render-support gate — separate from validateStoryboard so editor paths (save/updateScene/
 * updateExample) keep allowing storage and editing of example-referencing scripts. Phase 4
 * added real rendering for exactly one scene type: MechanismScene. Any other type combined
 * with exampleId stays explicitly unsupported and rejected — not silently ignored — since
 * nothing else knows how to read examples/exampleId/operationRange.
 */
export function assertRenderSupport(script) {
  for (const section of script.sections) {
    for (const v of section.visuals) {
      if (v.exampleId && v.type !== 'MechanismScene') {
        throw new Error(`Example-driven rendering is only implemented for MechanismScene: visual "${v.id}" (type "${v.type}") references example "${v.exampleId}"`);
      }
    }
  }
}
