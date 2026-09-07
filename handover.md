# Handover Document — AI Video Generator
**Date:** 2026-09-05  
**Session:** Quality improvement implementation (Phase 2 of YouTube-quality upgrades)

---

## 1. Project Overview

An AI-powered educational video generator that produces 1080p YouTube-style tech explainer videos. The pipeline is:

```
Gemini 2.5 Flash → Script JSON → Edge TTS → Remotion (React) scenes → FFmpeg stitch → MP4
```

**Key services:**
- `server/server.js` — Express API (port 3001)
- `server/worker.js` — BullMQ worker (requires Redis on port 6379 via Docker)
- `src/remotion/` — All video scene components (React + Remotion 4)

---

## 2. What Was Fixed This Session

### 2.1 FFmpegService Critical Bugs (COMPLETED ✅)

**File:** `server/services/ffmpegService.js`

**Bug A — `getVideoDuration` always returned 0:**
- Root cause: FFmpeg writes `Duration:` to **stderr**, not stdout. The old code destructured only `{ stdout }` from the `.catch()` result, so `lines` was always an empty string.
- Fix: Changed to a `try/catch` around `execFileAsync`, then searches `err.stderr.toString() + err.stdout.toString()`.
- Added `maxBuffer: 10 * 1024 * 1024` to prevent buffer overflow errors.

**Bug B — `applyFades` copied lossless 100MB intermediate as final output:**
- Root cause: When `duration` was null (due to Bug A), fallback was `fs.copyFileSync(inputPath, outputPath)` — this copied the raw CRF-0 lossless H.264 intermediate (~100MB) directly as the final output with **no fades applied**.
- Fix: Replaced `copyFileSync` fallback with a proper CRF-16 encode (no fades, but still compressed). Also changed to call `getVideoDuration(inputPath)` instead of duplicating broken probe logic.

**Result:** Final output should now be ~15MB (CRF-16) with fade-in/fade-out, instead of 100MB lossless with no fades.

---

## 3. Quality Improvement Plan (Research Done)

### 3.1 Gap Analysis Research

Researched Fireship, ByteByteGo, Theo, TechWorld with Nana, 3Blue1Brown. Full analysis is in the conversation but key findings:

| Priority | Gap | Channels |
|---|---|---|
| P0 | Technology logos (official SVG brand marks) | ALL |
| P0 | Topic-specific color theming (Redis=red, Docker=blue) | Fireship, ByteByteGo |
| P0 | Animated packet flow on connector lines | ByteByteGo |
| P0 | Syntax highlighting for Go/Rust/SQL/YAML/Bash | Fireship |
| P1 | Sequential data-flow reveal in ArchitectureScene | ByteByteGo |
| P1 | Code focus mode (dim non-highlighted lines to 30%) | Fireship, Snappify |
| P1 | Callout arrows pointing to specific code lines | Fireship |
| P1 | Before/After code diff scene (new scene type) | Theo, Fireship |
| P1 | Feature comparison table scene (new scene type) | ByteByteGo |
| P1 | Line chart / performance graph scene (new scene type) | ByteByteGo |
| P1 | Lower third / concept label overlay | Nana, NetworkChuck |
| P1 | Opening hook visual — pain-first, not title-first | Fireship, ByteByteGo |
| P2 | File tree / project structure scene | Fireship, Nana |
| P2 | Chapter / section title cards | ByteByteGo, Nana |
| P2 | ANSI-colored terminal output | Nana, NetworkChuck |
| P2 | Sequence / message flow diagram | ByteByteGo |
| P2 | Short "punctuation" scenes (2–4s) | Fireship |
| P3 | Sound effects on key moments | Fireship |
| P3 | Animated code morphing | 3Blue1Brown, Fireship |
| P3 | Voiceover speed variation | Fireship |

---

## 4. What Was Implemented This Session (Quality Improvements)

### 4.1 TechLogos.tsx — NEW FILE ✅

**File:** `src/remotion/components/TechLogos.tsx`

Created a library of **~55 official tech SVG logos** as inline React components. Each logo is a simplified but immediately recognizable SVG representation.

