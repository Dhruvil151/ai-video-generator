/**
 * FFmpegService — Phase 5
 *
 * Responsibilities:
 *  1. concatenateScenes()  — concat all per-scene MP4s into a single video
 *  2. mixAudio()           — overlay TTS audio + bg music with ducking onto the video
 *  3. stitchFinalVideo()   — full pipeline: concat → mix
 *
 * Uses `ffmpeg-static` for a zero-install FFmpeg binary.
 */
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import ffmpegPath from 'ffmpeg-static';

const execFileAsync = promisify(execFile);

/**
 * Run ffmpeg with the given args and log the command.
 */
async function ffmpeg(...args) {
  console.log(`[FFmpeg] ${args.slice(0, 6).join(' ')}…`);
  try {
    const { stdout, stderr } = await execFileAsync(ffmpegPath, args, {
      maxBuffer: 100 * 1024 * 1024, // 100MB
    });
    return { stdout, stderr };
  } catch (err) {
    // ffmpeg writes progress to stderr but exits 0 — only throw on real errors
    throw new Error(`[FFmpegService] Error: ${err.message}\n${err.stderr?.slice(-800) || ''}`);
  }
}

/**
 * Write a concat list file for ffmpeg demuxer.
 * @param {string[]} filePaths - absolute paths to scene MP4s (in order)
 * @param {string} listPath    - where to write the concat list
 */
function writeConcatList(filePaths, listPath) {
  const content = filePaths
    .map(p => `file '${p.replace(/\\/g, '/')}'`)
    .join('\n');
  fs.writeFileSync(listPath, content, 'utf-8');
}

/**
 * Concatenate multiple scene MP4 files into one file (no re-encode).
 * Requires all inputs to have identical codec, resolution, and fps.
 *
 * @param {string[]} scenePaths  - ordered array of scene MP4 paths
 * @param {string}   outputPath  - output concatenated MP4 path
 */
export async function concatenateScenes(scenePaths, outputPath) {
  if (scenePaths.length === 0) throw new Error('No scene paths provided to concatenate');

  if (scenePaths.length === 1) {
    // Nothing to concat — just copy
    fs.copyFileSync(scenePaths[0], outputPath);
    return;
  }

  const listPath = outputPath + '.concat.txt';
  writeConcatList(scenePaths, listPath);

  await ffmpeg(
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', listPath,
    '-c', 'copy',
    outputPath
  );

  fs.unlinkSync(listPath);
  console.log(`[FFmpeg] Concatenated ${scenePaths.length} scenes → ${path.basename(outputPath)}`);
}

/**
 * Mix background music onto an already-rendered video with audio ducking.
 *
 * The final mix:
 *   - TTS voiceover (from video stream) at full volume
 *   - Background music at AMBIENT volume when no speech
 *   - Background music ducked to LOW volume when speech is detected via sidechaining
 *
 * @param {object} opts
 * @param {string}   opts.videoPath    - input video (with TTS audio baked in)
 * @param {string}   opts.musicPath    - background music file (any format)
 * @param {string}   opts.outputPath   - output path for final mixed video
 * @param {number}   [opts.ambientVol] - music volume when no speech (0.0–1.0)
 * @param {number}   [opts.duckedVol]  - music volume when speech present (0.0–1.0)
 */
export async function mixBackgroundMusic({
  videoPath,
  musicPath,
  outputPath,
  ambientVol = 0.14,
  duckedVol  = 0.02,
}) {
  if (!musicPath || !fs.existsSync(musicPath)) {
    // No music — just copy video as-is
    fs.copyFileSync(videoPath, outputPath);
    return;
  }

  /**
   * FFmpeg filter graph:
   * 1. Loop background music for the entire video duration
   * 2. Apply sidechain ducking: the voiceover (stream 0:a) controls
   *    the gain of the bg music stream. When voice energy is high → duck.
   *
   * Uses the `sidechaincompress` filter (available in ffmpeg 4.x+).
   */
  const duckFilter = [
    // Voice audio: pass through at full volume
    '[0:a]aformat=sample_rates=44100:channel_layouts=stereo[voice]',
    // Bg music: loop + normalize
    `[1:a]aloop=loop=-1:size=2e+09,aformat=sample_rates=44100:channel_layouts=stereo,volume=${ambientVol}[bgraw]`,
    // Sidechain: use voice as key, compress bg music
    `[bgraw][voice]sidechaincompress=threshold=0.01:ratio=20:attack=200:release=1000:level_sc=0.8[bgduck]`,
    // Mix voice + ducked bg
    `[voice][bgduck]amix=inputs=2:duration=first:weights=1 1[aout]`,
  ].join(';');

  await ffmpeg(
    '-y',
    '-i', videoPath,
    '-stream_loop', '-1', '-i', musicPath,
    '-filter_complex', duckFilter,
    '-map', '0:v',
    '-map', '[aout]',
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-shortest',
    outputPath
  );

  console.log(`[FFmpeg] Background music mixed with ducking → ${path.basename(outputPath)}`);
}

/**
 * Add a short fade-in at the start and fade-out at the end of the final video.
 *
 * @param {string} inputPath
 * @param {string} outputPath
 * @param {number} fadeSec - duration of fade in/out in seconds
 */
export async function applyFades(inputPath, outputPath, fadeSec = 0.5) {
  // Get duration first
  const { stdout } = await execFileAsync(ffmpegPath, [
    '-i', inputPath,
    '-f', 'null', '-'
  ]).catch(err => ({ stdout: '', stderr: err.stderr || '' }));

  // Extract duration from stderr (ffmpeg writes stats to stderr)
  // If we can't get duration, skip fades
  let duration = null;
  const match = (stdout + '').match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
  if (match) {
    duration = parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseFloat(match[3]);
  }

  if (!duration) {
    fs.copyFileSync(inputPath, outputPath);
    return;
  }

  const fadeOutStart = Math.max(0, duration - fadeSec);
  const vf = `fade=t=in:st=0:d=${fadeSec},fade=t=out:st=${fadeOutStart.toFixed(2)}:d=${fadeSec}`;
  const af = `afade=t=in:st=0:d=${fadeSec},afade=t=out:st=${fadeOutStart.toFixed(2)}:d=${fadeSec}`;

  await ffmpeg(
    '-y',
    '-i', inputPath,
    '-vf', vf,
    '-af', af,
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '18',
    '-c:a', 'aac',
    '-b:a', '192k',
    outputPath
  );

  console.log(`[FFmpeg] Fades applied (${fadeSec}s) → ${path.basename(outputPath)}`);
}

/**
 * Get video duration in seconds using ffprobe.
 * @param {string} filePath
 * @returns {Promise<number>}
 */
export async function getVideoDuration(filePath) {
  try {
    const { stdout } = await execFileAsync(ffmpegPath, [
      '-i', filePath, '-f', 'null', '-'
    ]).catch(err => ({ stdout: '', stderr: err.stderr || '' }));

    const lines = stdout + '';
    const m = lines.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
    if (!m) return 0;
    return parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseFloat(m[3]);
  } catch {
    return 0;
  }
}
