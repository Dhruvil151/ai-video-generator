# AI Educational Video Generator

**Turn a topic into an editable storyboard and a narrated video.**

A local application for exploring how AI-generated teaching content can become an animated educational video. Enter a topic, review and edit the proposed storyboard, then render an MP4 with narration.

For someone making an explainer, it brings scripting, scene selection, speech, and rendering into one workflow. Generated explanations still need human fact-checking and editorial review.

![Describe a topic, review the storyboard, then render a video. Conceptual workflow.](docs/overview.svg)

[Quick start](#try-it-locally) · [Architecture](#how-it-is-built) · [Recorded validation](IMPLEMENTATION_STATUS.md) · [Portfolio](https://github.com/Dhruvil151)

## See an animation sample

![Offline cache demonstration rendered by this project](docs/video-preview.gif)

A real render of the included, deterministic cache demonstration. This silent sample uses a test fixture; it is not a freshly AI-generated lesson or a voice-quality demonstration. [Download the MP4](docs/demo-cache.mp4) · [How to reproduce it](docs/PREVIEW.md).

## A simple example

Enter “JavaScript closures.” The app asks Gemini for a teaching plan and visual storyboard. Review the narration and scenes, edit the JSON if needed, and submit a background render. Speech synthesis, React-based animation, and video assembly produce the downloadable result.

This describes the intended workflow; generation time and output quality depend on the topic, hardware, and provider availability.

## What it does

- Generates structured storyboards rather than a single block of narration.
- Lets you review and save edits before rendering.
- Supports code scenes, comparisons, diagrams, and bounded mechanism demonstrations.
- Queues render jobs and reports progress separately from the web interface.
- Caches intermediate assets and saves render manifests for inspection and replay.
- Produces video output and captions when timing information is available.

## Try it locally

Use Node.js 22 or 24, Python 3.10+ available as `python`, and Docker with Compose. Live generation needs your own Gemini API key and network access for speech synthesis.

```sh
npm ci
python -m pip install edge-tts
```

Copy `.env.example` to `.env` and set `GEMINI_API_KEY`. Then:

```sh
docker compose up -d
npm run dev
```

Open **http://localhost:5173**. The API runs on port 3001; the worker handles rendering in the background. Generate a storyboard, inspect it, then start the render.

Provider quotas, model availability, third-party licenses, and hardware requirements apply. This project does not promise zero cost or a fixed completion time. Optional stock footage requires its own configured provider key.

## How it is built

**Node.js / Express · Gemini · BullMQ / Redis · React / Remotion · Edge TTS · FFmpeg**

The browser dashboard lives in `public/` and is bundled with Vite. React components in `src/remotion/` render the video scenes. Express accepts script and render requests; BullMQ and Redis separate long-running work from the HTTP interface. Python handles speech synthesis, Remotion renders visuals, and FFmpeg assembles media.

**Design decisions worth exploring:** structured storyboard validation before synthesis; narration and visual timing handled separately; deterministic instructional examples; cached assets and manifests for diagnosing rendering problems.

For implementation details, see [project documentation](PROJECT_DOCUMENTATION.md) and the [implementation status](IMPLEMENTATION_STATUS.md). Historical notes may describe older layouts; current source and checks are the reference for behavior.

## Checks and evidence

```sh
npm run test:local
npx tsc --noEmit
npm run build
```

These checks do not require a new Gemini request or speech generation. Tests include local FFmpeg operations. [GitHub Actions](https://github.com/Dhruvil151/ai-video-generator/actions) records results for commits with the workflow enabled.

The implementation report records a completed end-to-end render, but also identifies unresolved pacing, factual-content, and visual-consistency issues. Treat it as a working prototype, not an automatically publication-ready video service.

## Current scope

- Review generated teaching claims, examples, timing, and visual continuity before sharing a video.
- Detailed-mode quality and broad input coverage need further validation.
- Some caption timing is approximate; a media file passing decode checks does not prove teaching quality.
- This is a local development application, not a hardened public multi-user service.
- No root project license file is currently present; bundled assets can have separate terms.

