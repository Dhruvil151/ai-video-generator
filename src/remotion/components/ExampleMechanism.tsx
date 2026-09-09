// @ts-nocheck
// Resolves scene.exampleId against the examples registry, runs shared/operations.mjs's
// executeOperations (memoized on the example reference — the whole computation is
// microseconds given Phase 2/3's bounds, but this avoids redoing it on every frame's
// re-render regardless), slices the trace to scene.operationRange, and schedules which
// trace entry is "active" using the same proportional-fallback pattern EngineMechanism
// already uses for demo.steps — generalized from step count to trace-entry count.
// Dispatches the active entry to a small renderer registry by its operation type —
// example-driven visuals never populate beats, so there is no beat/continuity contract
// to satisfy here; internal operation timing is always proportional within this visual's
// own on-screen duration.
import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { executeOperations } from '../../../shared/operations.mjs';
import { motionWindow } from '../../../shared/timeline.mjs';
import type { VideoScene, WorkedExample } from '../EducationalVideo';
import { TokenStripView } from './TokenStripView';
import { DocumentPanel } from './DocumentPanel';
import { PostingRowView } from './PostingRowView';
import { SetOperationView } from './SetOperationView';
import { ResultListView } from './ResultListView';
import { OperationCaption } from './OperationCaption';

const OPERATION_RENDERERS: Record<string, React.ComponentType<any>> = {
  tokenize: TokenStripView, normalize: TokenStripView, groupTerms: TokenStripView,
  appendPosting: PostingRowView, lookup: PostingRowView,
  intersect: SetOperationView, union: SetOperationView,
  filter: ResultListView, project: ResultListView,
};

export const ExampleMechanism: React.FC<{ scene: VideoScene; examples: WorkedExample[]; techPrimary?: string }> = ({ scene, examples, techPrimary }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const primary = techPrimary || '#25856a';
  const duration = scene.durationFrames || Math.ceil((scene.actualDurationSec || 12) * fps);

  const example = examples?.find(e => e.id === scene.exampleId);
  const execution = useMemo(() => (example ? executeOperations(example) : null), [example]);

  if (!example || !execution) {
    return (
      <AbsoluteFill style={{ background: '#f5f7f8', color: '#17272b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
        Example not found: {scene.exampleId}
      </AbsoluteFill>
    );
  }

  const range = scene.operationRange || { from: 0, to: execution.trace.length - 1 };
  const rangeTrace = execution.trace.slice(range.from, range.to + 1);
  const isInspect = scene.operationMode === 'inspect';

  // Before the first entry's scheduled frame, nothing is active yet — matches
  // EngineMechanism's active=-1 convention exactly, rather than defaulting to entry 0
  // early. Inspect visuals have no schedule: a single settled entry from frame 0.
  let activeEntry = null;
  let progress = 1;
  let activeIndex = -1;

  if (isInspect) {
    activeEntry = rangeTrace[0] || null;
    activeIndex = 0;
  } else if (rangeTrace.length > 0) {
    // Prefer compiled beats (anchor-matched or proportionally-clamped by compileSection)
    // over recomputing an independent schedule — mirrors EngineMechanism's existing pattern.
    const scheduled = scene.beats?.length
      ? scene.beats.map(b => b.frame)
      : rangeTrace.map((_, i) => Math.round(duration * (i + 0.6) / (rangeTrace.length + 1.4)));
    let active = -1;
    scheduled.forEach((f, i) => { if (frame >= f) active = i; });
    activeIndex = active;
    if (active >= 0) {
      activeEntry = rangeTrace[active];
      const nextFrame = scheduled[active + 1] ?? duration;
      const motionFrames = motionWindow(scheduled[active], nextFrame, fps);
      progress = Math.max(0, Math.min(1, (frame - scheduled[active]) / motionFrames));
    } else {
      progress = 0;
    }
  }

  const Renderer = activeEntry ? OPERATION_RENDERERS[activeEntry.type] : null;

  return (
    <AbsoluteFill style={{ background: '#f5f7f8', color: '#17272b', fontFamily: 'Inter, sans-serif', padding: 64 }}>
      <div style={{ fontSize: 22, color: '#42636a', marginBottom: 12 }}>{example.scenario}</div>
      <h1 style={{ fontSize: 52, lineHeight: 1.15, maxWidth: 1400, margin: 0, overflowWrap: 'anywhere' }}>{scene.title}</h1>

      {activeEntry?.output?.sourceDocId && <DocumentPanel example={example} docId={activeEntry.output.sourceDocId} primary={primary} />}

      <div style={{ marginTop: 48 }}>
        {activeEntry && <OperationCaption entry={activeEntry} />}
        {Renderer && activeEntry && <Renderer entry={activeEntry} example={example} progress={progress} primary={primary} />}
      </div>

      <div style={{ position: 'absolute', left: 100, right: 100, bottom: 155, borderTop: '2px solid #c0cdd1', paddingTop: 28, display: 'flex', gap: 24, alignItems: 'center' }}>
        <span style={{ fontSize: 28, color: primary, minWidth: 90 }}>{rangeTrace.length ? activeIndex + 1 : 0} / {rangeTrace.length}</span>
        <div style={{ fontSize: 34, lineHeight: 1.35 }}>{activeEntry?.label || scene.subtitle || 'Initial state'}</div>
      </div>
      <div style={{ position: 'absolute', left: 100, right: 100, bottom: 55, fontSize: 21, lineHeight: 1.4, color: '#52686e' }}>{example.assumptions}</div>
    </AbsoluteFill>
  );
};
