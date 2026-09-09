import test from 'node:test';
import assert from 'node:assert/strict';
import { SectionModel } from '../models/Script.js';
import { srtTimestamp, getVideoDuration, generateSrtFile } from '../services/ffmpegService.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('visual durations preserve section duration even with a short beat', () => {
  const section = new SectionModel({ actualDurationSec: 10, visuals: [
    { durationFraction: 0.95 }, { durationFraction: 0.05 },
  ] });
  section.populateVisualTimings();
  assert.equal(section.visuals[1].startSec, 9.5);
  assert.equal(section.visuals[1].durationSec, 0.5);
});

test('invalid weights are normalized and empty sections are rejected', () => {
  const section = new SectionModel({ actualDurationSec: 9, visuals: [
    { durationFraction: Infinity }, { durationFraction: -1 }, {},
  ] });
  section.populateVisualTimings();
  assert.deepEqual(section.visuals.map(v => v.durationSec), [3, 3, 3]);
  assert.throws(() => new SectionModel().populateVisualTimings());
});

test('caption rounding carries into minutes and hours', () => {
  assert.equal(srtTimestamp(59.9996), '00:01:00,000');
  assert.equal(srtTimestamp(3599.9996), '01:00:00,000');
  assert.equal(srtTimestamp(-1), '00:00:00,000');
});

test('missing media produces an explicit probe failure', async () => {
  await assert.rejects(getVideoDuration('missing-test-input.mp4'));
});

test('caption output removes overlaps and rejects empty timestamps', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'video-captions-'));
  const target = path.join(dir, 'captions.srt');
  try {
    generateSrtFile([{ actualDurationSec: 3, subtitles: [
      { type: 'sentence', text: 'First.', start: 0, end: 2 },
      { type: 'sentence', text: 'Second.', start: 1.5, end: 3 },
    ] }], target);
    assert.match(fs.readFileSync(target, 'utf8'), /00:00:00,000 --> 00:00:01,500/);
    assert.throws(() => generateSrtFile([], path.join(dir, 'empty.srt')));
    assert.equal(fs.existsSync(path.join(dir, 'empty.srt')), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
