// Post-timing review hints — computed AFTER populateVisualTimings() has run, since these
// checks need real durationSec, which validateStoryboard()'s own diagnostics run before.
// Thresholds are named and reviewable, never auto-applied: nothing here throws, mutates the
// script, cuts a visual, or rewrites narration. A pacing hint must never fail a build (see
// scripts/render-fixture.mjs's exit-code check, which is untouched by this file).
import { SCENE_TYPES } from '../config/constants.js';

// 0.3 mirrors job-39.observations.md's own finding (Title+Summary = 30.7% of a 148.5s video)
// — the same methodology, now automated as a hint rather than a one-off manual observation.
export const PACING_HINTS = {
  openingClosingRatioWarn: 0.3,
  staticVisualWarnSec: 25,
};

export function computePacingHints(script) {
  const diagnostics = [];
  const visuals = script.sections.flatMap(s => s.visuals);
  if (!visuals.length) return diagnostics;

  const totalSec = visuals.reduce((sum, v) => sum + (v.durationSec || 0), 0);
  if (totalSec > 0) {
    const first = visuals[0], last = visuals[visuals.length - 1];
    let openingClosingSec = 0;
    if ([SCENE_TYPES.TITLE, SCENE_TYPES.CHAPTER].includes(first.type)) openingClosingSec += first.durationSec || 0;
    if (last.type === SCENE_TYPES.SUMMARY && last !== first) openingClosingSec += last.durationSec || 0;
    const ratio = openingClosingSec / totalSec;
    if (ratio > PACING_HINTS.openingClosingRatioWarn) {
      diagnostics.push({ code: 'high-opening-closing-ratio',
        message: `Title/summary-style visuals occupy ${(ratio * 100).toFixed(1)}% of runtime (review threshold ${(PACING_HINTS.openingClosingRatioWarn * 100).toFixed(0)}%)` });
    }
  }

  // Excludes anything with an exampleId (worked example, including operationMode:'inspect')
  // or engine beats — those are legitimate, deliberate holds, not "nothing is happening".
  for (const v of visuals) {
    if (v.exampleId || v.beats?.length) continue;
    if ((v.durationSec || 0) > PACING_HINTS.staticVisualWarnSec) {
      diagnostics.push({ code: 'long-static-visual', visualId: v.id,
        message: `Holds for ${v.durationSec.toFixed(1)}s with no animated content (review threshold ${PACING_HINTS.staticVisualWarnSec}s)` });
    }
  }

  return diagnostics;
}
