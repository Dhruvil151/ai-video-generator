/**
 * Phase 3 + Phase 4 — Full Verification Suite
 * - Phase 3: Gemini script generation (short + detailed), estimate, scene edit, retrieval
 * - Phase 4: All 13 Remotion source files exist, TypeScript clean, actual still-frame render
 */
import http from 'http';
import fs   from 'fs';
import path from 'path';
import { execSync, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../');

let passed = 0, failed = 0;
const results = [];

function pass(label, detail = '') { passed++; results.push({ status: 'PASS', label, detail }); }
function fail(label, detail = '') { failed++; results.push({ status: 'FAIL', label, detail }); }

function httpJSON(method, urlPath, body, timeoutMs = 90000) {
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
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error('Request timed out after ' + timeoutMs + 'ms')); });
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

const VALID_SCENE_TYPES = ['TitleScene','CodeEditorScene','ArchitectureScene','ConceptCardScene','ComparisonScene','SummaryScene'];

function validateScene(scene, idx, label) {
  if (!scene)                              { fail(`${label} scene[${idx}] exists`); return; }
  scene.id        ? pass(`${label} scene[${idx}].id present`, scene.id) : fail(`${label} scene[${idx}].id missing`);
  VALID_SCENE_TYPES.includes(scene.type)  ? pass(`${label} scene[${idx}].type valid`, scene.type) : fail(`${label} scene[${idx}].type invalid`, scene.type);
  scene.title?.trim()                     ? pass(`${label} scene[${idx}].title present`) : fail(`${label} scene[${idx}].title empty`);
  scene.narration?.trim()                 ? pass(`${label} scene[${idx}].narration present`, scene.narration.slice(0,40)+'…') : fail(`${label} scene[${idx}].narration empty`);
  typeof scene.estimatedDurationSec === 'number' && scene.estimatedDurationSec > 0
    ? pass(`${label} scene[${idx}].estimatedDurationSec > 0`, scene.estimatedDurationSec + 's')
    : fail(`${label} scene[${idx}].estimatedDurationSec`, 'Got: ' + scene.estimatedDurationSec);
  scene.payload && typeof scene.payload === 'object'
    ? pass(`${label} scene[${idx}].payload is object`)
    : fail(`${label} scene[${idx}].payload`, 'Got: ' + typeof scene.payload);
}

