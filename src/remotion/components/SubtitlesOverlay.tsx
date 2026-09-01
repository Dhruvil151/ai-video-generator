import { Audio, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import React from 'react';

interface WordTimestamp {
  text: string;
  start: number; // seconds
  end: number;   // seconds
}

interface SubtitlesOverlayProps {
  subtitles: WordTimestamp[];
  audioStartSec?: number; // offset into the scene's global frame
}

export const SubtitlesOverlay: React.FC<SubtitlesOverlayProps> = ({
  subtitles,
  audioStartSec = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentSec = frame / fps - audioStartSec;

  // If no subtitles from Edge-TTS, return nothing
  if (!subtitles || subtitles.length === 0) return null;

  // Find the active window of words to display (max ~12 words around current position)
  const WINDOW = 12;
  const activeIdx = subtitles.findIndex((w: WordTimestamp) => currentSec >= w.start && currentSec <= w.end);

  // Manual findLastIndex (ES2019 compat — no ES2023 needed)
  let lastSpokenIdx = -1;
  for (let i = subtitles.length - 1; i >= 0; i--) {
    if (currentSec > subtitles[i].end) { lastSpokenIdx = i; break; }
  }

  // Window centered around active word
  let start = Math.max(0, (activeIdx >= 0 ? activeIdx : lastSpokenIdx + 1) - 4);
  let end   = Math.min(subtitles.length, start + WINDOW);
  start     = Math.max(0, end - WINDOW);

  const visible = subtitles.slice(start, end);

  const containerOpacity = interpolate(frame, [0, fps * 0.3], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div className="subtitles-container" style={{ opacity: containerOpacity }}>
      <p className="subtitles-text">
        {visible.map((word, i) => {
          const globalIdx = start + i;
          const isActive  = currentSec >= word.start && currentSec <= word.end;
          const isSpoken  = currentSec > word.end;
          const className = isActive
            ? 'subtitle-word subtitle-word--active'
            : isSpoken
            ? 'subtitle-word subtitle-word--spoken'
            : 'subtitle-word';

          return (
            <span key={globalIdx} className={className}>
              {word.text}{' '}
            </span>
          );
        })}
      </p>
    </div>
  );
};

// ── Subtitle estimator ────────────────────────────────────────────────────────
/**
 * When Edge-TTS doesn't return word boundaries, generate approximate timestamps
 * from the narration text and its known total duration.
 */
export function estimateSubtitles(
  narration: string,
  durationSec: number,
): WordTimestamp[] {
  const cleaned = narration.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const words   = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const secPerWord = durationSec / words.length;
  let cursor = 0.1;

  return words.map(text => {
    const start = cursor;
    const end   = cursor + secPerWord * 0.85;
    cursor      = cursor + secPerWord;
    return { text, start: Math.round(start * 1000) / 1000, end: Math.round(end * 1000) / 1000 };
  });
}
