export const ENGINES = ['cache', 'references', 'coercion', 'react-state', 'docker-layers', 'event-loop'];
export const ACTIONS = ['reveal', 'move', 'update', 'connect', 'highlight', 'execute', 'invalidate', 'compare'];
const entity = (id, label, value, x, y) => ({ id, label, value: String(value), x, y });
const step = (label, changes, from, to) => ({ label, changes, from, to });

// These are bounded, illustrative models, not claims to emulate the full runtime.
export function buildDemonstration(engine, input = {}) {
  const product = String(input.product || 'Coffee').slice(0, 32);
  const initial = Number.isFinite(input.initial) ? input.initial : 12;
  const updated = Number.isFinite(input.updated) ? input.updated : initial + 3;
  const quantity = /^\d{1,5}$/.test(String(input.quantity)) ? String(input.quantity) : '2';
  switch (engine) {
    case 'cache': return {
      context: `Product detail API: ${product}`, assumption: 'Illustrative cache-aside flow; expiry is explicit, not a performance benchmark.',
      entities: [entity('client', 'Product page', 'GET /products/coffee', 0, 0), entity('cache', 'Redis cache', 'empty', 1, 0), entity('db', 'Product database', `$${initial}`, 2, 0)],
      steps: [step('Cache miss: fetch the product from the database', {cache:'MISS'}, 'client','cache'), step('Store the returned price with an expiry', {cache:`$${initial} | TTL 60s`,client:`$${initial}`},'db','cache'), step('The next request is a cache hit', {client:`$${initial} | cache HIT`},'cache','client'), step('The database price changes; the cached value is stale', {db:`$${updated}`},'db','db'), step('Expiry removes the stale entry', {cache:'expired'},'cache','cache'), step('A fresh lookup returns the new price', {cache:`$${updated} | TTL 60s`,client:`$${updated}`},'db','client')],
    };
    case 'references': return {
      context:'Two shopping-cart variables, one object', assumption:'Object assignment copies a reference; mutation affects the shared object.',
      entities:[entity('a','cart','object #1',0,0),entity('heap','object #1','quantity: 1',1,0),entity('b','otherCart','unassigned',2,0)],
      steps:[step('Assign otherCart = cart', {b:'object #1'},'a','b'),step('Mutate otherCart.quantity = 2', {heap:'quantity: 2'},'b','heap'),step('Reading cart.quantity also returns 2', {a:'object #1 | quantity: 2'},'heap','a'),step('A separate object can change independently', {b:'object #2 | quantity: 3'},'b','b')],
    };
    case 'coercion': return {
      context:'A quantity arrives from a form as text', assumption:'This example contrasts string concatenation with explicit numeric conversion.',
      entities:[entity('input','Form value',`"${quantity}" (string)`,0,0),entity('op','Operation','quantity + 1',1,0),entity('result','Result','?',2,0)],
      steps:[step('Adding a number to this string concatenates', {result:`"${quantity}1" (string)`},'input','result'),step('Convert the form value to a number first', {op:'Number(quantity) + 1'},'input','op'),step('Numeric addition gives the intended quantity', {result:`${Number(quantity)+1} (number)`},'op','result')],
    };
    case 'react-state': return {
      context:'An interval callback captures a render snapshot', assumption:'The illustration isolates a stale closure; it is not a complete React Fiber model.',
      entities:[entity('state','Current state','0',0,0),entity('closure','Captured count','0',1,0),entity('queue','Update','setCount(count + 1)',2,0)],
      steps:[step('The first callback requests 0 + 1', {state:'1'},'closure','state'),step('The next callback still captures zero', {state:'1',closure:'0 (unchanged)'},'closure','state'),step('Switch to a functional updater', {queue:'setCount(prev => prev + 1)'},'queue','queue'),step('The updater receives current state: 1 becomes 2', {state:'2'},'queue','state'),step('The next update receives 2 and returns 3', {state:'3'},'queue','state')],
    };
    case 'docker-layers': return {
      context:'Rebuilding after an application-source edit', assumption:'Illustrative dependency-cache model; assumes unchanged base, lockfile and install inputs.',
      entities:[entity('base','Base image','unchanged',0,0),entity('deps','Dependency install','cached',1,0),entity('source','Application source','cached',2,0),entity('write','Container writable layer','empty',1,1)],
      steps:[step('Copy package manifests before application source', {deps:'package + lockfile | cached'},'base','deps'),step('A source edit invalidates the source step', {source:'changed | rebuild'},'source','source'),step('Unchanged dependencies reuse the cache', {deps:'cache HIT',source:'rebuilt'},'deps','source'),step('A runtime file write goes into the container layer', {write:'new file',base:'unchanged',source:'image unchanged'},'source','write')],
    };
    case 'event-loop': return {
      context:'console.log, a Promise callback, and a timer', assumption:'Simplified browser task/microtask example; timers become eligible, not precisely scheduled.',
      entities:[entity('stack','Call stack','script()',0,0),entity('micro','Microtask queue','empty',1,0),entity('task','Task queue','empty',2,0),entity('out','Console output','',1,1)],
      steps:[step('Synchronous code logs A', {out:'A'},'stack','out'),step('Queue a Promise callback and a timer callback', {micro:'log B',task:'log C (eligible)'},'stack','micro'),step('Synchronous code logs D and the stack clears', {out:'A D',stack:'empty'},'stack','out'),step('Drain the microtask before the next task', {out:'A D B',micro:'empty'},'micro','out'),step('The timer task runs afterward', {out:'A D B C',task:'empty'},'task','out')],
    };
    default: throw new Error(`Unsupported demonstration engine: ${engine}`);
  }
}

export function demonstrationState(demo, completedSteps) {
  const values = Object.fromEntries(demo.entities.map(e => [e.id, e.value]));
  for (const event of demo.steps.slice(0, Math.max(0, completedSteps))) Object.assign(values, event.changes);
  return values;
}

export function validateDemonstration(payload) {
  if (payload.inputs && (typeof payload.inputs !== 'object' || Array.isArray(payload.inputs))) throw new Error('Demonstration inputs must be an object');
  for (const key of ['initial','updated']) {
    if (payload.inputs?.[key] !== undefined && (!Number.isFinite(payload.inputs[key]) || Math.abs(payload.inputs[key]) > 1000000)) throw new Error(`Invalid ${key} value`);
  }
  const demo = buildDemonstration(payload.engine, payload.inputs);
  const ids = new Set(demo.entities.map(e => e.id));
  for (const event of demo.steps) {
    for (const id of [...Object.keys(event.changes), event.from, event.to].filter(Boolean)) {
      if (!ids.has(id)) throw new Error(`Unknown demonstration entity: ${id}`);
    }
  }
  return demo;
}
