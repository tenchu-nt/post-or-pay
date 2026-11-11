// Pure-logic self-test: no network, no Stripe. Run: node lib/selftest.mjs
import assert from 'node:assert/strict';
process.env.LOCAL_MEMORY_STORE = '1';
const P = await import('./pledge.js');
const { matchFeed, matchYouTube, tiktokDate, xDate, linkedinDate, checkLinkedIn } = await import('./platforms.js');
const { savePledge, getByWitness, loadPledge } = await import('./store.js');

const status = (fn) => { try { fn(); } catch (e) { return e.status; } return 200; };
const fresh = () => ({ id: 't1', name: 'T', platform: 'youtube', handle: 'UC' + 'a'.repeat(22), stake: 500, startDate: '2026-11-01', dayOffset: 0, status: 'active', days: P.makeDays('2026-11-01'), charges: [], witnessId: 'w_test0001' });
let n = 0; const ok = (name) => console.log(`ok ${++n} ${name}`);

{ const p = fresh(); assert.equal(P.todayFor(p), '2026-11-01'); p.dayOffset = 3; assert.equal(P.todayFor(p), '2026-11-04'); assert.equal(P.dayIndex(p), 3); ok('todayFor and dayIndex'); }

{ const p = fresh(); P.applyAdvance(p); assert.equal(p.days[0].status, 'missed'); assert.equal(p.dayOffset, 1); ok('advance marks a pending day missed'); }

{ const p = fresh(); p.days[0].status = 'posted'; P.applyAdvance(p); assert.equal(p.days[0].status, 'posted'); ok('advance keeps a posted day'); }

{ const p = fresh(); for (let i = 0; i < 7; i++) P.applyAdvance(p); assert.equal(P.publicView(p).finished, true); assert.equal(status(() => P.applyAdvance(p)), 409); ok('advance past day 7 is 409'); }

{ const p = fresh(); assert.equal(P.canInsure(p, '2026-11-01'), false); P.applyAdvance(p); assert.equal(P.canInsure(p, '2026-11-01'), true); assert.equal(P.canInsure(p, '2026-11-02'), false); ok('insure only on a missed day'); }

{ const p = fresh(); P.applyAdvance(p); P.applyInsure(p, '2026-11-01', { type: 'insurance', amount: 100 }); assert.equal(p.days[0].status, 'insured'); assert.equal(status(() => P.applyInsure(p, '2026-11-01', {})), 409); assert.equal(p.charges.length, 1); ok('insure twice blocked'); }

{ const p = fresh(); p.days.forEach((d, i) => (d.status = i === 2 ? 'insured' : 'posted')); assert.equal(P.settleOutcome(p), 'won'); p.days[6].status = 'missed'; assert.equal(P.settleOutcome(p), 'lost'); ok('settleOutcome won/lost'); }

{ const p = fresh(); assert.equal(status(() => P.assertActive(p)), 200); p.status = 'won'; assert.equal(status(() => P.assertActive(p)), 409); ok('double settle refused by status check'); }

{ const d = tiktokDate('7300000000000000000'); assert.ok(d.getUTCFullYear() >= 2023 && d.getUTCFullYear() <= 2024, d.toISOString()); ok(`tiktok id to date (${d.toISOString().slice(0, 10)})`); }

{
  const rss = '<rss><channel><item><title>a</title><link>https://b.com/1</link><pubDate>Thu, 05 Nov 2026 09:00:00 GMT</pubDate></item><item><link>https://b.com/0</link><pubDate>Wed, 04 Nov 2026 23:59:00 GMT</pubDate></item></channel></rss>';
  assert.deepEqual(matchFeed(rss, '2026-11-05'), { posted: true, evidenceUrl: 'https://b.com/1' });
  assert.equal(matchFeed(rss, '2026-11-06').posted, false);
  const atom = '<feed><entry><link href="https://g.com/p"/><published>2026-11-05T08:00:00Z</published></entry></feed>';
  assert.equal(matchFeed(atom, '2026-11-05').evidenceUrl, 'https://g.com/p');
  ok('rss/atom feed matcher for blog, newsletter, podcast');
}

{ const d = xDate('1850000000000000000'); assert.ok(d.getUTCFullYear() >= 2024 && d.getUTCFullYear() <= 2025, d.toISOString()); const l = linkedinDate('7200000000000000000'); assert.ok(l.getUTCFullYear() === 2024, l.toISOString()); { const link = 'https://www.linkedin.com/posts/natantrolka_hello-activity-7200000000000000000-ab'; const d = '2024-05-25'; assert.equal(checkLinkedIn('natantrolka', link, d).source, 'link'); assert.equal(status(() => checkLinkedIn('someoneelse', link, d)), 400); }
  ok(`x and linkedin id to date (${d.toISOString().slice(0,10)}, ${l.toISOString().slice(0,10)})`); }

{ const xml = '<feed><entry><link rel="alternate" href="https://www.youtube.com/watch?v=abc"/><published>2026-11-05T12:00:00+00:00</published></entry></feed>'; assert.equal(matchYouTube(xml, '2026-11-05').evidenceUrl, 'https://www.youtube.com/watch?v=abc'); assert.equal(matchYouTube(xml, '2026-11-06').posted, false); ok('youtube rss matcher'); }

{
  const good = { name: 'Maya', platform: 'x', handle: 'Maya_P', stake: 1000 };
  assert.equal(P.validateInput(good).handle, '@maya_p');
  assert.equal(status(() => P.validateInput({ ...good, platform: 'bluesky' })), 400);
  assert.equal(P.validateInput({ ...good, platform: 'newsletter', handle: 'https://maya.substack.com/feed' }).platform, 'newsletter');
  for (const stake of [99, 5001, 10.5, '10', null]) assert.equal(status(() => P.validateInput({ ...good, stake })), 400, `stake ${stake}`);
  assert.equal(status(() => P.validateInput({ ...good, name: '' })), 400);
  assert.equal(status(() => P.validateInput({ ...good, platform: 'youtube', handle: 'UCnope' })), 400);
  assert.equal(P.validateInput({ ...good, platform: 'youtube', handle: 'UC' + 'a'.repeat(22) }).platform, 'youtube');
  assert.equal(P.validateInput({ ...good, platform: 'tiktok', handle: 'maya' }).handle, '@maya');
  ok('validateInput rejects bad stakes, names and handles');
}

{ const v = P.publicView({ ...fresh(), customerId: 'cus_x', paymentMethodId: 'pm_x' }); assert.ok(!('customerId' in v) && !('paymentMethodId' in v)); ok('publicView hides Stripe ids'); }

{ await savePledge(fresh()); assert.equal((await getByWitness('w_test0001')).id, 't1'); const d = await loadPledge('demo'); assert.deepEqual(d.days.slice(0, 4).map((x) => x.status), ['posted', 'posted', 'insured', 'posted']); assert.equal(P.dayIndex(d), 4); ok('memory store, witness lookup, demo seed'); }

{
  const d = await loadPledge('demo'); assert.equal(P.demoStale(d), false);
  d.dayOffset = 7; d.status = 'lost'; await savePledge(d);
  assert.equal((await loadPledge('demo')).status, 'lost'); // actions keep working on the used example
  const r = await loadPledge('demo', { refreshDemo: true }); assert.equal(r.status, 'active'); assert.equal(r.dayOffset, 4); assert.equal(r.witnessId, 'w_demo');
  assert.equal(P.demoStale({ ...r, platform: 'bluesky' }), true);
  ok('used or outdated demo reseeds on page load');
}

console.log(`all ${n} passed`);
