// Test-only fixture: one existing, already-production engine (cache) split across two
// MechanismScene visuals sharing a continuityId. No new engine, no production file touched.
// Exists so render-fixture.mjs's boundary-sampling logic has a real two-visual cut to sample —
// every auto-generated fixture in demonstrations.mjs otherwise has exactly one visual per section.
import { buildDemonstration } from '../../../shared/demonstrations.mjs';

export function buildSplitContinuityFixture(engine='cache',splitAt=3,duration=18){
  const demo=buildDemonstration(engine);
  const narration=demo.steps.map(s=>s.label+'.').join(' ');
  const continuityId=engine+'-split';
  const section={id:'split-'+engine,objective:demo.context,narration,actualDurationSec:duration,
    subtitles:demo.steps.map((s,i)=>({type:'sentence',text:s.label+'.',start:duration*(i+0.5)/(demo.steps.length+1),end:duration*(i+1.3)/(demo.steps.length+1)})),
    visuals:[
      {id:engine+'-split-a',type:'MechanismScene',title:demo.context,subtitle:'Part one',purpose:demo.assumption,durationFraction:0.5,continuityId,
        payload:{engine,inputs:{}},beats:demo.steps.slice(0,splitAt).map((s,i)=>({step:i,action:'execute',narrationAnchor:s.label,expectedResult:s.changes}))},
      {id:engine+'-split-b',type:'MechanismScene',title:demo.context,subtitle:'Part two',purpose:demo.assumption,durationFraction:0.5,continuityId,
        payload:{engine,inputs:{}},beats:demo.steps.slice(splitAt).map((s,i)=>({step:splitAt+i,action:'execute',narrationAnchor:s.label,expectedResult:s.changes}))},
    ]};
  return {schemaVersion:2,topic:engine+'-split-continuity',mode:'short',brief:{audience:'Developers',learningOutcome:demo.context,scenario:demo.context},sections:[section]};
}

export const splitContinuityFixture=buildSplitContinuityFixture();
