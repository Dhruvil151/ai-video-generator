import test from 'node:test';
import assert from 'node:assert/strict';
import { alignAnchor, compileSection, sceneTimings, motionWindow, scheduleSteps } from '../../shared/timeline.mjs';
import { buildDemonstration, demonstrationState, ENGINES } from '../../shared/demonstrations.mjs';
import { ScriptModel } from '../models/Script.js';
import { validateStoryboard, assertRenderSupport } from '../services/storyboardValidation.js';
import { buildPrompt, buildScriptModel, WORKED_EXAMPLE_SKELETON } from '../services/geminiService.js';
import { OPERATION_TYPES } from '../../shared/operations.mjs';
import { fixtures } from './fixtures/demonstrations.mjs';
import { splitContinuityFixture } from './fixtures/split-continuity.mjs';

test('all demonstrations validate and finish with deterministic state',()=>{
  for(const raw of fixtures){
    const script=new ScriptModel(raw); validateStoryboard(script);
    script.sections[0].populateVisualTimings();
    const demo=buildDemonstration(raw.topic);
    const first=JSON.stringify(demo);
    const result=demonstrationState(demo,demo.steps.length);
    for(const [key,value] of Object.entries(demo.steps.at(-1).changes)) assert.equal(result[key],value);
    assert.equal(JSON.stringify(demo),first);
    assert.equal(script.sections[0].visuals[0].beats.length,demo.steps.length);
  }
});
test('model examples match real JavaScript operations',()=>{
  const d=buildDemonstration('coercion',{quantity:'2'});
  assert.equal(d.steps[0].changes.result,JSON.stringify('2'+1)+' (string)');
  assert.equal(d.steps[2].changes.result,(Number('2')+1)+' (number)');
  const cart={quantity:1}, other=cart;other.quantity=2;
  assert.equal(cart.quantity,2);
  assert.equal(demonstrationState(buildDemonstration('references'),3).heap,'quantity: 2');
});
test('event loop fixture matches a locally executed scheduling example',async()=>{
  const output=['A'];const timer=new Promise(resolve=>setTimeout(()=>{output.push('C');resolve();},0));
  Promise.resolve().then(()=>output.push('B'));output.push('D');await timer;
  const demo=buildDemonstration('event-loop');
  assert.equal(demonstrationState(demo,5).out,output.join(' '));
});
test('cache scenario retains stale data until explicit expiry/refill',()=>{
  const d=buildDemonstration('cache',{initial:10,updated:20});
  assert.equal(demonstrationState(d,4).cache,'$10 | TTL 60s');
  assert.equal(demonstrationState(d,6).client,'$20');
});
test('word anchors and sentence estimates report honest confidence',()=>{
  assert.deepEqual(alignAnchor('cache hit',[{text:'cache',start:2,end:2.3},{text:'hit',start:2.3,end:2.6}]),{seconds:2,confidence:'word',ambiguous:false});
  assert.equal(alignAnchor('cache hit',[{type:'sentence',text:'This is a cache hit.',start:1,end:5}]).confidence,'estimated-sentence');
  assert.equal(alignAnchor('missing',[]),null);
});
test('a phrase occurring more than once is flagged ambiguous, distinct from estimated-sentence positioning',()=>{
  // "cache" appears twice among word cues -> ambiguous word match, still deterministically the first
  const words=[{text:'cache',start:1,end:1.3},{text:'ok',start:1.3,end:1.5},{text:'cache',start:5,end:5.3}];
  const wordMatch=alignAnchor('cache',words);
  assert.equal(wordMatch.confidence,'word');
  assert.equal(wordMatch.seconds,1); // deterministic: first occurrence
  assert.equal(wordMatch.ambiguous,true);

  // same phrase twice within one sentence cue -> ambiguous sentence match
  const sentenceMatch=alignAnchor('the cache',[{type:'sentence',text:'Check the cache, then check the cache again.',start:0,end:6}]);
  assert.equal(sentenceMatch.ambiguous,true);

  // a single, non-repeated match is NOT ambiguous
  const unique=alignAnchor('cache hit',[{text:'cache',start:2,end:2.3},{text:'hit',start:2.3,end:2.6}]);
  assert.equal(unique.ambiguous,false);
});
test('frame allocation conserves duration across fractions and anchors',()=>{
  for(let n=1;n<12;n++){
    const s={actualDurationSec:10.017,visuals:Array.from({length:n},(_,i)=>({id:String(i),durationFraction:i+1}))};
    const c=compileSection(s);
    assert.equal(c.visuals.reduce((a,v)=>a+v.durationFrames,0),301);
    assert.equal(sceneTimings(c.visuals.map(v=>({...v,actualDurationSec:v.durationSec}))).at(-1).fromFrame+c.visuals.at(-1).durationFrames,301);
  }
});
test('out-of-order anchors are bounded and diagnosed',()=>{
  const c=compileSection({actualDurationSec:10,subtitles:[{text:'late',start:8,end:9},{text:'early',start:1,end:2}],visuals:[{}, {narrationAnchor:'late'}, {narrationAnchor:'early'}]});
  assert.ok(c.visuals[2].startFrame>c.visuals[1].startFrame);
  assert.ok(c.diagnostics.some(d=>d.code==='anchor-clamped'));
});
test('legacy scenes adapt without losing code',()=>{
  const code='const value = "'+'x'.repeat(100)+'";';
  const s=new ScriptModel({scenes:[{id:'old',type:'CodeEditorScene',narration:'Example.',estimatedDurationSec:6,payload:{code}}]});
  assert.equal(s.sections.length,1);assert.equal(s.scenes[0].payload.code,code);validateStoryboard(s);
});
test('unsupported engine and duplicate IDs fail before rendering',()=>{
  const s=new ScriptModel(fixtures[0]);s.scenes[0].payload.engine='eval';
  assert.throws(()=>validateStoryboard(s));
  const other=new ScriptModel(fixtures[0]);other.sections.push(other.sections[0]);
  assert.throws(()=>validateStoryboard(other));
});
test('demonstration state can continue across two visual cuts',()=>{
  const raw=structuredClone(fixtures[0]);
  const first=raw.sections[0].visuals[0], second=structuredClone(first);
  first.continuityId=second.continuityId='same-cache';second.id='cache-continued';
  first.beats=first.beats.slice(0,3);second.beats=second.beats.slice(3);
  first.durationFraction=second.durationFraction=0.5;
  raw.sections[0].visuals.push(second);
  const script=new ScriptModel(raw);validateStoryboard(script);
  assert.equal(script.scenes[1].beats[0].step,3);
  script.scenes[1].payload.inputs={initial:99};
  assert.throws(()=>validateStoryboard(script));
});
test('contradictory expected output and path-like section IDs are rejected',()=>{
  const s=new ScriptModel(fixtures[0]);s.scenes[0].beats[0].expectedResult={cache:'HIT'};
  assert.throws(()=>validateStoryboard(s));
  const other=new ScriptModel(fixtures[0]);other.sections[0].id='../bad';
  assert.throws(()=>validateStoryboard(other));
});
// ── Phase 1 hardening: existing transitions under custom inputs, determinism, invalid inputs, ──
// ── and split-vs-unsplit continuity consistency. No new engine semantics are introduced here — ──
// ── every expected value below is independently hand-typed, not re-read from the object under test. ──
test('cache demonstration under custom inputs matches independently computed values',()=>{
  const d=buildDemonstration('cache',{initial:99,updated:150});
  assert.equal(demonstrationState(d,2).client,'$99');
  assert.equal(demonstrationState(d,2).cache,'$99 | TTL 60s');
  assert.equal(demonstrationState(d,4).db,'$150');
  assert.equal(demonstrationState(d,4).client,'$99 | cache HIT');
  assert.equal(demonstrationState(d,6).client,'$150');
  assert.equal(demonstrationState(d,6).cache,'$150 | TTL 60s');
});
test('coercion demonstration under a custom valid quantity matches independently computed values',()=>{
  const d=buildDemonstration('coercion',{quantity:'7'});
  assert.equal(demonstrationState(d,1).result,'"71" (string)');
  assert.equal(demonstrationState(d,3).result,'8 (number)');
});
test('every engine is deterministic across repeated builds with default inputs',()=>{
  for(const engine of ENGINES) assert.deepEqual(buildDemonstration(engine),buildDemonstration(engine));
});
test('invalid coercion quantity falls back to the documented default rather than throwing',()=>{
  const d=buildDemonstration('coercion',{quantity:'abc'});
  assert.equal(demonstrationState(d,1).result,'"21" (string)');
  assert.equal(demonstrationState(d,3).result,'3 (number)');
});
test('invalid cache initial/updated values fall back to the documented defaults',()=>{
  const d=buildDemonstration('cache',{initial:'not-a-number',updated:'also-not-a-number'});
  assert.equal(demonstrationState(d,2).client,'$12');
  assert.equal(demonstrationState(d,6).client,'$15');
});
test('a split-continuity fixture reaches the same final state as an unsplit render',()=>{
  const script=new ScriptModel(splitContinuityFixture);validateStoryboard(script);
  assert.equal(script.sections[0].visuals.length,2);
  assert.equal(script.sections[0].visuals[0].continuityId,script.sections[0].visuals[1].continuityId);
  const merged=script.sections[0].visuals.reduce((acc,v)=>{
    for(const b of v.beats) Object.assign(acc,b.expectedResult || {});
    return acc;
  },{});
  assert.deepEqual(merged,demonstrationState(buildDemonstration('cache'),6));
});
// ── Phase 2: shared worked-example contract (schema v3) ─────────────────────────────────
// Helpers build a minimal valid example / v3 script so each test only varies what it checks.
function buildExample(overrides={}){
  return {
    id:'ex1',scenario:'Inverted index',assumptions:'Illustrative.',
    corpus:[{id:'D1',fields:{text:'Docker basics'}},{id:'D2',fields:{text:'Deployment guide'}},{id:'D3',fields:{text:'Docker deployment'}}],
    operations:[
      {id:'op0',label:'tokenize D1',type:'tokenize',args:{source:{kind:'corpusEntry',id:'D1'},field:'text'}},
      {id:'op1',label:'tokenize D2',type:'tokenize',args:{source:{kind:'corpusEntry',id:'D2'},field:'text'}},
      {id:'op2',label:'tokenize D3',type:'tokenize',args:{source:{kind:'corpusEntry',id:'D3'},field:'text'}},
      {id:'op3',label:'normalize D1 tokens',type:'normalize',args:{input:{kind:'operation',id:'op0'}}},
    ],
    evidence:[],inputData:{},query:{},
    ...overrides,
  };
}
function exampleVisual(overrides={}){
  return {id:'v1',type:'ConceptCardScene',durationFraction:1,payload:{bulletPoints:[{title:'a',description:'b'}]},...overrides};
}
function buildScriptV3(sections,examples=[]){
  return {schemaVersion:3,topic:'test',mode:'short',sections,examples};
}

