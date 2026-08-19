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

  const seasonStr = `${season.year}`;
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

  const seasonStr = `${season.year}`;
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

router.post('/import-schedule/:seasonId', async (c) => {
  const { DB } = c.env;
  const seasonId = c.req.param('seasonId');
  const season = await DB.prepare('SELECT year FROM seasons WHERE id = ?').bind(seasonId).first() as any;
  if (!season) return c.json({ error: 'Season not found' }, 404);

  const seasonStr = `${season.year}`;
  const url = `${BASE_URL}/eventsseason.php?id=4391&s=${seasonStr}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return c.json({ error: 'Failed to fetch from TheSportsDB' }, 502);
    const data = await res.json() as any;
    const events = data.events || [];

    if (events.length === 0) {
      return c.json({ error: 'No schedule data available from TheSportsDB for this season yet' }, 404);
    }

    // Get all teams to build a name-to-id mapping
    const teams = await DB.prepare('SELECT id, name, abbreviation, city FROM teams').all();
    const teamMap = new Map<string, number>();
    for (const t of teams.results as any[]) {
      teamMap.set(t.name.toLowerCase(), t.id);
      teamMap.set(t.abbreviation.toLowerCase(), t.id);
      teamMap.set(`${t.city} ${t.name}`.toLowerCase(), t.id);
    }

    let imported = 0;
    for (const event of events) {
      const homeTeamName = event.strHomeTeam?.toLowerCase();
      const awayTeamName = event.strAwayTeam?.toLowerCase();

      const homeTeamId = teamMap.get(homeTeamName);
      const awayTeamId = teamMap.get(awayTeamName);

      if (!homeTeamId || !awayTeamId) {
        console.log(`Skipping: ${event.strEvent} - teams not found`);
        continue;
      }

      // Determine week from round or date
      let week = 1;
      if (event.intRound && event.intRound !== '500') {
        week = parseInt(event.intRound);
      }

      await DB.prepare(
        'INSERT INTO games (season_id, week, home_team_id, away_team_id, home_score, away_score, game_time, status, thesportsdb_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(
        seasonId,
        week,
        homeTeamId,
        awayTeamId,
        event.intHomeScore || null,
        event.intAwayScore || null,
        event.strTimestamp || null,
        event.strStatus === 'FT' ? 'final' : 'scheduled',
        event.idEvent || null
      ).run();
      imported++;
    }

    return c.json({ ok: true, imported, total: events.length });
  } catch (e) {
    return c.json({ error: `Failed to import: ${(e as Error).message}` }, 500);
  }
});

export { router as thesportsdbRouter };
