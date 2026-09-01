/**
 * RenderController — Phase 5
 *
 * Endpoints:
 *   POST   /api/render/start        — Queue a new video render job
 *   GET    /api/render/:jobId       — Poll job status + progress
 *   GET    /api/render/:jobId/stream — SSE progress stream
 *   GET    /api/render              — List recent jobs
 *   DELETE /api/render/:jobId       — Cancel / remove a job
 */
import { scriptStore } from './scriptController.js';
import { videoQueue }   from '../queues/videoQueue.js';
import { RenderJobModel, JOB_STATUS } from '../models/RenderJob.js';
import { AVAILABLE_VOICES, DEFAULT_VOICE } from '../config/constants.js';

// ── In-memory job store (jobId → RenderJobModel) ─────────────────────────────
// Exported so renderPipeline can update it from the worker process.
export const jobStore = new Map();

// ── POST /api/render/start ────────────────────────────────────────────────────
export async function startRender(req, res) {
  const { scriptId, voice, bgMusicUrl } = req.body;

  if (!scriptId || typeof scriptId !== 'string') {
    return res.status(400).json({ error: 'scriptId is required' });
  }

  const script = scriptStore.get(scriptId);
  if (!script) {
    return res.status(404).json({ error: `Script "${scriptId}" not found. Generate a script first.` });
  }

  // Validate voice
  const resolvedVoice = voice && AVAILABLE_VOICES.find(v => v.id === voice)
    ? voice
    : DEFAULT_VOICE;

  // Create in-memory job model
  const jobModel = new RenderJobModel(null, script);

  // Add to BullMQ — timeout after 4s so we fail fast when Redis is down
  let bullJob;
  try {
    bullJob = await Promise.race([
      videoQueue.add('render', {
        scriptId,
        script, // Pass full script payload to worker
        voice:    resolvedVoice,
        bgMusicUrl: bgMusicUrl || null,
      }, {
        attempts:    2,
        backoff:     { type: 'exponential', delay: 3000 },
        removeOnComplete: 50,
        removeOnFail:     20,
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('REDIS_TIMEOUT')), 4000)
      ),
    ]);
  } catch (err) {
    console.error('[RenderController] Failed to queue job:', err.message);
    return res.status(503).json({
      error: 'Queue unavailable. Is Redis running? Try: docker-compose up -d',
      detail: err.message,
    });
  }

  // Update model with the real BullMQ job ID
  jobModel.jobId = bullJob.id;
  jobStore.set(bullJob.id, jobModel);

  console.log(`[RenderController] Job queued: ${bullJob.id} — "${script.topic}" [${script.mode}] — voice: ${resolvedVoice}`);

  return res.status(202).json({
    jobId:       bullJob.id,
    scriptId:    script.id,
    topic:       script.topic,
    mode:        script.mode,
    voice:       resolvedVoice,
    status:      jobModel.status,
    progress:    jobModel.progress,
    currentStep: jobModel.currentStep,
    totalScenes: jobModel.totalScenes,
    startedAt:   jobModel.startedAt,
    pollUrl:     `/api/render/${bullJob.id}`,
    streamUrl:   `/api/render/${bullJob.id}/stream`,
  });
}

// ── GET /api/render/:jobId ────────────────────────────────────────────────────
export async function getJobStatus(req, res) {
  const { jobId } = req.params;

  const model = jobStore.get(jobId);
  if (!model) {
    return res.status(404).json({ error: `Job "${jobId}" not found` });
  }

  // Also check BullMQ for the latest worker-side progress
  let bullState = null;
  try {
    const bullJob = await videoQueue.getJob(jobId);
    if (bullJob) {
      bullState = await bullJob.getState();
      
      // Sync progress
      if (bullJob.progress > 0) {
        model.progress = bullJob.progress;
      }

      // Sync state transitions
      if (bullState === 'completed' && model.status !== JOB_STATUS.COMPLETED) {
        model.outputVideoUrl = bullJob.returnvalue?.outputUrl || bullJob.returnvalue;
        model.updateProgress(JOB_STATUS.COMPLETED, 100, 'Video ready!');
      } else if (bullState === 'failed' && model.status !== JOB_STATUS.FAILED) {
        const err = bullJob.failedReason || 'Unknown error';
        model.fail(err);
      } else if (bullState === 'active' && model.status === JOB_STATUS.QUEUED) {
        model.status = JOB_STATUS.PROCESSING;
        model.currentStep = 'Processing in background worker…';
      }
    }
  } catch { /* BullMQ unavailable — return cached model state */ }

  return res.status(200).json({
    ...model.toJSON(),
    bullState,
  });
}

// ── GET /api/render/:jobId/stream ─────────────────────────────────────────────
// Server-Sent Events — client gets a live progress stream
export async function streamJobProgress(req, res) {
  const { jobId } = req.params;

  const model = jobStore.get(jobId);
  if (!model) {
    return res.status(404).json({ error: `Job "${jobId}" not found` });
  }

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const send = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Send current state immediately
  send(model.toJSON());

  // Poll every 1s and push updates
  const interval = setInterval(() => {
    send(model.toJSON());

    const terminal = [JOB_STATUS.COMPLETED, JOB_STATUS.FAILED];
    if (terminal.includes(model.status)) {
      clearInterval(interval);
      res.write('event: done\ndata: {}\n\n');
      res.end();
    }
  }, 1000);

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(interval);
  });
}

// ── GET /api/render ───────────────────────────────────────────────────────────
export async function listJobs(req, res) {
  const jobs = Array.from(jobStore.values())
    .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
    .slice(0, 20)  // last 20 jobs
    .map(m => m.toJSON());

  return res.status(200).json({ jobs, total: jobStore.size });
}

// ── DELETE /api/render/:jobId ─────────────────────────────────────────────────
export async function deleteJob(req, res) {
  const { jobId } = req.params;

  const model = jobStore.get(jobId);
  if (!model) {
    return res.status(404).json({ error: `Job "${jobId}" not found` });
  }

  // Try to remove from BullMQ
  try {
    const bullJob = await videoQueue.getJob(jobId);
    if (bullJob) await bullJob.remove();
  } catch { /* Already completed or missing */ }

  jobStore.delete(jobId);
  return res.status(200).json({ message: `Job "${jobId}" removed` });
}