test('two visuals reference the same example without data divergence; contiguous continuity ranges are valid',()=>{
  const raw=buildScriptV3([{id:'s1',narration:'Docker basics and deployment guide become postings, then combined.',visuals:[
    exampleVisual({id:'v1',continuityId:'seq1',durationFraction:0.5,exampleId:'ex1',operationRange:{from:0,to:1}}),
    exampleVisual({id:'v2',continuityId:'seq1',durationFraction:0.5,exampleId:'ex1',operationRange:{from:2,to:3}}),
  ]}],[buildExample()]);
  const script=new ScriptModel(raw);
  validateStoryboard(script);
  assert.equal(script.sections[0].visuals[0].exampleId,script.sections[0].visuals[1].exampleId);
  assert.equal(script.examples.length,1);
  assert.equal(script.examples[0].corpus[0].fields.text,'Docker basics');
});

test('out-of-order operationRanges within one continuity sequence are rejected',()=>{
  const raw=buildScriptV3([{id:'s1',narration:'Docker basics and deployment guide become postings.',visuals:[
    exampleVisual({id:'v1',continuityId:'seq1',durationFraction:0.5,exampleId:'ex1',operationRange:{from:2,to:3}}),
    exampleVisual({id:'v2',continuityId:'seq1',durationFraction:0.5,exampleId:'ex1',operationRange:{from:0,to:1}}),
  ]}],[buildExample()]);
  assert.throws(()=>validateStoryboard(new ScriptModel(raw)));
});

