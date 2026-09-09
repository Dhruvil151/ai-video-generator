import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { KNOWLEDGE_SOURCES, VERIFIED_FIXTURES, findKnowledgeSource, isVerifiedFixture, knowledgeSourcesForTopic } from '../../assets/knowledge/registry.mjs';
import { buildPrompt } from '../services/geminiService.js';
import { writeRenderManifest } from '../services/renderManifest.js';
import { ScriptModel } from '../models/Script.js';

// ── The four regression entries match job-39.observations.md's four factual issues ──────────
test('the registry has exactly the four job-39 regression entries, each transcribed from the observations doc',()=>{
  assert.equal(KNOWLEDGE_SOURCES.length,4);
  const ids=KNOWLEDGE_SOURCES.map(s=>s.id);
  assert.deepEqual(new Set(ids).size,4); // unique
  assert.ok(ids.includes('elasticsearch-standard-analyzer'),'issue 1: analyzer does not stem by default');
  assert.ok(ids.includes('elasticsearch-match-query-operator'),'issue 2: match query default operator is OR');
  assert.ok(ids.includes('postgresql-full-text-search-indexes'),'issue 3: relational DBs vs inverted-index needs qualification');
  assert.ok(ids.includes('illustrative-complexity-claims'),'issue 4: unsupported O(1) complexity claim');
});

test('every source has a claim, a limitation, and either a real url or an explicit null (no source has a fabricated url)',()=>{
  for(const s of KNOWLEDGE_SOURCES){
    assert.ok(s.claimSummary?.length>0,`${s.id}: missing claimSummary`);
    assert.ok(s.limitations?.length>0,`${s.id}: missing limitations`);
    assert.ok(s.url===null || /^https:\/\//.test(s.url),`${s.id}: url must be a real https link or explicitly null`);
  }
  // The one issue job-39.observations.md itself noted has no single external source
  // ("refuted on its own terms") must not have been given a fabricated url.
  assert.equal(findKnowledgeSource('illustrative-complexity-claims').url,null);
});

test('findKnowledgeSource resolves known ids and returns undefined for unknown ones',()=>{
  assert.ok(findKnowledgeSource('elasticsearch-match-query-operator'));
  assert.equal(findKnowledgeSource('not-a-real-source'),undefined);
});

test('VERIFIED_FIXTURES starts empty, so isVerifiedFixture is false for every known source',()=>{
  assert.equal(VERIFIED_FIXTURES.length,0);
  for(const s of KNOWLEDGE_SOURCES) assert.equal(isVerifiedFixture(s.id),false);
});

// ── buildPrompt topic-matching: relevant sources only, never the whole catalog ───────────────
test('buildPrompt injects the matching sources for an Elasticsearch topic',()=>{
  const prompt=buildPrompt('Elasticsearch inverted index',shortModeArgs()[0],shortModeArgs()[1],shortModeArgs()[2]);
  assert.ok(prompt.includes('KNOWN FACTUAL ISSUES FOR THIS TOPIC'));
  assert.ok(prompt.includes('standard` analyzer') || prompt.toLowerCase().includes('analyzer'));
  assert.ok(prompt.includes('elasticsearch-standard-analyzer'));
  assert.ok(prompt.includes('elasticsearch-match-query-operator'));
});

test('buildPrompt injects nothing extra for an unrelated topic',()=>{
  const prompt=buildPrompt('Redis caching strategies',shortModeArgs()[0],shortModeArgs()[1],shortModeArgs()[2]);
  assert.ok(!prompt.includes('KNOWN FACTUAL ISSUES FOR THIS TOPIC'));
  for(const s of KNOWLEDGE_SOURCES) assert.ok(!prompt.includes(s.id));
});

test('knowledgeSourcesForTopic performs real filtering, not always-all or always-none',()=>{
  assert.ok(knowledgeSourcesForTopic('Elasticsearch inverted index').length>0);
  assert.equal(knowledgeSourcesForTopic('React state management').length,0);
});

function shortModeArgs(){ return ['short',3,420]; }

// ── renderManifest exposes a clean, resolved sourcesReferenced summary ───────────────────────
test('writeRenderManifest resolves cited evidence sourceIds into sourcesReferenced, deduplicated',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'manifest-knowledge-'));
  try{
    const script=new ScriptModel({
      schemaVersion:3,topic:'t',mode:'short',
      sections:[{id:'s1',narration:'n',actualDurationSec:5,visuals:[{id:'v1',type:'ConceptCardScene',durationFraction:1,payload:{bulletPoints:[{title:'a',description:'b'}]}}]}],
      examples:[
        {id:'ex1',scenario:'s',assumptions:'a',corpus:[],operations:[],inputData:{},query:{},evidence:[
          {sourceId:'elasticsearch-standard-analyzer',claim:'c1',provenance:'illustrative'},
          {sourceId:'elasticsearch-match-query-operator',claim:'c2',provenance:'illustrative'},
        ]},
        {id:'ex2',scenario:'s',assumptions:'a',corpus:[],operations:[],inputData:{},query:{},evidence:[
          {sourceId:'elasticsearch-standard-analyzer',claim:'c3',provenance:'illustrative'}, // duplicate sourceId across examples
          {sourceId:'',claim:'c4',provenance:'illustrative'}, // no citation, must be excluded
        ]},
      ],
    });
    const manifestPath=writeRenderManifest(script,path.join(dir,'out.mp4'));
    const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
    assert.equal(manifest.sourcesReferenced.length,2);
    const ids=manifest.sourcesReferenced.map(s=>s.id).sort();
    assert.deepEqual(ids,['elasticsearch-match-query-operator','elasticsearch-standard-analyzer']);
    assert.ok(manifest.sourcesReferenced.every(s=>s.url && s.claimSummary));
  } finally {
    assert.equal(path.dirname(dir),os.tmpdir());
    fs.rmSync(dir,{recursive:true,force:true});
  }
});

