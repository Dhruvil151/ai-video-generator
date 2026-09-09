// Single invalidation policy shared by save(), updateScene(), and updateExample()
// (scriptController.js). None of the three write paths decides staleness on its own —
// every mutation to a stored script goes through here first.
//
// Uses recomputed dependency hashes, never whatever durationFrames/audioPath the
// incoming submission happens to contain — a hand-edited textarea (the only real
// editing UI this app has) can claim any derived state it likes; only a hash mismatch
// against the previously stored version decides what actually needs to be redone.
import crypto from 'node:crypto';

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function narrationHash(section) {
  return sha256(section.narration || '');
}

function visualDependencyHash(visual, script) {
  const example = visual.exampleId ? script.examples.find(e => e.id === visual.exampleId) : null;
  const exampleContent = example
    ? { corpus: example.corpus, inputData: example.inputData, query: example.query, operations: example.operations }
    : '';
  return sha256(JSON.stringify({
    exampleId:       visual.exampleId,
    operationRange:  visual.operationRange,
    operationMode:   visual.operationMode,
    narrationAnchor: visual.narrationAnchor,
    beats:           visual.beats,
    exampleContent,
  }));
}

/**
 * Reconcile `newScript`'s derived state against `storedScript` (may be null — first save).
 * Mutates `newScript` in place: resets stale audio/timing, preserves what's still valid,
 * flags visuals whose reference changed for alignment review, and clears stale totals.
 */
export function reconcileDerivedState(newScript, storedScript) {
  for (const section of newScript.sections) {
    const priorSection = storedScript?.sections.find(s => s.id === section.id) || null;
    const freshNarrationHash = narrationHash(section);
    const audioStale = !priorSection || priorSection.narrationHash !== freshNarrationHash;

    if (audioStale) {
      section.actualDurationSec = 0;
      section.audioPath = null;
      section.audioUrl = null;
      section.subtitles = [];
    } else {
      section.actualDurationSec = priorSection.actualDurationSec;
      section.audioPath = priorSection.audioPath;
      section.audioUrl = priorSection.audioUrl;
      section.subtitles = priorSection.subtitles;
    }
    section.narrationHash = freshNarrationHash;
    section.diagnostics = [];

    for (const visual of section.visuals) {
      const priorVisual = priorSection?.visuals.find(v => v.id === visual.id) || null;
      const freshDependencyHash = visualDependencyHash(visual, newScript);
      const isNewVisual = !priorVisual;
      const referenceChanged = !!priorVisual && priorVisual.dependencyHash !== freshDependencyHash;
      const timingStale = audioStale || isNewVisual || referenceChanged;

      if (timingStale) {
        visual.durationFrames = 0;
        visual.durationSec = 0;
        visual.startSec = 0;
      } else {
        visual.durationFrames = priorVisual.durationFrames;
        visual.durationSec = priorVisual.durationSec;
        visual.startSec = priorVisual.startSec;
      }
      // Only an actual reference change on a pre-existing visual needs review — a brand
      // new visual's anchor was presumably written to match its (also new) reference.
      if (referenceChanged) visual.needsAlignmentReview = true;
      visual.dependencyHash = freshDependencyHash;
    }
  }
  newScript.diagnostics = [];
  newScript.calculateEstimatedDuration();
}
