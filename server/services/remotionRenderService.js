/**
 * RemoionRenderService — Phase 5
 *
 * Responsibilities:
 *  1. bundle() — bundle the Remotion composition once per job
 *  2. renderScene() — render a single scene Sequence to MP4 using renderMedia()
 *
 * Design decisions:
 *  - One bundle per job (reused across all scene renders)
 *  - concurrencyPerCpu = Math.max(1, Math.floor(cpus/2)) for Chromium headless
 *  - Each scene is rendered with its own Sequence range (from → from+duration)
 *  - Output is a per-scene MP4 in the job temp dir; FFmpegService stitches them
 */
import path from 'path';
import os from 'os';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { ENV } from '../config/env.js';
import { sceneTimings } from '../../shared/timeline.mjs';

const ENTRY_POINT = path.resolve(ENV.ROOT_DIR, 'src/remotion/index.ts');
const COMPOSITION_ID = 'EducationalVideo';
const FPS = 30;
const MAX_RETRIES = 2;

/**
 * Bundle the Remotion composition.
 * Returns the bundle directory path.
 * @returns {Promise<string>} bundleDir
 */
export async function bundleComposition() {
  console.log('[RenderService] Bundling Remotion composition…');
  const bundleDir = await bundle({
    entryPoint: ENTRY_POINT,
    webpackOverride: (config) => config,
  });
  console.log('[RenderService] Bundle complete:', bundleDir);
  return bundleDir;
}

/**
 * Render a single scene to an MP4 file.
 *
 * @param {object} opts
 * @param {string}   opts.bundleDir      - Remotion bundle directory
 * @param {number}   opts.fromFrame      - The first frame of this scene in the full timeline
 * @param {number}   opts.durationFrames - How many frames this scene spans
 * @param {object[]} opts.scenes         - Full scenes array (passed as composition props)
 * @param {string|null} opts.bgMusicUrl  - Public URL to lofi background music
 * @param {string}   opts.outputPath     - Absolute path for the output .mp4
 * @param {number}   [opts.attempt]      - Retry count (internal)
 * @returns {Promise<void>}
 */
export async function renderScene({
  bundleDir,
  fromFrame,
  durationFrames,
  scenes,
  examples,
  bgMusicUrl,
  topic,
  outputPath,
  attempt = 0,
}) {
  // Total duration of all scenes combined (needed to size the full composition)
  const totalFrames = scenes.reduce((sum, s) => {
    const dur = s.actualDurationSec || s.estimatedDurationSec || 10;
    return sum + (s.durationFrames || Math.ceil(dur * FPS));
  }, 0);

  // Select composition and resolve its props
  const composition = await selectComposition({
    serveUrl: bundleDir,
    id: COMPOSITION_ID,
    inputProps: { scenes, examples: examples || [], bgMusicUrl, topic: topic || '' },
  });

  // Override duration to the full video length (all scenes must be in the timeline
  // so Sequence offsets are correct), but we only EXPORT the frames for this scene
  const extendedComposition = {
    ...composition,
    durationInFrames: Math.max(totalFrames, composition.durationInFrames),
  };

  const cpus = os.cpus().length;
  const concurrency = Math.max(1, Math.floor(cpus / 2));

  try {
    await renderMedia({
      composition: extendedComposition,
      serveUrl: bundleDir,
      codec: 'h264',
      outputLocation: outputPath,
      inputProps: { scenes, examples: examples || [], bgMusicUrl, topic: topic || '' },
      frameRange: [fromFrame, fromFrame + durationFrames - 1],
      concurrency,
      imageFormat: 'png',
      crf: 1,
      muted: true,   // FFmpeg handles the final audio mix in renderPipeline.js — do NOT bake audio here
      logLevel: 'warn',
    });
  } catch (err) {
    if (attempt < MAX_RETRIES) {
      console.warn(`[RenderService] Scene render failed (attempt ${attempt + 1}), retrying…`);
      await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
      return renderScene({ bundleDir, fromFrame, durationFrames, scenes, examples, bgMusicUrl, topic, outputPath, attempt: attempt + 1 });
    }
    throw err;
  }
}

/**
 * Compute the cumulative frame offset for each scene.
 * Returns array of { scene, fromFrame, durationFrames }.
 */
export function computeSceneTimings(scenes) {
  return sceneTimings(scenes, FPS);
}
