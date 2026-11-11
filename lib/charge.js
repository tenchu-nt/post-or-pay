import { stripe } from './stripe.js';
import { fail } from './http.js';

// Off-session charge on the saved card. Demo pledges never touch Stripe.
export async function charge(p, type, amount, idempotencyKey) {
  if (p.isDemo) return { type, amount, status: 'succeeded', id: 'demo_simulated', simulated: true };
  if (!p.customerId || !p.paymentMethodId) throw fail(409, 'No saved card on this pledge');
  let pi;
  try {
    pi = await stripe().paymentIntents.create(
    { amount, currency: 'gbp', customer: p.customerId, payment_method: p.paymentMethodId, off_session: true, confirm: true, metadata: { pledgeId: p.id, type } },
      { idempotencyKey },
    );
  } catch (e) {
    if (e?.code === 'authentication_required') throw fail(402, 'Your bank wants you to confirm this charge, so it could not run automatically');
    if (e?.type === 'StripeCardError') throw fail(402, `Card declined: ${e.message}`);
    throw e;
  }
  if (pi.status !== 'succeeded') throw fail(402, `Charge not completed (${pi.status})`);
  return { type, amount, status: pi.status, id: pi.id };
}
