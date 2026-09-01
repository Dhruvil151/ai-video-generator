import { GeminiService } from '../services/geminiService.js';
import { VIDEO_MODES } from '../config/constants.js';
import { formatDuration, estimateNarrationDuration } from '../utils/durationCalculator.js';

// In-memory script store (Phase 5 will persist to Redis)
export const scriptStore = new Map();


export class ScriptController {
  /**
   * POST /api/script/estimate
   * Body: { topic, mode }
   *
   * Fast, free estimation — no Gemini API call.
   * Returns estimated duration, word count, and scene count.
   */
  static estimate(req, res) {
    const { topic, mode = 'short' } = req.body;

    if (!topic || topic.trim() === '') {
      return res.status(400).json({ error: 'topic is required.' });
    }

    const validModes = Object.keys(VIDEO_MODES);
    if (!validModes.includes(mode)) {
      return res.status(400).json({ error: `Invalid mode. Use one of: ${validModes.join(', ')}` });
    }

    const result = GeminiService.estimate(topic.trim(), mode);
    res.json(result);
  }

  /**
   * POST /api/script/generate
   * Body: { topic, mode, apiKey?, voice?, targetDurationMinutes? }
   *
   * Calls Gemini to generate a full scene-by-scene storyboard.
   * Returns the full ScriptModel JSON including estimated durations.
   */
  static async generate(req, res) {
    const {
      topic,
      mode = 'short',
      apiKey,
      voice,
      targetDurationMinutes
    } = req.body;

    if (!topic || topic.trim() === '') {
      return res.status(400).json({ error: 'topic is required.' });
    }

    const validModes = Object.keys(VIDEO_MODES);
    if (!validModes.includes(mode)) {
      return res.status(400).json({ error: `Invalid mode. Use one of: ${validModes.join(', ')}` });
    }

    try {
      console.log(`[ScriptController] Generating script: "${topic}" [${mode}]`);
      const t0 = Date.now();

      const script = await GeminiService.generateScript({
        topic: topic.trim(),
        mode,
        apiKey,
        voice,
        targetDurationMinutes: targetDurationMinutes ? Number(targetDurationMinutes) : undefined,
      });

      const elapsed = Date.now() - t0;
      console.log(`[ScriptController] Script generated in ${elapsed}ms — ${script.scenes.length} scenes, ~${formatDuration(script.estimatedTotalDurationSec)}`);

      // Store in memory so the render controller can retrieve it by ID
      scriptStore.set(script.id, script);

      res.json(script.toJSON());
    } catch (err) {
      console.error('[ScriptController] Generate error:', err.message);

      // Differentiate API key errors from other failures
      if (err.message.includes('API key')) {
        return res.status(401).json({ error: err.message });
      }
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * GET /api/script/:scriptId
   * Retrieve a previously generated script from the in-memory store.
   */
  static get(req, res) {
    const { scriptId } = req.params;
    const script = scriptStore.get(scriptId);
    if (!script) {
      return res.status(404).json({ error: `Script "${scriptId}" not found. Re-generate it.` });
    }
    res.json(script.toJSON());
  }

  /**
   * PATCH /api/script/:scriptId/scene/:sceneId
   * Update a single scene's narration, code, or payload fields.
   * Used by the storyboard editor to apply user edits.
   */
  static updateScene(req, res) {
    const { scriptId, sceneId } = req.params;
    const updates = req.body;

    const script = scriptStore.get(scriptId);
    if (!script) {
      return res.status(404).json({ error: `Script "${scriptId}" not found.` });
    }

    const scene = script.scenes.find(s => s.id === sceneId);
    if (!scene) {
      return res.status(404).json({ error: `Scene "${sceneId}" not found in script "${scriptId}".` });
    }

    // Apply allowed updates
    if (updates.narration !== undefined) scene.narration  = updates.narration;
    if (updates.title     !== undefined) scene.title      = updates.title;
    if (updates.subtitle  !== undefined) scene.subtitle   = updates.subtitle;
    if (updates.payload   !== undefined) scene.payload    = { ...scene.payload, ...updates.payload };

    // Recalculate estimated duration after narration edit
    if (updates.narration !== undefined) {
      scene.estimatedDurationSec = Math.ceil(estimateNarrationDuration(scene.narration));
      script.calculateEstimatedDuration();
    }

    script.updatedAt = new Date().toISOString();
    scriptStore.set(scriptId, script);

    res.json({ scene, estimatedTotalDurationSec: script.estimatedTotalDurationSec });
  }


  // Expose store for use by renderController (Phase 5)
  static getScriptStore() {
    return scriptStore;
  }
}
