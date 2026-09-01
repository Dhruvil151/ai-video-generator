import fs from 'fs';
import { ENV } from '../config/env.js';

const REQUIRED_DIRS = [
  ENV.PUBLIC_DIR,
  ENV.OUTPUT_DIR,
  ENV.AUDIO_DIR,
  ENV.CACHE_DIR,
  ENV.TTS_CACHE_DIR,
  ENV.SCENE_CACHE_DIR,
  ENV.TEMP_DIR,
  ENV.ASSETS_DIR,
  ENV.MUSIC_DIR,
];

/** Create all required directories if they don't already exist. */
export function ensureDirectories() {
  for (const dir of REQUIRED_DIRS) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

/**
 * Delete files older than `maxAgeMinutes` in a directory.
 * Used to clean up temp files after a render job.
 */
export function cleanOldFiles(directory, maxAgeMinutes = 120) {
  if (!fs.existsSync(directory)) return;
  const cutoff = Date.now() - maxAgeMinutes * 60 * 1000;
  try {
    for (const file of fs.readdirSync(directory)) {
      const full = `${directory}/${file}`;
      const stat = fs.statSync(full);
      if (stat.mtimeMs < cutoff) {
        if (stat.isDirectory()) {
          fs.rmSync(full, { recursive: true, force: true });
        } else {
          fs.unlinkSync(full);
        }
      }
    }
  } catch (err) {
    console.warn(`[FileHelper] Could not clean ${directory}:`, err.message);
  }
}

/**
 * Delete all contents of a job's temp folder after render completes.
 */
export function cleanJobTemp(jobId) {
  const jobTemp = `${ENV.TEMP_DIR}/${jobId}`;
  if (fs.existsSync(jobTemp)) {
    try {
      fs.rmSync(jobTemp, { recursive: true, force: true });
    } catch (err) {
      console.warn(`[FileHelper] Could not clean job temp ${jobTemp}:`, err.message);
    }
  }
}

/**
 * Ensure a job-specific temp directory exists and return its path.
 */
export function getJobTempDir(jobId) {
  const dir = `${ENV.TEMP_DIR}/${jobId}`;
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}
