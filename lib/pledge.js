import { fail } from './http.js';

export const LENGTH = 7;
export const INSURANCE_PRICE = 100;
export const PLATFORMS = ['linkedin', 'instagram', 'tiktok', 'x', 'youtube', 'blog', 'newsletter', 'podcast'];
export const FEED_PLATFORMS = ['blog', 'newsletter', 'podcast'];

export const addDays = (date, n) => new Date(Date.parse(`${date}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
export const utcDate = (d = new Date()) => new Date(d).toISOString().slice(0, 10);
export const todayFor = (p) => addDays(p.startDate, p.dayOffset);
export const dayIndex = (p) => Math.min(p.dayOffset, LENGTH - 1);
export const makeDays = (startDate) =>
  Array.from({ length: LENGTH }, (_, i) => ({ date: addDays(startDate, i), status: 'pending', evidenceUrl: null, verdict: '' }));

export function publicView(p) {
  const { customerId: _c, paymentMethodId: _pm, ...rest } = p;
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

const AT = /^@[\w.]{2,30}$/;
const HANDLE = {
  linkedin: /^@?[\w.\- ]{2,60}$/, instagram: AT, tiktok: AT, x: /^@\w{1,15}$/,
  youtube: /^UC[\w-]{22}$/, blog: /^https:\/\/\S{4,300}$/, newsletter: /^https:\/\/\S{4,300}$/, podcast: /^https:\/\/\S{4,300}$/,
};
const HANDLE_HINT = {
  linkedin: 'Enter your LinkedIn name', instagram: 'Instagram handle must look like @name', tiktok: 'TikTok handle must look like @name',
  x: 'X handle must look like @name', youtube: 'YouTube channel ID must start with UC and be 24 characters',
  blog: 'Enter your blog RSS feed URL (https://...)', newsletter: 'Enter your newsletter RSS feed URL (https://...)', podcast: 'Enter your podcast RSS feed URL (https://...)',
};

export function validateInput(body = {}) {
  const name = String(body.name ?? '').trim();
  const platform = String(body.platform ?? '');
  let handle = String(body.handle ?? '').trim();
  const stake = Number(body.stake);
  if (name.length < 1 || name.length > 40) throw fail(400, 'Name must be 1 to 40 characters');
  if (!PLATFORMS.includes(platform)) throw fail(400, 'Choose a platform');
  if (['instagram', 'tiktok', 'x'].includes(platform)) handle = '@' + handle.replace(/^@/, '').toLowerCase();
  if (!HANDLE[platform].test(handle)) throw fail(400, HANDLE_HINT[platform]);
  if (!Number.isInteger(stake) || stake < 100 || stake > 5000) throw fail(400, 'Stake must be between £1 and £50');
  return { name, platform, handle, stake };
}

// The example is shared by every visitor, so anything but the untouched seed (used, settled, or from an older build) is stale.
export const demoStale = (p, now = new Date()) =>
  JSON.stringify({ ...p, witnessId: 0 }) !== JSON.stringify({ ...demoPledge(now), witnessId: 0 });

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
    id: 'demo', name: 'Demo creator', platform: 'youtube', handle: 'UC16niRr50-MSBwiO3YDb3RA', stake: 1000,
    startDate, dayOffset: 4, status: 'active', days, isDemo: true, witnessId: newWitnessId(),
    contract: 'Demo creator posts on YouTube every day for 7 days or pays £10.00. Witnesses are watching.',
    charges: [{ type: 'insurance', amount: INSURANCE_PRICE, status: 'succeeded', id: 'demo_simulated', simulated: true, date: days[2].date }],
  };
}
