import fs from 'fs';
import path from 'path';
import { ENV } from '../config/env.js';
import { TTS_CACHE_TTL_HOURS, SCENE_CACHE_TTL_HOURS } from '../config/constants.js';

/**
 * File-based cache with TTL metadata JSON.
 *
 * Cache structure:
 *   cache/tts/<hash>.mp3
 *   cache/tts/<hash>_meta.json   ← contains { createdAt, ttlHours, ...ttsResult }
 *
 *   cache/scenes/<hash>.mp4
 *   cache/scenes/<hash>_meta.json
 */
export class CacheService {
  // ── TTS Cache ──────────────────────────────────────────────────────────────

  static ttsMp3Path(hash) {
    return path.join(ENV.TTS_CACHE_DIR, `${hash}.mp3`);
  }

  static ttsMetaPath(hash) {
    return path.join(ENV.TTS_CACHE_DIR, `${hash}_meta.json`);
  }

  static hasTtsCache(hash) {
    return this._isValid(this.ttsMetaPath(hash), TTS_CACHE_TTL_HOURS) &&
           fs.existsSync(this.ttsMp3Path(hash));
  }

  static getTtsCache(hash) {
    if (!this.hasTtsCache(hash)) return null;
    try {
      const meta = JSON.parse(fs.readFileSync(this.ttsMetaPath(hash), 'utf-8'));
      return {
        audioFile:   meta.audioFile,
        audioPath:   this.ttsMp3Path(hash),
        audioUrl:    `/public/audio/${meta.audioFile}`,
        durationSec: meta.durationSec,
        subtitles:   meta.subtitles || [],
        fromCache:   true,
      };
    } catch {
      return null;
    }
  }

  static saveTtsCache(hash, result) {
    const meta = {
      createdAt:   new Date().toISOString(),
      ttlHours:    TTS_CACHE_TTL_HOURS,
      audioFile:   result.audioFile,
      durationSec: result.durationSec,
      subtitles:   result.subtitles,
    };
    fs.writeFileSync(this.ttsMetaPath(hash), JSON.stringify(meta, null, 2));
  }

  // ── Scene Chunk Cache ──────────────────────────────────────────────────────

  static sceneMp4Path(hash) {
    return path.join(ENV.SCENE_CACHE_DIR, `${hash}.mp4`);
  }

  static sceneMetaPath(hash) {
    return path.join(ENV.SCENE_CACHE_DIR, `${hash}_meta.json`);
  }

  static hasSceneCache(hash) {
    return this._isValid(this.sceneMetaPath(hash), SCENE_CACHE_TTL_HOURS) &&
           fs.existsSync(this.sceneMp4Path(hash));
  }

  static saveSceneMeta(hash, meta) {
    const record = {
      createdAt: new Date().toISOString(),
      ttlHours:  SCENE_CACHE_TTL_HOURS,
      ...meta,
    };
    fs.writeFileSync(this.sceneMetaPath(hash), JSON.stringify(record, null, 2));
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  static _isValid(metaPath, ttlHours) {
    if (!fs.existsSync(metaPath)) return false;
    try {
      const { createdAt } = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      const ageMs = Date.now() - new Date(createdAt).getTime();
      return ageMs < ttlHours * 60 * 60 * 1000;
    } catch {
      return false;
    }
  }
}
