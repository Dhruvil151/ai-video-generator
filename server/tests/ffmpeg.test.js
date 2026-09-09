import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import ffmpeg from 'ffmpeg-static';
import {stitchSections,mixBackgroundMusic,applyFades,getVideoDuration} from '../services/ffmpegService.js';
import {SectionModel} from '../models/Script.js';

test('local synthetic clips preserve section duration through stitch, music and fades',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'video-local-'));
  const file=name=>path.join(dir,name);
  const run=args=>execFileSync(ffmpeg,['-hide_banner','-loglevel','error','-y',...args],{timeout:30000});
  try{
    run(['-f','lavfi','-i','color=c=white:s=320x180:r=30:d=0.5','-c:v','libx264',file('v.mp4')]);
    run(['-f','lavfi','-i','sine=frequency=440:sample_rate=48000:duration=0.8',file('a.wav')]);
    await stitchSections([file('v.mp4'),file('v.mp4')],[{id:'s',audioPath:file('a.wav'),timelineDurationSec:1}],file('joined.mp4'));
    assert.ok(Math.abs(await getVideoDuration(file('joined.mp4'))-1)<0.06);
    await mixBackgroundMusic({videoPath:file('joined.mp4'),musicPath:file('a.wav'),outputPath:file('mixed.mp4')});
    await applyFades(file('mixed.mp4'),file('final.mp4'),0.1);
    assert.ok(Math.abs(await getVideoDuration(file('final.mp4'))-1)<0.06);
    const frame=execFileSync(ffmpeg,['-v','error','-i',file('final.mp4'),'-frames:v','1','-vf','scale=1:1','-f','rawvideo','-pix_fmt','rgb24','pipe:1']);
    assert.ok(frame[0]<10,'first frame is actually faded');
  }finally{
    // Only the freshly created test directory is eligible for cleanup.
    assert.equal(path.dirname(dir),os.tmpdir());
    fs.rmSync(dir,{recursive:true,force:true});
  }
});

// Phase 5: real audio (not frame arithmetic) for a section split across two visuals,
// shaped like example-rendering.mjs's s4-query (durationFraction 0.4/0.6). Compares the
// visual partition against Math.ceil(measuredSeconds*fps) — the exact ceiling rounding
// compileSection itself uses — so the final sub-frame remainder is accounted for exactly,
// then verifies the real stitched output's audio is neither duplicated nor truncated.
test('a two-visual section split preserves real measured audio duration and frame totals',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'video-split-'));
  const file=name=>path.join(dir,name);
  const run=args=>execFileSync(ffmpeg,['-hide_banner','-loglevel','error','-y',...args],{timeout:30000});
  try{
    // Deliberately non-round duration to exercise sub-frame rounding explicitly.
    run(['-f','lavfi','-i','sine=frequency=440:sample_rate=48000:duration=2.53',file('a.wav')]);
    const measuredSec=await getVideoDuration(file('a.wav'));
    assert.ok(measuredSec>2 && measuredSec<3);

    const section=new SectionModel({id:'s4-query',actualDurationSec:measuredSec,audioPath:file('a.wav'),
      visuals:[{id:'v4',durationFraction:0.4},{id:'v5',durationFraction:0.6}]});
    section.populateVisualTimings();

    const expectedFrames=Math.ceil(measuredSec*30); // same ceiling rounding compileSection uses
    assert.equal(section.durationFrames,expectedFrames);
    assert.equal(section.visuals[0].durationFrames+section.visuals[1].durationFrames,expectedFrames);
    assert.equal(section.visuals[0].startFrame,0);
    assert.equal(section.visuals[1].startFrame,section.visuals[0].durationFrames); // contiguous: no gap, no overlap

    // Real stitch: two distinct video clips (one per visual), one continuous section audio track.
    run(['-f','lavfi','-i','color=c=red:s=320x180:r=30:d=1','-c:v','libx264',file('v4.mp4')]);
    run(['-f','lavfi','-i','color=c=blue:s=320x180:r=30:d=1','-c:v','libx264',file('v5.mp4')]);
    await stitchSections([file('v4.mp4'),file('v5.mp4')],[{id:section.id,audioPath:file('a.wav'),timelineDurationSec:section.timelineDurationSec}],file('out.mp4'));

    const outDuration=await getVideoDuration(file('out.mp4'));
    assert.ok(Math.abs(outDuration-measuredSec)<0.06,'stitched audio duration matches the source — neither duplicated nor truncated');
  }finally{
    assert.equal(path.dirname(dir),os.tmpdir());
    fs.rmSync(dir,{recursive:true,force:true});
  }
});
