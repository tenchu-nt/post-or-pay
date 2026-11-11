export const fail = (status, message) => Object.assign(new Error(message), { status });

export async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let raw = typeof req.body === 'string' ? req.body : '';
  if (!raw && typeof req.on === 'function' && req.method !== 'GET') {
    raw = await new Promise((resolve) => {
      let s = '';
      req.on('data', (c) => (s += c));
      req.on('end', () => resolve(s));
      req.on('error', () => resolve(''));
    });
  }
  try { return raw ? JSON.parse(raw) : {}; } catch { throw fail(400, 'Body must be JSON'); }
}

// Wraps a handler with a method guard and maps thrown {status, message} to JSON errors.
export function route(methods, fn) {
  return async function handler(req, res) {
    if (!methods.includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
    try {
      await fn(req, res);
    } catch (e) {
      const status = e?.status || (e?.type === 'StripeCardError' ? 402 : e?.statusCode >= 400 && e?.statusCode < 500 ? 400 : 500);
      if (status >= 500) console.error('[api]', req.url, e?.message);
      res.status(status).json({ error: e?.message || 'Something went wrong' });
    }
  };
}