test('writeRenderManifest produces an empty sourcesReferenced when no evidence cites a source',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'manifest-knowledge-empty-'));
  try{
    const script=new ScriptModel({
      schemaVersion:1,topic:'t',mode:'short',
      sections:[{id:'s1',narration:'n',actualDurationSec:5,visuals:[{id:'v1',type:'ConceptCardScene',durationFraction:1,payload:{bulletPoints:[{title:'a',description:'b'}]}}]}],
    });
    const manifestPath=writeRenderManifest(script,path.join(dir,'out.mp4'));
    const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
    assert.deepEqual(manifest.sourcesReferenced,[]);
  } finally {
    assert.equal(path.dirname(dir),os.tmpdir());
    fs.rmSync(dir,{recursive:true,force:true});
  }
});

// ── Phase 8: manifest review metadata — exampleHashes, evidenceSummary, operationsCatalogVersion, unified diagnostics ──
test('writeRenderManifest exposes a stable per-example content hash and the operations catalog version',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'manifest-hashes-'));
  try{
    const raw={schemaVersion:3,topic:'t',mode:'short',
      sections:[{id:'s1',narration:'n',actualDurationSec:5,visuals:[{id:'v1',type:'ConceptCardScene',durationFraction:1,payload:{bulletPoints:[{title:'a',description:'b'}]}}]}],
      examples:[{id:'ex1',scenario:'s',assumptions:'a',corpus:[{id:'D1',fields:{text:'x'}}],operations:[],inputData:{},query:{},evidence:[]}]};
    const script1=new ScriptModel(raw);
    const path1=writeRenderManifest(script1,path.join(dir,'out1.mp4'));
    const manifest1=JSON.parse(fs.readFileSync(path1,'utf8'));
    assert.ok(manifest1.exampleHashes.ex1);
    assert.equal(manifest1.renderer.operationsCatalogVersion,1);

    // Same example content -> same hash across independent manifest writes.
    const script2=new ScriptModel(raw);
    const path2=writeRenderManifest(script2,path.join(dir,'out2.mp4'));
    const manifest2=JSON.parse(fs.readFileSync(path2,'utf8'));
    assert.equal(manifest2.exampleHashes.ex1,manifest1.exampleHashes.ex1);

    // Changed corpus -> different hash.
    const changed={...raw,examples:[{...raw.examples[0],corpus:[{id:'D1',fields:{text:'CHANGED'}}]}]};
    const path3=writeRenderManifest(new ScriptModel(changed),path.join(dir,'out3.mp4'));
    const manifest3=JSON.parse(fs.readFileSync(path3,'utf8'));
    assert.notEqual(manifest3.exampleHashes.ex1,manifest1.exampleHashes.ex1);
  } finally {
    assert.equal(path.dirname(dir),os.tmpdir());
    fs.rmSync(dir,{recursive:true,force:true});
  }
});

