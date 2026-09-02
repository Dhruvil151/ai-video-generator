# AI Educational Video Generator

> Type a topic. Get a fully animated, narrated educational video — automatically.
> Powered by Google Gemini AI, Microsoft Edge TTS, and Remotion.

---

## What is this?

Imagine typing **"JavaScript Closures"** and getting back a polished, animated educational video — complete with voiceover, diagrams, code walkthroughs, statistics, and smooth transitions — **in under 5 minutes**.

That is exactly what this project does.

You don't need to:
- Write a script
- Record your voice
- Design slides
- Learn video editing

The AI handles **everything** — from deciding how many scenes to create, to choosing the right visual style for each one.

---

## What makes it special?

### Every video looks different

Most AI video tools generate the same layout every time. This system is different.

For each topic, Google Gemini AI **freely decides**:
- How many scenes to create (4 to 8, based on topic complexity)
- Which visual styles to use
- What order to present them in
- Which layout variant fits best for each scene

A video about **"Node.js Event Loop"** gets a flow diagram + code walkthrough + steps.
A video about **"SOLID Principles"** gets a comparison + concept cards + a quote.
**No two videos follow the same blueprint.**

### 11 Visual Scene Types

| Scene | What it shows |
|---|---|
| **TitleScene** | Animated intro with topic name and key tags |
| **ArchitectureScene** | System diagram showing how components connect |
| **CodeEditorScene** | Live-typing code with syntax highlighting |
| **ConceptCardScene** | Key concepts with icons and descriptions |
| **ComparisonScene** | Side-by-side "before vs after" comparison |
| **TimelineScene** | Historical or sequential progression of events |
| **StatsScene** | Animated numbers and bar charts |
| **TerminalScene** | Command-line terminal simulation |
| **QuoteScene** | Impactful quote or principle highlight |
| **StepsScene** | Step-by-step numbered process |
| **SummaryScene** | Closing recap with key takeaways |

### Multiple Layout Variants Per Scene

Each scene type supports multiple visual layouts so the same scene type can look completely different across videos:

| Scene | Layout Options |
|---|---|
| TitleScene | `orbital` (floating badges) or `minimal` (clean typography) |
| ArchitectureScene | `flow` (left-to-right nodes) or `radial` (hub + spokes) |
| CodeEditorScene | `split` (code + explanation panel) or `fullscreen` (full-width editor) |
| ConceptCardScene | `stack` (vertical list) or `grid` (2x2 grid) |
| TimelineScene | `horizontal` or `vertical` |
| StatsScene | `counters` or `bar` |
| TerminalScene | `typed` or `split` |
| QuoteScene | `centered` or `left-accent` |
| StepsScene | `numbered` or `cards` |

Gemini picks the best combination for the topic — automatically.

---

## Quick Start

### What you need before starting
- **Node.js** v18 or higher
- **Python 3.10+** with `edge-tts` installed
- **Docker** (for Redis — starts with one command)
- A free **Google Gemini API key**

### Step 1 — Get the code
```bash
git clone https://github.com/Dhruvil151/ai-video-generator.git
cd ai-video-generator
npm install
pip install edge-tts
```

### Step 2 — Add your API key
```bash
cp .env.example .env
# Open .env and paste your GEMINI_API_KEY
# Get a free key at: https://aistudio.google.com
```

### Step 3 — Start Redis
```bash
docker-compose up -d
```

### Step 4 — Start the app
```bash
npm run dev
```

This starts three things at once:
- **Dashboard** at http://localhost:5173 *(your main interface)*
- **API Server** at http://localhost:3001
- **Worker** that handles video rendering in the background

### Step 5 — Make your first video
1. Open http://localhost:5173
2. Type any topic (e.g. "Python Decorators")
3. Choose **Short** (~2 min) or **Detailed** (~8 min)
4. Click **Generate** and review the AI-created storyboard
5. Click **Render Video** and watch the progress bar
6. Download your finished `.mp4`

---

## How It Works

```
You type a topic
       |
       v
Gemini AI creates a full video script
(decides scene count, types, layouts, narration, and all visual content)
       |
       v
For each scene:
   - Edge TTS converts narration text to speech audio
   - Remotion renders the animated scene as a video chunk
       |
       v
FFmpeg stitches all chunks into one final 1080p MP4
       |
       v
Video is ready to watch and download
```

