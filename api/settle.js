import { route, readBody } from '../lib/http.js';
import { assertActive, settleOutcome, publicView, LENGTH } from '../lib/pledge.js';
import { fail } from '../lib/http.js';
import { loadPledge, savePledge } from '../lib/store.js';
import { charge } from '../lib/charge.js';

// shortcut: no lock, two simultaneous settles both pass the status check; the Stripe idempotency key stops a double charge.
export default route(['POST'], async (req, res) => {
  const { id } = await readBody(req);
  const p = await loadPledge(id);
  assertActive(p);
  // Settling early would count unchecked days as missed and forfeit the stake.
  if (p.dayOffset < LENGTH - 1) throw fail(409, 'The week is not over yet');
  for (const d of p.days) if (d.status === 'pending') d.status = 'missed';
  const outcome = settleOutcome(p);
  let c;
  if (outcome === 'lost') {
    c = await charge(p, 'stake', p.stake, `stake-${p.id}`);
    p.charges.push(c);
  }
  p.status = outcome;
  await savePledge(p);
  res.status(200).json({ pledge: publicView(p), outcome, ...(c && { charge: c }) });
});
