import test from 'node:test';
import assert from 'node:assert/strict';
import { PACING_HINTS, computePacingHints } from '../services/pacingHints.js';

function scriptOf(visuals) {
  return { sections: [{ id: 's1', visuals }] };
}

test('an opening Title + closing Summary under the threshold gets no warning',()=>{
  const script=scriptOf([
    { id:'v1', type:'TitleScene', durationSec:10 },
    { id:'v2', type:'ConceptCardScene', durationSec:80 },
    { id:'v3', type:'SummaryScene', durationSec:10 },
  ]); // 20/100 = 20% < 30% threshold
  const diagnostics=computePacingHints(script);
  assert.ok(!diagnostics.some(d=>d.code==='high-opening-closing-ratio'));
});

test('title/summary occupying more than the threshold is flagged — mirrors job-39\'s own 30.7% finding',()=>{
  const script=scriptOf([
    { id:'v1', type:'TitleScene', durationSec:22 },
    { id:'v2', type:'ConceptCardScene', durationSec:70 },
    { id:'v3', type:'SummaryScene', durationSec:23 },
  ]); // 45/115 ≈ 39%
  const diagnostics=computePacingHints(script);
  const found=diagnostics.find(d=>d.code==='high-opening-closing-ratio');
  assert.ok(found);
  assert.ok(found.message.includes('39'));
});

test('a long, plain visual with no exampleId and no beats is flagged as long-static-visual',()=>{
  const script=scriptOf([
    { id:'v1', type:'ConceptCardScene', durationSec:PACING_HINTS.staticVisualWarnSec+5 },
  ]);
  const diagnostics=computePacingHints(script);
  const found=diagnostics.find(d=>d.code==='long-static-visual' && d.visualId==='v1');
  assert.ok(found);
});

test('a deliberate static inspection hold (exampleId set, operationMode inspect, no beats) is NOT flagged, however long it holds',()=>{
  const script=scriptOf([
    { id:'v1', type:'MechanismScene', durationSec:PACING_HINTS.staticVisualWarnSec*3,
      exampleId:'ex1', operationRange:{from:0,to:0}, operationMode:'inspect', beats:[] },
  ]);
  const diagnostics=computePacingHints(script);
  assert.ok(!diagnostics.some(d=>d.code==='long-static-visual'));
});

test('a long engine demonstration with beats is NOT flagged either — beats are dynamic content',()=>{
  const script=scriptOf([
    { id:'v1', type:'MechanismScene', durationSec:PACING_HINTS.staticVisualWarnSec*3,
      beats:[{step:0,narrationAnchor:'a',action:'execute'}] },
  ]);
  const diagnostics=computePacingHints(script);
  assert.ok(!diagnostics.some(d=>d.code==='long-static-visual'));
});

test('a visual at or under the static-hold threshold is not flagged',()=>{
  const script=scriptOf([{ id:'v1', type:'ConceptCardScene', durationSec:PACING_HINTS.staticVisualWarnSec }]);
  assert.equal(computePacingHints(script).length,0);
});

test('an empty script produces no diagnostics and does not throw',()=>{
  assert.deepEqual(computePacingHints({sections:[]}),[]);
  assert.deepEqual(computePacingHints({sections:[{id:'s1',visuals:[]}]}),[]);
});
