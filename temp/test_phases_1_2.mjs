// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PHASE 1 & 2 — COMPREHENSIVE RE-TEST SUITE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import http from 'http';
import fs   from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../');

let passed = 0;
let failed = 0;
const results = [];

function pass(label, detail = '') {
  passed++;
  results.push({ status: 'PASS', label, detail });
}
function fail(label, detail = '') {
  failed++;
  results.push({ status: 'FAIL', label, detail });
}

function httpJSON(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost', port: 3001, path: urlPath, method,
      headers: {
        'Content-Type': 'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {})
      }
    };
    const req = http.request(opts, res => {
      let d = '';
      res.on('data', c => { d += c; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(35000, () => { req.destroy(); reject(new Error('Request timed out')); });
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function run() {
  console.log('\n' + '='.repeat(62));
  console.log('  PHASE 1 TESTS — Infrastructure & Scaffold');
  console.log('='.repeat(62));

  // T1.1 Python version
  try {
    const out = execSync('python --version', { stdio: 'pipe' }).toString().trim();
    const ver = out.split(' ')[1];
    const [maj, min] = ver.split('.').map(Number);
    if (maj >= 3 && min >= 10) pass('T1.1  Python 3.10+ available', out);
    else fail('T1.1  Python version too low', out);
  } catch (e) { fail('T1.1  Python available', e.message); }

  // T1.2 edge-tts importable
  try {
    execSync('python -c "import edge_tts"', { stdio: 'pipe' });
    pass('T1.2  edge-tts importable');
  } catch (e) { fail('T1.2  edge-tts importable', e.message); }

  // T1.3 Required directories
  const dirs = [
    'public/audio', 'public/output',
    'cache/tts', 'cache/scenes',
    'temp', 'assets/music'
  ];
  for (const d of dirs) {
    const full = path.join(ROOT, d);
    if (fs.existsSync(full)) pass('T1.3  Dir exists: ' + d);
    else fail('T1.3  Dir missing: ' + d);
  }

  // T1.4 Key source files
  const files = [
    'package.json', 'docker-compose.yml', '.env.example', 'README.md',
    'server/config/env.js', 'server/config/constants.js',
    'server/models/Script.js', 'server/models/RenderJob.js',
    'server/utils/pythonCheck.js', 'server/utils/hashHelper.js',
    'server/utils/durationCalculator.js', 'server/utils/fileHelper.js',
    'server/queues/videoQueue.js', 'server/app.js',
    'server/server.js', 'server/worker.js',
    'server/routes/api.js', 'server/routes/scriptRoutes.js',
    'server/routes/renderRoutes.js', 'server/routes/audioRoutes.js',
  ];
  for (const f of files) {
    const full = path.join(ROOT, f);
    if (fs.existsSync(full)) pass('T1.4  File: ' + f);
    else fail('T1.4  Missing: ' + f);
  }

  // T1.5 GET /api/health
  try {
    const { status, body } = await httpJSON('GET', '/api/health');
    if (status === 200) pass('T1.5  GET /api/health → 200');
    else fail('T1.5  GET /api/health', 'Status: ' + status);

    if (body.ok === true)                   pass('T1.6  health.ok === true');
    else fail('T1.6  health.ok', 'Got: ' + body.ok);

    if (body.python && body.python.startsWith('3.')) pass('T1.7  health.python present', body.python);
    else fail('T1.7  health.python', 'Got: ' + body.python);

    if (body.edgeTts === true)              pass('T1.8  health.edgeTts === true');
    else fail('T1.8  health.edgeTts', 'Got: ' + body.edgeTts);

    if (typeof body.redis === 'string')     pass('T1.9  health.redis field present', body.redis.slice(0, 40));
    else fail('T1.9  health.redis', 'Got: ' + body.redis);

    if (body.timestamp)                     pass('T1.10 health.timestamp present', body.timestamp);
    else fail('T1.10 health.timestamp missing');
  } catch (e) { fail('T1.5  GET /api/health', e.message); }

  // T1.11 404 handler
  try {
    const { status, body } = await httpJSON('GET', '/api/does-not-exist');
    if (status === 404 && body.error)       pass('T1.11 404 handler works', body.error);
    else fail('T1.11 404 handler', 'Status: ' + status);
  } catch (e) { fail('T1.11 404 handler', e.message); }

  // T1.12 Placeholder script route
  try {
    const { status, body } = await httpJSON('POST', '/api/script/estimate', {});
    if (status === 200 && body.message)     pass('T1.12 /api/script/estimate placeholder responds');
    else fail('T1.12 script route', 'Status: ' + status);
  } catch (e) { fail('T1.12 script route', e.message); }

  // T1.13 Placeholder render route
  try {
    const { status, body } = await httpJSON('POST', '/api/render/start', {});
    if (status === 200 && body.message)     pass('T1.13 /api/render/start placeholder responds');
    else fail('T1.13 render route', 'Status: ' + status);
  } catch (e) { fail('T1.13 render route', e.message); }

  console.log('\n' + '='.repeat(62));
  console.log('  PHASE 2 TESTS — Edge-TTS Voiceover Engine');
  console.log('='.repeat(62));

  // T2.1 Phase 2 source files
  const p2Files = [
    'server/services/generate_audio.py',
    'server/services/cacheService.js',
    'server/services/ttsService.js',
    'server/controllers/audioController.js',
  ];
  for (const f of p2Files) {
    const full = path.join(ROOT, f);
    if (fs.existsSync(full)) pass('T2.1  File: ' + f);
    else fail('T2.1  Missing: ' + f);
  }

  // T2.2 GET /api/audio/voices
  try {
    const { status, body } = await httpJSON('GET', '/api/audio/voices');
    if (status === 200 && Array.isArray(body.voices) && body.voices.length >= 4)
      pass('T2.2  GET /api/audio/voices', body.voices.length + ' voices listed');
    else fail('T2.2  Voice list', 'Status: ' + status + ' count: ' + body.voices?.length);

    const chris = body.voices?.find(v => v.id === 'en-US-ChristopherNeural');
    if (chris) pass('T2.3  Christopher voice in list', chris.name);
    else fail('T2.3  Christopher voice missing');
  } catch (e) { fail('T2.2  Voice list', e.message); }

  // T2.4 Empty text → 400
  try {
    const { status, body } = await httpJSON('POST', '/api/audio/preview', { text: '', voice: 'en-US-ChristopherNeural' });
    if (status === 400 && body.error) pass('T2.4  Empty text → 400', body.error);
    else fail('T2.4  Empty text validation', 'Status: ' + status);
  } catch (e) { fail('T2.4  Empty text validation', e.message); }

  // T2.5 Invalid voice → 400
  try {
    const { status, body } = await httpJSON('POST', '/api/audio/preview', { text: 'Test.', voice: 'bad-voice' });
    if (status === 400 && body.error) pass('T2.5  Invalid voice → 400', body.error.slice(0, 50));
    else fail('T2.5  Invalid voice validation', 'Status: ' + status);
  } catch (e) { fail('T2.5  Invalid voice validation', e.message); }

  // T2.6 Fresh synthesis
  const testText = 'Welcome to the world of Node.js. It is single-threaded and event-driven.';
  console.log('\n  [T2.6] Fresh TTS synthesis with Christopher voice (may take ~20s)...');
  let freshDuration = 0;
  try {
    const t0 = Date.now();
    const { status, body } = await httpJSON('POST', '/api/audio/preview', {
      text: testText,
      voice: 'en-US-ChristopherNeural'
    });
    const elapsed = Date.now() - t0;

    if (status === 200)                              pass('T2.6  Synthesis → 200', 'took ' + elapsed + 'ms');
    else fail('T2.6  Synthesis status', 'Got: ' + status);

    if (body.audioUrl && body.audioUrl.includes('.mp3')) pass('T2.7  audioUrl is .mp3', body.audioUrl);
    else fail('T2.7  audioUrl', 'Got: ' + body.audioUrl);

    freshDuration = body.durationSec;
    if (typeof freshDuration === 'number' && freshDuration > 0) pass('T2.8  durationSec > 0', freshDuration + 's');
    else fail('T2.8  durationSec', 'Got: ' + freshDuration);

    if (Array.isArray(body.subtitles)) pass('T2.9  subtitles is array', body.subtitles.length + ' entries');
    else fail('T2.9  subtitles type', 'Got: ' + typeof body.subtitles);

    if (body.fromCache === false) pass('T2.10 fromCache === false (fresh)');
    else fail('T2.10 fromCache', 'Expected false, got: ' + body.fromCache);
  } catch (e) { fail('T2.6  Fresh synthesis', e.message); }

  // T2.11 Cache hit (same text)
  console.log('  [T2.11] Cache hit test...');
  try {
    const t0 = Date.now();
    const { status, body } = await httpJSON('POST', '/api/audio/preview', {
      text: testText, voice: 'en-US-ChristopherNeural'
    });
    const elapsed = Date.now() - t0;

    if (status === 200 && body.fromCache === true)  pass('T2.11 Cache hit → fromCache:true', elapsed + 'ms');
    else fail('T2.11 Cache hit', 'fromCache: ' + body.fromCache);

    if (elapsed < 500)                              pass('T2.12 Cache response under 500ms', elapsed + 'ms');
    else fail('T2.12 Cache speed', 'Too slow: ' + elapsed + 'ms');

    if (body.durationSec === freshDuration)         pass('T2.13 Cached duration matches original', body.durationSec + 's');
    else fail('T2.13 Duration mismatch', freshDuration + ' vs ' + body.durationSec);
  } catch (e) { fail('T2.11 Cache hit', e.message); }

  // T2.14 SSML break tag in narration
  console.log('  [T2.14] SSML break tag test...');
  const ssmlText = "Node.js uses an event loop. <break time='0.8s'/> This makes it very fast.";
  try {
    const { status, body } = await httpJSON('POST', '/api/audio/preview', {
      text: ssmlText, voice: 'en-US-ChristopherNeural'
    });
    if (status === 200 && body.durationSec > 0)     pass('T2.14 SSML break tags handled OK', body.durationSec + 's');
    else fail('T2.14 SSML break tags', 'Status: ' + status);
  } catch (e) { fail('T2.14 SSML break tags', e.message); }

  // T2.15 MP3 files on disk
  const audioDir = path.join(ROOT, 'public/audio');
  const mp3s = fs.existsSync(audioDir) ? fs.readdirSync(audioDir).filter(f => f.endsWith('.mp3')) : [];
  if (mp3s.length > 0) pass('T2.15 MP3 files written to public/audio', mp3s.length + ' files');
  else fail('T2.15 MP3 files on disk', 'None found');

  // T2.16 Cache files on disk
  const cacheDir = path.join(ROOT, 'cache/tts');
  const cacheFiles = fs.existsSync(cacheDir) ? fs.readdirSync(cacheDir) : [];
  const metaFiles = cacheFiles.filter(f => f.endsWith('_meta.json'));
  const cacheMp3s = cacheFiles.filter(f => f.endsWith('.mp3'));
  if (metaFiles.length > 0) pass('T2.16 Cache meta JSON files exist', metaFiles.length + ' files');
  else fail('T2.16 Cache meta JSON', 'None found in cache/tts');
  if (cacheMp3s.length > 0) pass('T2.17 Cached MP3 files exist', cacheMp3s.length + ' files');
  else fail('T2.17 Cached MP3 files', 'None found in cache/tts');

  // ━━━ SUMMARY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n' + '='.repeat(62));
  console.log('  RESULTS');
  console.log('='.repeat(62));
  for (const r of results) {
    const icon = r.status === 'PASS' ? '✓' : '✗';
    const detail = r.detail ? '  →  ' + r.detail : '';
    console.log(icon + ' [' + r.status + '] ' + r.label + detail);
  }
  console.log('='.repeat(62));
  console.log('  PASSED : ' + passed + ' / ' + (passed + failed));
  console.log('  FAILED : ' + failed);
  console.log('='.repeat(62) + '\n');
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error('[FATAL]', e.message); process.exit(1); });
