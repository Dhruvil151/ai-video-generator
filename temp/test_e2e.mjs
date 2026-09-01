/**
 * End-to-End System Test — No UI Required
 *
 * Flow:
 *   1. POST /api/script/generate  — Gemini generates a 5-scene script
 *   2. POST /api/render/start     — Queue the render job in BullMQ
 *   3. Poll GET /api/render/:id   — Print live progress every 5s
 *   4. Done → print final video path + open it
 *
 * Prerequisites:
 *   - docker-compose up -d   (Redis on port 6379)
 *   - node server/server.js  (Express API on port 3001)
 *   - node server/worker.js  (BullMQ render worker)
 */
import http from 'http';
import fs   from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT   = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../');
const TOPIC  = process.argv[2] || 'JavaScript Promises';
const MODE   = process.argv[3] || 'short';
const VOICE  = 'en-US-ChristopherNeural';
const POLL_INTERVAL_MS = 5000;

// ── ANSI colours ──────────────────────────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  cyan:   '\x1b[36m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  dim:    '\x1b[2m',
};

function log(icon, color, msg) {
  const ts = new Date().toLocaleTimeString('en-IN', { hour12: false });
  console.log(`${C.dim}[${ts}]${C.reset} ${color}${icon}${C.reset} ${msg}`);
}