test('overlapping operationRanges within one continuity sequence are rejected',()=>{
  const raw=buildScriptV3([{id:'s1',narration:'Docker basics and deployment guide become postings.',visuals:[
    exampleVisual({id:'v1',continuityId:'seq1',durationFraction:0.5,exampleId:'ex1',operationRange:{from:0,to:2}}),
    exampleVisual({id:'v2',continuityId:'seq1',durationFraction:0.5,exampleId:'ex1',operationRange:{from:1,to:3}}),
  ]}],[buildExample()]);
  assert.throws(()=>validateStoryboard(new ScriptModel(raw)));
});

test('a standalone execute visual may independently replay an example from the start elsewhere in the script',()=>{
  const raw=buildScriptV3([
    {id:'s1',narration:'Docker basics and deployment guide become postings, then combined.',visuals:[
      exampleVisual({id:'v1',continuityId:'seq1',durationFraction:1,exampleId:'ex1',operationRange:{from:0,to:3}}),
    ]},
    {id:'s2',narration:'Docker basics tokenizes first, again, for recap.',visuals:[
      exampleVisual({id:'v2',durationFraction:1,exampleId:'ex1',operationRange:{from:0,to:1}}),
    ]},
  ],[buildExample()]);
  validateStoryboard(new ScriptModel(raw)); // no global overlap check across independent sequences
});

