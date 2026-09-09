import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { FPS } from '../../shared/timeline.mjs';
import { OPERATIONS_VERSION } from '../../shared/operations.mjs';
import { findKnowledgeSource } from '../../assets/knowledge/registry.mjs';
import { EVIDENCE_PROVENANCE } from './storyboardValidation.js';
import { computePacingHints } from './pacingHints.js';

export function writeRenderManifest(script, outputPath, metadata = {}) {
  const manifestPath = outputPath.replace(/\.mp4$/i, '.manifest.json');
  const assetDir = outputPath.replace(/\.mp4$/i, '.assets');
  fs.mkdirSync(assetDir, {recursive:true});
  const snapshot = JSON.parse(JSON.stringify(script));
  const assets = [];
  snapshot.sections.forEach((section, i) => {
    if (!section.audioPath || !fs.existsSync(section.audioPath)) return;
    const destination = path.join(assetDir, `section-${i}.mp3`);
    fs.copyFileSync(section.audioPath, destination);
    section.audioPath = path.relative(path.dirname(manifestPath), destination).replaceAll('\\','/');
    section.audioUrl = null;
    assets.push({path:section.audioPath,sha256:crypto.createHash('sha256').update(fs.readFileSync(destination)).digest('hex')});
  });
  for (const section of snapshot.sections) {
    for (const visual of section.visuals) {
      const url=visual.payload?.videoUrl;
      if (!url) continue;
      const pathname=new URL(url,'http://localhost').pathname;
      if (!pathname.startsWith('/public/broll/')) continue;
      const original=path.resolve('public/broll',path.basename(pathname));
      if (!fs.existsSync(original)) continue;
      const destination=path.join(assetDir,`broll-${assets.length}.mp4`);
      fs.copyFileSync(original,destination);
      const relative=path.relative(path.dirname(manifestPath),destination).replaceAll('\\','/');
      visual.payload.videoUrl=relative;
      assets.push({path:relative,sha256:crypto.createHash('sha256').update(fs.readFileSync(destination)).digest('hex')});
    }
  }
  const sourceFiles=['package-lock.json','assets/asset-registry.json',...['src/remotion','shared'].flatMap(root=>fs.readdirSync(root,{recursive:true}).filter(f=>/\.(tsx?|mjs|css|woff2)$/.test(f)).map(f=>path.join(root,f)))];
  const sourceHashes=Object.fromEntries(sourceFiles.filter(f=>fs.existsSync(f)).map(f=>[f.replaceAll('\\','/'),crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')]));
  // Clean reference list for the review report / end metadata — every unique sourceId
  // actually cited by an example's evidence, resolved to its registry entry. The raw
  // evidence[] is still present in the script snapshot; this is a deduplicated summary,
  // not a new source of truth.
  const citedSourceIds=[...new Set((script.examples || []).flatMap(e=>e.evidence.map(ev=>ev.sourceId)).filter(Boolean))];
  const sourcesReferenced=citedSourceIds.map(id=>findKnowledgeSource(id)).filter(Boolean)
    .map(({id,url,product,claimSummary})=>({id,url,product,claimSummary}));

  // One stable fingerprint per example — same formula scriptReconciliation.js's
  // visualDependencyHash uses for its exampleContent, reimplemented here since this hash is
  // for review comparability across manifests, a different concern from staleness detection.
  const exampleHashes=Object.fromEntries((script.examples || []).map(e=>[e.id,
    crypto.createHash('sha256').update(JSON.stringify({corpus:e.corpus,operations:e.operations,inputData:e.inputData,query:e.query})).digest('hex')]));

  const allEvidence=(script.examples || []).flatMap(e=>e.evidence);
  const evidenceSummary={
    byProvenance:Object.fromEntries(EVIDENCE_PROVENANCE.map(p=>[p,allEvidence.filter(ev=>ev.provenance===p).length])),
    byVerificationStatus:{verified:allEvidence.filter(ev=>ev.verificationStatus==='verified').length,
      unverified:allEvidence.filter(ev=>ev.verificationStatus==='unverified').length},
  };

  // Unified review diagnostics: validation warnings (script.diagnostics, previously dropped
  // here entirely), per-section timing diagnostics, and post-timing pacing hints, each tagged
  // by source so a reviewer can tell which pass produced which finding.
  const diagnostics=[
    ...(script.diagnostics || []).map(d=>({...d,source:'validation'})),
    ...script.sections.flatMap(s=>s.diagnostics || []).map(d=>({...d,source:'timing'})),
    ...computePacingHints(script).map(d=>({...d,source:'pacing'})),
  ];

  const manifest = {manifestVersion:1,createdAt:new Date().toISOString(),
    renderer:{fps:FPS,width:1920,height:1080,frameFormat:'png',intermediateCrf:1,finalCrf:16,operationsCatalogVersion:OPERATIONS_VERSION},
    script:snapshot,assets,sourceHashes,sourcesReferenced,exampleHashes,evidenceSummary,diagnostics,...metadata};
  fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2));
  return manifestPath;
}