**Technologies included:**
JavaScript, TypeScript, Python, React, Vue, Angular, Svelte, Next.js, Node.js, Go, Rust, Docker, Kubernetes, Redis, PostgreSQL, MySQL, MongoDB, GraphQL, AWS, GCP, Azure, Vercel, GitHub, Git, Linux, Nginx, Kafka, Tailwind CSS, Vite, Terraform, Firebase, Supabase, Spring Boot, FastAPI, Express, Django, Cloudflare, Prisma, Elasticsearch, Webpack, RabbitMQ, Nuxt, Bun, Deno, VS Code, Ansible, Jenkins, Netlify, GitHub Actions, WebSocket, gRPC, REST, Kotlin, Swift, Java, Cassandra, SQLite

**Exports:**
```tsx
// Render a tech logo SVG by technology name (case-insensitive)
<TechLogo name="redis" size={32} />

// Check if a logo exists before rendering
hasTechLogo("docker") // → true

// Get the brand's primary hex color
getTechColor("redis") // → "#DC382D"
```

---

### 4.2 getTechTheme.ts — NEW FILE ✅

**File:** `src/remotion/utils/getTechTheme.ts`

Maps any topic string to a color theme that tints the video's background gradients and accents to match the technology's brand color.

**Examples:**
- "Redis" or "caching" → `{ primary: '#DC382D', secondary: '#FF6B6B', variant: 'arch' }`
- "Docker" or "containers" → `{ primary: '#2496ED', secondary: '#0db7ed', variant: 'arch' }`
- "React" or "hooks" → `{ primary: '#61DAFB', secondary: '#00B4D8', variant: 'code' }`
- "Kubernetes" → `{ primary: '#326CE5', secondary: '#6096FE', variant: 'arch' }`
- "JavaScript" → `{ primary: '#F7DF1E', secondary: '#F0B429', variant: 'code' }`

Covers ~25 technology groups with keyword matching (so "containerization" maps to Docker theme, "caching" maps to Redis theme, etc.).

**Usage:**
```ts
import { getTechTheme } from './utils/getTechTheme';
const theme = getTechTheme("Redis Internals"); // → { primary: '#DC382D', ... }
```

---

### 4.3 BackgroundGradients.tsx — UPDATED ✅

**File:** `src/remotion/components/BackgroundGradients.tsx`

Added two new optional props and a `hexToRgba()` helper:

```tsx
<BackgroundGradients
  variant="arch"
  techPrimary="#DC382D"   // NEW: Redis red
  techSecondary="#FF6B6B" // NEW: lighter Redis red
/>
```

When `techPrimary` is provided, the three ambient glow orbs are tinted with the tech's brand color instead of the default cyan/purple/green. The `variant` still controls orb positions.

**New internal function:**
```ts
function hexToRgba(hex: string, alpha: number): string
// Converts "#DC382D" → "rgba(220,56,45,0.10)"
```

---

### 4.4 EducationalVideo.tsx — UPDATED ✅

**File:** `src/remotion/EducationalVideo.tsx`

Three changes:

1. **Added `topic` prop** — the video topic string is now part of `EducationalVideoProps`
2. **Derives tech theme** — calls `getTechTheme(topic)` once at the composition level
3. **Passes theme to all scenes** — every scene component now receives `techPrimary` and `techSecondary` props (ready for each scene to pass to `BackgroundGradients`)
4. **Imported 6 new scene types** — `CodeDiffScene`, `ComparisonTableScene`, `LineChartScene`, `FileTreeScene`, `ChapterScene`, `SequenceDiagramScene` (these components are **NOT YET CREATED** — this will break TypeScript until they are)

```tsx
// New in EducationalVideoProps:
topic?: string;

// In render:
const techTheme = getTechTheme(topic || '');
// Passes to each scene:
<SceneComponent techPrimary={techTheme.primary} techSecondary={techTheme.secondary} />
```

---

### 4.5 remotionRenderService.js — UPDATED ✅