test('a standalone execute visual must start at 0, not resume mid-example',()=>{
  const raw=buildScriptV3([{id:'s1',narration:'AND query intersects the postings.',visuals:[
    exampleVisual({id:'v1',durationFraction:1,exampleId:'ex1',operationRange:{from:3,to:3}}),
  ]}],[buildExample()]);
  assert.throws(()=>validateStoryboard(new ScriptModel(raw)));
});

test('inspect-mode visuals may reference any in-bounds index without a prior execute',()=>{
  const raw=buildScriptV3([{id:'s1',narration:'Here is the AND query result again.',visuals:[
    exampleVisual({id:'v1',durationFraction:1,exampleId:'ex1',operationRange:{from:3,to:3},operationMode:'inspect'}),
  ]}],[buildExample()]);
  validateStoryboard(new ScriptModel(raw));
});

test('inspect mode requires a single-point range (from === to)',()=>{
  const raw=buildScriptV3([{id:'s1',narration:'A recap of the postings.',visuals:[
    exampleVisual({id:'v1',durationFraction:1,exampleId:'ex1',operationRange:{from:0,to:1},operationMode:'inspect'}),
  ]}],[buildExample()]);
  assert.throws(()=>validateStoryboard(new ScriptModel(raw)));
});

test('operationRange without exampleId is rejected',()=>{
  const raw=buildScriptV3([{id:'s1',narration:'A generic visual.',visuals:[
    exampleVisual({id:'v1',durationFraction:1,operationRange:{from:0,to:1}}),
  ]}],[]);
  assert.throws(()=>validateStoryboard(new ScriptModel(raw)));
});

test('a visual referencing an unknown example is rejected',()=>{
  const raw=buildScriptV3([{id:'s1',narration:'A generic visual.',visuals:[
    exampleVisual({id:'v1',durationFraction:1,exampleId:'missing'}),
  ]}],[]);
  assert.throws(()=>validateStoryboard(new ScriptModel(raw)));
});

test('schemaVersion below 3 with example fields is rejected; schemaVersion 3 is accepted',()=>{
  const rawV2={...buildScriptV3([{id:'s1',narration:'A generic visual.',visuals:[exampleVisual({id:'v1',durationFraction:1,exampleId:'ex1'})]}],[buildExample()]),schemaVersion:2};
  assert.throws(()=>validateStoryboard(new ScriptModel(rawV2)));
  const rawV3={...rawV2,schemaVersion:3};
  validateStoryboard(new ScriptModel(rawV3));
});

test('round-trip serialization preserves example IDs and assumptions, and forces unverified provenance',()=>{
  const raw=buildScriptV3([{id:'s1',narration:'A generic visual.',visuals:[exampleVisual({id:'v1',durationFraction:1,exampleId:'ex1'})]}],
    [buildExample({evidence:[{sourceId:'src1',claim:'x',provenance:'computed-locally',verificationStatus:'verified'}]})]);
  const script=new ScriptModel(raw);
  assert.equal(script.examples[0].evidence[0].verificationStatus,'unverified'); // forced, never trusted from input
  const script2=new ScriptModel(JSON.parse(JSON.stringify(script))); // exact shape BullMQ/manifest round-trips rely on
  assert.deepEqual(script2.examples,script.examples);
  assert.equal(script2.examples[0].id,script.examples[0].id);
  assert.equal(script2.examples[0].assumptions,script.examples[0].assumptions);
});

// ── Phase 6: knowledge registry — evidence sourceId resolution + verified-status computation ──
test('evidence referencing an unknown sourceId is rejected',()=>{
  const raw=buildScriptV3([{id:'s1',narration:'A generic visual.',visuals:[exampleVisual({id:'v1',durationFraction:1,exampleId:'ex1'})]}],
    [buildExample({evidence:[{sourceId:'not-a-real-source',claim:'x',provenance:'illustrative'}]})]);
  assert.throws(()=>validateStoryboard(new ScriptModel(raw)),/unknown source/);
});

