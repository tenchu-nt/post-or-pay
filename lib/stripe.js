import Stripe from 'stripe';
import { fail } from './http.js';

let client;
export function stripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw fail(500, 'Payments not configured: STRIPE_SECRET_KEY is missing');
  if (!/^(sk|rk)_test_/.test(key)) throw fail(500, 'test mode key required'); // rk_: the restricted key a Stripe Projects sandbox issues
  return (client ??= new Stripe(key));
}
