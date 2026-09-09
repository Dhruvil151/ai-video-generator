// Inspect an existing output only; no generation or queue operations.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import ffmpeg from 'ffmpeg-static';
import ffprobe from 'ffprobe-static';

const file = path.resolve(process.argv[2]);
const manifest = JSON.parse(fs.readFileSync(file.replace(/\.mp4$/i,'.manifest.json'),'utf8'));
const probe = JSON.parse(execFileSync(ffprobe.path,['-v','error','-show_streams','-show_format','-of','json',file],{encoding:'utf8'}));
const video = probe.streams.find(s=>s.codec_type==='video');
const audio = probe.streams.find(s=>s.codec_type==='audio');
if (!video || !audio) throw new Error('Video or audio stream missing');
const expectedFrames = manifest.script.sections.reduce((sum,s)=>sum+s.durationFrames,0);
if (Math.abs(Number(video.duration)-expectedFrames/30)>0.1) throw new Error('Timeline/video duration mismatch');
const out = path.resolve('temp/review',path.basename(file,'.mp4'));
fs.mkdirSync(out,{recursive:true});
let sectionStart=0;
const samples=[];
for (const section of manifest.script.sections) {
  for (const visual of section.visuals) {
    const time=sectionStart+visual.startSec+visual.durationFrames/60;
    const output=path.join(out,visual.id+'.png');
    execFileSync(ffmpeg,['-v','error','-y','-ss',String(time),'-i',file,'-frames:v','1',output]);
    samples.push({id:visual.id,type:visual.type,time,duration:visual.durationFrames/30,output});
  }
  sectionStart+=section.durationFrames/30;
}
// Decode the entire final file; corrupt frames or packets fail the check.
execFileSync(ffmpeg,['-v','error','-xerror','-i',file,'-f','null','-'],{maxBuffer:8*1024*1024});
const report={file,duration:Number(probe.format.duration),expectedFrames,width:video.width,height:video.height,fps:video.avg_frame_rate,audioCodec:audio.codec_name,sampleRate:audio.sample_rate,bytes:fs.statSync(file).size,captionsAvailable:manifest.captionsAvailable,warnings:manifest.warnings,samples};
fs.writeFileSync(path.join(out,'media-check.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
