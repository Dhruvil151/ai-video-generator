# AI Video Generator — Project Handover

Welcome! If you are a new AI thread picking up this project, this document contains everything you need to know about the architecture, key decisions, and how to run the system.

## 🎯 Project Goal
A fully automated, end-to-end AI Video Generator. It takes a text topic (e.g., "JavaScript Promises"), generates a 5-10 scene script via Google Gemini, synthesizes voiceovers via Edge-TTS, renders visuals via Remotion, and stitches it all together with background music using FFmpeg.

## 🏗️ Architecture
The system is built on a decoupled **Express.js API + BullMQ Worker** architecture. 

### 1. Backend (Node.js)
- **`server/server.js`**: Express API. Serves the web dashboard, proxies Gemini requests (`scriptController.js`), and queues render jobs.
- **`server/worker.js`**: BullMQ Worker. Processes the heavy lifting (TTS, Remotion rendering, FFmpeg). Must be run as a separate process.
- **Redis (`docker-compose.yml`)**: Used by BullMQ for job queues and message passing.

### 2. Video Pipeline (`server/services/renderPipeline.js`)
The worker executes jobs in 5 phases:
1. **TTS**: Python bridge to `edge-tts` (`generate_audio.py`). Audio is saved to `public/audio/`.
2. **Bundle**: `@remotion/bundler` creates a Webpack bundle of the React composition (`remotionRenderService.js`).
3. **Render**: `@remotion/renderer` renders the bundle into per-scene `.mp4` chunks in parallel (headless Chromium).
4. **Stitch**: `ffmpegService.js` demuxes the chunks together, overlays background music, and applies sidechain ducking.
5. **Cleanup**: Temp chunks are deleted.

### 3. Frontend Web Dashboard (`public/`)
- A strict **Vanilla HTML/CSS/JS** Single Page Application. No frontend frameworks (React/Vite) were used for the UI to adhere to a "Zero Install" philosophy.
- **`public/js/app.js`**: Connects to the Express API via `fetch()` and tracks live rendering progress via Server-Sent Events (SSE) from `GET /api/render/:jobId/stream`.

## 🛠️ Key Technical Decisions & Quirks
- **Zero Manual Installs (mostly)**: 
  - We use `ffmpeg-static` and `ffprobe-static` via npm. 
  - **Exception**: Python 3.12+ and `edge-tts` (`pip install edge-tts`) MUST be installed on the host machine.
- **Worker Concurrency**: 
  - The BullMQ worker is explicitly capped at `{ concurrency: 1 }` to prevent OOM/CPU crashes during heavy Remotion/FFmpeg rendering.
- **Remotion Audio Fetching**: 
  - Because TTS audio is generated *after* the initial Remotion bundle is created, Remotion fetches audio assets directly from the Express API using absolute URLs (`http://localhost:3001/public/audio/...`) to bypass the static bundler cache.
- **API/Worker Sync**: 
  - The Express API and BullMQ worker run in separate processes. The API server manually syncs the latest BullMQ state (`bullJob.progress`) into its local memory so the SSE stream stays accurate.

## 🚀 How to Run the Project
The environment requires 3 terminal windows running simultaneously.

1. **Start Redis (requires Docker Desktop running)**:
   ```powershell
   cd project101
   docker-compose up -d
   ```
2. **Start the API Server**:
   ```powershell
   node server/server.js
   ```
3. **Start the Render Worker**:
   ```powershell
   node server/worker.js
   ```
4. **Test the UI**:
   Open a browser to `http://localhost:3001/public/index.html`.

## ✅ Current Status
- Phases 1 through 6 are **100% complete**. 
- The system has been thoroughly E2E tested.
- All temporary debugging files and caches have been cleaned up. The workspace is pristine.

## 🔜 Next Steps / Future Ideas
The core engine is rock solid. The next logical features to implement would be:
- Expanding the Remotion React templates (e.g., adding dynamic B-roll fetching, better animations).
- Adding multi-language voiceover support.
- Enhancing the Web Dashboard to allow previewing and editing the generated script before rendering.
