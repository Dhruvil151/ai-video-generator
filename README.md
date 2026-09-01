# AI Educational Video Generator

> Automatically generate production-quality educational videos from any technical topic using Gemini AI, Edge-TTS, and Remotion — at **zero cost**.

---

## Prerequisites

> ⚠️ **This is the only manual setup step.** Everything else (Redis, FFmpeg) is fully automated.

**Python 3.10+** must be installed with `edge-tts`:

```bash
python --version      # must be 3.10 or higher
pip install edge-tts
```

The server automatically checks for Python and `edge-tts` on startup and exits with a clear error message if either is missing.

---

## Quick Start

### 1. Clone & Install
```bash
git clone <repo-url>
cd project101
npm install
pip install edge-tts
```

### 2. Configure Environment
```bash
cp .env.example .env
# Add your GEMINI_API_KEY to .env
```

### 3. Start Redis (Docker required)
```bash
docker-compose up -d
```

### 4. Run the App
```bash
npm run dev
```

This starts three processes concurrently:
- **SERVER** → Express API on `http://localhost:3001`
- **WORKER** → BullMQ background render worker
- **CLIENT** → Vite dashboard on `http://localhost:5173`

### 5. Health Check
```bash
curl http://localhost:3001/api/health
# → { "ok": true, "redis": "connected", "python": "3.x.x", "edgeTts": true }
```

---

## Architecture

| Layer | Technology | Purpose |
|---|---|---|
| **AI Scripting** | Google Gemini 1.5 Flash (free) | Topic → structured scene JSON storyboard |
| **Voiceover** | Microsoft Edge TTS via `edge-tts` (free) | Neural voice synthesis with word timestamps |
| **Motion Graphics** | Remotion (React-based) | Animated scenes: code editor, architecture diagrams, concept cards |
| **Audio Ducking** | Remotion `interpolate()` | Frame-perfect lo-fi music ducking under voiceover |
| **Rendering** | `@remotion/renderer` | Per-scene headless Chromium rendering → `.mp4` chunks |
| **Concatenation** | FFmpeg via `ffmpeg-static` | Stitch scene chunks into final video (no system install) |
| **Job Queue** | BullMQ + Redis (Docker) | Background rendering, concurrency:1, progress tracking |
| **Caching** | SHA-256 file cache | Skip re-rendering unchanged TTS audio & scene chunks |
| **Dashboard** | React + Vite | Topic input, storyboard editor, live progress, video player |

---

## How It Works

```
1. Enter topic + mode (Short ~2min / Detailed ~8min)
2. Gemini generates a scene-by-scene JSON storyboard
3. Review & edit scenes in the storyboard editor
4. Click "Render Video" → job queued in BullMQ
5. Worker synthesizes TTS audio for each scene (cached)
6. Worker bundles Remotion once, renders each scene chunk (cached)
7. FFmpeg stitches all chunks into a final 1080p MP4
8. Watch the finished video in the dashboard and download
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | ✅ Yes | Get free from [Google AI Studio](https://aistudio.google.com) |
| `PORT` | No | Express server port (default: `3001`) |
| `REDIS_URL` | No | Redis connection (default: `redis://localhost:6379`) |
| `NODE_ENV` | No | `development` or `production` |

---

## Project Structure

```
project101/
├── docker-compose.yml       # Redis via Docker
├── assets/music/            # CC0 lo-fi background music
├── cache/                   # TTS audio & scene chunk cache (gitignored)
├── public/output/           # Final rendered videos
├── server/                  # Express API (MVC)
│   ├── config/              # Environment & constants
│   ├── models/              # Script & RenderJob schemas
│   ├── controllers/         # Route handlers
│   ├── services/            # Gemini, TTS, Remotion, FFmpeg
│   ├── queues/              # BullMQ queue + worker
│   └── utils/               # Helpers: hash, file, duration, python check
└── src/
    ├── remotion/            # Remotion scene components
    └── web/                 # React dashboard
```
