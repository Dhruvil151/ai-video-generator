import { VIDEO_CONFIG } from '../config/constants.js';

/**
 * Estimate the spoken duration of a narration string.
 *
 * - Strips all SSML/HTML tags to count actual spoken words.
 * - Parses <break time="Xs"/> or <break time="500ms"/> markers
 *   and adds their total duration to the speech time.
 * - Adds scene transition padding.
 *
 * @param {string} text - Narration text (may contain SSML break tags)
 * @param {number} [wpm] - Words per minute (default from VIDEO_CONFIG)
 * @returns {number} Estimated duration in seconds
 */
export function estimateNarrationDuration(text = '', wpm = VIDEO_CONFIG.WORDS_PER_MINUTE) {
  if (!text.trim()) return VIDEO_CONFIG.SCENE_TRANSITION_PADDING_SEC;

  // Strip tags to count spoken words only
  const spokenText = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const wordCount = spokenText.split(/\s+/).filter(Boolean).length;
  const speechSec = (wordCount / wpm) * 60;

  // Sum up SSML break durations
  let breakSec = 0;
  const breakRe = /<break\s+time=["'](\d+(?:\.\d+)?)(s|ms)?["']\s*\/>/gi;
  let match;
  while ((match = breakRe.exec(text)) !== null) {
    const value = parseFloat(match[1]);
    const unit  = (match[2] || 's').toLowerCase();
    breakSec += unit === 'ms' ? value / 1000 : value;
  }

  return Math.max(3, speechSec + breakSec + VIDEO_CONFIG.SCENE_TRANSITION_PADDING_SEC);
}

/**
 * Format total seconds as MM:SS.
 * @param {number} totalSeconds
 * @returns {string}
 */
export function formatDuration(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.round(totalSeconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/**
 * Convert Remotion frames to seconds.
 */
export function framesToSeconds(frames, fps = VIDEO_CONFIG.FPS) {
  return frames / fps;
}

/**
 * Convert seconds to Remotion frames (always rounded up).
 */
export function secondsToFrames(seconds, fps = VIDEO_CONFIG.FPS) {
  return Math.ceil(seconds * fps);
}
