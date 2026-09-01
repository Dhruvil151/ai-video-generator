/**
 * Render Routes — Phase 5
 */
import { Router } from 'express';
import {
  startRender,
  getJobStatus,
  streamJobProgress,
  listJobs,
  deleteJob,
} from '../controllers/renderController.js';

const router = Router();

// Queue a new render job
router.post('/start', startRender);

// List recent jobs
router.get('/', listJobs);

// Get single job status (polling)
router.get('/:jobId', getJobStatus);

// SSE live stream for a job
router.get('/:jobId/stream', streamJobProgress);

// Delete / cancel a job
router.delete('/:jobId', deleteJob);

export default router;