test('evidence referencing a real registry sourceId is accepted; empty sourceId stays valid',()=>{
  const raw=buildScriptV3([{id:'s1',narration:'A generic visual.',visuals:[exampleVisual({id:'v1',durationFraction:1,exampleId:'ex1'})]}],
    [buildExample({evidence:[
      {sourceId:'elasticsearch-standard-analyzer',claim:'x',provenance:'external-fixture'},
      {sourceId:'',claim:'y',provenance:'illustrative'},
    ]})]);
  validateStoryboard(new ScriptModel(raw));
});

test('verificationStatus stays unverified for external-fixture provenance with no matching captured fixture, even when the input claims verified',()=>{
  const raw=buildScriptV3([{id:'s1',narration:'A generic visual.',visuals:[exampleVisual({id:'v1',durationFraction:1,exampleId:'ex1'})]}],
    [buildExample({evidence:[{sourceId:'elasticsearch-standard-analyzer',claim:'x',provenance:'external-fixture',verificationStatus:'verified'}]})]);
  const script=new ScriptModel(raw);
  // VERIFIED_FIXTURES is empty by design (Phase 6) — nothing can be 'verified' yet, proving
  // this is a real computation against the fixture registry, not a decorative pass-through.
  assert.equal(script.examples[0].evidence[0].verificationStatus,'unverified');
});

test('computed-locally provenance never becomes verified regardless of a passing expectedResult check',()=>{
  const raw=buildScriptV3([{id:'s1',narration:'A generic visual.',visuals:[exampleVisual({id:'v1',durationFraction:1,exampleId:'ex1'})]}],
    [buildExample({evidence:[{sourceId:'elasticsearch-standard-analyzer',claim:'x',provenance:'computed-locally'}]})]);
  const script=new ScriptModel(raw);
  assert.equal(script.examples[0].evidence[0].verificationStatus,'unverified');
});

test('an example exceeding the corpus size bound is rejected',()=>{
  const big=Array.from({length:25},(_,i)=>({id:'D'+i,fields:{}}));
  const raw=buildScriptV3([{id:'s1',narration:'A generic visual.',visuals:[exampleVisual()]}],[buildExample({corpus:big})]);
  assert.throws(()=>validateStoryboard(new ScriptModel(raw)));
});

test('a script exceeding the maximum example count is rejected',()=>{
  const many=Array.from({length:11},(_,i)=>buildExample({id:'ex'+i}));
  const raw=buildScriptV3([{id:'s1',narration:'A generic visual.',visuals:[exampleVisual()]}],many);
  assert.throws(()=>validateStoryboard(new ScriptModel(raw)));
});

test('corpus submitted as a non-array is rejected at construction, not silently normalized to empty',()=>{
  const raw=buildScriptV3([{id:'s1',narration:'A generic visual.',visuals:[exampleVisual()]}],[{...buildExample(),corpus:'not-an-array'}]);
  assert.throws(()=>new ScriptModel(raw));
});

test('unknown top-level keys on a corpus entry are dropped, not preserved as arbitrary data',()=>{
  const raw=buildScriptV3([{id:'s1',narration:'A generic visual.',visuals:[exampleVisual()]}],
    [buildExample({corpus:[{id:'D1',fields:{text:'x'},maliciousKey:'y'}]})]);
  const script=new ScriptModel(raw);
  assert.equal(script.examples[0].corpus[0].maliciousKey,undefined);
});

// ── Phase 5: motionWindow / scheduleSteps — the one shared helper EngineMechanism, ──
// ── ExampleMechanism, and render-fixture.mjs's sampler all now call, instead of three ──
// ── independent copies of the same formula. ──────────────────────────────────────────
test('motionWindow is bounded between 1 frame and 65% of fps, scaled by the gap to the next event',()=>{
  assert.equal(motionWindow(0,1,30),1); // tiny gap -> floor of 1 frame
  assert.equal(motionWindow(0,1000,30),30*0.65); // huge gap -> capped at 0.65*fps (unrounded)
  assert.equal(motionWindow(0,25,30),10); // (25-0)*0.4=10, under both bounds
});
test('scheduleSteps prefers compiled beat frames when present, and reproduces the existing proportional fallback formula when not',()=>{
  const beatSchedule=scheduleSteps([{frame:10},{frame:200}],2,300,30);
  assert.deepEqual(beatSchedule.scheduled,[10,200]);
  const proportional=scheduleSteps(null,3,300,30);
  assert.deepEqual(proportional.scheduled,Array.from({length:3},(_,i)=>Math.round(300*(i+0.6)/(3+1.4))));
});
test('scheduleSteps warns on insufficient real hold time — using the motion window, not the beat spacing guard — for both the beats-present and no-beats proportional paths',()=>{
  // Two beats crammed together: almost no time to settle before the next one fires.
  const packed=scheduleSteps([{frame:0},{frame:2}],2,300,30);
  assert.ok(packed.diagnostics.some(d=>d.code==='insufficient-result-hold' && d.step===0));
  // Comfortably spaced beats: no warning.
  const roomy=scheduleSteps([{frame:0},{frame:100}],2,300,30);
  assert.equal(roomy.diagnostics.length,0);
  // No-beats proportional path with a huge step count crammed into a short visual: also warns.
  const packedProportional=scheduleSteps(null,20,60,30);
  assert.ok(packedProportional.diagnostics.length>0);
});

