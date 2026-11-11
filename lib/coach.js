const BRAGS = ['Posted. The streak lives and the stake stays home.', 'Another day shipped. Your wallet thanks you.', 'Receipts filed. Keep stacking days.'];
const ROASTS = ['No post today. The stake is getting nervous.', 'Silence on the feed. Your money noticed.', 'Missed it. Tomorrow is a fresh chance to not pay.'];
const CONTRACTS = (p) => [`${p.name} posts every day for 7 days or pays £${(p.stake / 100).toFixed(2)}. Witnesses are watching.`];
const pick = (list) => list[Math.floor(Math.random() * list.length)];

async function ask(prompt, fallback) {
  const key = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free';
  // Safety: free models only, never a paid one.
  if (!key || !(model.endsWith(':free') || model === 'openrouter/free')) return { text: fallback, coach: 'offline' };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model, max_tokens: 80, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!r.ok) throw new Error(String(r.status));
    const text = String((await r.json())?.choices?.[0]?.message?.content || '').trim().replace(/^["']|["']$/g, '').split('\n')[0].slice(0, 140);
    return text ? { text, coach: 'live' } : { text: fallback, coach: 'offline' };
  } catch {
    return { text: fallback, coach: 'offline' };
  } finally {
    clearTimeout(timer);
  }
}

const rules = 'Reply with one line under 140 characters, no hashtags, at most one emoji, no quotes.';

export const writeContract = (p) =>
  ask(`Write a punchy one-line accountability contract: ${p.name} must post on ${p.platform} every day for 7 days or pay £${(p.stake / 100).toFixed(2)}. ${rules}`, pick(CONTRACTS(p)));

export const writeVerdict = (p, result) =>
  result.posted
    ? ask(`Write a punchy one-line brag for ${p.name}, who just posted on ${p.platform} today and kept a 7-day streak alive. ${rules}`, pick(BRAGS))
    : ask(`Write a playful one-line roast for ${p.name}, who has not posted on ${p.platform} today with £${(p.stake / 100).toFixed(2)} at stake. Keep it kind. ${rules}`, pick(ROASTS));
