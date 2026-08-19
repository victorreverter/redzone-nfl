import { Hono } from 'hono';
import { AppEnv } from '../env';

type Env = { Bindings: AppEnv['Bindings'] };

const router = new Hono<Env>();

const BASE_URL = 'https://www.thesportsdb.com/api/v1/json/3';

router.get('/schedule/:seasonId', async (c) => {
  const { DB } = c.env;
  const seasonId = c.req.param('seasonId');
  const season = await DB.prepare('SELECT year FROM seasons WHERE id = ?').bind(seasonId).first() as any;
  if (!season) return c.json({ error: 'Season not found' }, 404);

  const seasonStr = `${season.year}-${season.year + 1}`;
  const url = `${BASE_URL}/eventsseason.php?id=4391&s=${seasonStr}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return c.json({ error: 'Failed to fetch from TheSportsDB' }, 502);
    const data = await res.json() as any;
    return c.json(data.events || []);
  } catch {
    return c.json({ error: 'Failed to reach TheSportsDB' }, 502);
  }
});

router.get('/teams', async () => {
  const url = `${BASE_URL}/lookup_all_teams.php?id=4391`;
  try {
    const res = await fetch(url);
    if (!res.ok) return new Response(JSON.stringify({ error: 'Failed' }), { status: 502 });
    const data = await res.json() as any;
    return new Response(JSON.stringify(data.teams || []));
  } catch {
    return new Response(JSON.stringify({ error: 'Failed' }), { status: 502 });
  }
});

router.get('/standings/:seasonId', async (c) => {
  const { DB } = c.env;
  const seasonId = c.req.param('seasonId');
  const season = await DB.prepare('SELECT year FROM seasons WHERE id = ?').bind(seasonId).first() as any;
  if (!season) return c.json({ error: 'Season not found' }, 404);

  const seasonStr = `${season.year}-${season.year + 1}`;
  const url = `${BASE_URL}/lookup_all_teams.php?id=4391&s=${seasonStr}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return c.json({ error: 'Failed to fetch' }, 502);
    const data = await res.json() as any;
    return c.json(data.teams || []);
  } catch {
    return c.json({ error: 'Failed' }, 502);
  }
});

export { router as thesportsdbRouter };