test('Phase 5: compileSection records requestedFrame and adjusted separately from confidence, and confidence is never rewritten by the spacing adjustment',()=>{
  // Two beats anchored to the SAME early moment force the spacing guard to push the second
  // one forward — its confidence (match quality) must stay 'word', even though its final
  // frame differs from what the anchor actually matched.
  const section={
    actualDurationSec:10,
    subtitles:[{text:'go',start:1,end:1.2}],
    visuals:[{id:'v1',durationFraction:1,beats:[
      {narrationAnchor:'go'},
      {narrationAnchor:'go'}, // same anchor -> same requested position -> forces adjustment
    ]}],
  };
  const compiled=compileSection(section);
  const [b0,b1]=compiled.visuals[0].beats;
  assert.equal(b0.requestedFrame,b1.requestedFrame); // both requested the same spot
  assert.equal(b1.adjusted,true); // the second one was actually moved
  assert.equal(b1.confidence,'word'); // match quality is unchanged by the move — still honest
  assert.ok(compiled.diagnostics.some(d=>d.code==='beat-adjusted'));
});
test('Phase 5: compileSection flags an ambiguous narration anchor via a distinct diagnostic',()=>{
  const section={
    actualDurationSec:10,
    subtitles:[{text:'cache',start:1,end:1.2},{text:'ok',start:1.2,end:1.4},{text:'cache',start:5,end:5.2}],
    visuals:[{id:'v1',durationFraction:1,beats:[{narrationAnchor:'cache'}]}],
  };
  const compiled=compileSection(section);
  assert.ok(compiled.diagnostics.some(d=>d.code==='anchor-ambiguous'));
});
test('Phase 5: compileSection warns on insufficient result-hold time using internalStepCount for the no-beats proportional path',()=>{
  const section={
    actualDurationSec:2, // short visual, many internal steps -> packed schedule
    visuals:[{id:'v1',durationFraction:1,beats:[],internalStepCount:15}],
  };
  const compiled=compileSection(section);
  assert.ok(compiled.diagnostics.some(d=>d.code==='insufficient-result-hold' && d.visualId==='v1'));
});

test('a missing or unrecognized operation type is rejected at construction, not inferred',()=>{
  const raw=buildScriptV3([{id:'s1',narration:'A generic visual.',visuals:[exampleVisual()]}],
    [buildExample({operations:[{id:'op0',label:'no type',args:{}}]})]);
  assert.throws(()=>new ScriptModel(raw));
  const rawBadType=buildScriptV3([{id:'s1',narration:'A generic visual.',visuals:[exampleVisual()]}],
    [buildExample({operations:[{id:'op0',label:'bad type',type:'eval',args:{}}]})]);
  assert.throws(()=>new ScriptModel(rawBadType));
});

test('a correct expectedResult validates; a deliberately wrong one is rejected against real computed output',()=>{
  const corpus=[{id:'D1',fields:{text:'Docker'}}];
  const operations=[
    {id:'tok',label:'Tokenize D1',type:'tokenize',args:{source:{kind:'corpusEntry',id:'D1'},field:'text'}},
    {id:'norm',label:'Normalize',type:'normalize',args:{input:{kind:'operation',id:'tok'}},expectedResult:[{id:'D1:0',text:'docker'}]},
  ];
  const rawCorrect=buildScriptV3([{id:'s1',narration:'A generic visual.',visuals:[exampleVisual()]}],
    [buildExample({corpus,operations})]);
  validateStoryboard(new ScriptModel(rawCorrect)); // matches real computed output — accepted

  const rawWrong=buildScriptV3([{id:'s1',narration:'A generic visual.',visuals:[exampleVisual()]}],
    [buildExample({corpus,operations:[operations[0],{...operations[1],expectedResult:[{id:'D1:0',text:'WRONG'}]}]})]);
  assert.throws(()=>validateStoryboard(new ScriptModel(rawWrong))); // contradicts real computed output — rejected
});

