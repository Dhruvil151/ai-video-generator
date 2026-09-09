import test from 'node:test';
import assert from 'node:assert/strict';
import {ScriptController,scriptStore} from '../controllers/scriptController.js';
import {ScriptModel} from '../models/Script.js';
import {fixtures} from './fixtures/demonstrations.mjs';
import {invertedIndexOperationChain} from './fixtures/operation-chains.mjs';
import {checkCodeSyntax} from '../services/codeChecks.js';
const response=()=>({statusCode:200,status(n){this.statusCode=n;return this;},json(value){this.value=value;return this;}});

test('editor saves a v2 script without any generation calls',()=>{
  const res=response();ScriptController.save({body:fixtures[0]},res);
  assert.equal(res.statusCode,200);assert.equal(res.value.schemaVersion,2);assert.ok(scriptStore.has(res.value.id));
});
test('invalid edits do not mutate the saved script',()=>{
  const script=new ScriptModel(fixtures[0]);scriptStore.set(script.id,script);
  const res=response();ScriptController.updateScene({params:{scriptId:script.id,sceneId:script.scenes[0].id},body:{payload:{engine:'unknown'}}},res);
  assert.equal(res.statusCode,400);assert.equal(scriptStore.get(script.id).scenes[0].payload.engine,'cache');
});
test('narration edits invalidate old audio and boundaries',()=>{
  const script=new ScriptModel(fixtures[0]);scriptStore.set(script.id,script);
  const res=response();ScriptController.updateScene({params:{scriptId:script.id,sceneId:script.scenes[0].id},body:{narration:'A changed narration.'}},res);
  assert.equal(res.statusCode,200);assert.equal(scriptStore.get(script.id).sections[0].actualDurationSec,0);
  assert.deepEqual(scriptStore.get(script.id).sections[0].subtitles,[]);
});
test('code checks parse syntax without evaluating code',()=>{
  assert.ok(checkCodeSyntax('const x = ;').errors.length);
  assert.equal(checkCodeSyntax('process.exit(99);').errors.length,0);
  assert.equal(checkCodeSyntax('SELECT 1;','sql').status,'not-checked');
});

// ── Phase 2: shared invalidation policy across save(), updateScene(), updateExample() ──
function v3ScriptWithExample(){
  return {schemaVersion:3,topic:'test',mode:'short',
    sections:[{id:'s1',narration:'Docker basics tokenizes first.',visuals:[
      {id:'v1',type:'ConceptCardScene',durationFraction:1,exampleId:'ex1',narrationAnchor:'Docker basics',payload:{bulletPoints:[{title:'a',description:'b'}]}},
    ]}],
    examples:[{id:'ex1',scenario:'Inverted index',assumptions:'Illustrative.',
      corpus:[{id:'D1',fields:{text:'Docker basics'}}],
      operations:[{id:'op0',label:'tokenize D1',type:'tokenize',args:{source:{kind:'corpusEntry',id:'D1'},field:'text'}}],
      evidence:[],inputData:{},query:{}}]};
}
function simulateRenderedState(scriptId){
  const stored=scriptStore.get(scriptId);
  stored.sections[0].actualDurationSec=12;stored.sections[0].audioPath='/audio/x.mp3';stored.sections[0].audioUrl='/audio/x.mp3';
  stored.sections[0].visuals[0].durationFrames=300;stored.sections[0].visuals[0].durationSec=10;stored.sections[0].visuals[0].startSec=0;
  scriptStore.set(scriptId,stored);
  return stored;
}

test('whole-script save invalidates a changed example dependent, not just a PATCH',()=>{
  const res1=response();ScriptController.save({body:v3ScriptWithExample()},res1);
  assert.equal(res1.statusCode,200);
  const scriptId=res1.value.id;
  simulateRenderedState(scriptId);

  // Re-submit with the SAME narration (audio should be preserved) but a CHANGED example
  // corpus, while the submitted JSON dishonestly still claims the old durationFrames.
  const changed=scriptStore.get(scriptId).toJSON();
  changed.examples[0].corpus=[{id:'D1',fields:{text:'CHANGED CONTENT'}}];
  const res2=response();ScriptController.save({body:changed},res2);
  assert.equal(res2.statusCode,200);

  const after=scriptStore.get(scriptId);
  assert.equal(after.sections[0].actualDurationSec,12); // narration unchanged -> audio preserved
  assert.equal(after.sections[0].visuals[0].durationFrames,0); // example content changed -> timing invalidated despite submitted claim
  assert.equal(after.sections[0].visuals[0].needsAlignmentReview,true);
});

