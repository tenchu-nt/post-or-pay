import { route, readBody, fail } from '../lib/http.js';
import { canInsure, applyInsure, INSURANCE_PRICE, publicView } from '../lib/pledge.js';
import { loadPledge, savePledge } from '../lib/store.js';
import { charge } from '../lib/charge.js';

export default route(['POST'], async (req, res) => {
  const { id, date } = await readBody(req);
  const p = await loadPledge(id);
  if (!canInsure(p, date)) throw fail(409, 'Only a missed day on an active pledge can be insured, once');
  const c = { ...(await charge(p, 'insurance', INSURANCE_PRICE, `insure-${p.id}-${date}`)), date };
  applyInsure(p, date, c);
  await savePledge(p);
  res.status(200).json({ pledge: publicView(p), charge: c });
});
