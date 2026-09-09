export const FPS = 30;
const clean = text => String(text || '').replace(/<[^>]*>/g, ' ').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

// Minimum time a settled result should stay visible before the next cut, for a viewer to
// actually register it — a scheduling *hint* surfaced as a diagnostic, never enforced by
// auto-cutting narration or auto-dropping beats.
const MIN_HOLD_SEC = 0.5;

// Exact word boundaries are preferred; sentence-internal offsets are estimates. Collects
// every match at a tier before choosing one, so a phrase occurring more than once can be
// flagged `ambiguous` — distinct from `estimated-sentence`, which means the position within
// a single matched sentence is approximate, not that multiple candidate positions exist.
// Selection is deterministic (first occurrence) either way.
export function alignAnchor(anchor, subtitles = []) {
  const needle = clean(anchor);
  if (!needle) return null;
  const cues = subtitles.filter(c => Number.isFinite(c.start) && Number.isFinite(c.end) && c.end > c.start);
  const words = cues.filter(c => !c.type);

  const wordMatches = [];
  for (let i = 0; i < words.length; i++) {
    let phrase = '';
    for (let j = i; j < Math.min(words.length, i + 30); j++) {
      phrase = `${phrase} ${clean(words[j].text)}`.trim();
      if (phrase === needle) { wordMatches.push({ seconds: words[i].start, confidence: 'word' }); break; }
      if (!needle.startsWith(phrase)) break;
    }
  }
  if (wordMatches.length) return { ...wordMatches[0], ambiguous: wordMatches.length > 1 };

  const sentenceMatches = [];
  for (const cue of cues) {
    const text = clean(cue.text);
    let searchFrom = 0, index;
    while ((index = ` ${text} `.indexOf(` ${needle} `, searchFrom)) >= 0) {
      sentenceMatches.push({
        seconds: cue.start + (cue.end - cue.start) * index / Math.max(1, text.length),
        confidence: index === 0 ? 'sentence' : 'estimated-sentence',
      });
      searchFrom = index + 1;
    }
  }
  if (sentenceMatches.length) return { ...sentenceMatches[0], ambiguous: sentenceMatches.length > 1 };
  return null;
}

// The motion-window formula every renderer (EngineMechanism, ExampleMechanism) and the
// offline fixture sampler need identically — extracted once so the three can't drift apart.
export function motionWindow(eventFrame, nextFrame, fps = FPS) {
  return Math.max(1, Math.min(fps * 0.65, (nextFrame - eventFrame) * 0.4));
}

/**
 * Compute per-step scheduled frames — from compiled beats when present, or the same
 * proportional fallback formula EngineMechanism/ExampleMechanism already used, when not —
 * and diagnose insufficient result-hold time using the real motion window, not the beat
 * spacing guard (which only bounds how close beats may *start*, not how long a settled
 * result stays visible before the next cut). Generic over what a "step" represents.
 */
export function scheduleSteps(beats, stepCount, durationFrames, fps = FPS) {
  const scheduled = beats?.length
    ? beats.map(b => b.frame)
    : Array.from({ length: stepCount }, (_, i) => Math.round(durationFrames * (i + 0.6) / (stepCount + 1.4)));
  const diagnostics = [];
  const minHoldFrames = Math.round(fps * MIN_HOLD_SEC);
  scheduled.forEach((frame, i) => {
    const nextFrame = scheduled[i + 1] ?? durationFrames;
    const hold = nextFrame - (frame + motionWindow(frame, nextFrame, fps));
    if (hold < minHoldFrames) {
      diagnostics.push({ code: 'insufficient-result-hold', step: i, message: `Only ${(hold / fps).toFixed(2)}s to hold the result of step ${i + 1} before the next cut` });
    }
  });
  return { scheduled, diagnostics };
}

