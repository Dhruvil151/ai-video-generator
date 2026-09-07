import path from 'path';
import fs from 'fs';
import { spawn, execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { ENV } from '../config/env.js';
import { VIDEO_CONFIG, TTS_MAX_RETRIES, TTS_BASE_DELAY_MS, DEFAULT_VOICE } from '../config/constants.js';
import { ttsCacheKey } from '../utils/hashHelper.js';
import { CacheService } from './cacheService.js';
import { ensureDirectories } from '../utils/fileHelper.js';

const execFileAsync = promisify(execFile);

// TODO P3: Speed variation — edge-tts supports a --rate parameter (+/-% adjustment). Consider -10%
// for complex concepts and +5% for recap/summary scenes to match Fireship's pacing rhythm

/**
 * Node-side safety net: if the Python bridge returns a suspiciously short
 * duration (≤ 6.5s), measure the actual MP3 duration via ffprobe.
 * This guards against mutagen failures or edge-tts stream oddities.
 */
async function measureMp3Duration(audioPath) {
  try {
    // Find ffprobe.exe bundled with @remotion
    const ffprobePaths = [
      path.join(ENV.ROOT_DIR, 'node_modules', '@remotion', 'compositor-win32-x64-msvc', 'ffprobe.exe'),
    ];
    const ffprobeBin = ffprobePaths.find(p => fs.existsSync(p));
    if (!ffprobeBin) return null;

    const { stdout: out } = await execFileAsync(ffprobeBin, [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      audioPath,
    ]);
    const data = JSON.parse(out);
    const dur = parseFloat(data?.format?.duration);
    return isFinite(dur) && dur > 0 ? Math.round(dur * 1000) / 1000 : null;
  } catch {
    return null;
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const PYTHON_SCRIPT = path.join(__dirname, 'generate_audio.py');

export class TTSService {
  /**
   * Synthesize a single narration text into an MP3 with word-level timestamps.
   *
   * Features:
   * - SHA-256 cache check first — returns instantly on hit
   * - Up to 4 retries with exponential backoff + jitter on failure
   * - Scene transition padding added to raw audio duration
   *
   * @param {string} text   - Narration text (may contain <break time="Xs"/> tags)
   * @param {string} voice  - Edge-TTS voice ID
   * @param {string} sceneId - Used as the filename for the output audio
   * @returns {Promise<{audioFile, audioPath, audioUrl, durationSec, subtitles, fromCache}>}
   */
  static async synthesize(text, voice = DEFAULT_VOICE, sceneId = `scene_${Date.now()}`) {
    ensureDirectories();

    const cacheKey  = ttsCacheKey(text, voice);
    const audioFile = `${sceneId}.mp3`;

    // ── Cache hit ────────────────────────────────────────────────────────────
    const cached = CacheService.getTtsCache(cacheKey);
    if (cached) {
      // Copy cached MP3 to public/audio with the correct scene filename
      const destPath = path.join(ENV.AUDIO_DIR, audioFile);
      if (!fs.existsSync(destPath)) {
        fs.copyFileSync(cached.audioPath, destPath);
      }
      console.log(`[TTS] Cache hit: ${cacheKey} → ${audioFile}`);
      return { ...cached, audioFile, audioPath: destPath, audioUrl: `/public/audio/${audioFile}` };
    }

    // ── Synthesize with retry ────────────────────────────────────────────────
    const audioPath = path.join(ENV.AUDIO_DIR, audioFile);
    const metaPath  = path.join(ENV.TTS_CACHE_DIR, `${cacheKey}_meta.json`);
    const textPath  = path.join(ENV.TEMP_DIR, `${sceneId}_text.txt`);

    let lastError = null;

    for (let attempt = 0; attempt <= TTS_MAX_RETRIES; attempt++) {
      await fs.promises.writeFile(textPath, text, 'utf-8');
      
      if (attempt > 0) {
        const delay = TTS_BASE_DELAY_MS * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 500);
        console.log(`[TTS] Retry ${attempt}/${TTS_MAX_RETRIES} for "${sceneId}" — waiting ${delay}ms`);
        await sleep(delay);
      }

      try {
        const result = await this._runPythonBridge(textPath, voice, audioPath, metaPath);

        // ── Node-side duration guard ──────────────────────────────────────────
        // If Python reports ≤ 6.5s it likely means mutagen also failed.
        // Measure directly with ffprobe as a backstop.
        let trueDuration = result.durationSec;
        if (trueDuration <= 6.5 && fs.existsSync(audioPath)) {
          const measured = await measureMp3Duration(audioPath);
          if (measured && measured > trueDuration) {
            console.log(`[TTS] ⚠ Duration override: Python reported ${trueDuration}s → ffprobe measured ${measured}s`);
            trueDuration = measured;
          }
        }

        // Add scene transition padding to the real duration
        const paddedDuration = trueDuration + VIDEO_CONFIG.SCENE_TRANSITION_PADDING_SEC;
        const finalResult = {
          audioFile,
          audioPath,
          audioUrl:    `/public/audio/${audioFile}`,
          durationSec: Math.max(3.0, paddedDuration),
          subtitles:   result.subtitles,
          fromCache:   false,
        };

        // Save to TTS cache (copy MP3 to cache dir)
        const cacheMp3Path = CacheService.ttsMp3Path(cacheKey);
        fs.copyFileSync(audioPath, cacheMp3Path);
        CacheService.saveTtsCache(cacheKey, {
          audioFile,
          durationSec: finalResult.durationSec,
          subtitles:   finalResult.subtitles,
        });

        console.log(`[TTS] ✓ Synthesized "${sceneId}" (${finalResult.durationSec.toFixed(1)}s)`);
        return finalResult;
      } catch (err) {
        lastError = err;
        console.warn(`[TTS] Attempt ${attempt + 1} failed for "${sceneId}": ${err.message}`);
      }
    }

    throw new Error(`[TTS] All ${TTS_MAX_RETRIES + 1} attempts failed for "${sceneId}": ${lastError?.message}`);
  }

  /**
   * Synthesize all scenes in a script sequentially with progress callbacks.
   *
   * @param {ScriptModel} script
   * @param {function} onProgress - ({ sceneIndex, total, message }) => void
   * @returns {Promise<ScriptModel>} Script with audio fields populated on each scene
   */
  static async synthesizeAll(script, onProgress) {
    const sections = script.sections;
    const total    = sections.length;

    for (let i = 0; i < total; i++) {
      const section = sections[i];
      if (onProgress) {
        onProgress({ sceneIndex: i, total, message: `Synthesizing audio for section ${i + 1}/${total}` });
      }

      const result = await this.synthesize(section.narration, script.voice, section.id);
      section.actualDurationSec = result.durationSec;
      section.audioPath         = result.audioPath;
      section.audioUrl          = result.audioUrl;
      section.subtitles         = result.subtitles;
      section.populateVisualTimings();
    }

    script.recalculateActualDuration();
    return script;
  }

  // ── Internal: Python subprocess bridge ──────────────────────────────────────

  static _runPythonBridge(textPath, voice, audioPath, metaPath) {
    return new Promise((resolve, reject) => {
      const proc = spawn('python', [PYTHON_SCRIPT, textPath, voice, audioPath, metaPath]);

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', d => { stdout += d.toString(); });
      proc.stderr.on('data', d => { stderr += d.toString(); });

      proc.on('close', (code) => {
        // Clean up the temp text file
        try { if (fs.existsSync(textPath)) fs.unlinkSync(textPath); } catch (_) {}

        if (code !== 0) {
          return reject(new Error(`Edge-TTS process exited with code ${code}: ${stderr || stdout}`));
        }
        try {
          const parsed = JSON.parse(stdout.trim().split('\n').pop()); // last line
          if (!parsed.success) {
            return reject(new Error(parsed.error || 'Unknown TTS error'));
          }
          resolve(parsed.result);
        } catch (e) {
          reject(new Error(`Failed to parse TTS output: ${e.message} | stdout: ${stdout}`));
        }
      });

      proc.on('error', (err) => {
        reject(new Error(`Failed to spawn Python process: ${err.message}`));
      });
    });
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