**File:** `server/services/remotionRenderService.js`

`renderScene()` now accepts and passes a `topic` parameter through to Remotion's `inputProps`:

```js
// New parameter:
renderScene({ ..., topic: script.topic, ... })

// Passed to Remotion:
inputProps: { scenes, bgMusicUrl, topic: topic || '' }
```

---

### 4.6 renderPipeline.js — UPDATED ✅

**File:** `server/services/renderPipeline.js`

Now passes `script.topic` to `renderScene()`:

```js
await renderScene({
  bundleDir, fromFrame, durationFrames,
  scenes: scenes.map(s => ({ ...s, audioUrl: null })),
  bgMusicUrl: null,
  topic: script.topic || '',   // NEW
  outputPath: sceneFile,
});
```

---

### 4.7 TitleScene.tsx — PARTIALLY UPDATED ⚠️

**File:** `src/remotion/components/TitleScene.tsx`

Only the **import** was added:
```tsx
import { TechLogo, hasTechLogo } from './TechLogos';
```

**NOT YET DONE:** TitleScene does not yet actually use TechLogo or techPrimary/techSecondary in its render output. The component still uses the old hardcoded cyan/purple colors.

---

## 5. What Is NOT Done Yet (Remaining Work)

Everything below was planned but NOT implemented before the session was stopped.

### 5.1 Files That Need Updating

| File | What needs to happen |
|---|---|
| `TitleScene.tsx` | Use `TechLogo` in badge area (show tech logo next to topicTag); use `techPrimary` for divider color and badge accents; pass theme to `BackgroundGradients` |
| `ArchitectureScene.tsx` | 1) Show `TechLogo` in node cards when logo exists; 2) Sequential data-flow reveal (nodes appear in connection order, not all at once); 3) Traveling packet animation (animated dots travel along connector lines) |
| `CodeEditorScene.tsx` | 1) More syntax highlighting languages (Go, Rust, SQL, YAML, JSON, Bash, Dockerfile, Java); 2) Code focus mode (dim non-highlighted lines to ~25% opacity); 3) Callout arrow (SVG line from callout box to target line) |
| `TerminalScene.tsx` | ANSI color output parsing (green for success, red for errors, yellow for warnings, cyan for prompts) |

### 5.2 New Scene Types to Create

These are imported in `EducationalVideo.tsx` but the files don't exist yet. **The TypeScript build will fail until all 6 are created.**

| File | Description |
|---|---|
| `src/remotion/components/CodeDiffScene.tsx` | Before/After code diff — red lines with "−" prefix, green lines with "+" prefix, git-diff style |
| `src/remotion/components/ComparisonTableScene.tsx` | Feature comparison grid — rows are features, columns are products, cells animate in with ✓/✗ |
| `src/remotion/components/LineChartScene.tsx` | Animated line chart — path draws left-to-right, labeled data points, for performance/growth stories |
| `src/remotion/components/FileTreeScene.tsx` | Project directory tree — files animate in one-by-one, specific files highlight |
| `src/remotion/components/ChapterScene.tsx` | Section title card — "Part 2: The Solution" style, used between major sections |
| `src/remotion/components/SequenceDiagramScene.tsx` | Message flow diagram — actors as vertical columns, horizontal arrows for request/response flows |

### 5.3 Backend Updates Not Done

| File | What needs to happen |
|---|---|
| `server/config/constants.js` | Add 6 new SCENE_TYPES: CODE_DIFF, COMPARISON_TABLE, LINE_CHART, FILE_TREE, CHAPTER, SEQUENCE_DIAGRAM |
| `server/services/geminiService.js` | Teach Gemini about new scene types, their payloads, when to use them, and to use tech logos as node icons |
| `server/models/Script.js` | Add new payload field definitions for the 6 new scene types in SceneModel constructor |

### 5.4 P1 Overlay Feature Not Done

- **Lower third / concept label overlay** — a new component that slides up a branded label during key narration moments. Would need to be added to `EducationalVideo.tsx` similar to `SubtitlesOverlay`.

---

## 6. Current Build State

