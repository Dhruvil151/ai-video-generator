import { SCENE_TYPES, VIDEO_CONFIG } from '../config/constants.js';
import { compileSection } from '../../shared/timeline.mjs';
import { OPERATION_TYPES } from '../../shared/operations.mjs';
import { buildDemonstration } from '../../shared/demonstrations.mjs';
import { isVerifiedFixture } from '../../assets/knowledge/registry.mjs';

// ─── VisualModel ──────────────────────────────────────────────────────────────
// A single visual beat within a section. Multiple visuals share one audio track.
export class VisualModel {
  constructor(data = {}) {
    this.id             = data.id   || `visual_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    this.type           = data.type || SCENE_TYPES.CONCEPT_CARD;
    this.title          = data.title    || '';
    this.subtitle       = data.subtitle || '';
    this.purpose        = data.purpose || '';
    this.narrationAnchor = data.narrationAnchor || '';
    this.continuityId   = data.continuityId || '';
    this.beats         = structuredClone(data.beats || []);
    this.durationFrames = data.durationFrames || 0;
    this.durationFraction = Number.isFinite(data.durationFraction) && data.durationFraction > 0
      ? data.durationFraction : 1;

    // Shared worked-example reference (schema v3) — a pointer into script.examples, not a data copy
    this.exampleId      = data.exampleId || null;
    this.operationMode  = data.operationMode === 'inspect' ? 'inspect' : 'execute';
    this.operationRange = data.operationRange && Number.isInteger(data.operationRange.from) && Number.isInteger(data.operationRange.to)
      ? { from: data.operationRange.from, to: data.operationRange.to } : null;
    // Set true when the example/range this visual points at changes out from under it — cleared only
    // by an explicit narrationAnchor edit (scriptController.js), never automatically by re-compilation.
    this.needsAlignmentReview = !!data.needsAlignmentReview;
    // Dependency hash — recomputed and compared by scriptReconciliation.js, never trusted from input.
    this.dependencyHash = data.dependencyHash || '';

    // Timing — set by SectionModel.populateVisualTimings()
    this.startSec       = data.startSec    || 0;
    this.durationSec    = data.durationSec || 0;

    // Visual payload — normalized from Gemini output
    this.payload = normalizePayload(structuredClone(data.payload || {}));
  }

  /** Convert to a scene-like object compatible with EducationalVideo.tsx */
  toScene(sectionNarration = '', sectionSubtitles = []) {
    return {
      id:                  this.id,
      type:                this.type,
      title:               this.title,
      subtitle:            this.subtitle,
      narration:           sectionNarration,
      audioUrl:            null,   // Remotion renders muted; FFmpeg handles audio
      actualDurationSec:   this.durationSec,
      estimatedDurationSec: this.durationSec,
      subtitles:           sectionSubtitles,
      durationFrames:      this.durationFrames,
      beats:               this.beats,
      continuityId:        this.continuityId,
      purpose:             this.purpose,
      payload:             this.payload,
      exampleId:           this.exampleId,
      operationRange:      this.operationRange,
      operationMode:       this.operationMode,
    };
  }
}

// ─── SectionModel ─────────────────────────────────────────────────────────────
// One continuous narration driving 1-3 visual cuts.
export class SectionModel {
  constructor(data = {}) {
    this.id       = data.id       || `section_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    this.narration = data.narration || '';
    this.objective = data.objective || '';
    this.visuals  = (data.visuals || []).map((v, i) =>
      new VisualModel({ ...v, id: v.id || `${this.id}_v${i}` })
    );

    // Set after TTS synthesis
    this.audioPath           = data.audioPath  || null;
    this.audioUrl            = data.audioUrl   || null;
    this.actualDurationSec   = data.actualDurationSec || 0;
    this.estimatedDurationSec = data.estimatedDurationSec || 0;
    this.subtitles           = data.subtitles || [];
    // Dependency hash — recomputed and compared by scriptReconciliation.js, never trusted from input.
    this.narrationHash       = data.narrationHash || '';
  }

