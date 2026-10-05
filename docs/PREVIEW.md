# About the animation preview

The README preview is an actual render of this repository's existing cache demonstration fixture. It shows a bounded instructional model of a cache, not a full Redis implementation.

- Input: `demonstrationFixture('cache')` from `server/tests/fixtures/demonstrations.mjs`.
- Output: an 18-second silent animation, 1920×1080 at 30 fps.
- README GIF: reduced to 800 pixels wide and 8 fps for a small download.
- No Gemini request, new speech synthesis, Redis queue, or stock-footage call was used.

After installing dependencies, reproduce the source render from the repository root:

```sh
node scripts/render-fixture.mjs --engine=cache --video
```

The source MP4 is written to `temp/fixture-review/cache.muted.mp4`. Remotion may download its compatible Chromium renderer on the first run. The script also samples frames and checks selected layout bounds.

The preview demonstrates rendering and state changes. It does not establish the accuracy or quality of arbitrary AI-generated lessons. See [implementation status](../IMPLEMENTATION_STATUS.md) for the recorded end-to-end results and remaining limitations.

[Back to the project](../README.md)
