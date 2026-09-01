import { Audio, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import React from 'react';

interface WordTimestamp {
  text: string;
  start: number; // seconds
  end: number;   // seconds
}

interface AudioMixerProps {
  voiceoverUrl: string | null;
  bgMusicUrl:   string | null;
  subtitles:    WordTimestamp[];
  sceneDurationSec: number;
}

const BG_VOLUME_AMBIENT = 0.14;  // volume when no voiceover speech
const BG_VOLUME_DUCKED  = 0.018; // volume under voiceover
const FADE_IN_SEC  = 0.3;        // music fade-in seconds
const FADE_OUT_SEC = 0.5;        // music fade-out at end of scene

export const AudioMixer: React.FC<AudioMixerProps> = ({
  voiceoverUrl,
  bgMusicUrl,
  subtitles,
  sceneDurationSec,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentSec = frame / fps;

  // ── Background music volume with ducking ─────────────────────────────────
  const bgMusicVolume = React.useMemo(() => {
    if (!bgMusicUrl) return 0;

    const totalFrames = Math.ceil(sceneDurationSec * fps);

    // Fade in at start
    const fadeInFrames  = Math.ceil(FADE_IN_SEC * fps);
    const fadeOutFrames = Math.ceil(FADE_OUT_SEC * fps);
    const fadeFactor = interpolate(
      frame,
      [0, fadeInFrames, totalFrames - fadeOutFrames, totalFrames],
      [0, 1, 1, 0],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );

    // Duck based on active word boundaries (with 200ms lookahead)
    const LOOKAHEAD_SEC = 0.2;
    const LOOKBEHIND_SEC = 0.1;

    const isSpeaking = subtitles.length > 0
      ? subtitles.some(w =>
          currentSec >= (w.start - LOOKAHEAD_SEC) &&
          currentSec <= (w.end + LOOKBEHIND_SEC)
        )
      : voiceoverUrl !== null; // duck entire scene if no subtitles but audio exists

    const targetVolume = isSpeaking ? BG_VOLUME_DUCKED : BG_VOLUME_AMBIENT;

    // Smooth the ducking transition (10 frames / ~333ms)
    return targetVolume * fadeFactor;
  }, [frame, fps, bgMusicUrl, subtitles, sceneDurationSec, voiceoverUrl, currentSec]);

  return (
    <>
      {/* Voiceover */}
      {voiceoverUrl && (
        <Audio
          src={voiceoverUrl}
          volume={1.0}
          startFrom={0}
        />
      )}

      {/* Background music */}
      {bgMusicUrl && (
        <Audio
          src={bgMusicUrl}
          volume={bgMusicVolume}
          loop
        />
      )}
    </>
  );
};
