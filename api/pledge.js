import { route, readBody } from '../lib/http.js';
import { validateInput, makeDays, utcDate, newId, newWitnessId, publicView } from '../lib/pledge.js';
import { savePledge, loadPledge } from '../lib/store.js';
import { stripe } from '../lib/stripe.js';

const baseUrl = (req) => (process.env.APP_URL || `https://${req.headers['x-forwarded-host'] || req.headers.host}`).replace(/\/$/, '');

export default route(['GET', 'POST'], async (req, res) => {
  if (req.method === 'GET') {
    const p = await loadPledge(req.query?.id, { reset: req.query?.id === 'demo' && req.query?.reset === '1' });
    return res.status(200).json({ pledge: publicView(p) });
  }
  const input = validateInput(await readBody(req));
  const s = stripe();
  const id = newId();
  const customer = await s.customers.create({ name: input.name, metadata: { pledgeId: id } });
  const base = baseUrl(req);
  const session = await s.checkout.sessions.create({
    mode: 'setup', currency: 'gbp', customer: customer.id, metadata: { pledgeId: id },
    success_url: `${base}/#/p/${id}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/#/?cancelled=1`,
  });
  const startDate = utcDate();
  await savePledge({
    id, ...input, startDate, dayOffset: 0, status: 'pending', days: makeDays(startDate), contract: '',
    witnessId: newWitnessId(), isDemo: false, charges: [], customerId: customer.id, paymentMethodId: null,
  });
  res.status(200).json({ id, checkoutUrl: session.url });
});