function httpJSON(method, urlPath, body, timeoutMs = 90000) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: 'localhost', port: 3001, path: urlPath, method,
      headers: {
        'Content-Type': 'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      }
    }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error('Request timed out')); });
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function progressBar(pct, width = 30) {
  const filled = Math.round((pct / 100) * width);
  const empty  = width - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${String(pct).padStart(3)}%`;
}

async function main() {
  console.log('\n' + C.bold + C.cyan + '═'.repeat(60) + C.reset);
  console.log(C.bold + C.cyan + `  AI Video Generator — End-to-End Test` + C.reset);
  console.log(C.bold + C.cyan + `  Topic: "${TOPIC}"  Mode: ${MODE}` + C.reset);
  console.log(C.bold + C.cyan + '═'.repeat(60) + C.reset + '\n');

  // ── Step 0: Health check ───────────────────────────────────────
  log('🔍', C.cyan, 'Checking server health…');
  try {
    const { status, body } = await httpJSON('GET', '/api/health', null, 5000);
    if (status === 200) {
      log('✓', C.green, `Server OK — ${body.message || 'healthy'}`);
    } else {
      log('✗', C.red, `Server returned ${status}. Is server/server.js running?`);
      process.exit(1);
    }
  } catch (e) {
    log('✗', C.red, `Cannot reach server: ${e.message}`);
    log('!', C.yellow, 'Run:  node server/server.js');
    process.exit(1);
  }

  // ── Step 1: Generate script ────────────────────────────────────
  log('📝', C.cyan, `Generating ${MODE} script for "${TOPIC}" via Gemini…`);
  const t0 = Date.now();
  let script;
  try {
    const { status, body } = await httpJSON('POST', '/api/script/generate', {
      topic: TOPIC, mode: MODE, voice: VOICE,
    }, 300000); // 5 minute timeout for Gemini
    if (status !== 200) {
      log('✗', C.red, `Script generation failed (${status}): ${body.error || body}`);
      process.exit(1);
    }
    script = body;
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    log('✓', C.green, `Script ready in ${elapsed}s — ${script.scenes.length} scenes, ~${script.estimatedFormattedDuration}`);
    script.scenes.forEach((s, i) =>
      log(' ', C.dim, `  Scene ${i+1}: [${s.type.replace('Scene','')}] ${s.title} (${s.estimatedDurationSec}s)`)
    );
  } catch (e) {
    log('✗', C.red, `Script error: ${e.message}`);
    process.exit(1);
  }

  // ── Step 2: Queue render ───────────────────────────────────────
  log('🎬', C.cyan, 'Queuing render job…');
  let jobId;
  try {
    const { status, body } = await httpJSON('POST', '/api/render/start', {
      scriptId: script.id,
      voice:    VOICE,
    }, 10000);

    if (status === 202) {
      jobId = body.jobId;
      log('✓', C.green, `Job queued: ${jobId}`);
      log(' ', C.dim, `  Poll: http://localhost:3001${body.pollUrl}`);
      log(' ', C.dim, `  SSE:  http://localhost:3001${body.streamUrl}`);
    } else if (status === 503) {
      log('✗', C.red, `Queue unavailable: ${body.error}`);
      log('!', C.yellow, 'Fix:  docker-compose up -d');
      log('!', C.yellow, 'Then: node server/worker.js');
      process.exit(1);
    } else {
      log('✗', C.red, `Queue failed (${status}): ${body.error || body}`);
      process.exit(1);
    }
  } catch (e) {
    log('✗', C.red, `Queue error: ${e.message}`);
    process.exit(1);
  }

  // ── Step 3: Poll until complete ────────────────────────────────
  console.log('');
  log('⏳', C.cyan, 'Rendering… (poll every 5s — this takes 5–20 min)\n');

  let lastStatus = '';
  let lastStep   = '';
  const renderStart = Date.now();

  while (true) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));

    let pollBody;
    try {
      const { status, body } = await httpJSON('GET', `/api/render/${jobId}`, null, 8000);
      if (status !== 200) { log('!', C.yellow, `Poll returned ${status}`); continue; }
      pollBody = body;
    } catch (e) { log('!', C.yellow, `Poll error: ${e.message}`); continue; }

    const { status, progress, currentStep, completedScenes, totalScenes, outputVideoUrl, error } = pollBody;
    const elapsed = ((Date.now() - renderStart) / 1000).toFixed(0);
    const bar = progressBar(progress || 0);

    // Only print when something changed
    if (status !== lastStatus || currentStep !== lastStep) {
      const sceneInfo = totalScenes > 0 ? ` [scene ${completedScenes}/${totalScenes}]` : '';
      process.stdout.write(`\r${C.cyan}${bar}${C.reset}  ${C.dim}${elapsed}s${C.reset}  ${currentStep}${sceneInfo}          \n`);
      lastStatus = status;
      lastStep   = currentStep;
    } else {
      // Overwrite same line with updated elapsed time
      process.stdout.write(`\r${C.cyan}${bar}${C.reset}  ${C.dim}${elapsed}s${C.reset}  ${currentStep}          `);
    }

    if (status === 'completed') {
      const totalTime = ((Date.now() - renderStart) / 1000 / 60).toFixed(1);
      console.log('\n');
      log('🎉', C.green + C.bold, `RENDER COMPLETE in ${totalTime} minutes!`);
      console.log('');

      const localPath = path.join(ROOT, outputVideoUrl.replace(/^\//, ''));
      const sizeKb    = fs.existsSync(localPath)
        ? Math.round(fs.statSync(localPath).size / 1024)
        : 0;

      log('📁', C.green, `Output: ${localPath}`);
      log('📦', C.green, `Size:   ${sizeKb} KB`);
      log('🌐', C.green, `URL:    http://localhost:3001${outputVideoUrl}`);

      // Try to open the video in Windows default player
      try {
        execSync(`start "" "${localPath}"`, { shell: true });
        log('▶', C.cyan, 'Opening video in default player…');
      } catch {}

      console.log('');
      break;
    }

    if (status === 'failed') {
      console.log('\n');
      log('✗', C.red, `RENDER FAILED: ${error}`);
      log('!', C.yellow, 'Check worker terminal for detailed error logs.');
      process.exit(1);
    }
  }

  console.log(C.bold + C.cyan + '═'.repeat(60) + C.reset + '\n');
}

main().catch(e => {
  console.error('\n[FATAL]', e.message);
  process.exit(1);
});
