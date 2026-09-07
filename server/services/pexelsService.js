/**
 * PexelsService — fetch and cache royalty-free stock video clips.
 *
 * Requires PEXELS_API_KEY in .env (free at pexels.com/api).
 * If the key is absent, every call returns null silently so the
 * pipeline falls back to the ConceptCardScene gradient background.
 *
 * Downloaded clips are cached in public/broll/ so the same search
 * term never hits the network twice across jobs.
 */
import fs from 'fs';
import path from 'path';
import https from 'https';
import { ENV } from '../config/env.js';

const PEXELS_API_KEY = process.env.PEXELS_API_KEY || '';
const BROLL_DIR      = path.join(ENV.PUBLIC_DIR, 'broll');

// Ensure the broll directory exists at startup
if (!fs.existsSync(BROLL_DIR)) fs.mkdirSync(BROLL_DIR, { recursive: true });

/**
 * Fetch a relevant video clip from Pexels and download it.
 *
 * @param {string} query  - search keyword(s) e.g. "server room data center"
 * @param {string} fileId - unique file identifier (no extension)
 * @returns {Promise<{ localPath: string, url: string } | null>}
 */
export async function fetchBRollClip(query, fileId) {
  if (!PEXELS_API_KEY) {
    console.log('[Pexels] No API key — skipping B-roll fetch');
    return null;
  }

  const destPath = path.join(BROLL_DIR, `${fileId}.mp4`);

  // Cache hit: file already downloaded from a previous job
  if (fs.existsSync(destPath) && fs.statSync(destPath).size > 10_000) {
    console.log(`[Pexels] Cache hit: ${fileId}.mp4`);
    return { localPath: destPath, url: `/public/broll/${fileId}.mp4` };
  }

  try {
    // Search Pexels video library
    const searchUrl = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape&size=medium`;
    const data = await pexelsGet(searchUrl);

    if (!data.videos || data.videos.length === 0) {
      console.warn(`[Pexels] No results for "${query}"`);
      return null;
    }

    // Pick a random result from the top 5 so identical topics vary
    const video = data.videos[Math.floor(Math.random() * Math.min(5, data.videos.length))];

    // Prefer HD (1280p) but fall back to smaller files for faster download
    const files = (video.video_files || [])
      .filter(f => f.file_type === 'video/mp4')
      .sort((a, b) => b.width - a.width);
    const file = files.find(f => f.width <= 1280 && f.width >= 640) || files[0];

    if (!file?.link) {
      console.warn(`[Pexels] No suitable MP4 file for "${query}"`);
      return null;
    }

    await downloadFile(file.link, destPath);
    console.log(`[Pexels] ✓ "${query}" → ${fileId}.mp4 (${file.width}×${file.height})`);
    return { localPath: destPath, url: `/public/broll/${fileId}.mp4` };

  } catch (err) {
    console.warn(`[Pexels] Failed to fetch clip for "${query}": ${err.message}`);
    return null;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pexelsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { Authorization: PEXELS_API_KEY } }, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(new Error(`Pexels JSON parse error: ${e.message}`)); }
      });
    }).on('error', reject);
  });
}

function downloadFile(url, destPath, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) return reject(new Error('Too many redirects'));
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, destPath, redirectCount + 1).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const file = fs.createWriteStream(destPath);
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
      file.on('error', err => { fs.unlink(destPath, () => {}); reject(err); });
    }).on('error', err => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}
