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
      // ── CodeEditorScene ──────────────────────────────────────────────────
      code:           data.payload?.code           || '',
      language:       data.payload?.language       || 'javascript',
      filename:       data.payload?.filename       || 'index.js',
      highlightLines: data.payload?.highlightLines || [],
      callout:        data.payload?.callout        || '',

      // ── ArchitectureScene ────────────────────────────────────────────────
      // nodes: [{ id, label, icon, status: 'active'|'idle'|'processing'|'success' }]
      nodes:           data.payload?.nodes           || [],
      // connections: [{ from (nodeId), to (nodeId), label }]
      connections:     data.payload?.connections     || [],
      flowDescription: data.payload?.flowDescription || '',

      // ── ConceptCardScene / SummaryScene ─────────────────────────────────
      // bulletPoints: [{ icon, title, description }]
      bulletPoints: data.payload?.bulletPoints || [],
      badges:       data.payload?.badges       || [],
      keyTakeaway:  data.payload?.keyTakeaway  || '',

      // ── ComparisonScene ──────────────────────────────────────────────────
      leftTitle:  data.payload?.leftTitle  || '',
      leftPoints: data.payload?.leftPoints || [],
      rightTitle: data.payload?.rightTitle || '',
      rightPoints: data.payload?.rightPoints || [],

      // ── TitleScene ───────────────────────────────────────────────────────
      topicTag: data.payload?.topicTag || '',
    };
  }

  validate() {
    if (!this.narration || this.narration.trim() === '') {
      throw new Error(`Scene "${this.title}" (${this.id}) is missing narration text.`);
    }
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
