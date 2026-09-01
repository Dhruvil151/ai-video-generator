/**
 * BullMQ Worker — Phase 5
 *
 * Picks jobs off the 'video-render' queue (concurrency: 1)
 * and runs the full render pipeline:
 *   TTS → Remotion bundle → per-scene renderMedia → FFmpeg stitch
 */
import { Worker } from 'bullmq';
import { redisConnection } from './queues/videoQueue.js';
import { ensureDirectories } from './utils/fileHelper.js';
import { checkPythonDependencies } from './utils/pythonCheck.js';
import { QUEUE_NAME, WORKER_CONCURRENCY } from './config/constants.js';
import { runRenderPipeline, setJobRegistry } from './services/renderPipeline.js';
import { scriptStore } from './controllers/scriptController.js';
import { jobStore } from './controllers/renderController.js';

// ── Startup checks ─────────────────────────────────────────────────────────────
ensureDirectories();
checkPythonDependencies();

// Give renderPipeline access to the in-memory job store for progress updates
setJobRegistry(jobStore);

// ── Job processor ──────────────────────────────────────────────────────────────
async function processJob(bullJob) {
  const { scriptId, script, voice, bgMusicUrl } = bullJob.data;

  console.log(`\n[Worker] ▶ Job ${bullJob.id} — scriptId: ${scriptId}`);

  if (!script) {
    throw new Error(`Script "${scriptId}" not found in job payload.`);
  }

  // Look up the in-memory RenderJobModel
  const model = jobStore.get(bullJob.id) || null;

  // Run the full pipeline
  const result = await runRenderPipeline(bullJob, model, script, { voice, bgMusicUrl });

  console.log(`[Worker] ✓ Job ${bullJob.id} complete → ${result.outputUrl}`);
  return result;
}

// ── Worker (concurrency: 1 — CRITICAL to prevent OOM) ─────────────────────────
const worker = new Worker(QUEUE_NAME, processJob, {
  connection: redisConnection,
  concurrency: WORKER_CONCURRENCY,
});

worker.on('active',    (job) => console.log(`[Worker] Active: job ${job.id}`));
worker.on('progress',  (job, p) => console.log(`[Worker] Progress: job ${job.id} → ${p}%`));
worker.on('completed', (job) => console.log(`[Worker] ✓ Completed: job ${job.id}`));
worker.on('failed',    (job, err) => console.error(`[Worker] ✗ Failed: job ${job?.id}:`, err.message));
worker.on('error',     (err) => console.error('[Worker] Queue error:', err.message));

console.log(`\n╔══════════════════════════════════════════════╗`);
console.log(`║  AI Video Generator — BullMQ Worker          ║`);
console.log(`╠══════════════════════════════════════════════╣`);
console.log(`║  Queue       → ${QUEUE_NAME.padEnd(28)}║`);
console.log(`║  Concurrency → ${String(WORKER_CONCURRENCY).padEnd(28)}║`);
console.log(`╚══════════════════════════════════════════════╝`);
console.log(`\n[Worker] Ready. Waiting for render jobs…\n`);
