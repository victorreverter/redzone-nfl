import { Hono } from 'hono';
import { AppEnv } from '../env';

type Env = { Bindings: AppEnv['Bindings'] };

const router = new Hono<Env>();

router.get('/', async (c) => {
  const { DB } = c.env;
  const seasons = await DB.prepare('SELECT * FROM seasons ORDER BY year DESC').all();
  return c.json(seasons.results);
});

router.post('/', async (c) => {
  const { DB } = c.env;
  const { year } = await c.req.json();
  if (!Number.isInteger(year)) {
    return c.json({ error: 'Season year must be an integer' }, 400);
  }
  const result = await DB.prepare('INSERT INTO seasons (year) VALUES (?)').bind(year).run();
  return c.json({ id: result.meta.last_row_id, year }, 201);
});

router.get('/:id', async (c) => {
  const { DB } = c.env;
  const id = c.req.param('id');
  const season = await DB.prepare('SELECT * FROM seasons WHERE id = ?').bind(id).first();
  if (!season) return c.json({ error: 'Not found' }, 404);
  return c.json(season);
});

router.patch('/:id', async (c) => {
  const { DB } = c.env;
  const id = c.req.param('id');
  const body = await c.req.json();
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (body.status) { sets.push('status = ?'); vals.push(body.status); }
  if (sets.length === 0) return c.json({ error: 'Nothing to update' }, 400);
  vals.push(id);
  await DB.prepare(`UPDATE seasons SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = ?`).bind(...vals).run();
  return c.json({ ok: true });
});

export { router as seasonsRouter };
