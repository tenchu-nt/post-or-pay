// Storage on Stripe Customer metadata: free, no extra provider. Upstash/Turso need a card on file.
// shortcut: 20 x 500-char metadata chunks (~10 KB per pledge), fine for a 7-day pledge; move to a real DB before launch.
import { fail } from './http.js';
import { stripe } from './stripe.js';
import { demoPledge, demoStale } from './pledge.js';

const mem = new Map();
const useMemory = () => process.env.LOCAL_MEMORY_STORE === '1';
const CHUNK = 500, MAX_CHUNKS = 20;
const demoCustomer = () => process.env.DEMO_CUSTOMER_ID;

const customerFor = (id) => (id === 'demo' ? demoCustomer() : id);

async function readCustomer(cid) {
  if (!cid || !/^cus_[A-Za-z0-9]+$/.test(cid)) return null;
  try {
    const c = await stripe().customers.retrieve(cid);
    return c.deleted ? null : c;
  } catch (e) {
    if (e?.statusCode === 404 || e?.code === 'resource_missing') return null;
    throw e;
  }
}

export async function getPledge(id) {
  if (useMemory()) return structuredClone(mem.get(`pledge:${id}`) ?? null);
  const c = await readCustomer(customerFor(id));
  if (!c?.metadata?.d0) return null;
  let json = '';
  for (let i = 0; i < MAX_CHUNKS && c.metadata[`d${i}`]; i++) json += c.metadata[`d${i}`];
  return JSON.parse(json);
}

export async function savePledge(p) {
  if (useMemory()) {
    mem.set(`pledge:${p.id}`, structuredClone(p));
    mem.set(`witness:${p.witnessId}`, p.id);
    return p;
  }
  const cid = customerFor(p.id);
  if (!cid) throw fail(500, 'Storage not configured: DEMO_CUSTOMER_ID is missing');
  const json = JSON.stringify(p);
  if (json.length > CHUNK * MAX_CHUNKS) throw fail(500, 'Pledge too large to store');
  const metadata = {};
  for (let i = 0; i < MAX_CHUNKS; i++) metadata[`d${i}`] = json.slice(i * CHUNK, (i + 1) * CHUNK); // '' clears unused keys
  await stripe().customers.update(cid, { metadata });
  return p;
}

// Witness ids are separate Customers pointing at the pledge, so a witness link never exposes the pledge id.
export async function createWitness(pledgeId) {
  if (useMemory()) return 'w_' + crypto.randomUUID().replace(/-/g, '').slice(0, 8);
  const w = await stripe().customers.create({ name: 'Post or Pay witness link', metadata: { pledge: pledgeId } });
  return w.id;
}

export async function getByWitness(w) {
  if (w === 'w_demo') return loadPledge('demo');
  if (useMemory()) { const id = mem.get(`witness:${w}`); return id ? getPledge(id) : null; }
  const c = await readCustomer(w);
  return c?.metadata?.pledge ? getPledge(c.metadata.pledge) : null;
}

// Loads a pledge or throws 404. The demo pledge is seeded on first read (or on reset).
export async function loadPledge(id, { reset = false, refreshDemo = false } = {}) {
  if (!id || typeof id !== 'string') throw fail(400, 'Missing id');
  let p = reset ? null : await getPledge(id);
  if (p && id === 'demo' && refreshDemo && demoStale(p)) p = null; // page load: every visitor starts from the untouched example
  if (!p && id === 'demo') p = await savePledge({ ...demoPledge(), witnessId: 'w_demo' });
  if (!p) throw fail(404, 'Pledge not found');
  return p;
}