test('Phase 4: an example-driven MechanismScene visual (no payload.engine) validates without hitting the old engine-based check',()=>{
  const raw=buildScriptV3([{id:'s1',narration:'A generic visual.',visuals:[
    {id:'v1',type:'MechanismScene',durationFraction:1,exampleId:'ex1',payload:{}}, // no payload.engine — would throw under the old unconditional check
  ]}],[buildExample()]);
  validateStoryboard(new ScriptModel(raw)); // does not throw
});

test('Phase 4: assertRenderSupport accepts a MechanismScene visual referencing an example',()=>{
  const raw=buildScriptV3([{id:'s1',narration:'A generic visual.',visuals:[
    {id:'v1',type:'MechanismScene',durationFraction:1,exampleId:'ex1',payload:{}},
  ]}],[buildExample()]);
  assertRenderSupport(new ScriptModel(raw)); // does not throw — Phase 4 supports this combination
});

// ── Phase 5: beats on example-driven visuals — optional, but "all or nothing" and ──
// ── local to the visual's own operationRange slice when provided. ────────────────
test('Phase 5: a complete, ordered set of beats — one per operation in the range — validates',()=>{
  const raw=buildScriptV3([{id:'s1',narration:'Tokenize D1 then D2.',visuals:[
    exampleVisual({id:'v1',type:'MechanismScene',durationFraction:1,exampleId:'ex1',operationRange:{from:0,to:1},
      beats:[{step:0,narrationAnchor:'Tokenize D1'},{step:1,narrationAnchor:'then D2'}]}),
  ]}],[buildExample()]);
  validateStoryboard(new ScriptModel(raw));
});
test('Phase 5: a partial beat set on an example-driven visual is rejected — all or nothing',()=>{
  const raw=buildScriptV3([{id:'s1',narration:'Tokenize D1 then D2.',visuals:[
    exampleVisual({id:'v1',type:'MechanismScene',durationFraction:1,exampleId:'ex1',operationRange:{from:0,to:1},
      beats:[{step:0,narrationAnchor:'Tokenize D1'}]}), // only 1 of 2
  ]}],[buildExample()]);
  assert.throws(()=>validateStoryboard(new ScriptModel(raw)));
});
test('Phase 5: beat.step is local to the operationRange slice — out-of-order or non-zero-based is rejected',()=>{
  const raw=buildScriptV3([{id:'s1',narration:'Tokenize D1 then D2.',visuals:[
    exampleVisual({id:'v1',type:'MechanismScene',durationFraction:1,exampleId:'ex1',operationRange:{from:0,to:1},
      beats:[{step:1,narrationAnchor:'Tokenize D1'},{step:0,narrationAnchor:'then D2'}]}), // swapped
  ]}],[buildExample()]);
  assert.throws(()=>validateStoryboard(new ScriptModel(raw)));
});
test('Phase 5: inspect-mode visuals reject beats outright — there is no schedule to anchor',()=>{
  const raw=buildScriptV3([{id:'s1',narration:'Recap.',visuals:[
    exampleVisual({id:'v1',type:'MechanismScene',durationFraction:1,exampleId:'ex1',operationRange:{from:0,to:0},operationMode:'inspect',
      beats:[{step:0,narrationAnchor:'Recap'}]}),
  ]}],[buildExample()]);
  assert.throws(()=>validateStoryboard(new ScriptModel(raw)));
});
test('Phase 5: an example-driven beat with an action other than execute is rejected',()=>{
  const raw=buildScriptV3([{id:'s1',narration:'Tokenize D1.',visuals:[
    exampleVisual({id:'v1',type:'MechanismScene',durationFraction:1,exampleId:'ex1',operationRange:{from:0,to:0},
      beats:[{step:0,narrationAnchor:'Tokenize D1',action:'reveal'}]}),
  ]}],[buildExample()]);
  assert.throws(()=>validateStoryboard(new ScriptModel(raw)));
});
test('Phase 5: beat-level expectedResult is rejected, not silently ignored — example.operations[].expectedResult is the one authoritative check',()=>{
  const raw=buildScriptV3([{id:'s1',narration:'Tokenize D1.',visuals:[
    exampleVisual({id:'v1',type:'MechanismScene',durationFraction:1,exampleId:'ex1',operationRange:{from:0,to:0},
      beats:[{step:0,narrationAnchor:'Tokenize D1',expectedResult:['docker']}]}),
  ]}],[buildExample()]);
  assert.throws(()=>validateStoryboard(new ScriptModel(raw)));
});

