import { Redis } from '@upstash/redis';
import { fail } from './http.js';

let redis;
const mem = new Map();
const useMemory = () => process.env.LOCAL_MEMORY_STORE === '1';

function client() {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw fail(500, 'Storage not configured: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are missing');
  return (redis = new Redis({ url, token }));
}

const get = async (k) => (useMemory() ? structuredClone(mem.get(k) ?? null) : client().get(k));
const set = async (k, v) => (useMemory() ? void mem.set(k, structuredClone(v)) : client().set(k, v));

export const getPledge = (id) => get(`pledge:${id}`);
export async function savePledge(p) {
  await set(`pledge:${p.id}`, p);
  await set(`witness:${p.witnessId}`, p.id);
  return p;
}
export async function getByWitness(w) {
  const id = await get(`witness:${w}`);
  return id ? getPledge(id) : null;
}

import { demoPledge } from './pledge.js';

// Loads a pledge or throws 404. The demo pledge is seeded on first read (or on reset).
export async function loadPledge(id, { reset = false } = {}) {
  if (!id || typeof id !== 'string') throw fail(400, 'Missing id');
  let p = reset ? null : await getPledge(id);
  if (!p && id === 'demo') p = await savePledge(demoPledge());
  if (!p) throw fail(404, 'Pledge not found');
  return p;
}
