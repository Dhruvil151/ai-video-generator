// Read existing queue records, audio, and already-rendered manifests only. This never submits a job.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import Redis from 'ioredis';
import { ENV } from '../server/config/env.js';
import { writeRenderManifest } from '../server/services/renderManifest.js';
import { ScriptModel } from '../server/models/Script.js';

const args=process.argv.slice(2);
const manifestArg=args.find(a=>a.startsWith('--manifest='));
const baselineDir=path.resolve('server/tests/fixtures/baseline');
fs.mkdirSync(baselineDir,{recursive:true});

if(manifestArg) await captureFromManifest(manifestArg.slice('--manifest='.length));
else await captureFromRedis();

// ── On-disk manifest capture: validate every path, stage in a temp dir, verify hashes, ──
// ── publish only at the end. A refused or failed capture never mutates the real baseline. ──
// ── Never opens Redis or reads the TTS cache — fully independent of captureFromRedis(). ──
async function captureFromManifest(sourcePath){
  const asArg=args.find(a=>a.startsWith('--as='));
  const force=args.includes('--force');
  if(!asArg) throw new Error('--manifest= requires --as=<label>');
  const label=asArg.slice('--as='.length);
  if(!/^[a-z0-9][a-z0-9-]{0,63}$/.test(label)) throw new Error('Invalid --as= label: '+label);

  const resolvedSource=path.resolve(sourcePath);
  const sourceDir=path.dirname(resolvedSource);
  const sourceBytes=fs.readFileSync(resolvedSource);
  const sourceManifestSha256=crypto.createHash('sha256').update(sourceBytes).digest('hex');
  const manifest=JSON.parse(sourceBytes);

  const destManifestPath=path.resolve(baselineDir,label+'.manifest.json');
  const destAssetDirName=label+'.assets';
  const destAssetDir=path.resolve(baselineDir,destAssetDirName);
  assertWithin(baselineDir,destManifestPath);
  assertWithin(baselineDir,destAssetDir);

  // Validate every source asset path — traversal, absolute override, symlinks, filename collisions —
  // and every candidate destination filename, before copying anything.
  const plannedDestNames=new Set();
  for(const asset of manifest.assets || []){
    const resolvedAssetSource=resolveSafe(sourceDir,asset.path);
    assertNoSymlink(resolvedAssetSource);
    const destName=path.basename(asset.path);
    if(plannedDestNames.has(destName)) throw new Error('Asset filename collision in "'+label+'": '+destName);
    plannedDestNames.add(destName);
  }

  // Stage into a throwaway directory. Nothing under the real baseline dir is touched yet.
  const stagingRoot=path.resolve(baselineDir,'.staging-'+label+'-'+crypto.randomBytes(4).toString('hex'));
  const stagingAssetDir=path.join(stagingRoot,destAssetDirName);
  fs.mkdirSync(stagingAssetDir,{recursive:true});
  try{
    const rewrites=new Map(); // old relative asset path (as it appears in the source manifest) -> new relative path
    for(const asset of manifest.assets || []){
      const resolvedAssetSource=resolveSafe(sourceDir,asset.path);
      const destName=path.basename(asset.path);
      const destPath=path.join(stagingAssetDir,destName);
      fs.copyFileSync(resolvedAssetSource,destPath);
      const copiedSha256=crypto.createHash('sha256').update(fs.readFileSync(destPath)).digest('hex');
      if(copiedSha256!==asset.sha256) throw new Error('Hash mismatch after copying '+asset.path+' — refusing to stage a corrupted baseline');
      rewrites.set(asset.path,path.join(destAssetDirName,destName).replaceAll('\\','/'));
    }

    // Rewrite only the known asset-bearing fields — never a blind recursive string replace,
    // which could corrupt narration or code text that happens to match an asset path.
    const rewritten=structuredClone(manifest);
    rewritten.sourceManifestSha256=sourceManifestSha256;
    for(const a of rewritten.assets || []) if(rewrites.has(a.path)) a.path=rewrites.get(a.path);
    for(const section of rewritten.script?.sections || []){
      if(section.audioPath && rewrites.has(section.audioPath)) section.audioPath=rewrites.get(section.audioPath);
      for(const visual of section.visuals || []){
        const url=visual.payload?.videoUrl;
        if(url && rewrites.has(url)) visual.payload.videoUrl=rewrites.get(url);
      }
    }
    const stagedManifestPath=path.join(stagingRoot,label+'.manifest.json');
    fs.writeFileSync(stagedManifestPath,JSON.stringify(rewritten,null,2));

    // Publish only now — after every asset has been copied and hash-verified.
    if(fs.existsSync(destManifestPath)){
      const existing=fs.readFileSync(destManifestPath,'utf8');
      const staged=fs.readFileSync(stagedManifestPath,'utf8');
      if(existing===staged){console.log('Baseline "'+label+'" already captured identically — no-op.');return;}
      if(!force) throw new Error('Baseline "'+label+'" already exists with different content. Re-run with --force to overwrite. Existing baseline left unchanged.');
    }
    fs.rmSync(destAssetDir,{recursive:true,force:true});
    fs.renameSync(stagingAssetDir,destAssetDir);
    fs.renameSync(stagedManifestPath,destManifestPath);
    console.log('Captured baseline "'+label+'" from '+sourcePath);
  } finally {
    fs.rmSync(stagingRoot,{recursive:true,force:true});
  }
}

