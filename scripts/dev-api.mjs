// Local stand-in for `vercel dev`: serves api/*.js on :3000 with Vercel's req/res helpers.
import http from 'node:http';
const PORT = Number(process.env.API_PORT || 3030);
http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const name = url.pathname.replace(/^\/api\//, '').replace(/[^a-z]/g, '');
  req.query = Object.fromEntries(url.searchParams);
  let raw = ''; for await (const c of req) raw += c;
  try { req.body = raw ? JSON.parse(raw) : {}; } catch { req.body = {}; }
  res.status = (s) => { res.statusCode = s; return res; };
  res.json = (o) => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(o)); };
  try { (await import(`../api/${name}.js`)).default(req, res); }
  catch { res.status(404).json({ error: 'No such endpoint' }); }
}).listen(PORT, () => console.log(`api on :${PORT}`));
