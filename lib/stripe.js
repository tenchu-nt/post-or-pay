import Stripe from 'stripe';
import { fail } from './http.js';

let client;
export function stripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw fail(500, 'Payments not configured: STRIPE_SECRET_KEY is missing');
  if (!key.startsWith('sk_test_')) throw fail(500, 'test mode key required');
  return (client ??= new Stripe(key));
}