function resolveSafe(baseDir,relativePath){
  if(path.isAbsolute(relativePath)) throw new Error('Asset path must be relative: '+relativePath);
  const resolved=path.resolve(baseDir,relativePath);
  if(resolved!==baseDir && !resolved.startsWith(baseDir+path.sep)) throw new Error('Asset path escapes its directory: '+relativePath);
  return resolved;
}
function assertNoSymlink(resolvedPath){
  let current=resolvedPath;
  while(current!==path.parse(current).root){
    if(fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) throw new Error('Refusing to follow symlink/junction: '+current);
    current=path.dirname(current);
  }
}
function assertWithin(dir,target){
  const resolvedDir=path.resolve(dir), resolvedTarget=path.resolve(target);
  if(resolvedTarget!==resolvedDir && !resolvedTarget.startsWith(resolvedDir+path.sep)) throw new Error('Path escapes baseline directory: '+target);
}

// ── Redis-backed capture for jobs whose manifest was never written to public/output/. ──
// ── Unchanged from before — still only reads retained queue data and local TTS cache files. ──
async function captureFromRedis(){
  const redis=new Redis(ENV.REDIS_URL,{connectTimeout:2000,maxRetriesPerRequest:0,retryStrategy:()=>null});
  redis.on('error',()=>{});
  try{
    const metas=fs.readdirSync(ENV.TTS_CACHE_DIR).filter(f=>f.endsWith('_meta.json')).map(f=>JSON.parse(fs.readFileSync(path.join(ENV.TTS_CACHE_DIR,f),'utf8')));
    for(const job of ['35','36','37']){
      const data=await redis.hget('bull:video-render:'+job,'data');
      if(!data){console.warn('No retained script for job '+job);continue;}
      const script=new ScriptModel(JSON.parse(data).script);
      for(const section of script.sections){
        const audioFile='job'+job+'_'+section.id+'.mp3';
        const meta=metas.find(m=>m.audioFile===audioFile);
        section.audioPath=path.join(ENV.AUDIO_DIR,audioFile);
        if(meta){section.actualDurationSec=meta.durationSec;section.subtitles=meta.subtitles || [];}
      }
      writeRenderManifest(script,path.join(baselineDir,'job-'+job+'.mp4'),{baseline:true,historicalRendererSettings:'unknown; original output retained in public/output'});
      console.log('Captured job '+job);
    }
  }finally{redis.disconnect();}
}