test('writeRenderManifest tallies evidence by provenance and verificationStatus, zero-filled for absent categories',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'manifest-evidence-'));
  try{
    const script=new ScriptModel({
      schemaVersion:3,topic:'t',mode:'short',
      sections:[{id:'s1',narration:'n',actualDurationSec:5,visuals:[{id:'v1',type:'ConceptCardScene',durationFraction:1,payload:{bulletPoints:[{title:'a',description:'b'}]}}]}],
      examples:[{id:'ex1',scenario:'s',assumptions:'a',corpus:[],operations:[],inputData:{},query:{},evidence:[
        {sourceId:'elasticsearch-standard-analyzer',claim:'c1',provenance:'illustrative'},
        {sourceId:'elasticsearch-match-query-operator',claim:'c2',provenance:'illustrative'},
        {sourceId:'',claim:'c3',provenance:'computed-locally'},
      ]}],
    });
    const manifestPath=writeRenderManifest(script,path.join(dir,'out.mp4'));
    const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
    assert.deepEqual(manifest.evidenceSummary.byProvenance,{'computed-locally':1,'external-fixture':0,illustrative:2});
    assert.deepEqual(manifest.evidenceSummary.byVerificationStatus,{verified:0,unverified:3}); // VERIFIED_FIXTURES is empty
  } finally {
    assert.equal(path.dirname(dir),os.tmpdir());
    fs.rmSync(dir,{recursive:true,force:true});
  }
});

test('writeRenderManifest merges validation warnings, timing diagnostics and pacing hints into one tagged diagnostics array',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'manifest-diagnostics-'));
  try{
    const script=new ScriptModel({
      schemaVersion:1,topic:'t',mode:'short',
      // No narrationAnchor -> validateStoryboard's 'missing-anchor' warning (source:'validation').
      // A single long, plain visual with no timed speech evidence -> timeline's
      // 'proportional-alignment'/'beat-proportional'-style diagnostics never fire for a
      // section-start visual, but its long duration with no exampleId/beats trips
      // pacingHints' 'long-static-visual' (source:'pacing') once timing is populated.
      sections:[{id:'s1',narration:'A short narration sentence for timing.',actualDurationSec:40,
        visuals:[{id:'v1',type:'ConceptCardScene',durationFraction:1,payload:{bulletPoints:[{title:'a',description:'b'}]}}]}],
    });
    script.diagnostics=[{code:'missing-anchor',visualId:'v1'}]; // what validateStoryboard would have returned
    script.sections.forEach(s=>s.populateVisualTimings(script.examples));

    const manifestPath=writeRenderManifest(script,path.join(dir,'out.mp4'));
    const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
    const sources=new Set(manifest.diagnostics.map(d=>d.source));
    assert.ok(sources.has('validation'));
    assert.ok(sources.has('pacing'));
    assert.ok(manifest.diagnostics.some(d=>d.code==='missing-anchor' && d.source==='validation'));
    assert.ok(manifest.diagnostics.some(d=>d.code==='long-static-visual' && d.source==='pacing'));
  } finally {
    assert.equal(path.dirname(dir),os.tmpdir());
    fs.rmSync(dir,{recursive:true,force:true});
  }
});
