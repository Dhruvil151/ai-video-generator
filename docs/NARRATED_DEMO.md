# Narrated output example

The linked [MP4](narrated-example.mp4) is a 40-second excerpt from an existing local render named `elasticsearch_inverted_index_40.mp4`. It covers source time 41.012-81.000 seconds, resized to 1280 x 720 for a small download. The original audio is retained. It is not a new provider request or a recording of the dashboard.

## What it demonstrates

A narrated, animated walkthrough of tokenizing fictional documents and collecting terms for an inverted index. This connects speech and rendered visual states in a real output from the project.

## Verification and limits

- Both H.264 video and AAC audio streams decode successfully.
- Sampled frames were inspected for readable labels and visible state changes.
- The source SHA-256, excerpt boundaries, stream metadata and decode result are in [the evidence record](narrated-example.json).
- No claim is made about a fresh end-to-end run, subjective audio quality, or perfect narration/animation alignment.
- The on-screen phrase about a standard analyzer is a simplification: the fixture demonstrates whitespace splitting and lowercasing, not Elasticsearch's complete standard analyzer.
- This is an output demonstration, not a verified Elasticsearch tutorial.

## Try the interactive workflow

Follow the [quick start](../README.md#try-it-locally), enter a topic, generate the storyboard, review the narration and JSON, save any edits, then render. Provider availability and credentials are required. The project documentation describes the separation between the dashboard, worker, and rendering stages.

The existing [silent fixture preview](PREVIEW.md) provides an offline alternative without provider credentials.
