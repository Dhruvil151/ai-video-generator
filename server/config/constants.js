// ─── Video Output ────────────────────────────────────────────────────────────
export const VIDEO_CONFIG = {
  FPS: 30,
  WIDTH: 1920,
  HEIGHT: 1080,
  // Natural educational speech rate (accounting for pauses & emphasis)
  WORDS_PER_MINUTE: 140,
  // Silence padding added after each scene's raw TTS duration
  SCENE_TRANSITION_PADDING_SEC: 0.6,
  // Background music volumes
  BG_MUSIC_VOLUME_AMBIENT: 0.15,  // volume when no speech
  BG_MUSIC_VOLUME_DUCKED:  0.02,  // volume under voiceover
  // Ducking lookahead/lookbehind in ms around word timestamps
  DUCKING_PADDING_MS: 200,
};

// ─── Neural Voices (Microsoft Edge TTS) ─────────────────────────────────────
export const AVAILABLE_VOICES = [
  { id: 'en-US-ChristopherNeural', name: 'Christopher — US Male (Professional)', gender: 'Male',   lang: 'en-US' },
  { id: 'en-US-JennyNeural',       name: 'Jenny — US Female (Clear & Engaging)', gender: 'Female', lang: 'en-US' },
  { id: 'en-US-GuyNeural',         name: 'Guy — US Male (Casual Tech Presenter)', gender: 'Male',  lang: 'en-US' },
  { id: 'en-US-AriaNeural',        name: 'Aria — US Female (Studio Quality)',    gender: 'Female', lang: 'en-US' },
  { id: 'en-IN-PrabhatNeural',     name: 'Prabhat — Indian English Male',        gender: 'Male',   lang: 'en-IN' },
  { id: 'en-IN-NeerjaExpressiveNeural', name: 'Neerja — Indian English Female', gender: 'Female', lang: 'en-IN' },
];

export const DEFAULT_VOICE = 'en-US-ChristopherNeural';

// ─── Scene Types ─────────────────────────────────────────────────────────────
export const SCENE_TYPES = {
  TITLE:        'TitleScene',
  CODE_EDITOR:  'CodeEditorScene',
  ARCHITECTURE: 'ArchitectureScene',
  CONCEPT_CARD: 'ConceptCardScene',
  COMPARISON:   'ComparisonScene',
  SUMMARY:      'SummaryScene',
};

// ─── BullMQ Queue ────────────────────────────────────────────────────────────
export const QUEUE_NAME = 'video-render';
export const WORKER_CONCURRENCY = 1; // Only 1 render job at a time (prevents OOM)

// ─── TTS Retry ───────────────────────────────────────────────────────────────
export const TTS_MAX_RETRIES = 4;
export const TTS_BASE_DELAY_MS = 1000; // doubles each retry + random jitter

// ─── Cache TTL ───────────────────────────────────────────────────────────────
export const TTS_CACHE_TTL_HOURS = 72;
export const SCENE_CACHE_TTL_HOURS = 24;

// ─── Mode configs ────────────────────────────────────────────────────────────
export const VIDEO_MODES = {
  short: {
    label: 'Short Explainer',
    targetMinutes: 2,
    sceneCount: 5,
    description: 'Fast-paced overview covering the key concepts.',
  },
  detailed: {
    label: 'Detailed Deep Dive',
    targetMinutes: 8,
    sceneCount: 10,
    description: 'Multi-chapter breakdown with architecture, code walkthroughs, and internals.',
  },
};
