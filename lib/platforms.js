import { fail } from './http.js';
import { utcDate } from './pledge.js';

async function get(url, label, as = 'json') {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { 'user-agent': 'post-or-pay/1.0' } });
    if (!r.ok) throw new Error(String(r.status));
    return as === 'json' ? await r.json() : await r.text();
  } catch {
    throw fail(502, `Couldn't reach ${label}, try again`);
  } finally {
    clearTimeout(timer);
  }
}

export function matchBluesky(feed, handle, date) {
  const h = handle.toLowerCase();
  const item = (feed?.feed || []).find(
    (it) => !it.reason && it.post?.author?.handle?.toLowerCase() === h && it.post?.record?.createdAt && utcDate(it.post.record.createdAt) === date,
  );
  if (!item) return { posted: false, evidenceUrl: null };
  const rkey = item.post.uri.split('/').pop();
  return { posted: true, evidenceUrl: `https://bsky.app/profile/${handle}/post/${rkey}` };
}

export async function checkBluesky(handle, date) {
  const feed = await get(`https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(handle)}&limit=30&filter=posts_no_replies`, 'Bluesky');
  return matchBluesky(feed, handle, date);
}

export function matchYouTube(xml, date) {
  for (const [, entry] of String(xml).matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const published = entry.match(/<published>([^<]+)<\/published>/)?.[1];
    const href = entry.match(/<link rel="alternate" href="([^"]+)"/)?.[1];
    if (published && utcDate(published) === date) return { posted: true, evidenceUrl: href || null };
  }
  return { posted: false, evidenceUrl: null };
}

export async function checkYouTube(channelId, date) {
  return matchYouTube(await get(`https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`, 'YouTube', 'text'), date);
}

// TikTok video IDs carry the upload time (Unix seconds) in their top 32 bits.
export const tiktokDate = (id) => new Date(Number(BigInt(id) >> 32n) * 1000);

export async function checkTikTok(handle, link, date) {
  const id = String(link || '').match(/tiktok\.com\/@[\w.]+\/video\/(\d+)/)?.[1];
  if (!id) throw fail(400, 'Paste the full TikTok video link (tiktok.com/@you/video/...)');
  const o = await get(`https://www.tiktok.com/oembed?url=${encodeURIComponent(link)}`, 'TikTok');
  const want = handle.replace(/^@/, '').toLowerCase();
  const author = (o.author_unique_id || String(o.author_url || '').split('/').pop() || '').replace(/^@/, '').toLowerCase();
  const posted = author === want && utcDate(tiktokDate(id)) === date;
  return { posted, evidenceUrl: posted ? link : null };
}

export function checkPlatform(p, date, link) {
  if (p.platform === 'bluesky') return checkBluesky(p.handle, date);
  if (p.platform === 'youtube') return checkYouTube(p.handle, date);
  if (!link) throw fail(400, 'TikTok check needs the video link');
  return checkTikTok(p.handle, link, date);
}
