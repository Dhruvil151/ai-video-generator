import test from 'node:test';
import assert from 'node:assert/strict';
import {
  tokenize, normalize, groupTerms, appendPosting, lookup, intersect, union, filter, project,
  resolveRef, createContext, executeOperations, OPERATION_TYPES, OPERATION_BOUNDS,
} from '../../shared/operations.mjs';
import { invertedIndexExample, tableFilterExample, stateAfter } from './fixtures/acceptance-examples.mjs';
import { invertedIndexOperationChain, tableFilterOperationChain } from './fixtures/operation-chains.mjs';

// ── Duplicate tokens / case normalization / empty matches ──────────────────────────────
test('duplicate tokens in one document produce one posting entry, not two',()=>{
  const example={corpus:[{id:'D1',fields:{text:'Docker Docker basics'}}],operations:[],assumptions:''};
  const ctx=createContext(example);
  const tok=tokenize({source:{kind:'corpusEntry',id:'D1'},field:'text'},ctx);
  assert.deepEqual(tok.values.map(t=>t.text),['Docker','Docker','basics']); // tokenize preserves duplicates
  ctx.results.set('tok',tok);
  const norm=normalize({input:{kind:'operation',id:'tok'}},ctx);
  ctx.results.set('norm',norm);
  const terms=groupTerms({input:{kind:'operation',id:'norm'}},ctx);
  assert.deepEqual(terms.values,['basics','docker']); // deduplicated
  ctx.results.set('terms',terms);
  const posted=appendPosting({terms:{kind:'operation',id:'terms'},postingsId:'main'},ctx);
  assert.deepEqual(posted.values,['D1']);
  assert.deepEqual(ctx.postingsStores.get('main').get('docker'),['D1']); // one entry, not two
});

test('case variants of the same word normalize to the identical term and share one posting entry',()=>{
  const example={corpus:[{id:'D1',fields:{text:'DOCKER'}},{id:'D2',fields:{text:'docker'}}],operations:[],assumptions:''};
  const ctx=createContext(example);
  for(const [docId,opPrefix] of [['D1','a'],['D2','b']]){
    const tok=tokenize({source:{kind:'corpusEntry',id:docId},field:'text'},ctx);ctx.results.set(opPrefix+'tok',tok);
    const norm=normalize({input:{kind:'operation',id:opPrefix+'tok'}},ctx);
    assert.equal(norm.values[0].text,'docker'); // both DOCKER and docker normalize to the same lowercase term
    ctx.results.set(opPrefix+'norm',norm);
    const terms=groupTerms({input:{kind:'operation',id:opPrefix+'norm'}},ctx);ctx.results.set(opPrefix+'terms',terms);
    appendPosting({terms:{kind:'operation',id:opPrefix+'terms'},postingsId:'main'},ctx);
  }
  assert.deepEqual(ctx.postingsStores.get('main').get('docker'),['D1','D2']); // one shared posting entry, not two separate terms
});

test('lookup on a term that was never posted returns [] without throwing',()=>{
  const example={corpus:[{id:'D1',fields:{text:'Docker'}}],operations:[],assumptions:''};
  const ctx=createContext(example);
  const tok=tokenize({source:{kind:'corpusEntry',id:'D1'},field:'text'},ctx);ctx.results.set('tok',tok);
  const norm=normalize({input:{kind:'operation',id:'tok'}},ctx);ctx.results.set('norm',norm);
  const terms=groupTerms({input:{kind:'operation',id:'norm'}},ctx);ctx.results.set('terms',terms);
  appendPosting({terms:{kind:'operation',id:'terms'},postingsId:'main'},ctx);
  const result=lookup({postingsId:'main',term:'nonexistent'},ctx);
  assert.deepEqual(result.values,[]);
});

// Phase 1's acceptance-examples.mjs represents ID lists as literal strings like "[D1,D3]"
// (display text, not JSON) — this parses that format for a direct cross-check against the
// executor's real array output, without changing acceptance-examples.mjs itself.
function parseIdListString(s){ return s==='[]' ? [] : s.slice(1,-1).split(','); }

