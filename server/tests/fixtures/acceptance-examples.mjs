// Test-only reference specifications. Entirely self-contained — no import from
// shared/demonstrations.mjs, no edit to ENGINES/SCENE_TYPES/buildDemonstration.
// These are hand-computed target values for a future bounded operations engine
// (Phase 3) to execute against, not a working tokenizer or filter implementation.
// Not routed through validateStoryboard/MechanismScene/render-fixture.mjs — visual
// rendering of these examples is deferred to Phase 4.

const entity=(id,label,value)=>({id,label,value:String(value)});
const step=(label,changes,from,to)=>({label,changes,from,to});

// First Acceptance Story: a bounded illustrative corpus.
// D1 "Docker basics" -> tokens [docker, basics]
// D2 "Deployment guide" -> tokens [deployment, guide]
// D3 "Docker deployment" -> tokens [docker, deployment]
export const invertedIndexExample={
  id:'inverted-index-docker-deployment',
  corpus:[
    {id:'D1',title:'Docker basics',text:'Docker basics'},
    {id:'D2',title:'Deployment guide',text:'Deployment guide'},
    {id:'D3',title:'Docker deployment',text:'Docker deployment'},
  ],
  assumption:'Illustrative bounded model of tokenizing + posting lists + set intersection/union — not a claim to reproduce Elasticsearch analyzer or scoring behavior.',
  entities:[
    entity('D1','Document D1','Docker basics'),
    entity('D2','Document D2','Deployment guide'),
    entity('D3','Document D3','Docker deployment'),
    entity('docker','Postings: docker','[]'),
    entity('deployment','Postings: deployment','[]'),
    entity('result','Query result','—'),
  ],
  steps:[
    step('Tokenize D1: "Docker basics" -> [docker, basics]',{docker:'[D1]'},'D1','docker'),
    step('Tokenize D2: "Deployment guide" -> [deployment, guide]',{deployment:'[D2]'},'D2','deployment'),
    step('Tokenize D3: "Docker deployment" -> [docker, deployment]',{docker:'[D1,D3]',deployment:'[D2,D3]'},'D3','docker'),
    step('AND query "docker deployment": intersect [D1,D3] and [D2,D3]',{result:'[D3]'},'docker','result'),
    step('OR query "docker deployment": union [D1,D3] and [D2,D3]',{result:'[D1,D2,D3]'},'deployment','result'),
  ],
};

// A second, non-search domain reusing the same entity/step shape — filtering a small
// order list by status — so a future operations engine has two independent domains
// to prove reuse against, not an Elasticsearch-specific code path.
export const tableFilterExample={
  id:'table-filter-orders-by-status',
  corpus:[
    {id:'O1',customer:'Alice',status:'shipped'},
    {id:'O2',customer:'Bob',status:'pending'},
    {id:'O3',customer:'Cara',status:'shipped'},
  ],
  assumption:'Illustrative bounded filter model of scanning rows against one equality condition — not a query planner or general expression evaluator.',
  entities:[
    entity('O1','Order O1','status: shipped'),
    entity('O2','Order O2','status: pending'),
    entity('O3','Order O3','status: shipped'),
    entity('result','Filtered result (status = shipped)','[]'),
  ],
  steps:[
    step('Check O1: status = shipped -> matches',{result:'[O1]'},'O1','result'),
    step('Check O2: status = pending -> does not match',{},'O2',null),
    step('Check O3: status = shipped -> matches',{result:'[O1,O3]'},'O3','result'),
  ],
};

/** Reduce a specification's entities+steps to state after N completed steps. Local, not imported — keeps this file self-contained. */
export function stateAfter(spec,completedSteps){
  const values=Object.fromEntries(spec.entities.map(e=>[e.id,e.value]));
  for(const s of spec.steps.slice(0,Math.max(0,completedSteps))) Object.assign(values,s.changes);
  return values;
}
