import { route, readBody, fail } from '../lib/http.js';
import { assertActive, todayFor, LENGTH, publicView } from '../lib/pledge.js';
import { loadPledge, savePledge } from '../lib/store.js';
import { checkPlatform } from '../lib/platforms.js';
import { writeVerdict } from '../lib/coach.js';

export default route(['POST'], async (req, res) => {
  const { id, link } = await readBody(req);
  const p = await loadPledge(id);
  assertActive(p);
  if (p.dayOffset >= LENGTH) throw fail(409, 'Day 7 has passed, settle the pledge');
  const day = p.days[p.dayOffset];
  const source = p.platform === 'tiktok' ? 'link' : 'live';
  if (day.status === 'posted') {
    return res.status(200).json({ pledge: publicView(p), result: { posted: true, evidenceUrl: day.evidenceUrl, verdict: day.verdict, source } });
  }
  if (day.status !== 'pending') throw fail(409, `Today is already ${day.status}`);
  const found = await checkPlatform(p, todayFor(p), link); // throws 502 on failure, day stays pending
  const { text: verdict, coach } = await writeVerdict(p, found);
  if (found.posted) {
    Object.assign(day, { status: 'posted', evidenceUrl: found.evidenceUrl, verdict });
    await savePledge(p);
  }
  res.status(200).json({ pledge: publicView(p), result: { ...found, verdict, source, coach } });
});
