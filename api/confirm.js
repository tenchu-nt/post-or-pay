import { route, readBody, fail } from '../lib/http.js';
import { makeDays, utcDate, publicView } from '../lib/pledge.js';
import { loadPledge, savePledge } from '../lib/store.js';
import { stripe } from '../lib/stripe.js';
import { writeContract } from '../lib/coach.js';

export default route(['POST'], async (req, res) => {
  const { id, sessionId } = await readBody(req);
  const p = await loadPledge(id);
  if (p.status !== 'pending') return res.status(200).json({ pledge: publicView(p) });
  if (!sessionId) throw fail(400, 'Missing sessionId');
  const session = await stripe().checkout.sessions.retrieve(sessionId, { expand: ['setup_intent'] });
  if (session.status !== 'complete' || session.metadata?.pledgeId !== p.id) throw fail(409, 'Checkout is not complete for this pledge');
  const pm = session.setup_intent?.payment_method;
  const paymentMethodId = typeof pm === 'string' ? pm : pm?.id;
  if (!paymentMethodId) throw fail(409, 'No card was saved');
  const startDate = utcDate();
  Object.assign(p, { status: 'active', paymentMethodId, startDate, dayOffset: 0, days: makeDays(startDate) });
  p.contract = (await writeContract(p)).text;
  await savePledge(p);
  res.status(200).json({ pledge: publicView(p) });
});
