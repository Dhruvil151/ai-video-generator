// ─── Job Status Enum ─────────────────────────────────────────────────────────
export const JOB_STATUS = {
  QUEUED:           'queued',
  PREPARING:        'preparing',
  GENERATING_AUDIO: 'generating_audio',
  BUNDLING:         'bundling',
  RENDERING_SCENES: 'rendering_scenes',
  STITCHING:        'stitching',
  COMPLETED:        'completed',
  FAILED:           'failed',
};

// ─── RenderJobModel ──────────────────────────────────────────────────────────
export class RenderJobModel {
  constructor(jobId, script) {
    this.jobId   = jobId || `job_${Date.now()}`;
    this.scriptId = script?.id || null;
    this.topic   = script?.topic || '';
    this.status  = JOB_STATUS.QUEUED;
    this.progress = 0;       // 0 – 100
    this.currentStep = 'Queued — waiting for worker';

    // Per-scene render progress
    this.totalScenes     = script?.scenes?.length || 0;
    this.completedScenes = 0;

    // Output
    this.outputVideoPath = null;
    this.outputVideoUrl  = null;

    // Error
    this.error = null;

    // Timing
    this.startedAt   = new Date().toISOString();
    this.completedAt = null;
  }

  /**
   * Update job progress. Clamps progress to [0, 100].
   * @param {string} status  - One of JOB_STATUS values
   * @param {number} progress - 0–100
   * @param {string} message  - Human-readable step description
   */
  updateProgress(status, progress, message) {
    this.status      = status;
    this.progress    = Math.min(100, Math.max(0, Math.round(progress)));
    this.currentStep = message || this.currentStep;
    if (status === JOB_STATUS.COMPLETED) {
      this.completedAt = new Date().toISOString();
    }
  }

  /** Mark a scene as complete and update the rendering sub-progress. */
  onSceneComplete(sceneIndex) {
    this.completedScenes = sceneIndex + 1;
    // Scenes render spans 15% → 70% of total progress
    const sceneProgress = (this.completedScenes / Math.max(1, this.totalScenes));
    this.progress = Math.round(15 + sceneProgress * 55);
    this.currentStep = `Rendering scene ${this.completedScenes} / ${this.totalScenes}`;
  }

  fail(errorMessage) {
    this.status      = JOB_STATUS.FAILED;
    this.error       = errorMessage;
    this.completedAt = new Date().toISOString();
  }

  toJSON() {
    return {
      jobId:           this.jobId,
      scriptId:        this.scriptId,
      topic:           this.topic,
      status:          this.status,
      progress:        this.progress,
      currentStep:     this.currentStep,
      totalScenes:     this.totalScenes,
      completedScenes: this.completedScenes,
      outputVideoUrl:  this.outputVideoUrl,
      srtUrl:          this.srtUrl || null,
      warnings:        this.warnings || [],
      error:           this.error,
      startedAt:       this.startedAt,
      completedAt:     this.completedAt,
    };
  }
}