  /** Normalize durationFraction values so they sum to 1.0 */
  normalizeFractions() {
    const total = this.visuals.reduce((s, v) => s + v.durationFraction, 0);
    if (total > 0) this.visuals.forEach(v => { v.durationFraction = v.durationFraction / total; });
  }

  /**
   * Compute startSec and durationSec for each visual from actualDurationSec.
   * Must be called after TTS sets actualDurationSec.
   *
   * @param {Array} examples - script.examples, needed to compute internalStepCount for
   *   example-driven visuals before compileSection runs (compileSection is deliberately
   *   agnostic about what a "step" means — it can't derive this on its own).
   */
  populateVisualTimings(examples = []) {
    for (const v of this.visuals) v.internalStepCount = computeInternalStepCount(v, examples);
    const compiled = compileSection(this, VIDEO_CONFIG.FPS);
    this.durationFrames = compiled.durationFrames;
    this.timelineDurationSec = compiled.durationSec;
    this.diagnostics = compiled.diagnostics;
    compiled.visuals.forEach((v, i) => Object.assign(this.visuals[i], v));
  }

  /** Validate and fill missing visual payloads from narration */
  validate() {
    if (!this.narration?.trim()) throw new Error(`Section "${this.id}" is missing narration`);
    if (this.visuals.length === 0) throw new Error(`Section "${this.id}" has no visuals`);
    for (const v of this.visuals) {
      fillVisualPayload(v, this.narration);
    }
  }

  /** Return visuals as renderable scene objects for Remotion */
  toRenderableScenes() {
    return this.visuals.map(v => v.toScene(this.narration, this.subtitles
      .filter(c => c.end > v.startSec && c.start < v.startSec + v.durationSec)
      .map(c => ({ ...c, start: Math.max(0, c.start - v.startSec), end: Math.min(v.durationSec, c.end - v.startSec) }))));
  }
}

