import { route } from '../lib/http.js';
import { loadPledge, getByWitness } from '../lib/store.js';
import { fail } from '../lib/http.js';
import { stripe } from '../lib/stripe.js';

// Proof straight from Stripe (not our own record): saved card + every PaymentIntent on the customer.
export default route(['GET'], async (req, res) => {
  const w = req.query?.w;
  const p = w ? await getByWitness(String(w)) : await loadPledge(req.query?.id);
  if (!p) throw fail(404, 'Pledge not found');
  const mask = (card) => (card && w ? { ...card, last4: '••••' } : card); // witnesses see the brand, not the digits
  if (p.isDemo || !p.customerId) {
    return res.status(200).json({ source: 'simulated', livemode: false, card: mask({ brand: 'visa', last4: '4242', expMonth: 12, expYear: 2034 }), payments: p.charges.map((c) => ({ id: c.id, amount: c.amount, currency: 'gbp', status: c.status, description: c.type, created: c.date })) });
  }
  const s = stripe();
  const [pm, list] = await Promise.all([
    p.paymentMethodId ? s.paymentMethods.retrieve(p.paymentMethodId) : null,
    s.paymentIntents.list({ customer: p.customerId, limit: 20 }),
  ]);
  res.status(200).json({
    source: 'stripe',
    livemode: false,
    card: mask(pm?.card ? { brand: pm.card.brand, last4: pm.card.last4, expMonth: pm.card.exp_month, expYear: pm.card.exp_year } : null),
    payments: list.data.map((pi) => ({ id: pi.id, amount: pi.amount, currency: pi.currency, status: pi.status, description: pi.metadata?.type || pi.description || 'charge', created: new Date(pi.created * 1000).toISOString() })),
  });
});
