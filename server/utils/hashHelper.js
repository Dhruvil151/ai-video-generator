import { createHash } from 'crypto';

/**
 * Generate a short SHA-256 hex hash from any serializable value.
 * Used as a deterministic cache key for TTS audio and scene chunks.
 *
 * @param {string | object} input - Value to hash
 * @returns {string} 16-character hex prefix of SHA-256 hash
 */
export function sha256(input) {
  const str = typeof input === 'string' ? input : JSON.stringify(input);
  return createHash('sha256').update(str).digest('hex').slice(0, 16);
}

/**
 * Build a cache key for a TTS audio file.
 * Key is stable as long as text and voice don't change.
 */
export function ttsCacheKey(text, voice) {
  return sha256(`tts::${voice}::${text}`);
}

/**
 * Build a cache key for a rendered scene MP4 chunk.
 * Key is stable as long as sceneData payload and audio file haven't changed.
 */
export function sceneCacheKey(sceneData, audioFileHash) {
  return sha256(`scene::${audioFileHash}::${JSON.stringify(sceneData)}`);
}
