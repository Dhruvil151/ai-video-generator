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
import ffprobe from 'ffprobe-static';

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
 * Concatenate muted scene MP4s and mix each scene's TTS audio in one FFmpeg pass.
 *
 * Since Remotion now renders video-only (muted: true), this function:
 * 1. Builds a concat list of video-only scene chunks.
 * 2. Adds each scene's MP3 audio as a separate input, trimmed to its scene duration.
 * 3. Concatenates video + audio together using the FFmpeg concat filter.
 *
 * @param {Array<{videoPath: string, audioPath: string, audioStartSec: number, durationSec: number}>} scenes
 * @param {string} outputPath - final stitched MP4 (video + TTS audio, no bg music yet)
 */
export async function stitchSections(scenePaths, sections, outputPath) {
  const videoPath = outputPath + '.video.mp4';
  await concatenateScenes(scenePaths, videoPath);
  const inputs = ['-i', videoPath];
  const filters = [];
  sections.forEach((section, i) => {
    if (!section.audioPath) throw new Error(`Missing audio for ${section.id}`);
    inputs.push('-i', section.audioPath);
    const seconds = section.timelineDurationSec;
    if (!Number.isFinite(seconds) || seconds <= 0) throw new Error('Missing compiled section timing');
    filters.push(`[${i+1}:a]aresample=48000,apad,atrim=duration=${seconds.toFixed(9)},asetpts=PTS-STARTPTS[a${i}]`);
  });
  filters.push(`${sections.map((_,i)=>`[a${i}]`).join('')}concat=n=${sections.length}:v=0:a=1[audio]`);
  try {
    await ffmpeg('-y', ...inputs, '-filter_complex', filters.join(';'), '-map', '0:v', '-map', '[audio]',
      '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', outputPath);
  } finally {
    if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
  }
}

export async function stitchScenesWithAudio(scenes, outputPath) {
  if (scenes.length === 0) throw new Error('No scenes provided to stitch');

  // Build input flags: alternating -i video -i audio for each scene
  const inputs = [];
  for (const s of scenes) {
    inputs.push('-i', s.videoPath);
    inputs.push('-i', s.audioPath);
  }

  // Build filter_complex.
  // FFmpeg concat requires inputs interleaved: [v0][a0][v1][a1]...
  // NOT grouped: [v0][v1]...[a0][a1]...
  const n = scenes.length;
  const filterParts = [];

  // Normalize each video + trim each audio to the scene duration
  for (let i = 0; i < n; i++) {
    const vidIdx = i * 2;      // 0, 2, 4 …
    const audIdx = i * 2 + 1;  // 1, 3, 5 …
    filterParts.push(
      `[${vidIdx}:v]scale=1920:1080:force_original_aspect_ratio=decrease,` +
      `pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,format=yuv420p,setpts=PTS-STARTPTS[v${i}]`
    );
    filterParts.push(
      `[${audIdx}:a]aresample=48000,atrim=${(scenes[i].audioStartSec||0).toFixed(3)}:${((scenes[i].audioStartSec||0)+scenes[i].durationSec).toFixed(3)},asetpts=PTS-STARTPTS[a${i}]`
    );
  }

  // Interleave inputs for concat: [v0][a0][v1][a1]...concat=n=N:v=1:a=1
  const interleavedInputs = Array.from({ length: n }, (_, i) => `[v${i}][a${i}]`).join('');
  filterParts.push(`${interleavedInputs}concat=n=${n}:v=1:a=1[vout][aout]`);

  const filterComplex = filterParts.join(';');

  await ffmpeg(
    '-y',
    ...inputs,
    '-filter_complex', filterComplex,
    '-map', '[vout]',
    '-map', '[aout]',
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-crf', '0',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-ar', '48000',
    '-movflags', '+faststart',
    outputPath
  );

  console.log(`[FFmpeg] Stitched ${n} scenes with audio (lossless) → ${path.basename(outputPath)}`);
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
    '[0:a]aformat=sample_rates=48000:channel_layouts=stereo,asplit=2[voice][sidechain]',
    `[1:a]aloop=loop=-1:size=2e+09,aformat=sample_rates=48000:channel_layouts=stereo,volume=${ambientVol}[bgraw]`,
    // Sidechain: use voice as key, compress bg music
    `[bgraw][sidechain]sidechaincompress=threshold=0.01:ratio=20:attack=200:release=1000:level_sc=0.8[bgduck]`,
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
    '-t', String(await getVideoDuration(videoPath)),
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
  const duration = await getVideoDuration(inputPath);

  if (!duration) {
    console.warn('[FFmpeg] applyFades: could not determine duration — encoding without fades (CRF 16)');
    await ffmpeg(
      '-y', '-i', inputPath,
      '-r', '30',
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '16',
      '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
      '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
      '-movflags', '+faststart',
      outputPath,
    );
    return;
  }

  const fadeOutStart = Math.max(0, duration - fadeSec);
  const vf = [
    `fade=t=in:st=0:d=${fadeSec}`,
    `fade=t=out:st=${fadeOutStart.toFixed(2)}:d=${fadeSec}`,
    // Fix E: normalize color space to broadcast standard (yuv420p + bt709)
    'format=yuv420p',
  ].join(',');

  const af = `afade=t=in:st=0:d=${fadeSec},afade=t=out:st=${fadeOutStart.toFixed(2)}:d=${fadeSec}`;

  await ffmpeg(
    '-y',
    '-i', inputPath,
    '-vf', vf,
    '-af', af,
    // Fix F: enforce uniform 30fps output
    '-r', '30',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '16',
    '-color_range', 'tv',
    '-colorspace', 'bt709',
    '-color_primaries', 'bt709',
    '-color_trc', 'bt709',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-ar', '48000',
    '-movflags', '+faststart',
    outputPath
  );

  console.log(`[FFmpeg] Fades + color normalisation applied (${fadeSec}s) → ${path.basename(outputPath)}`);
}

