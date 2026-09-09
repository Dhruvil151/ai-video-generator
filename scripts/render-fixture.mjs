// Offline render only: no Gemini, Edge TTS, Redis queue, or stock-service calls.
import fs from 'node:fs';
import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { renderStill, renderMedia, selectComposition } from '@remotion/renderer';
import { ScriptModel } from '../server/models/Script.js';
import { fixtures, legacyFixtures } from '../server/tests/fixtures/demonstrations.mjs';
import { splitContinuityFixture } from '../server/tests/fixtures/split-continuity.mjs';
import { exampleRenderingFixture } from '../server/tests/fixtures/example-rendering.mjs';
import { validateStoryboard, assertRenderSupport } from '../server/services/storyboardValidation.js';
import { stitchSections,applyFades,generateSrtFile } from '../server/services/ffmpegService.js';
import { sceneTimings, FPS, motionWindow } from '../shared/timeline.mjs';
import {execFileSync} from 'node:child_process';
import ffmpeg from 'ffmpeg-static';

const args=process.argv.slice(2), full=args.includes('--video');
const manifestArg=args.find(a=>a.endsWith('.json'));
let sources=args.includes('--all')?[...fixtures,...legacyFixtures,splitContinuityFixture,exampleRenderingFixture]:[...fixtures,splitContinuityFixture,exampleRenderingFixture];
const engineArg=args.find(a=>a.startsWith('--engine='));
if(engineArg)sources=sources.filter(s=>s.topic===engineArg.slice(9));
if(manifestArg){
  const manifest=JSON.parse(fs.readFileSync(manifestArg,'utf8'));
  const raw=manifest.script || manifest;
  for(const s of raw.sections || []) {
    if(s.audioPath)s.audioPath=path.resolve(path.dirname(manifestArg),s.audioPath);
    for(const v of s.visuals || []){
      const media=v.payload?.videoUrl;
      if(media && !/^https?:/.test(media)){
        const source=path.resolve(path.dirname(manifestArg),media);
        const dest=path.resolve('public/broll','replay-'+path.basename(source));
        fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(source,dest);
        v.payload.videoUrl='broll/'+path.basename(dest);
      }
    }
  }
  sources=[raw];
}
const out=path.resolve('temp/fixture-review');fs.mkdirSync(out,{recursive:true});
const serveUrl=await bundle({entryPoint:path.resolve('src/remotion/index.ts')});
const reports=[];
for(const raw of sources){
  const script=new ScriptModel(raw);validateStoryboard(script);assertRenderSupport(script);
  script.sections.forEach(s=>s.populateVisualTimings(script.examples));
  const scenes=script.sections.flatMap(s=>s.toRenderableScenes());
  const inputProps={scenes,examples:script.examples,topic:script.topic,bgMusicUrl:null,reviewMode:!full};
  const timings=sceneTimings(scenes);
  const durationInFrames=timings.reduce((n,t)=>n+t.durationFrames,0);
  const selected=await selectComposition({serveUrl,id:'EducationalVideo',inputProps});
  const composition={...selected,durationInFrames};
  const slug=script.topic.replace(/[^a-z0-9-]/gi,'_');

  // ── Beat-level sampling: pre-operation / motion-midpoint / settled-result per beat, plus ──
  // ── initial-state and continuity-boundary samples. Replicates MechanismScene.tsx's own ──
  // ── motion-window formula exactly, including its edge cases (frame-zero, unreachable settle). ──
  const samples=[]; // {visualId, step, role, frame:number|null, diagnostic?}
  const renderFrames=new Set(); // global frame numbers to actually render, deduplicated

  for(const t of timings){
    const beats=t.scene.beats || [];
    if(beats.length){
      beats.forEach((b,i)=>{
        const eventFrame=b.frame;
        const nextEventFrame=beats[i+1]?.frame ?? t.durationFrames;
        const motionFrames=motionWindow(eventFrame,nextEventFrame,FPS);
        const preLocal=eventFrame===0?null:eventFrame-1;
        const midLocal=Math.round(eventFrame+motionFrames/2);
        const settledRaw=Math.round(eventFrame+motionFrames);
        const settledLocal=(settledRaw<nextEventFrame && settledRaw<=t.durationFrames-1)?settledRaw:null;
        for(const [role,local] of [['pre',preLocal],['mid',midLocal],['settled',settledLocal]]){
          if(local===null){
            samples.push({visualId:t.scene.id,step:b.step,role,frame:null,
              diagnostic:role==='settled'?'settled-frame-unavailable':undefined});
            continue;
          }
          const clamped=Math.max(0,Math.min(t.durationFrames-1,local));
          const globalFrame=t.fromFrame+clamped;
          renderFrames.add(globalFrame);
          samples.push({visualId:t.scene.id,step:b.step,role,frame:globalFrame});
        }
      });
    } else {
      const base=[
        {role:'initial',frame:t.fromFrame},
        {role:'near-start',frame:t.fromFrame+Math.min(30,t.durationFrames-1)},
        {role:'mid',frame:t.fromFrame+Math.floor(t.durationFrames/2)},
        {role:'near-end',frame:t.fromFrame+t.durationFrames-2},
      ];
      for(const s of base){renderFrames.add(s.frame);samples.push({visualId:t.scene.id,role:s.role,frame:s.frame});}
    }
  }
  // Continuity boundary: for two visuals sharing a continuityId, sample the incoming visual's
  // own global fromFrame (B) and the frame just before it — not the outgoing visual's fromFrame.
  for(let i=1;i<timings.length;i++){
    const prev=timings[i-1], cur=timings[i];
    if(cur.scene.continuityId && cur.scene.continuityId===prev.scene.continuityId){
      const B=cur.fromFrame;
      renderFrames.add(B-1);renderFrames.add(B);
      samples.push({visualId:prev.scene.id,role:'boundary-before',frame:B-1});
      samples.push({visualId:cur.scene.id,role:'boundary-after',frame:B});
    }
  }

  const layoutReports=[];
  for(const frame of renderFrames){
    const output=path.join(out,slug+'-'+frame+'.png');
    await renderStill({serveUrl,composition,inputProps,frame,output,imageFormat:'png',logLevel:'error',onBrowserLog:log=>{
      if(log.text.startsWith('QUALITY:'))layoutReports.push(JSON.parse(log.text.slice(8)));
    }});
    const pixels=execFileSync(ffmpeg,['-v','error','-i',output,'-vf','scale=64:36','-f','rawvideo','-pix_fmt','rgb24','pipe:1']);
    if(Math.max(...pixels)-Math.min(...pixels)<20)throw new Error('Blank frame: '+output);
  }
  if(full){
    const muted=path.join(out,slug+'.muted.mp4');
    await renderMedia({serveUrl,composition,inputProps,outputLocation:muted,codec:'h264',imageFormat:'png',crf:1,muted:true,concurrency:2,logLevel:'error'});
    if(script.sections.every(s=>s.audioPath && fs.existsSync(s.audioPath))){
      const assembled=path.join(out,slug+'.assembled.mp4');
      await stitchSections([muted],script.sections,assembled);
      await applyFades(assembled,path.join(out,slug+'.mp4'));
      try{generateSrtFile(script.sections,path.join(out,slug+'.srt'));}catch(e){console.warn(e.message);}
    }
  }
  reports.push({topic:script.topic,durationInFrames,frames:[...renderFrames],samples,layoutReports,diagnostics:script.sections.flatMap(s=>s.diagnostics || [])});
}
fs.writeFileSync(path.join(out,manifestArg?path.basename(manifestArg)+'.review.json':args.includes('--all')?'all-scenes.report.json':'mechanisms.report.json'),JSON.stringify(reports,null,2));
console.log('Offline fixture review: '+out);
if(reports.some(r=>r.layoutReports.some(p=>p.problems.length)))process.exitCode=1;