⚠️ **The TypeScript build will currently FAIL** because `EducationalVideo.tsx` imports 6 scene components that don't exist yet:
- `CodeDiffScene`
- `ComparisonTableScene`
- `LineChartScene`
- `FileTreeScene`
- `ChapterScene`
- `SequenceDiagramScene`

**To make it build immediately** (as a temporary fix), either:
a) Remove those 6 imports from `EducationalVideo.tsx` until the components are created, OR
b) Create stub files for each (empty component returning `<div/>`)

The render pipeline itself (server-side) will still work because it doesn't import TypeScript files directly.

---

## 7. How to Continue This Work

Recommended order to complete the remaining implementation:

1. **Create 6 stub scene files** (so TypeScript compiles) — 10 min
2. **Update `constants.js`** — add 6 new SCENE_TYPES — 5 min
3. **Implement `CodeDiffScene.tsx`** — high visual impact — 30 min
4. **Implement `ComparisonTableScene.tsx`** — high visual impact — 30 min
5. **Implement `LineChartScene.tsx`** — moderate impact — 30 min
6. **Implement `ChapterScene.tsx`** — simple — 15 min
7. **Implement `FileTreeScene.tsx`** — moderate — 30 min
8. **Implement `SequenceDiagramScene.tsx`** — complex — 45 min
9. **Update `TitleScene.tsx`** — use TechLogo + techPrimary — 20 min
10. **Update `ArchitectureScene.tsx`** — logos + sequential reveal + packets — 45 min
11. **Update `CodeEditorScene.tsx`** — more languages + focus mode + arrows — 30 min
12. **Update `TerminalScene.tsx`** — ANSI colors — 20 min
13. **Update `geminiService.js`** — teach AI new scene types — 30 min
14. **Update `Script.js`** — add new payload fields — 10 min
15. **Run E2E test** — `node temp/test_e2e.mjs "Docker" short`

---

## 8. Key Architecture Facts for Next Session

- **Remotion composition ID:** `EducationalVideo`
- **Entry point:** `src/remotion/index.ts`
- **All scene components accept:** `{ scene, bgMusicUrl, techPrimary?, techSecondary? }`
- **BackgroundGradients now accepts:** `{ variant, techPrimary?, techSecondary? }`
- **Default voice:** `en-US-GuyNeural`
- **Video output:** 1920×1080, 30fps, CRF-16 H.264, 192k AAC
- **Gemini model:** `gemini-2.5-flash` (via `@google/genai` SDK, `responseMimeType: 'application/json'` ONLY — no `responseSchema`)
- **TTS:** edge-tts 7.2.8 via Python (`server/services/generate_audio.py`)
- **Redis queue:** BullMQ on `aivg_redis` Docker container, port 6379
- **Temp files:** `getJobTempDir(jobId)` in `server/utils/fileHelper.js`
- **Output dir:** `ENV.OUTPUT_DIR` (typically `public/output/`)

---

## 9. File Inventory (Changed This Session)

```
MODIFIED:
  server/services/ffmpegService.js          ← Bug fixes for applyFades + getVideoDuration
  server/services/remotionRenderService.js  ← Added topic param
  server/services/renderPipeline.js         ← Passes script.topic to renderScene
  src/remotion/EducationalVideo.tsx         ← topic prop, tech theme, new scene imports
  src/remotion/components/BackgroundGradients.tsx ← techPrimary/techSecondary props
  src/remotion/components/TitleScene.tsx    ← Import only (not yet used)

CREATED:
  src/remotion/components/TechLogos.tsx     ← 55 tech SVG logos
  src/remotion/utils/getTechTheme.ts        ← Topic → brand color theme mapping

NOT YET CREATED (build fails without these):
  src/remotion/components/CodeDiffScene.tsx
  src/remotion/components/ComparisonTableScene.tsx
  src/remotion/components/LineChartScene.tsx
  src/remotion/components/FileTreeScene.tsx
  src/remotion/components/ChapterScene.tsx
  src/remotion/components/SequenceDiagramScene.tsx
```
