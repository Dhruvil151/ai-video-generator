import test from 'node:test';
import assert from 'node:assert/strict';
import { invertedIndexExample, tableFilterExample, stateAfter } from './fixtures/acceptance-examples.mjs';

// These assert the reference specification's own internal correctness against literal,
// independently hand-typed expected values — never by re-reading steps[].changes on the
// object under test. They do not exercise any tokenizer/filter implementation; none exists yet.

test('inverted-index example: postings build correctly per tokenized document',()=>{
  assert.equal(stateAfter(invertedIndexExample,1).docker,'[D1]');
  assert.equal(stateAfter(invertedIndexExample,2).deployment,'[D2]');
  const afterD3=stateAfter(invertedIndexExample,3);
  assert.equal(afterD3.docker,'[D1,D3]');
  assert.equal(afterD3.deployment,'[D2,D3]');
});

test('inverted-index example: AND query intersects, OR query unions the same postings',()=>{
  assert.equal(stateAfter(invertedIndexExample,4).result,'[D3]');
  assert.equal(stateAfter(invertedIndexExample,5).result,'[D1,D2,D3]');
});

test('inverted-index example is deterministic on replay',()=>{
  assert.deepEqual(stateAfter(invertedIndexExample,5),stateAfter(invertedIndexExample,5));
});

test('table-filter example: only shipped orders remain in the result',()=>{
  assert.equal(stateAfter(tableFilterExample,tableFilterExample.steps.length).result,'[O1,O3]');
});

test('table-filter example does not add a non-matching order to the result',()=>{
  // through "Check O2: status = pending -> does not match" — O1 present, O2 correctly absent
  assert.equal(stateAfter(tableFilterExample,2).result,'[O1]');
});
