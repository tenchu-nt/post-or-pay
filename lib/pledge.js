import { fail } from './http.js';

export const LENGTH = 7;
export const INSURANCE_PRICE = 100;
export const PLATFORMS = ['bluesky', 'youtube', 'tiktok'];

export const addDays = (date, n) => new Date(Date.parse(`${date}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
export const utcDate = (d = new Date()) => new Date(d).toISOString().slice(0, 10);
export const todayFor = (p) => addDays(p.startDate, p.dayOffset);
export const dayIndex = (p) => Math.min(p.dayOffset, LENGTH - 1);
export const makeDays = (startDate) =>
  Array.from({ length: LENGTH }, (_, i) => ({ date: addDays(startDate, i), status: 'pending', evidenceUrl: null, verdict: '' }));

export function publicView(p) {
  const { customerId, paymentMethodId, ...rest } = p;
  return { ...rest, length: LENGTH, insurancePrice: INSURANCE_PRICE, today: todayFor(p), dayIndex: dayIndex(p), finished: p.dayOffset >= LENGTH };
}

export function assertActive(p) {
  if (p.status !== 'active') throw fail(409, `Pledge is ${p.status}, not active`);
}

// Demo clock: close out the current day, then move to the next one.
export function applyAdvance(p, missVerdict = '') {
  assertActive(p);
  if (p.dayOffset >= LENGTH) throw fail(409, 'Day 7 has passed, settle the pledge');
  const day = p.days[p.dayOffset];
  if (day.status === 'pending') Object.assign(day, { status: 'missed', verdict: missVerdict || day.verdict });
  p.dayOffset += 1;
  return p;
}

export const canInsure = (p, date) => p.status === 'active' && p.days.some((d) => d.date === date && d.status === 'missed');

export function applyInsure(p, date, charge) {
  if (!canInsure(p, date)) throw fail(409, 'Only a missed day can be insured, once');
  p.days.find((d) => d.date === date).status = 'insured';
  p.charges.push(charge);
  return p;
}

export const settleOutcome = (p) => (p.days.every((d) => d.status === 'posted' || d.status === 'insured') ? 'won' : 'lost');

const HANDLE = {
  bluesky: /^(?=.{3,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,62}$/i,
  youtube: /^UC[\w-]{22}$/,
  tiktok: /^@[\w.]{2,24}$/,
};

export function validateInput(body = {}) {
  const name = String(body.name ?? '').trim();
  const platform = String(body.platform ?? '');
  let handle = String(body.handle ?? '').trim();
  const stake = Number(body.stake);
  if (name.length < 1 || name.length > 40) throw fail(400, 'Name must be 1 to 40 characters');
  if (!PLATFORMS.includes(platform)) throw fail(400, 'Platform must be bluesky, youtube or tiktok');
  if (platform === 'bluesky') handle = handle.replace(/^@/, '').toLowerCase();
  if (platform === 'tiktok') handle = '@' + handle.replace(/^@/, '').toLowerCase();
  if (!HANDLE[platform].test(handle)) {
    throw fail(400, { bluesky: 'Bluesky handle must look like name.bsky.social', youtube: 'YouTube channel ID must start with UC and be 24 characters', tiktok: 'TikTok handle must look like @name' }[platform]);
  }
  if (!Number.isInteger(stake) || stake < 100 || stake > 5000) throw fail(400, 'Stake must be between £1 and £50');
  return { name, platform, handle, stake };
}

export const newId = () => crypto.randomUUID().slice(0, 8);
export const newWitnessId = () => 'w_' + crypto.randomUUID().replace(/-/g, '').slice(0, 8);

export function demoPledge(now = new Date()) {
  const startDate = addDays(utcDate(now), -4);
  const days = makeDays(startDate);
  const past = [
    ['posted', 'Day one, done. The streak has begun.'],
    ['posted', 'Two for two. Consistency looks good on you.'],
    ['insured', 'Missed it, paid the £1 insurance. Streak saved.'],
    ['posted', 'Back on track. The stake stays home.'],
  ];
  past.forEach(([status, verdict], i) => Object.assign(days[i], { status, verdict }));
  return {
    id: 'demo', name: 'Demo creator', platform: 'bluesky', handle: 'bsky.app', stake: 1000,
    startDate, dayOffset: 4, status: 'active', days, isDemo: true, witnessId: newWitnessId(),
    contract: 'Demo creator posts on Bluesky every day for 7 days or pays £10.00. Witnesses are watching.',
    charges: [{ type: 'insurance', amount: INSURANCE_PRICE, status: 'succeeded', id: 'demo_simulated', simulated: true, date: days[2].date }],
  };
}
