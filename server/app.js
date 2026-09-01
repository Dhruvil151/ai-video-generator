import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { ENV } from './config/env.js';
import { ensureDirectories } from './utils/fileHelper.js';
import { checkPythonDependencies } from './utils/pythonCheck.js';
import { videoQueue } from './queues/videoQueue.js';
import apiRouter from './routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ── Startup checks ────────────────────────────────────────────────────────────
ensureDirectories();
const pythonVersion = checkPythonDependencies();

// ── App setup ─────────────────────────────────────────────────────────────────
const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve generated files (audio, output videos) statically
app.use('/public', express.static(ENV.PUBLIC_DIR));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api', apiRouter);

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  let redisStatus = 'disconnected';

  try {
    // Race the Redis ping against a 2-second timeout
    await Promise.race([
      videoQueue.isPaused(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Redis timeout')), 2000)
      ),
    ]);
    redisStatus = 'connected';
  } catch {
    redisStatus = 'unavailable (start with: docker-compose up -d)';
  }

  res.json({
    ok: true,
    redis: redisStatus,
    python: pythonVersion,
    edgeTts: true,
    env: ENV.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ── 404 fallback ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Express Error]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

export default app;
