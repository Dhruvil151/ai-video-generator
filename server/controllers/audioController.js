import { TTSService } from '../services/ttsService.js';
import { AVAILABLE_VOICES, DEFAULT_VOICE } from '../config/constants.js';

export class AudioController {
  /**
   * POST /api/audio/preview
   * Body: { text, voice? }
   * Returns: { audioUrl, durationSec, subtitles, fromCache }
   */
  static async preview(req, res) {
    const { text, voice = DEFAULT_VOICE } = req.body;

    if (!text || text.trim() === '') {
      return res.status(400).json({ error: 'text is required.' });
    }

    const validVoiceIds = AVAILABLE_VOICES.map(v => v.id);
    if (!validVoiceIds.includes(voice)) {
      return res.status(400).json({
        error: `Invalid voice. Available: ${validVoiceIds.join(', ')}`,
      });
    }

    try {
      const result = await TTSService.synthesize(text, voice, `preview_${Date.now()}`);
      res.json({
        audioUrl:    result.audioUrl,
        durationSec: result.durationSec,
        subtitles:   result.subtitles,
        fromCache:   result.fromCache,
      });
    } catch (err) {
      console.error('[AudioController] Preview error:', err.message);
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * GET /api/audio/voices
   * Returns the list of available neural voices.
   */
  static async listVoices(req, res) {
    res.json({ voices: AVAILABLE_VOICES });
  }
}