export function compileSection(section, fps = FPS) {
  const seconds = section.actualDurationSec || section.estimatedDurationSec;
  if (!Number.isFinite(seconds) || seconds <= 0 || !section.visuals?.length) throw new Error('Section requires positive duration and visuals');
  // Ceil once per audio section, never independently for every visual.
  const durationFrames = Math.ceil(seconds * fps);
  if (section.visuals.length > durationFrames) throw new Error('Section has more visuals than frames');
  const weights = section.visuals.map(v => Number.isFinite(v.durationFraction) && v.durationFraction > 0 ? v.durationFraction : 1);
  const total = weights.reduce((a, b) => a + b, 0);
  let weight = 0;
  const diagnostics = [];
  const starts = section.visuals.map((v, i) => {
    const fallback = Math.round(durationFrames * weight / total);
    weight += weights[i];
    const match = alignAnchor(v.narrationAnchor, section.subtitles);
    if (i && !match) diagnostics.push({ code: 'proportional-alignment', visualId: v.id, message: 'No matching narration anchor; using proportional timing' });
    if (match?.ambiguous) diagnostics.push({ code: 'anchor-ambiguous', visualId: v.id, message: 'narrationAnchor matches more than one position; using the first occurrence' });
    const requestedFrame = i === 0 ? 0 : match ? Math.round(match.seconds * fps) : fallback;
    return { frame: requestedFrame, requestedFrame, confidence: i === 0 ? 'section-start' : match?.confidence || 'proportional' };
  });
  for (let i = 1; i < starts.length; i++) {
    const desired = starts[i].frame;
    starts[i].frame = Math.min(durationFrames - (starts.length - i), Math.max(starts[i - 1].frame + 1, desired));
    if (starts[i].frame !== desired) diagnostics.push({ code: 'anchor-clamped', visualId: section.visuals[i].id, message: 'Anchor was outside its ordered visual window' });
  }
  const visuals = section.visuals.map((v, i) => {
    const startFrame = starts[i].frame;
    const endFrame = starts[i + 1]?.frame ?? durationFrames;
    if (endFrame - startFrame < fps * 2) diagnostics.push({ code: 'short-hold', visualId: v.id, message: 'Visual holds for less than two seconds' });
    const beats = (v.beats || []).map((beat, index, all) => {
      const match = alignAnchor(beat.narrationAnchor, section.subtitles);
      const desired = match ? Math.round(match.seconds * fps) - startFrame : Math.round((endFrame - startFrame) * (index + 0.5) / (all.length + 1));
      if (!match) diagnostics.push({ code: 'beat-proportional', visualId: v.id, message: `Beat ${index + 1} lacks timed speech evidence` });
      if (match?.ambiguous) diagnostics.push({ code: 'anchor-ambiguous', visualId: v.id, message: `Beat ${index + 1}'s narrationAnchor matches more than one position; using the first occurrence` });
      const clamped = Math.max(0, Math.min(endFrame - startFrame - 1, desired));
      return { ...beat, frame: clamped, requestedFrame: clamped, adjusted: false, confidence: match?.confidence || 'proportional' };
    });
    const length = endFrame-startFrame;
    if (beats.length >= length) throw new Error(`Visual ${v.id} has insufficient frames for its beats`);
    const spacing = Math.max(1,Math.min(Math.round(fps*0.8),Math.floor(length/(beats.length+1))));
    beats.forEach((beat,j)=>{
      const desired=beat.frame;
      beat.frame=Math.max(j?beats[j-1].frame+spacing:0,Math.min(length-1-(beats.length-j)*spacing,desired));
      beat.adjusted = beat.frame !== desired;
      if(beat.adjusted)diagnostics.push({code:'beat-adjusted',visualId:v.id,message:'Beat moved to preserve motion and result hold'});
    });
    // Real hold-time check (motion window, not the spacing guard above) — covers both the
    // beats-present path and the no-beats proportional fallback via v.internalStepCount,
    // which populateVisualTimings() computes before calling compileSection.
    const stepCount = beats.length || v.internalStepCount || 0;
    if (stepCount > 0) {
      const { diagnostics: holdDiagnostics } = scheduleSteps(beats.length ? beats : null, stepCount, length, fps);
      for (const d of holdDiagnostics) diagnostics.push({ ...d, visualId: v.id });
    }
    return { ...v, startFrame, durationFrames: endFrame - startFrame, startSec: startFrame / fps, durationSec: (endFrame - startFrame) / fps, alignment: starts[i].confidence, requestedStartFrame: starts[i].requestedFrame, beats };
  });
  return { durationFrames, durationSec: durationFrames / fps, visuals, diagnostics };
}

export function sceneTimings(scenes, fps = FPS) {
  let cursor = 0;
  return scenes.map(scene => {
    const durationFrames = scene.durationFrames || Math.ceil((scene.actualDurationSec || scene.estimatedDurationSec || 10) * fps);
    const fromFrame = cursor;
    cursor += durationFrames;
    return { scene, fromFrame, from: fromFrame, durationFrames };
  });
}
