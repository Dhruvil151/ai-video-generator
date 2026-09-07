# Complete Project Documentation & System Guide: AI Educational Video Generator

---

## 📖 Table of Contents
1. [Executive Summary (For Non-Technical Readers)](#1-executive-summary-for-non-technical-readers)
2. [How It Works: The Bird's-Eye View](#2-how-it-works-the-birds-eye-view)
3. [End-to-End Workflow & Life of a Video](#3-end-to-end-workflow--life-of-a-video)
4. [Visual Scene Types & Layout Variants](#4-visual-scene-types--layout-variants)
5. [System Architecture & Technology Stack](#5-system-architecture--technology-stack)
6. [Complete API Reference & Data Contracts](#6-complete-api-reference--data-contracts)
7. [Directory & File Structure Deep Dive](#7-directory--file-structure-deep-dive)
8. [Reliability & Zero-Failure Engineering](#8-reliability--zero-failure-engineering)
9. [Configuration, Setup & Deployment Guide](#9-configuration-setup--deployment-guide)
10. [Frequently Asked Questions & Troubleshooting](#10-frequently-asked-questions--troubleshooting)

---

## 1. Executive Summary (For Non-Technical Readers)

### 💡 What is this project?
The **AI Educational Video Generator** is an automated software system that transforms any single text prompt (for example, *"How JavaScript Closures Work"* or *"The History of the Internet"*) into a **fully animated, studio-quality, narrated 1080p educational video** in under 5 minutes — without human intervention.

### 🎯 What problem does it solve?
Creating a good educational tech video typically takes **8 to 20 hours** of manual work:
1. Researching and writing an engaging script.
2. Hiring a voice actor or recording voiceover audio.
3. Designing slides, diagrams, and code snippets in Figma or PowerPoint.
4. Setting keyframes and animations in After Effects or Premiere Pro.
5. Timing animations to match spoken words, adding background music, and rendering.

**This application automates 100% of that workflow.** You type a topic, select your desired depth and voice actor, click "Generate," and download a broadcast-ready `.mp4` video.

### 🌟 Key Highlights & Differentiators
* **Dynamic Storyboarding (Not Cookie-Cutter Slides):** Unlike generic slide-makers that apply one fixed template, this system uses Artificial Intelligence (Google Gemini) as a creative director. For every topic, it intelligently selects between **11 distinct visual scene types** (code editors, architecture diagrams, timelines, stats counters, terminal emulators, comparison grids, quotes, etc.) and picks specific layout variants that best explain the subject.
* **Realistic AI Voiceover with Word Sync:** Converts narration into natural-sounding speech using Microsoft Edge Neural voices with precise pause management and subtitle synchronization.
* **Studio-Grade Motion Graphics:** Visuals are programmed as dynamic React components using **Remotion**, providing smooth 60fps/30fps spring animations, glowing dark-mode aesthetics, syntax-highlighted code, and glassmorphism UI elements.
* **Automated Audio Mastering:** Background lofi music plays softly during pauses and automatically ducks (quiets down) when the AI voiceover speaks, using professional audio sidechain compression.
* **$0 Ongoing Cost Architecture:** Built entirely on free-tier APIs and open-source tools (Google Gemini Free Tier, Microsoft Edge-TTS, Remotion Engine, FFmpeg, and Dockerized Redis).

---

## 2. How It Works: The Bird's-Eye View

```
       ┌─────────────────────────────────────────────────────────┐
       │                       USER INPUT                        │
       │     Topic: "JavaScript Promises" | Mode: Short (2m)     │
       └────────────────────────────┬────────────────────────────┘
                                    │
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │             STEP 1: SCRIPT & STORYBOARD AI              │
       │   Google Gemini AI generates scenes, narration, layout, │
       │   syntax-highlighted code, diagrams, and pacing pauses. │
       └────────────────────────────┬────────────────────────────┘
                                    │
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │              STEP 2: VOICE SYNTHESIS (TTS)              │
       │  Edge-TTS generates ultra-natural MP3 voiceovers and    │
       │  measures precise millisecond durations per scene.      │
       └────────────────────────────┬────────────────────────────┘
                                    │
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │             STEP 3: MOTION GRAPHIC RENDERING            │
       │  Remotion boots headless Chromium to animate and export │
       │  each visual scene into high-definition video chunks.   │
       └────────────────────────────┬────────────────────────────┘
                                    │
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │          STEP 4: AUDIO MASTERING & STITCHING            │
       │  FFmpeg joins video chunks, overlays voiceover audio,   │
       │  adds background music with ducking, and applies fades. │
       └────────────────────────────┬────────────────────────────┘
                                    │
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │                     FINAL OUTPUT                        │
       │     Ready-to-watch, 1080p 30fps MP4 Educational Video   │
       └─────────────────────────────────────────────────────────┘
```

---

## 3. End-to-End Workflow & Life of a Video

When a user submits a video generation request, the system executes seven distinct stages across its frontend, API server, background worker queue, and media pipelines:

### Stage 1: Topic Submission & Duration Estimation
1. The user enters a topic (e.g., *"Docker Containers"*), chooses a **Detail Level** (`Short` ~2 mins / 4-8 scenes or `Detailed` ~8 mins / 8-14 scenes), and picks a voice actor.
2. The frontend sends a request to the backend `/api/script/generate` endpoint. (A lightweight `/api/script/estimate` endpoint is also available for instantaneous duration calculation without spending API credits).

### Stage 2: AI Script Generation & Creative Directing
1. The backend constructs a comprehensive master prompt and sends it to **Google Gemini Flash**.
2. Gemini behaves as a technical educator and motion-graphics director:
   - Evaluates the complexity of the topic.
   - Determines the optimal number of scenes.
   - Picks the appropriate scene types (e.g., Terminal for Docker, Code Editor for React, Architecture for Microservices).
   - Writes conversational narration containing embedded `<break time="0.6s"/>` natural pause markers.
   - Produces structured JSON containing real, syntax-valid code snippets, diagram nodes, and key takeaways.
3. The server validates the JSON schema. If the AI returns malformed JSON or empty content arrays, the server automatically executes repair retries (up to 3 attempts).

### Stage 3: Job Queuing & Asynchronous Processing
1. Once the script is generated, the frontend submits the script ID to `POST /api/render/start`.
2. The API creates a `RenderJob` and pushes the task into a **BullMQ Redis Queue** (`video-render`).
3. The frontend establishes a persistent **Server-Sent Events (SSE)** connection to `/api/render/:jobId/stream` to receive real-time, second-by-second progress updates (0% to 100%).

### Stage 4: Voiceover Synthesis & Pacing Optimization
1. The background worker picks up the job and splits narration into scenes.
2. In parallel batches of 3, the worker invokes a Python bridge (`generate_audio.py`) utilizing **Microsoft Edge-TTS**.
3. The script synthesizes high-fidelity audio (`.mp3`) and extracts word-level boundary timestamps.
4. **Duration Safeguard:** The actual audio duration is verified using `mutagen` and `ffprobe`. Scene duration in the video timeline is locked to the exact audio length plus a `0.6s` natural breathing buffer.
5. All generated audio is cached using SHA-256 hashes so identical text is never re-synthesized.

### Stage 5: Motion Graphics Bundling & Scene Rendering
1. The worker triggers `@remotion/bundler` to package the React video composition into a single Webpack bundle.
2. For each scene, the worker calls `@remotion/renderer` (`renderMedia`):
   - Opens a headless Chromium browser instance.
   - Renders frames at 1920x1080 resolution at 30 FPS.
   - Visuals (spring physics, typography, floating orbs, syntax highlighters) are exported as silent `.mp4` chunks into a temporary job folder.
   - Sequential rendering ensures CPU memory stays within safe limits.

### Stage 6: FFmpeg Video Stitching & Audio Ducking
1. The worker invokes **FFmpeg** (`ffmpeg-static`) with an advanced multi-input filtergraph:
   - **Concatenation:** Joins all individual scene video chunks in precise chronological order.
   - **Audio Synchronization:** Synchronizes each scene's voiceover MP3 track with its matching video chunk.
   - **Background Music Mixing & Ducking:** Uses `sidechaincompress` to dynamically lower background lofi music to `2%` volume whenever speech is active, and restores it to `14%` ambient volume during silence.
   - **Broadcast Normalization:** Applies broadcast-standard color space formatting (`yuv420p`, `bt709`), smooth 0.5s visual and audio fade-ins at the start, and fade-outs at the end.

### Stage 7: Delivery & Temporary Cleanup
1. The finalized `.mp4` video is saved to `public/output/<topic_slug>_<jobId>.mp4`.
2. Intermediate video chunks and temporary files are deleted.
3. The SSE stream emits a `completed` event with the video URL.
4. The web dashboard displays the video player and a direct **Download Video** button.

---

## 4. Visual Scene Types & Layout Variants

The video renderer includes **11 distinct visual scene types**, each equipped with customizable layout modes, dark-mode styling, glassmorphism cards, and spring-based motion curves:

| Scene Type | Primary Use Case | Supported Layout Variants | Key Visual Elements |
|---|---|---|---|
| **TitleScene** | Video introduction & hook (Always Scene 1) | `orbital` (floating tags), `minimal` (sleek left-aligned typography) | Glowing title gradient, subtitle, animated topic badge, floating keyword pills, hook text |
| **ArchitectureScene** | System designs, data flows & pipelines | `flow` (left-to-right nodes), `radial` (central hub + spokes) | Glass cards representing services/databases, animated status badges, pulsing directional connection arrows |
| **CodeEditorScene** | Concrete code demonstrations & syntax | `split` (code + explanation side panel), `fullscreen` (code editor with callout overlay) | VS Code window mockup (traffic light buttons, tabs), line numbering, PrismJS syntax highlighting, animated line focus |
| **ConceptCardScene** | Core concepts, rules & properties | `stack` (vertical list of 3 cards), `grid` (2x2 four-card layout) | Glowing glassmorphism cards, dynamic Lucide tech icons, title, descriptive summary |
| **ComparisonScene** | Contrasting two paradigms (e.g., Old vs New, REST vs GraphQL) | `split` (two balanced vertical columns) | Side-by-side comparison tables, red/green accent headers, checkmarks and cross icons |
| **TimelineScene** | Chronological history, evolution, or multi-phase workflows | `horizontal` (left-to-right milestones), `vertical` (top-to-bottom timeline) | Connected milestone nodes, date/phase badges, sequential reveal animations |
| **StatsScene** | Numerical benchmarks, performance statistics & metrics | `counters` (2-4 big metric cards), `bar` (horizontal animated comparison bars) | Large gradient animated numerals, percentage badges, metric units (e.g., ms, req/s, %) |
| **TerminalScene** | Command-line interfaces, npm scripts, DevOps workflows | `typed` (live terminal typing), `split` (terminal + side explanation) | Mac-style bash terminal window, command prompt (`$`), live simulated typing, syntax outputs |
| **QuoteScene** | Core principles, architectural axioms & computing laws | `centered` (full bleed highlight), `left-accent` (bold colored border bar) | Large quotation typography, author attribution, citation/context badge |
| **StepsScene** | Step-by-step setup guides & algorithmic procedures | `numbered` (vertical numbered badges), `cards` (staggered step cards) | Circular sequence counters (01, 02, 03), action icons, bold instructions |
| **SummaryScene** | Closing recap & memorable takeaways (Always Last Scene) | `checklist` (animated checkmark list), `grid` (3-column summary cards) | Checklist items, final core takeaway callout box, celebratory closing visuals |

### 🛡️ Defensive Rendering & Component Fallbacks
If Google Gemini ever returns missing or incomplete payload fields (e.g., omitted bullet points or blank code), the Remotion components do **not** crash or render blank screens. Each component contains an automated fallback parser that extracts key insights directly from the narration text and generates placeholder content automatically.

---

## 5. System Architecture & Technology Stack

```
┌────────────────────────────────────────────────────────────────────────┐
│                              CLIENT TIER                               │
│  Single Page Application (Vanilla HTML5 / Modern CSS / JavaScript ES6) │
│  Real-time Server-Sent Events (SSE) Listener                           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / EventStream
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                             API ROUTE TIER                             │
│  Express.js Server (Port 3001)                                         │
│  - Script Controller: Gemini AI Prompting & Storyboard Generation      │
│  - Render Controller: BullMQ Job Dispatcher & SSE Stream Broadcaster   │
│  - Audio Controller: Voice Preview & Voice Listing                     │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │ Queue Task                     │ Cache Read/Write
                    ▼                                ▼
┌───────────────────────────────┐        ┌───────────────────────────────┐
│          REDIS QUEUE          │        │        CACHE SUBSYSTEM        │
│ BullMQ ('video-render')       │        │ SHA-256 Hashed Audio & Scenes │
│ Concurrency: 1 (OOM Guard)    │        │ Configurable TTL (24h - 72h)  │
└───────────────┬───────────────┘        └───────────────────────────────┘
                │ Pops Job
                ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          BACKGROUND WORKER TIER                        │
│  BullMQ Worker Process (`server/worker.js`)                            │
│                                                                        │
│  ┌──────────────────────┐ ┌──────────────────────┐ ┌─────────────────┐ │
│  │     Edge-TTS         │ │  Remotion Bundler &  │ │ FFmpeg Pipeline │ │
│  │  Python Bridge       │ │  Renderer (Chromium) │ │ Static Binaries │ │
│  │  - Speech Audio      │ │  - React Animations  │ │ - Demux / Stitch│ │
│  │  - Word Timestamps   │ │  - 1080p Video Chunks│ │ - Ducking / Fade│ │
│  └──────────────────────┘ └──────────────────────┘ └─────────────────┘ │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Outputs
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          STORAGE & ASSETS                              │
│  /public/output/*.mp4   /public/audio/*.mp3   /assets/music/*.mp3      │
└────────────────────────────────────────────────────────────────────────┘
```

### Complete Technology Matrix

| Layer | Technology | Version | Role / Purpose |
|---|---|---|---|
| **API Framework** | Express.js | `^4.21.2` | RESTful API server, static file hosting, SSE streaming |
| **Task Queue** | BullMQ + ioredis | `^5.51.0` / `^5.6.1` | Redis-backed asynchronous job queue with state tracking |
| **In-Memory Store** | Redis (Docker) | `alpine` | Ephemeral message passing and queue persistence |
| **AI Intelligence** | `@google/generative-ai` | `^0.24.0` | Google Gemini 3.6 Flash / Flash 2.0 with JSON mode |
| **Voice Synthesis** | Microsoft Edge-TTS | `Python 3.10+` | Neural text-to-speech engine with SSML and pause handling |
| **Audio Inspection** | `mutagen` / `ffprobe` | `3.1.0` | Precise MP3 header duration extraction |
| **Video Framework** | Remotion Engine | `^4.0.240` | React-based programmatic video composition and timeline |
| **Video Bundler** | `@remotion/bundler` | `^4.0.240` | Webpack compiler for Remotion React compositions |
| **Headless Render** | `@remotion/renderer` | `^4.0.240` | Headless Chromium frame renderer |
| **Post-Processing** | `ffmpeg-static` | `^5.2.0` | Zero-install FFmpeg binary for video stitching and audio ducking |
| **Code Highlighting**| PrismJS | `^1.29.0` | Syntax highlighting engine for code scenes |
| **Frontend UI** | HTML5 / CSS3 / ES6 | Native | Glassmorphism dashboard with zero external framework overhead |
| **Typography** | Fontsource | `^5.3.0` | Outfit (Headings), Inter (Body), JetBrains Mono (Code) |

---

## 6. Complete API Reference & Data Contracts

### 1. Script Management Endpoints

#### `POST /api/script/estimate`
Calculates estimated duration, scene count, and word budget without consuming Gemini API tokens.
* **Request Body:**
  ```json
  {
    "topic": "Microservices Architecture",
    "mode": "short"
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "mode": "short",
    "sceneCount": 5,
    "estimatedMinutes": 2,
    "estimatedTotalSec": 126,
    "estimatedFormattedDuration": "2:06",
    "estimatedWordCount": 280,
    "description": "Fast-paced overview covering the key concepts."
  }
  ```

#### `POST /api/script/generate`
Prompts Google Gemini to produce a full scene-by-scene educational storyboard.
* **Request Body:**
  ```json
  {
    "topic": "Python Decorators",
    "mode": "short",
    "voice": "en-US-ChristopherNeural"
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "id": "script_1741000000000",
    "topic": "Python Decorators",
    "mode": "short",
    "targetDurationMinutes": 2,
    "estimatedTotalDurationSec": 134.2,
    "actualTotalDurationSec": 0,
    "voice": "en-US-ChristopherNeural",
    "scenes": [
      {
        "id": "scene_1",
        "type": "TitleScene",
        "title": "Mastering Python Decorators",
        "subtitle": "Supercharge your functions elegantly",
        "narration": "Have you ever wanted to modify a function without changing its code? <break time='0.6s'/> That is the superpower of decorators.",
        "estimatedDurationSec": 12.4,
        "payload": {
          "layout": "orbital",
          "topicTag": "Python Decorators",
          "badges": ["Python", "Clean Code", "Metaprogramming"],
          "keyTakeaway": "Functions that modify other functions dynamically."
        }
      }
    ],
    "createdAt": "2026-09-03T11:45:00.000Z"
  }
  ```

#### `GET /api/script/:scriptId`
Retrieves an existing script from memory.

#### `PATCH /api/script/:scriptId/scene/:sceneId`
Updates narration, code, or payload fields of a specific scene in the storyboard before rendering.

---

### 2. Video Rendering Endpoints

#### `POST /api/render/start`
Queues a rendering job in the BullMQ Redis queue.
* **Request Body:**
  ```json
  {
    "scriptId": "script_1741000000000",
    "voice": "en-US-ChristopherNeural",
    "bgMusicUrl": null
  }
  ```
* **Response (202 Accepted):**
  ```json
  {
    "jobId": "1",
    "scriptId": "script_1741000000000",
    "topic": "Python Decorators",
    "mode": "short",
    "voice": "en-US-ChristopherNeural",
    "status": "queued",
    "progress": 0,
    "currentStep": "Queued — waiting for worker",
    "totalScenes": 6,
    "pollUrl": "/api/render/1",
    "streamUrl": "/api/render/1/stream"
  }
  ```

#### `GET /api/render/:jobId`
Returns instantaneous status and progress for polling clients.

#### `GET /api/render/:jobId/stream` (SSE Stream)
Maintains an active HTTP EventStream connection pushing live progress events.
* **Stream Events Emitted:**
  - `progress`: `{ "jobId": "1", "status": "rendering_scenes", "progress": 45, "currentStep": "Rendering scene 3/6" }`
  - `completed`: `{ "jobId": "1", "status": "completed", "progress": 100, "outputVideoUrl": "/public/output/python_decorators_1.mp4" }`
  - `failed`: `{ "jobId": "1", "status": "failed", "error": "TTS Timeout" }`

#### `GET /api/render`
Lists the 20 most recent rendering jobs.

#### `DELETE /api/render/:jobId`
Cancels a running job and removes it from the queue.

---

### 3. Voice & Audio Endpoints

#### `GET /api/audio/voices`
Returns all supported Microsoft Edge Neural voices.
* **Response:**
  ```json
  {
    "voices": [
      { "id": "en-US-ChristopherNeural", "name": "Christopher — US Male (Professional)", "gender": "Male", "lang": "en-US" },
      { "id": "en-US-JennyNeural", "name": "Jenny — US Female (Clear & Engaging)", "gender": "Female", "lang": "en-US" },
      { "id": "en-US-GuyNeural", "name": "Guy — US Male (Casual Tech Presenter)", "gender": "Male", "lang": "en-US" },
      { "id": "en-US-AriaNeural", "name": "Aria — US Female (Studio Quality)", "gender": "Female", "lang": "en-US" },
      { "id": "en-IN-PrabhatNeural", "name": "Prabhat — Indian English Male", "gender": "Male", "lang": "en-IN" },
      { "id": "en-IN-NeerjaExpressiveNeural", "name": "Neerja — Indian English Female", "gender": "Female", "lang": "en-IN" }
    ]
  }
  ```

#### `POST /api/audio/preview`
Generates a quick audio snippet for voice auditioning.

---

### 4. Health Check Endpoint

#### `GET /api/health`
Verifies Redis connectivity, Python availability, and environment settings.
* **Response:**
  ```json
  {
    "ok": true,
    "redis": "connected",
    "python": "Python 3.12.2",
    "edgeTts": true,
    "env": "development",
    "timestamp": "2026-09-03T11:45:00.000Z"
  }
  ```

---

## 7. Directory & File Structure Deep Dive

```
ai-video-generator/
│
├── .env                          # Local environment variables (API keys, ports)
├── .env.example                  # Template configuration
├── docker-compose.yml            # Docker container config for local Redis
├── package.json                  # NPM project dependencies and startup scripts
├── tsconfig.json                 # TypeScript compiler configuration
├── vite.config.ts                # Vite frontend bundler config
├── remotion.config.ts            # Remotion rendering engine configuration
│
├── assets/                       # Static multimedia assets
│   └── music/                    # Background lofi audio tracks (CC0 license)
│       └── background.mp3
│
├── cache/                        # Intelligent cache storage
│   ├── tts/                      # Hashed MP3 files and metadata JSON
│   └── scenes/                   # Rendered scene chunk MP4s and metadata JSON
│
├── public/                       # Static Web Assets & Final Render Outputs
│   ├── audio/                    # Synthesized narration MP3s per job
│   ├── css/
│   │   └── style.css             # Glassmorphism UI styling
│   ├── js/
│   │   └── app.js                # Frontend controller & SSE event listener
│   ├── output/                   # Final rendered 1080p MP4 videos
│   └── index.html                # Main single-page web dashboard
│
├── server/                       # Backend Application Engine (Node.js)
│   ├── app.js                    # Express application configuration & middleware
│   ├── server.js                 # HTTP server entrypoint
│   ├── worker.js                 # BullMQ worker process entrypoint
│   │
│   ├── config/
│   │   ├── constants.js          # Video dimensions, FPS, voice definitions, scene types
│   │   └── env.js                # Environment variable parser & absolute path resolver
│   │
│   ├── controllers/
│   │   ├── audioController.js    # Voice preview & voice listing endpoints
│   │   ├── renderController.js   # Render job scheduling, polling & SSE stream handlers
│   │   └── scriptController.js   # Script estimation, Gemini generation & editing endpoints
│   │
│   ├── models/
│   │   ├── RenderJob.js          # Render job lifecycle state model & progress calculators
│   │   └── Script.js             # Storyboard, Scene and Payload data validation schemas
│   │
│   ├── queues/
│   │   └── videoQueue.js         # BullMQ queue & ioredis client initialization
│   │
│   ├── routes/
│   │   ├── api.js                # Master API router aggregator
│   │   ├── audioRoutes.js        # /api/audio routes
│   │   ├── renderRoutes.js       # /api/render routes
│   │   └── scriptRoutes.js       # /api/script routes
│   │
│   ├── services/
│   │   ├── cacheService.js       # SHA-256 disk cache read/write/TTL management
│   │   ├── ffmpegService.js      # Video chunk stitching, audio mixing, ducking & fades
│   │   ├── geminiService.js      # Gemini Flash integration, prompt engineering & retries
│   │   ├── generate_audio.py     # Python subprocess script for Microsoft Edge-TTS
│   │   ├── remotionRenderService.js # Remotion Webpack bundler & Chromium headless renderer
│   │   ├── renderPipeline.js     # Master multi-phase orchestration engine
│   │   └── ttsService.js         # Node.js to Python TTS bridge with retry backoff
│   │
│   └── utils/
│       ├── durationCalculator.js # Narration word-rate to duration conversion
│       ├── fileHelper.js         # Directory structure creation & temp file purge
│       ├── hashHelper.js         # SHA-256 cache key generators
│       └── pythonCheck.js        # Startup diagnostic checking Python & Edge-TTS
│
└── src/                          # Remotion Video Source Code (React / TypeScript)
    └── remotion/
        ├── EducationalVideo.tsx  # Dynamic timeline registry & scene distributor
        ├── Root.tsx              # Remotion root configuration & preview compositions
        ├── index.ts              # Remotion registration entry point
        ├── fonts/                # Web typography loader
        ├── styles/
        │   └── video.css         # Global CSS animations, gradients, glass styles
        └── components/           # Scene React Components (1 file per scene type)
            ├── ArchitectureScene.tsx  # Diagram flows & node networks
            ├── AudioMixer.tsx         # Audio composition helper
            ├── BackgroundGradients.tsx# Ambient animated background orbs
            ├── CodeEditorScene.tsx    # VS Code syntax-highlighted editor
            ├── ComparisonScene.tsx    # Side-by-side comparison tables
            ├── ConceptCardScene.tsx   # Glassmorphism concept cards
            ├── QuoteScene.tsx         # Architectural principle quotes
            ├── StatsScene.tsx         # Animated numerical benchmarks
            ├── StepsScene.tsx         # Step-by-step numbered guides
            ├── SubtitlesOverlay.tsx   # Word-synced subtitle renderer
            ├── SummaryScene.tsx       # Closing recap checklist
            ├── TerminalScene.tsx      # Interactive CLI shell simulator
            ├── TimelineScene.tsx      # Chronological timeline milestones
            └── TitleScene.tsx         # Animated introductory title
```

---

## 8. Reliability & Zero-Failure Engineering

To ensure robust 24/7 video generation without crashes, the system incorporates several production-grade engineering patterns:

### 1. Worker Concurrency Guard (OOM Prevention)
Video rendering in headless Chromium alongside FFmpeg transcoding consumes significant CPU and RAM. The BullMQ worker is strictly configured with:
```javascript
const worker = new Worker(QUEUE_NAME, processJob, {
  connection: redisConnection,
  concurrency: 1, // Strict single-job execution
});
```
This guarantees that multiple incoming requests are safely queued in Redis rather than running concurrently and causing Out-Of-Memory (OOM) crashes.

### 2. Multi-Tier Audio Duration Safeguard
TTS services occasionally omit duration headers on streaming audio. The pipeline implements a three-tier duration detection system:
1. **Python Mutagen Inspection:** Reads the MP3 frame header directly on disk.
2. **Node ffprobe Fallback:** If Mutagen reports an anomalous duration (`<= 6.5s`), `ffprobe` is spawned to measure the exact byte stream duration.
3. **Padded Timeline Alignment:** A `0.6s` silence cushion is added to every scene to prevent speech from being abruptly cut off at scene transitions.

### 3. Windows AsyncIO Event Loop Compatibility
On Windows environments, Python's default `ProactorEventLoop` can conflict with Edge-TTS socket connections. The Python bridge explicitly forces the selector event loop:
```python
if sys.platform.startswith('win'):
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
```

### 4. Dynamic Audio URL Injection
Because TTS audio files are synthesized *after* the Remotion Webpack bundle is created, passing local file paths into the bundle can fail. The pipeline provides absolute HTTP URLs (`http://localhost:3001/public/audio/...`) allowing the headless Chromium renderer to fetch audio directly from the Express static file server.

### 5. Multi-Attempt JSON Repair
Gemini's output is forced into JSON mode (`responseMimeType: "application/json"`). If network jitter or formatting errors produce invalid JSON, the service strips Markdown code fences and retries up to 3 times with an explicit schema correction directive.

---

## 9. Configuration, Setup & Deployment Guide

### Prerequisites
1. **Node.js**: Version 18.0.0 or higher.
2. **Python**: Version 3.10 or higher with `edge-tts` installed.
3. **Docker Desktop**: For running the local Redis container.
4. **Google Gemini API Key**: Free tier key from [Google AI Studio](https://aistudio.google.com).

---

### Step-by-Step Installation

#### 1. Clone the repository and install Node dependencies
```bash
git clone https://github.com/Dhruvil151/ai-video-generator.git
cd ai-video-generator
npm install
```

#### 2. Install Python dependencies
```bash
pip install edge-tts mutagen
```

#### 3. Configure environment variables
Create a `.env` file in the project root:
```env
PORT=3001
GEMINI_API_KEY=your_actual_gemini_api_key_here
REDIS_URL=redis://localhost:6379
NODE_ENV=development
```

#### 4. Start Redis
```bash
docker-compose up -d
```

#### 5. Launch the Application
Run all services simultaneously using the master script:
```bash
npm run dev
```
*(This starts the Express API server on port 3001, the BullMQ worker, and the Vite UI on port 5173).*

Alternatively, you can run them in separate terminal windows:
* **Terminal 1 (Redis):** `docker-compose up -d`
* **Terminal 2 (API Server):** `npm run dev:server`
* **Terminal 3 (Render Worker):** `npm run dev:worker`
* **Terminal 4 (Dashboard):** Open browser at `http://localhost:3001/public/index.html` or `http://localhost:5173`.

---

## 10. Frequently Asked Questions & Troubleshooting

#### Q1: Why did the render fail with "Queue unavailable. Is Redis running?"
* **Reason:** The BullMQ queue could not connect to Redis.
* **Fix:** Ensure Docker Desktop is running and execute `docker-compose up -d` in the project root. You can verify health at `http://localhost:3001/api/health`.

#### Q2: How do I preview videos in the Remotion UI without rendering the full MP4?
* **Command:** Run `npm run remotion:preview`. This launches the interactive Remotion Studio player in your browser, where you can scrub through frames, inspect components, and test animations in real time.

#### Q3: Does running this cost any money?
* **Answer:** **No.** Google Gemini Flash provides a free daily quota, Microsoft Edge-TTS is free, Redis runs locally in Docker, and FFmpeg/Remotion run locally on your CPU.

#### Q4: How do I add custom background music?
* **Answer:** Place any `.mp3` audio file inside `assets/music/` named `background.mp3`. The FFmpeg pipeline will automatically detect it and mix it with sidechain ducking into all subsequent video renders.

---

*Document generated automatically for the AI Educational Video Generator project.*
