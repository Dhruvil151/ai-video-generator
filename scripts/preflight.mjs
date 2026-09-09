// Read-only readiness checks. Never launches generation or queues a render.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fixtures } from '../server/tests/fixtures/demonstrations.mjs';
import { ScriptModel } from '../server/models/Script.js';
import { validateStoryboard } from '../server/services/storyboardValidation.js';
const require=createRequire(import.meta.url);
for(const name of ['@remotion/renderer','@remotion/bundler','ffmpeg-static','ffprobe-static','prismjs'])require.resolve(name);
for(const file of ['public/tech/redis.svg','temp/test_e2e.mjs','server/tests/fixtures/baseline/job-37.manifest.json','server/tests/fixtures/baseline/job-39.manifest.json']){
  if(!fs.existsSync(file))throw new Error('Missing readiness asset: '+file);
}
for(const raw of fixtures){const script=new ScriptModel(raw);validateStoryboard(script);script.sections.forEach(s=>s.populateVisualTimings(script.examples));}
console.log('Local readiness checks passed. E2E remains gated by user authorization. No generation services called.');
