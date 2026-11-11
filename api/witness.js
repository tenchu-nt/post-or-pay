import { route, fail } from '../lib/http.js';
import { publicView } from '../lib/pledge.js';
import { getByWitness } from '../lib/store.js';

export default route(['GET'], async (req, res) => {
  const w = req.query?.w;
  if (!w || typeof w !== 'string') throw fail(400, 'Missing w');
  const p = await getByWitness(w);
  if (!p) throw fail(404, 'Pledge not found');
  res.status(200).json({ pledge: publicView(p) });
});