async function runPhase3() {
  console.log('\n' + '═'.repeat(64));
  console.log('  PHASE 3 — Gemini Script & Storyboard Generation');
  console.log('═'.repeat(64));

  // ── P3-F: Source files ────────────────────────────────────────
  for (const f of [
    'server/services/geminiService.js',
    'server/controllers/scriptController.js',
    'server/routes/scriptRoutes.js',
  ]) {
    fs.existsSync(path.join(ROOT, f)) ? pass(`P3-F  ${f}`) : fail(`P3-F  MISSING: ${f}`);
  }

  // ── P3-E: Estimate endpoint ───────────────────────────────────
  console.log('\n  [P3-E] Testing estimate endpoint…');
  for (const [mode, expectMin, expectScenes] of [['short', 2, 5], ['detailed', 8, 10]]) {
    const { status, body } = await httpJSON('POST', '/api/script/estimate', { topic: 'Node.js', mode });
    if (status === 200) {
      pass(`P3-E  estimate [${mode}] → 200`);
      body.estimatedMinutes === expectMin   ? pass(`P3-E  [${mode}] estimatedMinutes = ${expectMin}`, body.estimatedMinutes + ' min') : fail(`P3-E  [${mode}] estimatedMinutes`, `Expected ${expectMin}, got ${body.estimatedMinutes}`);
      body.sceneCount === expectScenes      ? pass(`P3-E  [${mode}] sceneCount = ${expectScenes}`) : fail(`P3-E  [${mode}] sceneCount`, `Expected ${expectScenes}, got ${body.sceneCount}`);
      body.estimatedTotalSec > 0            ? pass(`P3-E  [${mode}] estimatedTotalSec > 0`, body.estimatedTotalSec + 's') : fail(`P3-E  [${mode}] estimatedTotalSec`);
      typeof body.estimatedFormattedDuration === 'string' ? pass(`P3-E  [${mode}] formattedDuration`, body.estimatedFormattedDuration) : fail(`P3-E  [${mode}] formattedDuration`);
      body.estimatedWordCount > 0           ? pass(`P3-E  [${mode}] wordCount > 0`, body.estimatedWordCount + ' words') : fail(`P3-E  [${mode}] wordCount`);
    } else fail(`P3-E  estimate [${mode}]`, 'Status: ' + status);
  }

  // Validation errors
  { const { status, body } = await httpJSON('POST', '/api/script/estimate', { topic: '' });
    status === 400 && body.error ? pass('P3-E  empty topic → 400') : fail('P3-E  empty topic validation', 'Status: '+status); }
  { const { status, body } = await httpJSON('POST', '/api/script/estimate', { topic: 'X', mode: 'mega' });
    status === 400 && body.error ? pass('P3-E  invalid mode → 400') : fail('P3-E  invalid mode validation', 'Status: '+status); }

  // ── P3-G1: Generate SHORT ─────────────────────────────────────
  console.log('\n  [P3-G1] Generating SHORT script: "Node.js" (Gemini API call, ~20s)…');
  let shortScriptId = null;
  try {
    const t0 = Date.now();
    const { status, body } = await httpJSON('POST', '/api/script/generate', { topic: 'Node.js', mode: 'short', voice: 'en-US-ChristopherNeural' });
    const elapsed = Date.now() - t0;

    if (status === 200) {
      pass('P3-G1 Generate short → 200', elapsed + 'ms');
      shortScriptId = body.id;
      body.id      ? pass('P3-G1 id present', body.id) : fail('P3-G1 id missing');
      body.topic === 'Node.js' ? pass('P3-G1 topic matches') : fail('P3-G1 topic', body.topic);
      body.mode === 'short'    ? pass('P3-G1 mode = short')  : fail('P3-G1 mode', body.mode);

      if (Array.isArray(body.scenes) && body.scenes.length > 0) {
        pass('P3-G1 scenes array present', body.scenes.length + ' scenes');
        body.scenes.length === 5 ? pass('P3-G1 exactly 5 scenes') : fail('P3-G1 scene count', 'Got: ' + body.scenes.length);
        body.scenes[0]?.type === 'TitleScene'   ? pass('P3-G1 first scene = TitleScene') : fail('P3-G1 first scene type', body.scenes[0]?.type);
        body.scenes.at(-1)?.type === 'SummaryScene' ? pass('P3-G1 last scene = SummaryScene') : fail('P3-G1 last scene type', body.scenes.at(-1)?.type);
        body.scenes.some(s => s.narration?.includes('<break')) ? pass('P3-G1 SSML breaks present') : fail('P3-G1 SSML breaks missing');
        body.scenes.every(s => VALID_SCENE_TYPES.includes(s.type)) ? pass('P3-G1 all types valid') : fail('P3-G1 invalid types');
        body.scenes.every(s => s.estimatedDurationSec > 0) ? pass('P3-G1 all scenes have duration', body.scenes.map(s => s.estimatedDurationSec + 's').join(', ')) : fail('P3-G1 duration missing');
        body.estimatedTotalDurationSec > 0 ? pass('P3-G1 totalDuration > 0', body.estimatedTotalDurationSec + 's') : fail('P3-G1 totalDuration');

        // Deep validate first 3 scenes
        [0, 1, 2].forEach(i => validateScene(body.scenes[i], i, 'P3-G1'));

        // Validate payload structure per scene type
        for (const scene of body.scenes) {
          if (scene.type === 'TitleScene') {
            scene.payload?.badges ? pass('P3-G1 TitleScene has badges', scene.payload.badges.join(', ')) : fail('P3-G1 TitleScene.badges missing');
          }
          if (scene.type === 'CodeEditorScene') {
            scene.payload?.code   ? pass('P3-G1 CodeEditorScene has code', scene.payload.code.slice(0,40)+'…') : fail('P3-G1 CodeEditorScene.code missing');
            scene.payload?.filename ? pass('P3-G1 CodeEditorScene has filename', scene.payload.filename) : fail('P3-G1 CodeEditorScene.filename missing');
          }
          if (scene.type === 'ArchitectureScene') {
            Array.isArray(scene.payload?.nodes) && scene.payload.nodes.length > 0 ? pass('P3-G1 ArchitectureScene has nodes', scene.payload.nodes.length + ' nodes') : fail('P3-G1 ArchitectureScene.nodes missing');
            Array.isArray(scene.payload?.connections) ? pass('P3-G1 ArchitectureScene has connections') : fail('P3-G1 ArchitectureScene.connections missing');
          }
          if (scene.type === 'ConceptCardScene' || scene.type === 'SummaryScene') {
            Array.isArray(scene.payload?.bulletPoints) && scene.payload.bulletPoints.length > 0 ? pass(`P3-G1 ${scene.type} has bulletPoints`, scene.payload.bulletPoints.length + ' points') : fail(`P3-G1 ${scene.type}.bulletPoints missing`);
          }
        }
      } else fail('P3-G1 scenes array', typeof body.scenes);
    } else fail('P3-G1 Generate short', 'Status: ' + status + ' — ' + (body.error || ''));
  } catch(e) { fail('P3-G1 Generate short', e.message); }

  // ── P3-R: Retrieve script by ID ───────────────────────────────
  if (shortScriptId) {
    const { status, body } = await httpJSON('GET', '/api/script/' + shortScriptId);
    status === 200 && body.id === shortScriptId ? pass('P3-R  GET /:id → 200', shortScriptId) : fail('P3-R  GET /:id', 'Status: '+status);
    { const { status } = await httpJSON('GET', '/api/script/nonexistent_999');
      status === 404 ? pass('P3-R  GET nonexistent → 404') : fail('P3-R  GET nonexistent', 'Status: '+status); }
  }

  // ── P3-U: Scene update (PATCH) ────────────────────────────────
  if (shortScriptId) {
    const { status: gs, body: gs_body } = await httpJSON('GET', '/api/script/' + shortScriptId);
    if (gs === 200 && gs_body.scenes?.[0]) {
      const sceneId = gs_body.scenes[0].id;
      const newNarration = 'Updated narration. This was patched via the API. <break time="0.5s"/> Testing works.';
      const { status, body } = await httpJSON('PATCH', `/api/script/${shortScriptId}/scene/${sceneId}`, { narration: newNarration });
      if (status === 200) {
        pass('P3-U  PATCH scene → 200');
        body.scene?.narration === newNarration ? pass('P3-U  narration updated correctly') : fail('P3-U  narration mismatch', body.scene?.narration?.slice(0,40));
        typeof body.scene?.estimatedDurationSec === 'number' ? pass('P3-U  estimatedDurationSec recalculated', body.scene.estimatedDurationSec + 's') : fail('P3-U  estimatedDurationSec missing');
        typeof body.estimatedTotalDurationSec === 'number' ? pass('P3-U  totalDuration recalculated', body.estimatedTotalDurationSec + 's') : fail('P3-U  totalDuration');
      } else fail('P3-U  PATCH scene', 'Status: ' + status + ' — ' + (body.error || ''));
    }
  }

  // ── P3-G2: Generate DETAILED (proves multi-scene deep-dive) ───
  console.log('\n  [P3-G2] Generating DETAILED script: "JavaScript Promises" (Gemini API, ~30s)…');
  try {
    const t0 = Date.now();
    const { status, body } = await httpJSON('POST', '/api/script/generate', { topic: 'JavaScript Promises', mode: 'detailed', voice: 'en-US-JennyNeural' }, 120000);
    const elapsed = Date.now() - t0;

    if (status === 200) {
      pass('P3-G2 Generate detailed → 200', elapsed + 'ms');
      body.scenes?.length >= 8 ? pass('P3-G2 detailed mode >= 8 scenes', body.scenes.length + ' scenes') : fail('P3-G2 scene count', 'Got: ' + body.scenes?.length);
      body.scenes?.[0]?.type === 'TitleScene'     ? pass('P3-G2 first = TitleScene') : fail('P3-G2 first type', body.scenes?.[0]?.type);
      body.scenes?.at(-1)?.type === 'SummaryScene' ? pass('P3-G2 last = SummaryScene') : fail('P3-G2 last type', body.scenes?.at(-1)?.type);
      body.estimatedTotalDurationSec > 200          ? pass('P3-G2 total duration > 200s', body.estimatedTotalDurationSec + 's') : fail('P3-G2 total duration', body.estimatedTotalDurationSec + 's');

      const hasCodeScene = body.scenes?.some(s => s.type === 'CodeEditorScene');
      const hasArchScene = body.scenes?.some(s => s.type === 'ArchitectureScene');
      hasCodeScene ? pass('P3-G2 has CodeEditorScene') : fail('P3-G2 no CodeEditorScene found');
      hasArchScene ? pass('P3-G2 has ArchitectureScene') : fail('P3-G2 no ArchitectureScene found');

      const hasRealCode = body.scenes?.find(s => s.type === 'CodeEditorScene')?.payload?.code?.includes('Promise');
      hasRealCode ? pass('P3-G2 code contains "Promise" — content is topic-specific') : fail('P3-G2 code not topic-specific');
    } else fail('P3-G2 Generate detailed', 'Status: ' + status + ' — ' + (body.error || ''));
  } catch(e) { fail('P3-G2 Generate detailed', e.message); }
}

