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

// Generic RSS 2.0 / Atom: blogs, newsletters (Substack, Beehiiv, Ghost) and podcasts.
export function matchFeed(xml, date) {
  const text = String(xml);
  for (const [, item] of text.matchAll(/<(?:item|entry)[\s>]([\s\S]*?)<\/(?:item|entry)>/g)) {
    const when = item.match(/<(?:pubDate|published|updated|dc:date)>([^<]+)</)?.[1];
    const link = item.match(/<link>([^<]+)<\/link>/)?.[1] || item.match(/<link[^>]*href="([^"]+)"/)?.[1] || null;
    const d = when && new Date(when.trim());
    if (d && !isNaN(d) && utcDate(d) === date) return { posted: true, evidenceUrl: link?.trim() || null };
  }
  return { posted: false, evidenceUrl: null };
}

// X (Twitter) post IDs are snowflakes: top bits are ms since 2010-11-04.
export const xDate = (id) => new Date(Number((BigInt(id) >> 22n) + 1288834974657n));
// LinkedIn activity IDs carry the post time in ms in their top 41 bits.
export const linkedinDate = (id) => new Date(Number(BigInt(id) >> 22n));

async function checkX(handle, link, date) {
  const m = String(link || '').match(/^https:\/\/(?:www\.)?(?:x|twitter)\.com\/(\w{1,15})\/status\/(\d+)/);
  if (!m) throw fail(400, 'Paste the full X post link (x.com/you/status/...)');
  const o = await get(`https://publish.twitter.com/oembed?url=${encodeURIComponent(link)}&omit_script=1`, 'X');
  const author = String(o.author_url || '').split('/').pop().toLowerCase();
  const posted = author === handle.replace(/^@/, '').toLowerCase() && utcDate(xDate(m[2])) === date;
  return { posted, evidenceUrl: posted ? link : null, source: 'link' };
}

function checkLinkedIn(link, date) {
  const id = String(link || '').match(/linkedin\.com\/(?:posts\/[^?#]*activity-|feed\/update\/urn:li:(?:activity|share|ugcPost):)(\d{15,25})/)?.[1];
  if (!id) throw fail(400, 'Paste the full LinkedIn post link (linkedin.com/posts/...)');
  const posted = utcDate(linkedinDate(id)) === date; // date verified from the ID; authorship is self-reported
  return { posted, evidenceUrl: posted ? link : null, source: 'link' };
}

function checkInstagram(link) {
  if (!/^https:\/\/(?:www\.)?instagram\.com\/(?:p|reel|reels)\/[\w-]+/.test(String(link || ''))) throw fail(400, 'Paste the full Instagram post link (instagram.com/p/...)');
  // shortcut: Instagram has no free public API, so the link is logged as proof, not verified.
  return { posted: true, evidenceUrl: link, source: 'link-proof' };
}

export async function checkPlatform(p, date, link) {
  if (p.platform === 'youtube') return { ...(await checkYouTube(p.handle, date)), source: 'live' };
  if (['blog', 'newsletter', 'podcast'].includes(p.platform)) return { ...matchFeed(await get(p.handle, 'your feed', 'text'), date), source: 'live' };
  if (!link) throw fail(400, 'Paste today’s post link');
  if (p.platform === 'tiktok') return { ...(await checkTikTok(p.handle, link, date)), source: 'link' };
  if (p.platform === 'x') return checkX(p.handle, link, date);
  if (p.platform === 'linkedin') return checkLinkedIn(link, date);
  if (p.platform === 'instagram') return checkInstagram(link);
  throw fail(400, 'Unknown platform');
}
