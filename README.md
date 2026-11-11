# Post or Pay

Put money on your posting streak. An agent checks that you actually posted.

You commit to posting every day for 7 days and put £5–£20 on the line. Each day the agent reads your public posts and marks the day as posted or missed, then writes you a one-line brag or roast. If you miss a day, Streak Insurance repairs the streak for £1. Finish the week with the streak intact and you pay nothing; break it and the stake is charged. Friends can watch through a public witness link.

Built at Agentic Dev Day 2026 with Stripe Projects. **Stripe test mode only: no real money moves.**

## How the post check works
| Platform | How it is checked |
|---|---|
| Bluesky | Automatically, through the public `app.bsky.feed.getAuthorFeed` API |
| TikTok | You paste the post link. TikTok's public oEmbed confirms the author, and the date comes from the video ID. |
| YouTube | Automatically, through the channel's public RSS feed |
| Instagram, X | Not yet supported: they need paid or app-reviewed API access |

A rule-based check decides whether you posted. An AI coach (a free model on OpenRouter) writes the contract and the daily verdict, and falls back to template lines when the model is unavailable.

## Payments
- You save a card once, through Stripe Checkout in `setup` mode.
- Insurance (£1) and a lost stake are charged later as off-session PaymentIntents. Each uses an idempotency key (`insure-{id}-{date}`, `stake-{id}`), so retries never double-charge.
- Settle only runs once the week is over. A second settle returns 409.

## Demo script (2 minutes)
1. Open the site and click **See a live example**: a seeded pledge that is 4 days in, with one insured day. Its charges are labelled as simulated.
2. **Start** a pledge with a Bluesky handle and pay with card `4242 4242 4242 4242`, any future date, any CVC.
3. Post on Bluesky, then click **Check today**. The day is marked posted and the coach writes a verdict.
4. Click **Demo: simulate next day**. The skipped day becomes missed.
5. Click **Insure for £1**. You'll see a real test-mode charge appear.
6. Simulate to day 7, then click **Settle week**.
7. **Copy the witness link** and share the card.

## Run locally
```bash
npm install
cp .env.example .env.local   # STRIPE_SECRET_KEY (sk_test_ only), UPSTASH_REDIS_REST_URL/TOKEN, optional OPENROUTER_API_KEY
npx vercel dev               # API on :3000
npm run dev                  # SPA on :5173, proxies /api
npm test                     # logic self-test
```

Stack: React 19.3, Vite 8.3, Tailwind 4.3, GSAP 3.15, Lenis 1.3, Stripe Node 23.1, Upstash Redis, Vercel functions.