/**
 * Generate an SRT subtitle file from section word timestamps.
 *
 * Word timestamps from Edge-TTS are relative to each section's audio file.
 * This function offsets each section's words by the cumulative video time so
 * the SRT entries align with the final stitched video.
 *
 * @param {SectionModel[]} sections
 * @param {string}         outputSrtPath - where to write the .srt file
 */
export function generateSrtFile(sections, outputSrtPath) {
  const WORDS_PER_LINE = 8;
  const entries = [];
  let cumulativeSec = 0;

  for (const section of sections) {
    const sectionDuration = section.timelineDurationSec || section.actualDurationSec || section.estimatedDurationSec || 0;
    const all = (section.subtitles || []).filter(c => Number.isFinite(c.start) && Number.isFinite(c.end))
      .map(c => ({...c,start:Math.max(0,c.start),end:Math.min(sectionDuration,c.end)})).filter(c=>c.end>c.start);
    const wordLevel = all.filter(w => !w.type);   // WordBoundary — individual words
    const sentLevel = all.filter(w => w.type === 'sentence'); // SentenceBoundary — full sentences

    if (wordLevel.length > 0) {
      // Preferred: group individual word timestamps into 8-word caption lines
      for (let i = 0; i < wordLevel.length; i += WORDS_PER_LINE) {
        const chunk = wordLevel.slice(i, i + WORDS_PER_LINE);
        const startSec = cumulativeSec + chunk[0].start;
        const endSec   = cumulativeSec + chunk[chunk.length - 1].end;
        entries.push({ startSec: Math.max(0, startSec), endSec, text: chunk.map(w => w.text).join(' ') });
      }
    } else if (sentLevel.length > 0) {
      // Fallback: Edge TTS only fired SentenceBoundary events — use full sentences as cues
      for (const sent of sentLevel) {
        const words=String(sent.text).split(/\s+/).filter(Boolean);
        for(let i=0;i<words.length;i+=WORDS_PER_LINE){
          const end=Math.min(words.length,i+WORDS_PER_LINE);
          entries.push({startSec:cumulativeSec+sent.start+(sent.end-sent.start)*i/words.length,
            endSec:cumulativeSec+sent.start+(sent.end-sent.start)*end/words.length,text:words.slice(i,end).join(' ')});
        }
      }
    }

    cumulativeSec += section.timelineDurationSec || section.actualDurationSec || section.estimatedDurationSec || 0;
  }

  const ordered = entries.filter(e => Number.isFinite(e.startSec) && Number.isFinite(e.endSec) && e.text?.trim())
    .sort((a, b) => a.startSec - b.startSec);
  const valid = ordered.map((e, i) => ({
    ...e, endSec: Math.min(e.endSec, ordered[i + 1]?.startSec ?? e.endSec),
  })).filter(e => Math.round(e.endSec * 1000) > Math.round(e.startSec * 1000));
  if (!valid.length) throw new Error('No usable subtitle timestamps; caption output was not created');
  const srt = valid.map((e, i) => (
    `${i + 1}\n${srtTimestamp(e.startSec)} --> ${srtTimestamp(e.endSec)}\n${e.text}`
  )).join('\n\n');

  fs.writeFileSync(outputSrtPath, srt + '\n', 'utf-8');
  console.log(`[FFmpeg] SRT written: ${path.basename(outputSrtPath)} (${entries.length} cues)`);
}

export function srtTimestamp(secs) {
  const totalMs = Math.max(0, Math.round(secs * 1000));
  const h  = Math.floor(totalMs / 3600000);
  const m  = Math.floor(totalMs / 60000) % 60;
  const s  = Math.floor(totalMs / 1000) % 60;
  const ms = totalMs % 1000;
  return `${zp(h)}:${zp(m)}:${zp(s)},${zp(ms, 3)}`;
}

function zp(n, len = 2) { return String(n).padStart(len, '0'); }

/**
 * Get video duration in seconds.
 * Probe container metadata without decoding the entire video.
 * @param {string} filePath
 * @returns {Promise<number>}
 */
export async function getVideoDuration(filePath) {
  const { stdout } = await execFileAsync(ffprobe.path, [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'json', filePath,
  ], { timeout: 30000, maxBuffer: 1024 * 1024 });
  const duration = Number(JSON.parse(stdout).format?.duration);
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error(`Invalid media duration: ${filePath}`);
  }
  return duration;
}
