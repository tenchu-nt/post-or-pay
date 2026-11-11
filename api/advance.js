import { route, readBody } from '../lib/http.js';
import { applyAdvance, assertActive, LENGTH, publicView } from '../lib/pledge.js';
import { loadPledge, savePledge } from '../lib/store.js';
import { writeVerdict } from '../lib/coach.js';

export default route(['POST'], async (req, res) => {
  const { id } = await readBody(req);
  const p = await loadPledge(id);
  assertActive(p);
  const pending = p.dayOffset < LENGTH && p.days[p.dayOffset].status === 'pending';
  const roast = pending ? (await writeVerdict(p, { posted: false })).text : '';
  applyAdvance(p, roast);
  await savePledge(p);
  res.status(200).json({ pledge: publicView(p) });
});