**Smart caching** means re-rendering only re-processes changed scenes — unchanged ones reuse previous results from cache, saving significant time.

---

## Reliability Features

### No Empty Scenes — Ever

The system has two layers of protection to ensure every scene is always fully populated with real content:

1. **Prompt-level rules** — Gemini is explicitly told the minimum number of content items required for each scene type. For example, a ComparisonScene must have 3–5 real points on each side.

2. **Component-level fallback** — If Gemini ever returns incomplete data despite the rules, the video component automatically generates content from the scene narration text, so no scene is ever blank.

### Smart Error Recovery
- If Gemini returns invalid JSON, the system automatically retries up to 3 times
- If an unknown scene type appears, it falls back gracefully to a concept card
- TTS failures are logged as warnings and don't crash the entire render

---

## Technical Architecture

| Layer | Technology | What it does |
|---|---|---|
| **AI Scripting** | Google Gemini Flash (free tier) | Generates the entire video blueprint from a topic |
| **Voice Synthesis** | Microsoft Edge TTS via `edge-tts` (free) | Converts narration text to natural-sounding speech |
| **Animations** | Remotion (React-based video framework) | Renders each animated scene as a video chunk |
| **Video Stitching** | FFmpeg (bundled — no system install needed) | Joins all scene chunks into one final MP4 |
| **Background Jobs** | BullMQ + Redis (Docker) | Queues render jobs and tracks progress |
| **Caching** | SHA-256 file hash cache | Skips re-generating unchanged audio or video chunks |
| **Dashboard** | React + Vite | Web UI for generating, previewing, and downloading |

---

## Project Structure

```
ai-video-generator/
|
+-- docker-compose.yml          # Starts Redis with one command
+-- assets/music/               # Background lo-fi music (CC0 license)
+-- cache/                      # Auto-generated cache (audio & video chunks)
+-- public/output/              # Final rendered MP4 videos
|
+-- server/                     # Backend (Node.js + Express)
|   +-- config/                 # App settings and constants
|   +-- controllers/            # API route handlers
|   +-- models/                 # Script and RenderJob data schemas
|   +-- services/
|   |   +-- geminiService.js    # AI script generation (the brain)
|   |   +-- ttsService.js       # Voice synthesis
|   |   +-- renderPipeline.js   # Scene rendering orchestration
|   |   +-- ffmpegService.js    # Video stitching
|   +-- worker.js               # Background render worker
|
+-- src/
    +-- remotion/
    |   +-- EducationalVideo.tsx    # Scene registry (all 11 types registered here)
    |   +-- components/             # One file per scene type
    |       +-- TitleScene.tsx
    |       +-- ArchitectureScene.tsx
    |       +-- CodeEditorScene.tsx
    |       +-- ConceptCardScene.tsx
    |       +-- ComparisonScene.tsx
    |       +-- TimelineScene.tsx
    |       +-- StatsScene.tsx
    |       +-- TerminalScene.tsx
    |       +-- QuoteScene.tsx
    |       +-- StepsScene.tsx
    |       +-- SummaryScene.tsx
    +-- web/                        # React dashboard UI
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Free from https://aistudio.google.com |
| `PORT` | No | API server port (default: 3001) |
| `REDIS_URL` | No | Redis connection string (default: redis://localhost:6379) |
| `NODE_ENV` | No | `development` or `production` |

---

## Cost

This project is designed to run at zero ongoing cost:

| Service | Cost |
|---|---|
| Google Gemini Flash API | Free tier (generous daily quota) |
| Microsoft Edge TTS | Free (edge-tts Python library) |
| FFmpeg | Free (bundled via ffmpeg-static) |
| Redis | Free (runs locally via Docker) |
| Remotion rendering | Free (headless Chromium, runs locally) |

The only requirement is a machine to run it on.

---

## Roadmap

- [ ] Word-level subtitle sync
- [ ] More scene layout variants
- [ ] Detailed mode (8-min) full validation and testing
- [ ] Video thumbnail auto-generation
- [ ] Export to YouTube-ready format

---

## License

MIT — free to use, modify, and distribute.