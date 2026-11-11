# Post or Pay: shared contract (frontend ↔ backend)

Hosting: Vercel. Frontend is a Vite SPA in `src/`. The backend is Vercel Node functions in `api/*.js`, which are ESM `export default async function handler(req, res)`, with shared code in `lib/`.
All amounts are integer pence (GBP). Every response is JSON. Errors are `{ error: "human message" }` with a 4xx/5xx status.

## Env (server only, never shipped to the client)
`STRIPE_SECRET_KEY` (sk_test_), `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (or the `KV_*` names, so check both), `OPENROUTER_API_KEY` (optional), `APP_URL` (optional; otherwise derive it from the request host).

## Pledge object (public view: never include customerId or paymentMethodId)
```json
{
  "id": "abc123", "name": "Maya", "platform": "bluesky|youtube|tiktok", "handle": "maya.bsky.social",
  "stake": 1000, "length": 7, "startDate": "2026-11-11", "dayOffset": 0,
  "today": "2026-11-11",            // startDate + dayOffset (demo clock), YYYY-MM-DD UTC
  "dayIndex": 0,                    // 0..6, which challenge day 'today' is
  "status": "pending|active|won|lost",
  "days": [{ "date": "2026-11-11", "status": "posted|missed|insured|pending", "evidenceUrl": null, "verdict": "string" }],
  "contract": "string", "witnessId": "w_xyz", "isDemo": false,
  "insurancePrice": 100, "charges": [{ "type": "insurance|stake", "amount": 100, "status": "succeeded", "id": "pi_..." }]
}
```

## Endpoints
| Method / path | Body | 200 response |
|---|---|---|
| POST /api/pledge | `{name, platform, handle, stake}` | `{id, checkoutUrl}` (Checkout `mode: setup`, success_url `/#/p/{id}?session_id={CHECKOUT_SESSION_ID}`, cancel_url `/#/?cancelled=1`) |
| POST /api/confirm | `{id, sessionId}` | `{pledge}` (idempotent; status becomes active) |
| GET /api/pledge?id= | — | `{pledge}` (`id=demo` returns the seeded example, created on first read) |
| GET /api/witness?w= | — | `{pledge}` (same public view, looked up by witnessId) |
| POST /api/check | `{id, link?}` | `{pledge, result: {posted: bool, evidenceUrl, verdict, source: "live|link"}}`; 502 `{error}` if the platform is unreachable (day stays pending) |
| POST /api/advance | `{id}` | `{pledge}` (demo clock +1; the previous day becomes `missed` if still pending; 409 if day 7 has passed) |
| POST /api/insure | `{id, date}` | `{pledge, charge}` (£1 off-session; only for a `missed` day; idempotent per date) |
| POST /api/settle | `{id}` | `{pledge, outcome: "won|lost", charge?}`; 409 if not active |

Validation: name 1–40 characters; stake 100–5000; handle format by platform (bluesky: domain-like handle; youtube: channel ID starting with `UC`, 24 chars; tiktok: @handle). TikTok `check` needs `link`.

## Routes (hash)
`#/` landing + start form · `#/p/{id}` dashboard (on load with `?session_id=` call `/api/confirm`) · `#/w/{witnessId}` public witness page · `#/p/demo` seeded example.
