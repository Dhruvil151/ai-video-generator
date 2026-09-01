// Phase 3 Test Suite — Gemini Script & Storyboard Generation
import http from 'http';
import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../');

let passed = 0;
let failed = 0;
const results = [];

function pass(label, detail = '') { passed++; results.push({ status: 'PASS', label, detail }); }
function fail(label, detail = '') { failed++; results.push({ status: 'FAIL', label, detail }); }

function httpJSON(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost', port: 3001, path: urlPath, method,
      headers: { 'Content-Type': 'application/json', ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}) }
    };
    const req = http.request(opts, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(90000, () => { req.destroy(); reject(new Error('Timeout')); });
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

const SCENE_TYPES = ['TitleScene','CodeEditorScene','ArchitectureScene','ConceptCardScene','ComparisonScene','SummaryScene'];

async function run() {
  console.log('\n' + '='.repeat(64));
  console.log('  PHASE 3 TESTS — Gemini Script & Storyboard Generation');
  console.log('='.repeat(64));

  // ── T3.1 Phase 3 source files exist ─────────────────────────────────────
  const files = [
    'server/services/geminiService.js',
    'server/controllers/scriptController.js',
    'server/routes/scriptRoutes.js',
  ];
  for (const f of files) {
    fs.existsSync(path.join(ROOT, f)) ? pass('T3.1  File: ' + f) : fail('T3.1  Missing: ' + f);
  }

  // ── T3.2 Estimate endpoint — invalid inputs ──────────────────────────────
  {
    const { status, body } = await httpJSON('POST', '/api/script/estimate', { topic: '' });
    status === 400 && body.error ? pass('T3.2  Empty topic → 400', body.error) : fail('T3.2  Empty topic', 'Status: ' + status);
  }
  {
    const { status, body } = await httpJSON('POST', '/api/script/estimate', { topic: 'Node.js', mode: 'invalid' });
    status === 400 && body.error ? pass('T3.3  Invalid mode → 400', body.error) : fail('T3.3  Invalid mode', 'Status: ' + status);
  }

  // ── T3.4 Estimate endpoint — short mode ──────────────────────────────────
  {
    const { status, body } = await httpJSON('POST', '/api/script/estimate', { topic: 'Node.js', mode: 'short' });
    if (status === 200) {
      pass('T3.4  POST /api/script/estimate short → 200');
      typeof body.estimatedMinutes === 'number'    ? pass('T3.5  estimatedMinutes is number',  body.estimatedMinutes + ' min') : fail('T3.5  estimatedMinutes', JSON.stringify(body));
      typeof body.estimatedTotalSec === 'number'   ? pass('T3.6  estimatedTotalSec is number', body.estimatedTotalSec + 's')   : fail('T3.6  estimatedTotalSec', JSON.stringify(body));
      typeof body.estimatedWordCount === 'number'  ? pass('T3.7  estimatedWordCount present',  body.estimatedWordCount + ' words') : fail('T3.7  estimatedWordCount');
      typeof body.estimatedFormattedDuration === 'string' ? pass('T3.8  formattedDuration present', body.estimatedFormattedDuration) : fail('T3.8  formattedDuration');
      typeof body.sceneCount === 'number'          ? pass('T3.9  sceneCount present', body.sceneCount + ' scenes') : fail('T3.9  sceneCount');
      body.sceneCount === 5                        ? pass('T3.10 Short mode = 5 scenes') : fail('T3.10 Short scene count', 'Got: ' + body.sceneCount);
    } else fail('T3.4  Estimate short', 'Status: ' + status + ' ' + JSON.stringify(body));
  }

  // ── T3.11 Estimate endpoint — detailed mode ───────────────────────────────
  {
    const { status, body } = await httpJSON('POST', '/api/script/estimate', { topic: 'Node.js', mode: 'detailed' });
    if (status === 200) {
      pass('T3.11 Estimate detailed → 200');
      body.sceneCount >= 8 ? pass('T3.12 Detailed mode >= 8 scenes', body.sceneCount + ' scenes') : fail('T3.12 Detailed scene count', 'Got: ' + body.sceneCount);
      body.estimatedMinutes >= 5 ? pass('T3.13 Detailed >= 5 min', body.estimatedMinutes + ' min') : fail('T3.13 Detailed duration', 'Got: ' + body.estimatedMinutes);
    } else fail('T3.11 Estimate detailed', 'Status: ' + status);
  }

  // ── T3.14 Generate endpoint — validation ─────────────────────────────────
  {
    const { status, body } = await httpJSON('POST', '/api/script/generate', { mode: 'short' });
    status === 400 && body.error ? pass('T3.14 Missing topic → 400', body.error) : fail('T3.14 Missing topic validation', 'Status: ' + status);
  }
  {
    const { status, body } = await httpJSON('POST', '/api/script/generate', { topic: 'Node.js', mode: 'bad' });
    status === 400 && body.error ? pass('T3.15 Bad mode → 400', body.error) : fail('T3.15 Bad mode validation', 'Status: ' + status);
  }

  // ── T3.16 FULL Gemini generation — SHORT mode ─────────────────────────────
  console.log('\n  [T3.16] Calling Gemini API: "Node.js" SHORT mode (may take 10–30s)...');
  let scriptId = null;
  try {
    const t0 = Date.now();
    const { status, body } = await httpJSON('POST', '/api/script/generate', {
      topic: 'Node.js', mode: 'short', voice: 'en-US-ChristopherNeural'
    });
    const elapsed = Date.now() - t0;

    if (status === 200) {
      pass('T3.16 Generate short → 200', 'took ' + elapsed + 'ms');
      scriptId = body.id;
      body.id        ? pass('T3.17 Script has id',    body.id) : fail('T3.17 Script id missing');
      body.topic === 'Node.js' ? pass('T3.18 topic matches') : fail('T3.18 topic', 'Got: ' + body.topic);
      body.mode === 'short'    ? pass('T3.19 mode === short') : fail('T3.19 mode', 'Got: ' + body.mode);

      if (Array.isArray(body.scenes)) {
        pass('T3.20 scenes is array', body.scenes.length + ' scenes');
        body.scenes.length === 5 ? pass('T3.21 Short mode = 5 scenes') : fail('T3.21 Scene count', 'Got: ' + body.scenes.length);

        // Validate first scene is TitleScene
        const first = body.scenes[0];
        first?.type === 'TitleScene' ? pass('T3.22 First scene is TitleScene', first.type) : fail('T3.22 First scene type', 'Got: ' + first?.type);

        // Validate last scene is SummaryScene
        const last = body.scenes[body.scenes.length - 1];
        last?.type === 'SummaryScene' ? pass('T3.23 Last scene is SummaryScene') : fail('T3.23 Last scene type', 'Got: ' + last?.type);

        // Validate all scenes have narration
        const missingNarration = body.scenes.filter(s => !s.narration || s.narration.trim() === '');
        missingNarration.length === 0 ? pass('T3.24 All scenes have narration') : fail('T3.24 Missing narration', missingNarration.length + ' scenes');

        // Validate all scene types are valid
        const invalidTypes = body.scenes.filter(s => !SCENE_TYPES.includes(s.type));
        invalidTypes.length === 0 ? pass('T3.25 All scene types valid') : fail('T3.25 Invalid types', invalidTypes.map(s => s.type).join(', '));

        // Validate SSML breaks present in narrations
        const hasBreaks = body.scenes.some(s => s.narration?.includes('<break'));
        hasBreaks ? pass('T3.26 SSML break tags in narrations') : fail('T3.26 No SSML breaks found');

        // Validate estimatedDurationSec present on scenes
        const hasDuration = body.scenes.every(s => typeof s.estimatedDurationSec === 'number' && s.estimatedDurationSec > 0);
        hasDuration ? pass('T3.27 All scenes have estimatedDurationSec', body.scenes.map(s => s.estimatedDurationSec + 's').join(', ')) : fail('T3.27 Missing duration on scenes');

        // Check estimatedTotalDurationSec
        body.estimatedTotalDurationSec > 0 ? pass('T3.28 estimatedTotalDurationSec > 0', body.estimatedTotalDurationSec + 's') : fail('T3.28 estimatedTotalDurationSec');

      } else fail('T3.20 scenes not array', typeof body.scenes);
    } else if (status === 401) {
      fail('T3.16 API key error', body.error);
    } else {
      fail('T3.16 Generate short', 'Status: ' + status + ' — ' + (body.error || ''));
    }
  } catch (e) { fail('T3.16 Generate short', e.message); }

  // ── T3.29 GET script by ID ────────────────────────────────────────────────
  if (scriptId) {
    const { status, body } = await httpJSON('GET', '/api/script/' + scriptId);
    status === 200 && body.id === scriptId ? pass('T3.29 GET /api/script/:id works', scriptId) : fail('T3.29 GET by ID', 'Status: ' + status);
  } else {
    fail('T3.29 GET by ID', 'Skipped — no scriptId from generate call');
  }

  // ── T3.30 GET non-existent script → 404 ─────────────────────────────────
  {
    const { status } = await httpJSON('GET', '/api/script/nonexistent_id_xyz');
    status === 404 ? pass('T3.30 GET nonexistent → 404') : fail('T3.30 GET nonexistent', 'Status: ' + status);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(64));
  console.log('  RESULTS');
  console.log('='.repeat(64));
  for (const r of results) {
    const icon = r.status === 'PASS' ? '✓' : '✗';
    const detail = r.detail ? '  →  ' + r.detail : '';
    console.log(icon + ' [' + r.status + '] ' + r.label + detail);
  }
  console.log('='.repeat(64));
  console.log('  PASSED : ' + passed + ' / ' + (passed + failed));
  console.log('  FAILED : ' + failed);
  console.log('='.repeat(64) + '\n');
  if (scriptId) {
    console.log('  Generated Script ID: ' + scriptId);
    console.log('  Use this to test Phase 5 render pipeline.');
  }
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error('[FATAL]', e.message); process.exit(1); });