// ── AND/OR via a real executable chain — must match acceptance-examples.mjs exactly ────
test('the inverted-index operation chain reproduces the hand-computed reference values',()=>{
  const {finalResults}=executeOperations(invertedIndexOperationChain);
  assert.deepEqual(finalResults['lookup-docker'].values,['D1','D3']);
  assert.deepEqual(finalResults['lookup-deployment'].values,['D2','D3']);
  assert.deepEqual(finalResults['and-query'].values,['D3']);
  assert.deepEqual(finalResults['or-query'].values,['D1','D2','D3']);
  // cross-check against Phase 1's independently hand-computed values
  assert.deepEqual(finalResults['and-query'].values,parseIdListString(stateAfter(invertedIndexExample,4).result));
  assert.deepEqual(finalResults['or-query'].values,parseIdListString(stateAfter(invertedIndexExample,5).result));
});

// ── Second fixture reuses filter/union/project — no Elasticsearch-specific path ────────
test('the table-filter operation chain reproduces its hand-computed reference value using only filter/union/project',()=>{
  const {finalResults,trace}=executeOperations(tableFilterOperationChain);
  assert.deepEqual(finalResults['result'].values,['O1','O3']);
  const typesUsed=new Set(trace.map(t=>t.type));
  assert.deepEqual([...typesUsed].sort(),['filter','project','union']);
  assert.equal(stateAfter(tableFilterExample,3).result,'[O1,O3]');
});

// ── Invalid IDs ──────────────────────────────────────────────────────────────────────
test('tokenize with an unknown corpus entry ID throws',()=>{
  const ctx=createContext({corpus:[],operations:[],assumptions:''});
  assert.throws(()=>tokenize({source:{kind:'corpusEntry',id:'missing'},field:'text'},ctx));
});
test('intersect/union/project with an unresolvable operation reference throws',()=>{
  const ctx=createContext({corpus:[{id:'D1',fields:{text:'x'}}],operations:[],assumptions:''});
  assert.throws(()=>intersect({left:{kind:'operation',id:'missing'},right:{kind:'operation',id:'missing2'}},ctx));
  assert.throws(()=>union({left:{kind:'operation',id:'missing'},right:{kind:'operation',id:'missing2'}},ctx));
  assert.throws(()=>project({input:{kind:'operation',id:'missing'}},ctx));
});

// ── Wrong result kind rejected ──────────────────────────────────────────────────────
test('a tokens-kind reference passed where documentIds is expected is rejected',()=>{
  const ctx=createContext({corpus:[{id:'D1',fields:{text:'Docker'}}],operations:[],assumptions:''});
  const tok=tokenize({source:{kind:'corpusEntry',id:'D1'},field:'text'},ctx);
  ctx.results.set('tok',tok);
  assert.throws(()=>intersect({left:{kind:'operation',id:'tok'},right:{kind:'operation',id:'tok'}},ctx),/kind "tokens", expected documentIds/);
});

// ── Namespace collision cannot happen — corpus entry and operation share an ID string ──
test('a corpus entry and an operation sharing the same ID string resolve independently',()=>{
  const ctx=createContext({corpus:[{id:'X',fields:{text:'Docker'}}],operations:[],assumptions:''});
  const asOperation={kind:'documentIds',values:['X'],sourceDocId:null};
  ctx.results.set('X',asOperation);
  const entry=resolveRef({kind:'corpusEntry',id:'X'},ctx);
  const opResult=resolveRef({kind:'operation',id:'X'},ctx);
  assert.equal(entry.id,'X');assert.ok(entry.fields); // the corpus entry
  assert.equal(opResult.kind,'documentIds'); // the operation result — a different object entirely
});