// ─── ScriptModel ─────────────────────────────────────────────────────────────
export class ScriptModel {
  constructor(data = {}) {
    this.id     = data.id     || `script_${Date.now()}`;
    this.schemaVersion = data.schemaVersion || 1;
    this.brief = data.brief || {};
    this.generation = data.generation || { source: 'imported' };
    this.diagnostics = data.diagnostics || [];
    // Shared worked-example registry (schema v3). Visuals reference an entry by exampleId
    // instead of copying its data — see VisualModel.exampleId/operationRange.
    this.examples = (data.examples || []).map(e => normalizeExample(e));
    this.topic  = data.topic  || '';
    this.mode   = data.mode === 'detailed' ? 'detailed' : 'short';
    this.targetDurationMinutes   = data.targetDurationMinutes || (this.mode === 'detailed' ? 8 : 3);
    this.estimatedTotalDurationSec = data.estimatedTotalDurationSec || 0;
    this.actualTotalDurationSec    = data.actualTotalDurationSec    || 0;
    this.voice    = data.voice    || 'en-US-GuyNeural';
    const sections = data.sections || (data.scenes || []).map((s, i) => ({
      id: `legacy_${i}`, narration: s.narration, actualDurationSec: s.actualDurationSec,
      estimatedDurationSec: s.estimatedDurationSec, audioPath: s.audioPath,
      subtitles: s.subtitles, visuals: [{ ...s, durationFraction: 1 }],
    }));
    this.sections = sections.map(s => new SectionModel(s));
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  /** Backward-compat: flat list of all visuals across sections (for log lines, API, etc.) */
  get scenes() {
    return this.sections.flatMap(s => s.visuals);
  }

  /** Estimate section durations from narration word counts + SSML breaks. */
  calculateEstimatedDuration() {
    const wpm = VIDEO_CONFIG.WORDS_PER_MINUTE;
    let total = 0;
    for (const section of this.sections) {
      const clean = (section.narration || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const words = clean.split(/\s+/).filter(Boolean).length;
      const speechSec = (words / wpm) * 60;

      let breakSec = 0;
      const breakRe = /<break\s+time=["'](\d+(?:\.\d+)?)(s|ms)?["']\s*\/>/gi;
      let m;
      while ((m = breakRe.exec(section.narration)) !== null) {
        const val = parseFloat(m[1]);
        const unit = (m[2] || 's').toLowerCase();
        breakSec += unit === 'ms' ? val / 1000 : val;
      }

      section.estimatedDurationSec = Math.max(5, speechSec + breakSec);
      total += section.estimatedDurationSec;
    }
    this.estimatedTotalDurationSec = Math.ceil(total * 10) / 10;
    return this.estimatedTotalDurationSec;
  }

  recalculateActualDuration() {
    this.actualTotalDurationSec = this.sections.reduce(
      (sum, s) => sum + (s.timelineDurationSec || s.actualDurationSec || s.estimatedDurationSec || 0), 0
    );
    return this.actualTotalDurationSec;
  }

  toJSON() {
    // Expose both sections (new) and a flat scenes array (backward compat)
    const flatScenes = this.sections.flatMap(s =>
      s.visuals.map(v => ({
        id: v.id, type: v.type, title: v.title, subtitle: v.subtitle,
        narration: s.narration, actualDurationSec: v.durationSec,
        estimatedDurationSec: v.durationSec, payload: v.payload,
      }))
    );
    return {
      id:                        this.id,
      schemaVersion:             this.schemaVersion,
      brief:                     this.brief,
      generation:                this.generation,
      diagnostics:               this.diagnostics,
      examples:                  this.examples,
      topic:                     this.topic,
      mode:                      this.mode,
      targetDurationMinutes:     this.targetDurationMinutes,
      estimatedTotalDurationSec: this.estimatedTotalDurationSec,
      actualTotalDurationSec:    this.actualTotalDurationSec,
      voice:                     this.voice,
      sections:                  this.sections,
      scenes:                    flatScenes,
      createdAt:                 this.createdAt,
      updatedAt:                 this.updatedAt,
    };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizePayload(raw = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Payload must be an object');
  return {
    engine:          raw.engine || '',
    inputs:          raw.inputs || {},
    layout:          raw.layout          || 'default',
    code:            raw.code            || '',
    language:        raw.language        || 'javascript',
    filename:        raw.filename        || 'index.js',
    highlightLines:  raw.highlightLines  || [],
    callout:         raw.callout         || '',
    nodes:           raw.nodes           || [],
    connections:     raw.connections     || [],
    flowDescription: raw.flowDescription || '',
    bulletPoints:    raw.bulletPoints    || [],
    badges:          raw.badges          || [],
    keyTakeaway:     raw.keyTakeaway     || '',
    leftTitle:       raw.leftTitle       || '',
    leftPoints:      raw.leftPoints      || [],
    rightTitle:      raw.rightTitle      || '',
    rightPoints:     raw.rightPoints     || [],
    topicTag:        raw.topicTag        || '',
    steps:           raw.steps           || [],
    stats:           raw.stats           || [],
    commands:        (raw.commands || []).map(c => ({
      ...c,
      output: Array.isArray(c.output) ? c.output : c.output ? [String(c.output)] : [],
    })),
    termTitle:       raw.termTitle       || 'Terminal',
    quote:           raw.quote           || '',
    author:          raw.author          || '',
    context:         raw.context         || '',
    diffLines:       raw.diffLines       || [],
    headers:         raw.headers         || [],
    rows:            raw.rows            || [],
    xLabels:         raw.xLabels         || [],
    series:          raw.series          || [],
    yUnit:           raw.yUnit           || '',
    rootName:        raw.rootName        || '',
    tree:            raw.tree            || [],
    chapterNumber:   raw.chapterNumber   || '',
    chapterTitle:    raw.chapterTitle    || '',
    description:     raw.description     || '',
    actors:          raw.actors          || [],
    messages:        raw.messages        || [],
    // StockVideoScene fields
    query:           raw.query           || '',
    videoUrl:        raw.videoUrl        || '',
  };
}

// ─── Worked-example registry (schema v3) ──────────────────────────────────────
// Fills genuinely ABSENT fields with defaults, like normalizePayload — but REJECTS
// a field that is present with the wrong type instead of silently coercing it to a
// safe empty default. Malformed input should fail loudly, not be normalized away.
export function normalizeExample(raw = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Example must be an object');
  const label = raw.id || '(unnamed example)';
  if (raw.corpus     !== undefined && !Array.isArray(raw.corpus))     throw new Error(`Example "${label}": corpus must be an array`);
  if (raw.operations !== undefined && !Array.isArray(raw.operations)) throw new Error(`Example "${label}": operations must be an array`);
  if (raw.evidence   !== undefined && !Array.isArray(raw.evidence))   throw new Error(`Example "${label}": evidence must be an array`);
  if (raw.inputData !== undefined && (typeof raw.inputData !== 'object' || Array.isArray(raw.inputData) || raw.inputData === null))
    throw new Error(`Example "${label}": inputData must be an object`);
  if (raw.query !== undefined && (typeof raw.query !== 'object' || Array.isArray(raw.query) || raw.query === null))
    throw new Error(`Example "${label}": query must be an object`);

  // Closed top-level shape with one named extension point (fields/args) — unknown top-level
  // keys are dropped by construction rather than allowed to sprawl arbitrarily.
  const corpus = (raw.corpus || []).map(c => {
    if (!c || typeof c !== 'object' || Array.isArray(c)) throw new Error(`Example "${label}": corpus entry must be an object`);
    if (c.fields !== undefined && (typeof c.fields !== 'object' || Array.isArray(c.fields) || c.fields === null))
      throw new Error(`Example "${label}": corpus entry fields must be an object`);
    return { id: c.id, fields: c.fields || {} };
  });
  const operations = (raw.operations || []).map(o => {
    if (!o || typeof o !== 'object' || Array.isArray(o)) throw new Error(`Example "${label}": operation must be an object`);
    if (o.args !== undefined && (typeof o.args !== 'object' || Array.isArray(o.args) || o.args === null))
      throw new Error(`Example "${label}": operation args must be an object`);
    // type is required, not inferred and not defaulted — a missing/unrecognized type throws
    // here at construction, the same strictness tier as every other field on this shape.
    if (!OPERATION_TYPES.includes(o.type)) throw new Error(`Example "${label}": operation "${o.id}" has an unsupported type "${o.type}"`);
    return { id: o.id, label: o.label || '', type: o.type, args: o.args || {}, expectedResult: o.expectedResult };
  });
  // provenance is the author's/model's DECLARED claim, kept as-is; verificationStatus is
  // never read from input — it is always COMPUTED here from VERIFIED_FIXTURES. A submitted
  // script cannot claim its own evidence is verified; only a real, curated, captured
  // fixture registered against this sourceId can (Phase 6). Note this is deliberately NOT
  // provenance === 'computed-locally' plus a passing Phase 3 expectedResult check — that
  // would be circular self-verification (checking our own deterministic model against its
  // own declared expectation proves internal consistency, not real-world correctness).
  const evidence = (raw.evidence || []).map(e => {
    if (!e || typeof e !== 'object' || Array.isArray(e)) throw new Error(`Example "${label}": evidence entry must be an object`);
    const sourceId = e.sourceId || '';
    const verificationStatus = e.provenance === 'external-fixture' && isVerifiedFixture(sourceId) ? 'verified' : 'unverified';
    return { sourceId, claim: e.claim || '', provenance: e.provenance, verificationStatus };
  });

  return {
    id:          raw.id || `example_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    scenario:    raw.scenario    || '',
    assumptions: raw.assumptions || '',
    corpus, operations, evidence,
    inputData:   raw.inputData || {},
    query:       raw.query     || {},
  };
}

// How many internal operations/steps this visual's beats (if any) should schedule against —
// compileSection needs this for the no-beats proportional hold-time check but is deliberately
// agnostic about what a "step" means, so this is computed here, where both engine and example
// context are available, and attached as a plain transient field (not persisted/serialized;
// recomputed fresh every time populateVisualTimings runs).
function computeInternalStepCount(v, examples) {
  if (v.type !== 'MechanismScene') return 0;
  if (v.payload?.engine) {
    try { return buildDemonstration(v.payload.engine, v.payload.inputs).steps.length; }
    catch { return 0; }
  }
  if (v.exampleId && v.operationRange) return v.operationRange.to - v.operationRange.from + 1;
  return 0;
}

function fillVisualPayload(visual, narration) {
  const clean = (narration || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const sentences = clean.split(/(?<=[.!?])\s+/).filter(s => s.length > 10);

  const isEmpty = {
    CodeEditorScene:      () => !visual.payload.code?.trim(),
    ArchitectureScene:    () => !visual.payload.nodes?.length,
    ConceptCardScene:     () => !visual.payload.bulletPoints?.length,
    SummaryScene:         () => !visual.payload.bulletPoints?.length,
    ComparisonScene:      () => !visual.payload.leftPoints?.length && !visual.payload.rightPoints?.length,
    TimelineScene:        () => !visual.payload.steps?.length,
    StatsScene:           () => !visual.payload.stats?.length,
    TerminalScene:        () => !visual.payload.commands?.length,
    QuoteScene:           () => !visual.payload.quote?.trim(),
    StepsScene:           () => !visual.payload.steps?.length,
    CodeDiffScene:        () => !visual.payload.diffLines?.length,
    ComparisonTableScene: () => !visual.payload.headers?.length || !visual.payload.rows?.length,
    LineChartScene:       () => !visual.payload.series?.length,
    FileTreeScene:        () => !visual.payload.tree?.length,
    ChapterScene:         () => !visual.payload.chapterTitle?.trim(),
    SequenceDiagramScene: () => !visual.payload.actors?.length,
  };

  const check = isEmpty[visual.type];
  if (!check || !check()) return;

  console.warn(`[VisualModel] Filling empty payload for "${visual.title}" (${visual.type})`);

  if (visual.type === 'QuoteScene') {
    visual.payload.quote = sentences[0] || clean.slice(0, 200);
    return;
  }

  // Fallback to ConceptCardScene
  visual.type = SCENE_TYPES.CONCEPT_CARD;
  visual.payload.layout = 'stack';
  visual.payload.bulletPoints = sentences.slice(0, 3).map((s, i) => ({
    icon: ['zap', 'shield', 'globe'][i % 3],
    title: s.length > 60 ? s.slice(0, 57) + '...' : s,
    description: '',
  }));
}

// Keep SceneModel export for any remaining direct usages
export class SceneModel {
  constructor(data = {}) {
    this.id        = data.id        || `scene_${Date.now()}`;
    this.type      = Object.values(SCENE_TYPES).includes(data.type) ? data.type : SCENE_TYPES.CONCEPT_CARD;
    this.title     = data.title     || '';
    this.subtitle  = data.subtitle  || '';
    this.narration = data.narration || '';
    this.estimatedDurationSec = data.estimatedDurationSec || null;
    this.actualDurationSec    = data.actualDurationSec    || null;
    this.audioFile  = data.audioFile  || null;
    this.audioUrl   = data.audioUrl   || null;
    this.subtitles  = data.subtitles  || [];
    this.payload    = normalizePayload(data.payload);
  }
  fillEmptyPayload() { fillVisualPayload(this, this.narration); }
  validate() { return true; }
}