test('a failed updateExample leaves the stored script unchanged',()=>{
  const res1=response();ScriptController.save({body:v3ScriptWithExample()},res1);
  const scriptId=res1.value.id;
  const before=JSON.stringify(scriptStore.get(scriptId).toJSON());

  const res2=response();
  ScriptController.updateExample({params:{scriptId,exampleId:'ex1'},body:{evidence:[{sourceId:'s',claim:'c',provenance:'not-a-real-provenance'}]}},res2);
  assert.equal(res2.statusCode,400);
  assert.equal(JSON.stringify(scriptStore.get(scriptId).toJSON()),before);
});

test('editing an exampleId/operationRange via updateScene resets timing but preserves section audio',()=>{
  const res1=response();ScriptController.save({body:v3ScriptWithExample()},res1);
  const scriptId=res1.value.id;
  simulateRenderedState(scriptId);

  const res2=response();
  ScriptController.updateScene({params:{scriptId,sceneId:'v1'},body:{operationRange:{from:0,to:0}}},res2);
  assert.equal(res2.statusCode,200);

  const after=scriptStore.get(scriptId);
  assert.equal(after.sections[0].actualDurationSec,12); // audio untouched — narration didn't change
  assert.equal(after.sections[0].visuals[0].durationFrames,0); // timing invalidated
  assert.equal(after.sections[0].visuals[0].needsAlignmentReview,true);
});

test('an explicit narrationAnchor edit clears needsAlignmentReview even in the same request that changed the reference',()=>{
  const res1=response();ScriptController.save({body:v3ScriptWithExample()},res1);
  const scriptId=res1.value.id;

  const res2=response();
  ScriptController.updateScene({params:{scriptId,sceneId:'v1'},body:{operationRange:{from:0,to:0},narrationAnchor:'Docker basics'}},res2);
  assert.equal(res2.statusCode,200);
  assert.equal(scriptStore.get(scriptId).sections[0].visuals[0].needsAlignmentReview,false);
});

test('editing a shared example invalidates every referencing section, not just one',()=>{
  const raw=v3ScriptWithExample();
  raw.sections.push({id:'s2',narration:'Deployment guide tokenizes second.',visuals:[
    {id:'v2',type:'ConceptCardScene',durationFraction:1,exampleId:'ex1',payload:{bulletPoints:[{title:'a',description:'b'}]}},
  ]});
  const res1=response();ScriptController.save({body:raw},res1);
  const scriptId=res1.value.id;
  const stored=scriptStore.get(scriptId);
  for(const section of stored.sections){section.actualDurationSec=12;section.audioPath='/audio/x.mp3';section.visuals[0].durationFrames=300;}
  scriptStore.set(scriptId,stored);

  const res2=response();
  ScriptController.updateExample({params:{scriptId,exampleId:'ex1'},body:{corpus:[{id:'D1',fields:{text:'CHANGED'}}]}},res2);
  assert.equal(res2.statusCode,200);

  const after=scriptStore.get(scriptId);
  assert.equal(after.sections[0].visuals[0].durationFrames,0);
  assert.equal(after.sections[1].visuals[0].durationFrames,0); // both sections invalidated, not just the first
});

// ── Phase 8: GET .../example/:exampleId/trace — inspecting derived results ──────────────────
function v3ScriptWithRealExample(){
  return {schemaVersion:3,topic:'test',mode:'short',
    sections:[{id:'s1',narration:'A generic visual.',visuals:[
      {id:'v1',type:'MechanismScene',durationFraction:1,exampleId:invertedIndexOperationChain.id,operationRange:{from:0,to:15}},
    ]}],
    examples:[invertedIndexOperationChain]};
}

test('getExampleTrace returns the real computed trace, matching the known-good AND/OR query results',()=>{
  const res1=response();ScriptController.save({body:v3ScriptWithRealExample()},res1);
  const scriptId=res1.value.id;

  const res2=response();
  ScriptController.getExampleTrace({params:{scriptId,exampleId:invertedIndexOperationChain.id}},res2);
  assert.equal(res2.statusCode,200);
  assert.equal(res2.value.trace.length,invertedIndexOperationChain.operations.length);
  assert.deepEqual(res2.value.finalResults['and-query'].values,['D3']);
  assert.deepEqual(res2.value.finalResults['or-query'].values,['D1','D2','D3']);
});

test('getExampleTrace 404s for an unknown script or an unknown example',()=>{
  const res1=response();ScriptController.save({body:v3ScriptWithRealExample()},res1);
  const scriptId=res1.value.id;

  const missingScript=response();
  ScriptController.getExampleTrace({params:{scriptId:'nope',exampleId:invertedIndexOperationChain.id}},missingScript);
  assert.equal(missingScript.statusCode,404);

  const missingExample=response();
  ScriptController.getExampleTrace({params:{scriptId,exampleId:'nope'}},missingExample);
  assert.equal(missingExample.statusCode,404);
});