async function runPhase4() {
  console.log('\n' + '═'.repeat(64));
  console.log('  PHASE 4 — Remotion Scene Components & AudioMixer');
  console.log('═'.repeat(64));

  // ── P4-F: Source files ────────────────────────────────────────
  const p4Files = [
    'src/remotion/index.ts',
    'src/remotion/Root.tsx',
    'src/remotion/EducationalVideo.tsx',
    'src/remotion/styles/video.css',
    'src/remotion/components/BackgroundGradients.tsx',
    'src/remotion/components/SubtitlesOverlay.tsx',
    'src/remotion/components/AudioMixer.tsx',
    'src/remotion/components/TitleScene.tsx',
    'src/remotion/components/CodeEditorScene.tsx',
    'src/remotion/components/ArchitectureScene.tsx',
    'src/remotion/components/ConceptCardScene.tsx',
    'src/remotion/components/ComparisonScene.tsx',
    'src/remotion/components/SummaryScene.tsx',
    'remotion.config.ts',
  ];
  for (const f of p4Files) {
    const full = path.join(ROOT, f);
    fs.existsSync(full) ? pass(`P4-F  ${f}`, fs.statSync(full).size + ' bytes') : fail(`P4-F  MISSING: ${f}`);
  }

  // ── P4-C: CSS has required tokens ─────────────────────────────
  const cssPath = path.join(ROOT, 'src/remotion/styles/video.css');
  if (fs.existsSync(cssPath)) {
    const css = fs.readFileSync(cssPath, 'utf-8');
    css.includes('--bg-base')      ? pass('P4-C  CSS has --bg-base variable') : fail('P4-C  CSS --bg-base missing');
    css.includes('--cyan')         ? pass('P4-C  CSS has --cyan variable') : fail('P4-C  CSS --cyan missing');
    css.includes('glass-card')     ? pass('P4-C  CSS has .glass-card class') : fail('P4-C  CSS glass-card missing');
    css.includes('code-editor')    ? pass('P4-C  CSS has .code-editor class') : fail('P4-C  CSS code-editor missing');
    css.includes('subtitles')      ? pass('P4-C  CSS has subtitles styles') : fail('P4-C  CSS subtitles missing');
    css.includes('JetBrains Mono') ? pass('P4-C  CSS imports JetBrains Mono font') : fail('P4-C  JetBrains Mono font missing');
    css.includes('Outfit')         ? pass('P4-C  CSS imports Outfit font') : fail('P4-C  Outfit font missing');
  }

  // ── P4-T: TypeScript zero errors ─────────────────────────────
  console.log('\n  [P4-T] Running TypeScript type check (tsc --noEmit)…');
  const tscResult = spawnSync('npx', ['tsc', '--noEmit', '--skipLibCheck'], {
    cwd: ROOT, encoding: 'utf-8', shell: true,
    timeout: 30000,
  });
  if (tscResult.status === 0) {
    pass('P4-T  TypeScript: 0 errors');
  } else {
    const errors = (tscResult.stdout + tscResult.stderr).trim().split('\n').slice(0, 8).join('\n');
    fail('P4-T  TypeScript has errors', errors);
  }

  // ── P4-I: Import check — no circular or missing imports ───────
  console.log('  [P4-I] Import graph check…');
  for (const [file, imports] of [
    ['src/remotion/index.ts',           ['./Root']],
    ['src/remotion/Root.tsx',           ['./EducationalVideo']],
    ['src/remotion/EducationalVideo.tsx', ['./components/TitleScene', './components/CodeEditorScene']],
    ['src/remotion/components/TitleScene.tsx', ['./BackgroundGradients', './SubtitlesOverlay', './AudioMixer']],
  ]) {
    const content = fs.readFileSync(path.join(ROOT, file), 'utf-8');
    for (const imp of imports) {
      content.includes(imp) ? pass(`P4-I  ${path.basename(file)} imports ${imp.split('/').pop()}`) : fail(`P4-I  ${path.basename(file)} missing import: ${imp}`);
    }
  }

  // ── P4-R: Root composition structure ────────────────────────
  const indexContent = fs.readFileSync(path.join(ROOT, 'src/remotion/index.ts'), 'utf-8');
  const rootContent  = fs.readFileSync(path.join(ROOT, 'src/remotion/Root.tsx'), 'utf-8');
  indexContent.includes('registerRoot')    ? pass('P4-R  index.ts calls registerRoot') : fail('P4-R  registerRoot missing in index.ts');
  rootContent.includes('<Composition')     ? pass('P4-R  Root.tsx has <Composition>') : fail('P4-R  Composition missing');
  rootContent.includes('EducationalVideo') ? pass('P4-R  EducationalVideo registered as composition') : fail('P4-R  EducationalVideo not registered');
  rootContent.includes('fps={30}')         ? pass('P4-R  fps = 30') : fail('P4-R  fps setting missing');
  rootContent.includes('width={1920}')     ? pass('P4-R  width = 1920') : fail('P4-R  width setting');
  rootContent.includes('height={1080}')    ? pass('P4-R  height = 1080') : fail('P4-R  height setting');


  // ── P4-S: AudioMixer ducking logic present ───────────────────
  const mixerContent = fs.readFileSync(path.join(ROOT, 'src/remotion/components/AudioMixer.tsx'), 'utf-8');
  mixerContent.includes('BG_VOLUME_DUCKED')  ? pass('P4-S  AudioMixer has ducking constant') : fail('P4-S  DUCKED constant missing');
  mixerContent.includes('LOOKAHEAD_SEC')     ? pass('P4-S  AudioMixer has lookahead logic') : fail('P4-S  lookahead missing');
  mixerContent.includes('<Audio')            ? pass('P4-S  AudioMixer uses <Audio> component') : fail('P4-S  Audio component missing');
  mixerContent.includes('loop')              ? pass('P4-S  bg music loops') : fail('P4-S  loop missing on bg music');

  // ── P4-SR: Subtitle estimator present ───────────────────────
  const subContent = fs.readFileSync(path.join(ROOT, 'src/remotion/components/SubtitlesOverlay.tsx'), 'utf-8');
  subContent.includes('estimateSubtitles') ? pass('P4-SR estimateSubtitles fallback exported') : fail('P4-SR estimateSubtitles missing');
  subContent.includes('subtitle-word--active') ? pass('P4-SR active word class present') : fail('P4-SR active class missing');

  // ── P4-V: Actual still-frame render (the real visual test) ───
  console.log('\n  [P4-V] Rendering still frames to verify Remotion pipeline…');
  console.log('         (This launches Chromium — takes 30–60s)');

  const outDir = path.join(ROOT, 'temp/phase4_frames');
  fs.mkdirSync(outDir, { recursive: true });

  for (const [frameNum, sceneName] of [[0, 'TitleScene frame 0'], [90, 'ArchitectureScene frame 90'], [270, 'CodeEditorScene frame 270']]) {
    const outFile = path.join(outDir, `frame_${frameNum}.png`);
    const result = spawnSync('npx', [
      'remotion', 'still',
      'src/remotion/index.ts',
      'EducationalVideo',
      '--frame=' + frameNum,
      '--output=' + outFile,
    ], {
      cwd: ROOT, encoding: 'utf-8', shell: true,
      timeout: 90000,
    });

    if (result.status === 0 && fs.existsSync(outFile)) {
      const sizeKb = Math.round(fs.statSync(outFile).size / 1024);
      sizeKb > 50
        ? pass(`P4-V  Rendered ${sceneName} → ${sizeKb}KB`, outFile)
        : fail(`P4-V  ${sceneName} file too small (${sizeKb}KB) — may be blank`);
    } else {
      const errLines = (result.stdout + result.stderr).trim().split('\n').slice(-6).join('\n');
      fail(`P4-V  Render ${sceneName}`, errLines.slice(0, 120));
    }
  }
}

async function main() {
  await runPhase3();
  await runPhase4();

  // ── Summary ──────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(64));
  console.log('  RESULTS');
  console.log('═'.repeat(64));
  for (const r of results) {
    const icon   = r.status === 'PASS' ? '✓' : '✗';
    const detail = r.detail ? '  →  ' + r.detail.slice(0, 70) : '';
    console.log(icon + ' [' + r.status + '] ' + r.label + detail);
  }
  console.log('═'.repeat(64));
  console.log('  PASSED : ' + passed + ' / ' + (passed + failed));
  console.log('  FAILED : ' + failed);
  console.log('═'.repeat(64) + '\n');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error('[FATAL]', e.message); process.exit(1); });
