/**
 * RenderPipeline — Phase 5
 *
 * Orchestrates the full video generation pipeline for a single job:
 *
 *   Phase A — TTS (per scene, parallel batches of 3)
 *     For each scene: synthesize narration → get audio file + word timestamps
 *
 *   Phase B — Bundle (once per job)
 *     Bundle the Remotion composition for this job
 *
 *   Phase C — Scene Renders (sequential to avoid OOM)
 *     For each scene: renderMedia() → per-scene .mp4 in job temp dir
 *
 *   Phase D — Stitch
 *     FFmpeg concat all scene MP4s → one raw_concat.mp4
 *     FFmpeg mix background music with ducking → final.mp4
 *     FFmpeg apply fade-in/fade-out → output.mp4
 *
 *   Phase E — Cleanup
 *     Remove per-scene temp files; keep final output
 */
import fs from 'fs';
import path from 'path';
import { ENV } from '../config/env.js';
import { ScriptModel } from '../models/Script.js';
import { TTSService } from './ttsService.js';
import { bundleComposition, renderScene, computeSceneTimings } from './remotionRenderService.js';
import { stitchScenesWithAudio, mixBackgroundMusic, applyFades } from './ffmpegService.js';
import { cleanJobTemp, getJobTempDir } from '../utils/fileHelper.js';
import { JOB_STATUS } from '../models/RenderJob.js';

// In-memory job store (jobId → RenderJobModel)
// Imported from the registry set up in renderController
let _jobRegistry = null;
export function setJobRegistry(registry) { _jobRegistry = registry; }

/**
 * Progress reporting helper — updates BullMQ job progress AND in-memory model.
 */
async function reportProgress(bullJob, model, status, percent, message) {
  if (model) model.updateProgress(status, percent, message);
  try { await bullJob.updateProgress(percent); } catch {}
  console.log(`[Pipeline] [${bullJob.id}] ${percent}% — ${message}`);
}

/**
 * Main pipeline entry point — called by the BullMQ worker.
 *
 * @param {object} bullJob    - BullMQ Job instance
 * @param {object} model      - RenderJobModel instance (in-memory progress store)
 * @param {object} script     - Generated script from Phase 3 (scenes array)
 * @param {object} options    - { voice, bgMusicUrl }
 */
