# Post or Pay

Put money on your posting streak. An agent checks that you actually posted.

You commit to posting every day for 7 days and put £5–£20 on the line. Each day the agent reads your public posts and marks the day as posted or missed, then writes you a one-line brag or roast. If you miss a day, Streak Insurance repairs the streak for £1. Finish the week with the streak intact and you pay nothing; break it and the stake is charged. Friends can watch through a public witness link.

Built at Agentic Dev Day 2026 with Stripe Projects. **Stripe test mode only: no real money moves.**

## How the post check works
| Platform | Check |
|---|---|
| YouTube | Automatic: public channel RSS |
| Blog, Newsletter, Podcast | Automatic: your RSS/Atom feed |
| X | Post link: author via public oEmbed, date from the post ID |
| TikTok | Post link: author via public oEmbed, date from the video ID |
| LinkedIn | Post link: date from the activity ID (authorship self-reported) |
| Instagram | Post link logged as proof (no free API, not verified) |

A rule-based check decides "posted". The AI coach (free OpenRouter model) writes the contract and daily verdict, with template fallback.

## Proof
`GET /api/receipts?id=` reads the saved card and every PaymentIntent straight from Stripe; the dashboard shows them with their `pi_` IDs.

## Payments
- You save a card once, through Stripe Checkout in `setup` mode.
- Insurance (£1) and a lost stake are charged later as off-session PaymentIntents. Each uses an idempotency key (`insure-{id}-{date}`, `stake-{id}`), so retries never double-charge.
- Settle only runs once the week is over. A second settle returns 409.

## Demo script (2 minutes)
1. Open the site and click **See a live example**: a seeded pledge that is 4 days in, with one insured day. Its charges are labelled as simulated.
2. **Start** a pledge (e.g. a newsletter RSS feed or YouTube channel ID) and pay with card `4242 4242 4242 4242`, any future date, any CVC.
3. Click **Check today**. The agent reads the feed and marks the day; the Proof panel shows the saved card from Stripe.
4. Click **Demo: simulate next day**. The skipped day becomes missed.
5. Click **Insure for £1**. You'll see a real test-mode charge appear.
6. Simulate to day 7, then click **Settle week**.
7. **Copy the witness link** and share the card.

## Run locally
```bash
npm install
cp .env.example .env.local   # STRIPE_SECRET_KEY (test key only), DEMO_CUSTOMER_ID, optional OPENROUTER_API_KEY
LOCAL_MEMORY_STORE=1 node --env-file=.env.local scripts/dev-api.mjs   # API on :3030, pledges kept in memory
npm run dev                  # SPA on :5173, proxies /api to :3030
npm test                     # logic self-test
```

Stack: React 19.3, Vite 8.3, Tailwind 4.3, GSAP 3.15, Lenis 1.3, Stripe Node 23.1, Vercel functions. Pledges are stored on Stripe Customer metadata.
