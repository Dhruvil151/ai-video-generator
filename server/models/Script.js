import { SCENE_TYPES, VIDEO_CONFIG } from '../config/constants.js';

// ─── VisualModel ──────────────────────────────────────────────────────────────
// A single visual beat within a section. Multiple visuals share one audio track.
export class VisualModel {
  constructor(data = {}) {
    this.id             = data.id   || `visual_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    this.type           = Object.values(SCENE_TYPES).includes(data.type) ? data.type : SCENE_TYPES.CONCEPT_CARD;
    this.title          = data.title    || '';
    this.subtitle       = data.subtitle || '';
    this.durationFraction = Math.max(0.05, data.durationFraction || 0.5);

    // Timing — set by SectionModel.populateVisualTimings()
    this.startSec       = data.startSec    || 0;
    this.durationSec    = data.durationSec || 0;

    // Visual payload — normalized from Gemini output
    this.payload = normalizePayload(data.payload || {});
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
      payload:             this.payload,
    };
  }
}

// ─── SectionModel ─────────────────────────────────────────────────────────────
// One continuous narration driving 1-3 visual cuts.
export class SectionModel {
  constructor(data = {}) {
    this.id       = data.id       || `section_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    this.narration = data.narration || '';
    this.visuals  = (data.visuals || []).map((v, i) =>
      new VisualModel({ ...v, id: `${this.id}_v${i}` })
    );

    // Set after TTS synthesis
    this.audioPath           = data.audioPath  || null;
    this.audioUrl            = data.audioUrl   || null;
    this.actualDurationSec   = data.actualDurationSec || 0;
    this.estimatedDurationSec = data.estimatedDurationSec || 0;
    this.subtitles           = data.subtitles || [];
  }

  /** Normalize durationFraction values so they sum to 1.0 */
  normalizeFractions() {
    const total = this.visuals.reduce((s, v) => s + v.durationFraction, 0);
    if (total > 0) this.visuals.forEach(v => { v.durationFraction = v.durationFraction / total; });
  }

  /**
   * Compute startSec and durationSec for each visual from actualDurationSec.
   * Must be called after TTS sets actualDurationSec.
   */
  populateVisualTimings() {
    this.normalizeFractions();
    let elapsed = 0;
    for (const v of this.visuals) {
      v.startSec   = elapsed;
      v.durationSec = Math.max(3, this.actualDurationSec * v.durationFraction);
      elapsed += v.durationSec;
    }
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
    return this.visuals.map(v => v.toScene(this.narration, this.subtitles));
  }
}

// ─── ScriptModel ─────────────────────────────────────────────────────────────
export class ScriptModel {
  constructor(data = {}) {
    this.id     = data.id     || `script_${Date.now()}`;
    this.topic  = data.topic  || '';
    this.mode   = data.mode === 'detailed' ? 'detailed' : 'short';
    this.targetDurationMinutes   = data.targetDurationMinutes || (this.mode === 'detailed' ? 8 : 3);
    this.estimatedTotalDurationSec = data.estimatedTotalDurationSec || 0;
    this.actualTotalDurationSec    = data.actualTotalDurationSec    || 0;
    this.voice    = data.voice    || 'en-US-GuyNeural';
    this.sections = (data.sections || []).map(s => new SectionModel(s));
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
      (sum, s) => sum + (s.actualDurationSec || s.estimatedDurationSec || 0), 0
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
  return {
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
  };
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
