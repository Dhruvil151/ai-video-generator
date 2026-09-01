import { SCENE_TYPES, VIDEO_CONFIG } from '../config/constants.js';

// ─── SceneModel ──────────────────────────────────────────────────────────────
export class SceneModel {
  constructor(data = {}) {
    this.id       = data.id       || `scene_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    this.type     = Object.values(SCENE_TYPES).includes(data.type) ? data.type : SCENE_TYPES.CONCEPT_CARD;
    this.title    = data.title    || 'Untitled Scene';
    this.subtitle = data.subtitle || '';
    this.narration = data.narration || '';

    // Timing — set after TTS synthesis
    this.estimatedDurationSec = data.estimatedDurationSec || null;
    this.actualDurationSec    = data.actualDurationSec    || null;

    // Audio — set after TTS synthesis
    this.audioFile    = data.audioFile    || null;
    this.audioUrl     = data.audioUrl     || null;
    this.audioCacheKey = data.audioCacheKey || null;
    this.subtitles    = data.subtitles    || []; // [{ text, start (sec), end (sec) }]

    // Visual payload — varies by scene type
    this.payload = {
      // ── Layout variant — read by every component to pick visual structure ──
      // Each scene type supports 2–3 named variants (e.g. 'split', 'fullscreen')
      layout: data.payload?.layout || 'default',

      // ── CodeEditorScene ──────────────────────────────────────────────────
      // layout: 'split' (default) | 'fullscreen'
      code:           data.payload?.code           || '',
      language:       data.payload?.language       || 'javascript',
      filename:       data.payload?.filename       || 'index.js',
      highlightLines: data.payload?.highlightLines || [],
      callout:        data.payload?.callout        || '',

      // ── ArchitectureScene ────────────────────────────────────────────────
      // layout: 'flow' (default) | 'radial'
      // nodes: [{ id, label, icon, status: 'active'|'idle'|'processing'|'success' }]
      nodes:           data.payload?.nodes           || [],
      // connections: [{ from (nodeId), to (nodeId), label }]
      connections:     data.payload?.connections     || [],
      flowDescription: data.payload?.flowDescription || '',

      // ── ConceptCardScene / SummaryScene ─────────────────────────────────
      // layout: 'stack' (default) | 'grid'
      // bulletPoints: [{ icon, title, description }]
      bulletPoints: data.payload?.bulletPoints || [],
      badges:       data.payload?.badges       || [],
      keyTakeaway:  data.payload?.keyTakeaway  || '',

      // ── ComparisonScene ──────────────────────────────────────────────────
      leftTitle:   data.payload?.leftTitle   || '',
      leftPoints:  data.payload?.leftPoints  || [],
      rightTitle:  data.payload?.rightTitle  || '',
      rightPoints: data.payload?.rightPoints || [],

      // ── TitleScene ───────────────────────────────────────────────────────
      // layout: 'orbital' (default) | 'minimal'
      topicTag: data.payload?.topicTag || '',

      // ── TimelineScene ────────────────────────────────────────────────────
      // layout: 'horizontal' | 'vertical'
      // steps: [{ label, description, icon, timestamp? }]
      steps: data.payload?.steps || [],

      // ── StatsScene ───────────────────────────────────────────────────────
      // layout: 'counters' | 'bar'
      // stats: [{ value, label, icon, suffix? }]
      stats: data.payload?.stats || [],

      // ── TerminalScene ────────────────────────────────────────────────────
      // layout: 'typed' | 'split'
      // commands: [{ prompt, input, output: string[] }]
      commands:    data.payload?.commands    || [],
      termTitle:   data.payload?.termTitle   || 'Terminal',

      // ── QuoteScene ───────────────────────────────────────────────────────
      // layout: 'centered' | 'left-accent'
      quote:       data.payload?.quote       || '',
      author:      data.payload?.author      || '',
      context:     data.payload?.context     || '',

      // ── StepsScene ───────────────────────────────────────────────────────
      // layout: 'numbered' | 'cards'
      // steps shared with TimelineScene — same field, different visual treatment
    };
  }

  /**
   * Warn (not throw) when required payload fields are missing for the scene type.
   * Called from validate() so the pipeline always surfaces empty-slide issues.
   */
  warnOnEmptyPayload() {
    const tag = `[SceneModel] ⚠️  Scene "${this.title}" (${this.id}, type: ${this.type})`;

    const checks = {
      CodeEditorScene: () => {
        if (!this.payload.code || this.payload.code.trim() === '') {
          console.warn(`${tag} is missing payload.code — CodeEditorScene will show "// No code provided"`);
        }
      },
      ArchitectureScene: () => {
        if (!this.payload.nodes || this.payload.nodes.length === 0) {
          console.warn(`${tag} is missing payload.nodes — ArchitectureScene will render an empty diagram`);
        }
        if (!this.payload.connections || this.payload.connections.length === 0) {
          console.warn(`${tag} is missing payload.connections — no edges will be drawn`);
        }
      },
      ConceptCardScene: () => {
        if (!this.payload.bulletPoints || this.payload.bulletPoints.length === 0) {
          console.warn(`${tag} is missing payload.bulletPoints — ConceptCardScene will show no cards`);
        }
      },
      SummaryScene: () => {
        if (!this.payload.bulletPoints || this.payload.bulletPoints.length === 0) {
          console.warn(`${tag} is missing payload.bulletPoints — SummaryScene will show no takeaway items`);
        }
      },
      TitleScene: () => {
        if (!this.payload.badges || this.payload.badges.length === 0) {
          console.warn(`${tag} is missing payload.badges — TitleScene will show no tag pills`);
        }
      },
      ComparisonScene: () => {
        if (!this.payload.leftPoints || this.payload.leftPoints.length === 0) {
          console.warn(`${tag} is missing payload.leftPoints — ComparisonScene left column will be empty`);
        }
        if (!this.payload.rightPoints || this.payload.rightPoints.length === 0) {
          console.warn(`${tag} is missing payload.rightPoints — ComparisonScene right column will be empty`);
        }
      },
      TimelineScene: () => {
        if (!this.payload.steps || this.payload.steps.length === 0) {
          console.warn(`${tag} is missing payload.steps — TimelineScene will render empty`);
        }
      },
      StatsScene: () => {
        if (!this.payload.stats || this.payload.stats.length === 0) {
          console.warn(`${tag} is missing payload.stats — StatsScene will render empty`);
        }
      },
      TerminalScene: () => {
        if (!this.payload.commands || this.payload.commands.length === 0) {
          console.warn(`${tag} is missing payload.commands — TerminalScene will render empty`);
        }
      },
      QuoteScene: () => {
        if (!this.payload.quote || this.payload.quote.trim() === '') {
          console.warn(`${tag} is missing payload.quote — QuoteScene will render empty`);
        }
      },
      StepsScene: () => {
        if (!this.payload.steps || this.payload.steps.length === 0) {
          console.warn(`${tag} is missing payload.steps — StepsScene will render empty`);
        }
      },
    };

    const checker = checks[this.type];
    if (checker) checker();
  }

  validate() {
    if (!this.narration || this.narration.trim() === '') {
      throw new Error(`Scene "${this.title}" (${this.id}) is missing narration text.`);
    }
    this.warnOnEmptyPayload();
    return true;
  }
}


// ─── ScriptModel ─────────────────────────────────────────────────────────────
export class ScriptModel {
  constructor(data = {}) {
    this.id     = data.id     || `script_${Date.now()}`;
    this.topic  = data.topic  || '';
    this.mode   = data.mode === 'detailed' ? 'detailed' : 'short';
    this.targetDurationMinutes   = data.targetDurationMinutes   || (this.mode === 'detailed' ? 8 : 2);
    this.estimatedTotalDurationSec = data.estimatedTotalDurationSec || 0;
    this.actualTotalDurationSec    = data.actualTotalDurationSec    || 0;
    this.voice  = data.voice  || 'en-US-ChristopherNeural';
    this.scenes = (data.scenes || []).map(s => new SceneModel(s));
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Estimate scene durations from narration word counts + SSML breaks.
   * Runs before TTS synthesis as a fast pre-render estimate.
   */
  calculateEstimatedDuration() {
    const wpm = VIDEO_CONFIG.WORDS_PER_MINUTE;
    const pad = VIDEO_CONFIG.SCENE_TRANSITION_PADDING_SEC;
    let total = 0;

    for (const scene of this.scenes) {
      const cleanText = (scene.narration || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const words = cleanText.split(/\s+/).filter(Boolean).length;
      const speechSec = (words / wpm) * 60;

      // Parse SSML break durations
      let breakSec = 0;
      const breakRe = /<break\s+time=["'](\d+(?:\.\d+)?)(s|ms)?["']\s*\/>/gi;
      let m;
      while ((m = breakRe.exec(scene.narration)) !== null) {
        const val = parseFloat(m[1]);
        const unit = (m[2] || 's').toLowerCase();
        breakSec += unit === 'ms' ? val / 1000 : val;
      }

      const duration = Math.max(4, speechSec + breakSec + pad);
      scene.estimatedDurationSec = Math.ceil(duration * 10) / 10;
      total += scene.estimatedDurationSec;
    }

    this.estimatedTotalDurationSec = Math.ceil(total * 10) / 10;
    return this.estimatedTotalDurationSec;
  }

  /** Recalculate total from actual TTS-derived durations after synthesis. */
  recalculateActualDuration() {
    this.actualTotalDurationSec = this.scenes.reduce(
      (sum, s) => sum + (s.actualDurationSec || s.estimatedDurationSec || 0), 0
    );
    return this.actualTotalDurationSec;
  }

  toJSON() {
    return {
      id: this.id,
      topic: this.topic,
      mode: this.mode,
      targetDurationMinutes: this.targetDurationMinutes,
      estimatedTotalDurationSec: this.estimatedTotalDurationSec,
      actualTotalDurationSec: this.actualTotalDurationSec,
      voice: this.voice,
      scenes: this.scenes,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