// ── Missing store vs missing term — different failure modes ────────────────────────────
test('lookup on an unknown postings store throws; lookup on a known store for an absent term returns []',()=>{
  const ctx=createContext({corpus:[{id:'D1',fields:{text:'Docker'}}],operations:[],assumptions:''});
  assert.throws(()=>lookup({postingsId:'never-created',term:'docker'},ctx),/unknown postings store/);
  const tok=tokenize({source:{kind:'corpusEntry',id:'D1'},field:'text'},ctx);ctx.results.set('tok',tok);
  const norm=normalize({input:{kind:'operation',id:'tok'}},ctx);ctx.results.set('norm',norm);
  const terms=groupTerms({input:{kind:'operation',id:'norm'}},ctx);ctx.results.set('terms',terms);
  appendPosting({terms:{kind:'operation',id:'terms'},postingsId:'main'},ctx);
  assert.deepEqual(lookup({postingsId:'main',term:'nonexistent'},ctx).values,[]); // known store, absent term
});

// ── Document provenance is structural — appendPosting has no separate docId to spoof ───
test('appendPosting rejects a terms result with no single source document',()=>{
  const ctx=createContext({corpus:[{id:'D1',fields:{text:'x'}}],operations:[],assumptions:''});
  ctx.results.set('cross-doc-terms',{kind:'terms',values:['docker'],sourceDocId:null});
  assert.throws(()=>appendPosting({terms:{kind:'operation',id:'cross-doc-terms'},postingsId:'main'},ctx),/must trace back to a single source document/);
});

// ── Deterministic ordering ──────────────────────────────────────────────────────────
test('running the same operation chain twice produces byte-identical traces',()=>{
  assert.deepEqual(executeOperations(invertedIndexOperationChain),executeOperations(invertedIndexOperationChain));
  assert.deepEqual(executeOperations(tableFilterOperationChain),executeOperations(tableFilterOperationChain));
});

// ── Snapshot immutability ───────────────────────────────────────────────────────────
test('an early trace entry postings snapshot is not retroactively mutated by later operations',()=>{
  const {trace}=executeOperations(invertedIndexOperationChain);
  const d1Post=trace.find(t=>t.operationId==='d1-post');
  const afterD1Snapshot=JSON.stringify(d1Post.after.postings);
  const finalPost=trace.find(t=>t.operationId==='d3-post');
  assert.notEqual(JSON.stringify(finalPost.after.postings),afterD1Snapshot); // store did grow…
  assert.equal(JSON.stringify(d1Post.after.postings),afterD1Snapshot); // …but the earlier snapshot is untouched
});

// ── Serialization round-trip — no live Map ever leaks into trace/finalResults ──────────
test('the full execution result survives a JSON round-trip unchanged',()=>{
  const result=executeOperations(invertedIndexOperationChain);
  const roundTripped=JSON.parse(JSON.stringify(result));
  assert.deepEqual(roundTripped,result);
});

// ── Resource-limit failures — enforced by the executor itself, not only by validation ──
test('a corpus exceeding the executor bound is rejected even when calling executeOperations directly',()=>{
  const bigCorpus=Array.from({length:OPERATION_BOUNDS.maxCorpusSize+1},(_,i)=>({id:'D'+i,fields:{text:'x'}}));
  assert.throws(()=>executeOperations({corpus:bigCorpus,operations:[],assumptions:''}));
});
test('a tokenize field producing too many tokens is rejected',()=>{
  const longText=Array.from({length:OPERATION_BOUNDS.maxTokensPerOperation+1},()=>'word').join(' ');
  const ctx=createContext({corpus:[{id:'D1',fields:{text:longText}}],operations:[],assumptions:''});
  assert.throws(()=>tokenize({source:{kind:'corpusEntry',id:'D1'},field:'text'},ctx));
});

// ── Missing/invalid operation type — rejected by the executor too (defense in depth) ───
test('executeOperations rejects an unsupported operation type',()=>{
  const example={corpus:[{id:'D1',fields:{text:'x'}}],operations:[{id:'op0',label:'bad',type:'eval',args:{}}],assumptions:''};
  assert.throws(()=>executeOperations(example),/Unsupported operation type/);
});

test('OPERATION_TYPES lists exactly the 9 catalog operations',()=>{
  assert.deepEqual([...OPERATION_TYPES].sort(),['appendPosting','filter','groupTerms','intersect','lookup','normalize','project','tokenize','union']);
});