export async function runRenderPipeline(bullJob, model, rawScript, options = {}) {
  const { voice = 'en-US-GuyNeural', bgMusicUrl = null } = options;
  const jobId   = bullJob.id;
  const tempDir = getJobTempDir(jobId);

  // Rehydrate plain JSON object into ScriptModel so SectionModel/VisualModel methods are available.
  // BullMQ serializes job.data to Redis as JSON, stripping class prototypes.
  const script = rawScript instanceof ScriptModel ? rawScript : new ScriptModel(rawScript);

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`[Pipeline] Job ${jobId} — "${script.topic}" [${script.mode}]`);
  console.log(`${'─'.repeat(60)}`);

  try {
    // ── Phase A: TTS synthesis — one audio per section ─────────────────────────
    await reportProgress(bullJob, model, JOB_STATUS.GENERATING_AUDIO, 2, 'Synthesizing voiceover audio…');

    const sections = script.sections;
    const BATCH_SIZE = 3;

    for (let i = 0; i < sections.length; i += BATCH_SIZE) {
      const batch = sections.slice(i, i + BATCH_SIZE);

      await Promise.all(batch.map(async section => {
        const jobScopedId = `job${jobId}_${section.id}`;
        const { audioFile, audioPath, durationSec, subtitles } = await TTSService.synthesize(
          section.narration,
          voice,
          jobScopedId,
        );

        section.audioPath         = audioPath;
        section.audioUrl          = `http://localhost:${ENV.PORT}/public/audio/${audioFile}`;
        section.subtitles         = subtitles || [];
        section.actualDurationSec = durationSec || section.estimatedDurationSec;

        // Distribute audio duration across this section's visuals
        section.populateVisualTimings();
      }));

      const batchEnd = Math.min(i + BATCH_SIZE, sections.length);
      const pct = Math.round(2 + (batchEnd / sections.length) * 13);
      await reportProgress(bullJob, model, JOB_STATUS.GENERATING_AUDIO, pct,
        `TTS ${batchEnd}/${sections.length} sections complete`);
    }

    // Flatten sections → renderable scene objects for Remotion
    // Each visual becomes one scene-like object; Remotion still renders muted
    const renderableScenes = sections.flatMap(s => s.toRenderableScenes());
    console.log(`[Pipeline] ${sections.length} sections → ${renderableScenes.length} visuals to render`);

    // ── Phase B: Bundle ────────────────────────────────────────────────────────
    await reportProgress(bullJob, model, JOB_STATUS.BUNDLING, 15, 'Bundling Remotion composition…');
    const bundleDir = await bundleComposition();
    await reportProgress(bullJob, model, JOB_STATUS.BUNDLING, 20, 'Bundle complete');

    // ── Phase C: Render visuals sequentially ───────────────────────────────────
    await reportProgress(bullJob, model, JOB_STATUS.RENDERING_SCENES, 20, 'Starting scene renders…');

    const timings    = computeSceneTimings(renderableScenes);
    const scenePaths = [];

    for (let i = 0; i < timings.length; i++) {
      const { scene, fromFrame, durationFrames } = timings[i];
      const sceneFile = path.join(tempDir, `scene_${String(i).padStart(3, '0')}.mp4`);

      await reportProgress(bullJob, model, JOB_STATUS.RENDERING_SCENES,
        20 + Math.round((i / timings.length) * 50),
        `Rendering visual ${i + 1}/${timings.length}: ${scene.title}`);

      await renderScene({
        bundleDir,
        fromFrame,
        durationFrames,
        scenes: renderableScenes.map(s => ({ ...s, audioUrl: null })),
        bgMusicUrl: null,
        topic: script.topic || '',
        outputPath: sceneFile,
      });

      if (model) model.onSceneComplete(i);
      scenePaths.push(sceneFile);
      console.log(`[Pipeline] ✓ Visual ${i + 1}/${renderableScenes.length} rendered → ${path.basename(sceneFile)}`);
    }

    // ── Phase D: Stitch — audio trimmed to each visual's window ───────────────
    await reportProgress(bullJob, model, JOB_STATUS.STITCHING, 70, 'Concatenating scene videos with audio…');

    // Each visual descriptor includes audioStartSec: where in the section audio it starts.
    // FFmpeg atrim uses start:end offsets so visuals 2+ get the correct portion of the audio.
    const sceneDescriptors = [];
    let visualIdx = 0;
    for (const section of sections) {
      for (const visual of section.visuals) {
        sceneDescriptors.push({
          videoPath:     scenePaths[visualIdx],
          audioPath:     section.audioPath,
          audioStartSec: visual.startSec,
          durationSec:   visual.durationSec,
        });
        visualIdx++;
      }
    }

    const concatPath = path.join(tempDir, 'raw_concat.lossless.mp4');
    await stitchScenesWithAudio(sceneDescriptors, concatPath);

    // Determine final output filename
    const slug       = script.topic.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 32);
    const outputFile = `${slug}_${jobId}.mp4`;
    const outputPath = path.join(ENV.OUTPUT_DIR, outputFile);

    // Check for background music
    const musicFile = path.join(ENV.MUSIC_DIR, 'background.mp3');
    const hasBgMusic = bgMusicUrl || fs.existsSync(musicFile);

    if (hasBgMusic) {
      await reportProgress(bullJob, model, JOB_STATUS.STITCHING, 82, 'Mixing background music with ducking…');
      const mixedPath = path.join(tempDir, 'mixed.mp4');
      await mixBackgroundMusic({
        videoPath:  concatPath,
        musicPath:  bgMusicUrl ? path.join(ENV.ROOT_DIR, bgMusicUrl.replace(/^\//, '')) : musicFile,
        outputPath: mixedPath,
      });

      await reportProgress(bullJob, model, JOB_STATUS.STITCHING, 92, 'Applying fade-in / fade-out…');
      await applyFades(mixedPath, outputPath, 0.5);
    } else {
      await reportProgress(bullJob, model, JOB_STATUS.STITCHING, 92, 'Applying fade-in / fade-out…');
      await applyFades(concatPath, outputPath, 0.5);
    }

    // ── Phase E: Cleanup ───────────────────────────────────────────────────────
    await reportProgress(bullJob, model, JOB_STATUS.STITCHING, 98, 'Cleaning up temp files…');
    cleanJobTemp(jobId);

    // ── Done ───────────────────────────────────────────────────────────────────
    const outputUrl  = `/public/output/${outputFile}`;
    if (model) {
      model.outputVideoPath = outputPath;
      model.outputVideoUrl  = outputUrl;
      model.updateProgress(JOB_STATUS.COMPLETED, 100, 'Video ready!');
    }

    await reportProgress(bullJob, model, JOB_STATUS.COMPLETED, 100, `Video ready: ${outputUrl}`);
    console.log(`[Pipeline] ✓ Job ${jobId} complete → ${outputPath}`);

    return { outputPath, outputUrl };

  } catch (err) {
    console.error(`[Pipeline] ✗ Job ${jobId} failed:`, err.message);
    if (model) model.fail(err.message);

    // Try to clean up temp files on failure too
    try { cleanJobTemp(jobId); } catch {}

    throw err;
  }
}