test('assertRenderSupport still rejects exampleId on any scene type other than MechanismScene',()=>{
  const raw=buildScriptV3([{id:'s1',narration:'A generic visual.',visuals:[exampleVisual({id:'v1',durationFraction:1,exampleId:'ex1'})]}],[buildExample()]);
  const script=new ScriptModel(raw);
  validateStoryboard(script); // storage/editing still allowed regardless of render support
  assert.throws(()=>assertRenderSupport(script));
  const withoutExample=new ScriptModel(fixtures[0]); // existing v2 fixture, no exampleId
  assertRenderSupport(withoutExample); // does not throw
});

test('prompt contains mechanisms, not fixed title/summary or word quotas',()=>{
  const prompt=buildPrompt('Redis','short',3,420);
  assert.ok(prompt.includes('one concrete scenario'));assert.ok(prompt.includes('exact phrase'));
  assert.ok(!prompt.includes('always first'));assert.ok(!prompt.includes('60–90 words'));
  for(const engine of ENGINES)assert.ok(prompt.includes(engine));
  const s=buildScriptModel(fixtures[0],'Redis','short',3);
  assert.equal(s.schemaVersion,2); // legacy v2 fixtures still construct unchanged
});

// ── Phase 7: prompt requests schemaVersion 3 and offers the worked-example mechanism ─────────
test('the prompt requests schemaVersion 3 and describes the examples[] contract',()=>{
  const prompt=buildPrompt('Elasticsearch inverted index','short',3,420);
  assert.ok(prompt.includes('schemaVersion:3'));
  assert.ok(prompt.includes('WORKED EXAMPLE MENU'));
  for(const type of OPERATION_TYPES)assert.ok(prompt.includes(type),`missing operation type: ${type}`);
  assert.ok(prompt.includes('KNOWN FACTUAL ISSUES FOR THIS TOPIC')); // Phase 6 registry, topic-matched
});

test('the DEMONSTRATION MENU and its engine assertions still hold for an engine-shaped topic, alongside the new mechanism',()=>{
  const prompt=buildPrompt('JavaScript references and pointers','short',3,420);
  for(const engine of ENGINES)assert.ok(prompt.includes(engine));
  assert.ok(prompt.includes('WORKED EXAMPLE MENU'));
  assert.ok(prompt.includes('Do not force an unrelated demonstration or search/corpus example onto a topic'));
});

test('a neutral topic gets no KNOWN FACTUAL ISSUES block, and both mechanisms are still offered under the same "do not force" instruction',()=>{
  const prompt=buildPrompt('CSS Grid layout','short',3,420);
  assert.ok(!prompt.includes('KNOWN FACTUAL ISSUES FOR THIS TOPIC'));
  assert.ok(prompt.includes('WORKED EXAMPLE MENU'));
  for(const engine of ENGINES)assert.ok(prompt.includes(engine));
  assert.ok(prompt.includes('Do not force an unrelated demonstration or search/corpus example onto a topic'));
});

test('WORKED_EXAMPLE_SKELETON — the compact structural example taught to the model — is itself a valid, executable example',()=>{
  const raw={schemaVersion:3,topic:'t',mode:'short',
    sections:[{id:'s1',narration:'A generic visual.',visuals:[
      {id:'v1',type:'MechanismScene',durationFraction:1,exampleId:'ex1',operationRange:{from:0,to:1}},
    ]}],
    examples:[WORKED_EXAMPLE_SKELETON]};
  const script=new ScriptModel(raw);
  validateStoryboard(script); // runs executeOperations() on the skeleton for real
  assertRenderSupport(script);
});

test('a hand-built schemaVersion:3 model-shaped output survives buildScriptModel end-to-end unchanged',()=>{
  const parsed={schemaVersion:3,topic:'Elasticsearch inverted index',mode:'short',targetDurationMinutes:3,
    brief:{audience:'Developers',learningOutcome:'x',scenario:'y'},
    sections:[{id:'s1',objective:'x',narration:'A generic visual.',visuals:[
      {id:'v1',type:'MechanismScene',durationFraction:1,exampleId:'ex1',operationRange:{from:0,to:1}},
    ]}],
    examples:[WORKED_EXAMPLE_SKELETON]};
  const script=buildScriptModel(parsed,'Elasticsearch inverted index','short',3);
  assert.equal(script.schemaVersion,3);
  assert.equal(script.examples.length,1);
  assert.equal(script.examples[0].operations.length,2);
});
