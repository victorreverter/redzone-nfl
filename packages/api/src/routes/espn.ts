import { Hono } from 'hono';
import { AppEnv } from '../env';
import scheduleData from '../data/nfl-2026-schedule.json';

type Env = { Bindings: AppEnv['Bindings'] };

const router = new Hono<Env>();

interface ScheduleGame {
  home: string;
  away: string;
  date: string;
  week: number;
}

const schedule = scheduleData as ScheduleGame[];

router.get('/schedule/:seasonId', async (c) => {
  const { DB } = c.env;
  const seasonId = c.req.param('seasonId');
  const season = await DB.prepare('SELECT year FROM seasons WHERE id = ?').bind(seasonId).first() as any;
  if (!season) return c.json({ error: 'Season not found' }, 404);
  return c.json(schedule);
});

router.post('/import-schedule/:seasonId', async (c) => {
  const { DB } = c.env;
  const seasonId = c.req.param('seasonId');
  const season = await DB.prepare('SELECT year FROM seasons WHERE id = ?').bind(seasonId).first() as any;
  if (!season) return c.json({ error: 'Season not found' }, 404);

  try {
    const teams = await DB.prepare('SELECT id, name, abbreviation, city FROM teams').all();
    const teamMap = new Map<string, number>();
    for (const t of teams.results as any[]) {
      teamMap.set(t.abbreviation.toLowerCase(), t.id);
      teamMap.set(t.name.toLowerCase(), t.id);
      teamMap.set(`${t.city} ${t.name}`.toLowerCase(), t.id);
    }

    let imported = 0;

    for (const game of schedule) {
      const homeTeamId = teamMap.get(game.home.toLowerCase());
      const awayTeamId = teamMap.get(game.away.toLowerCase());

      if (!homeTeamId || !awayTeamId) {
        console.log(`Skipping: ${game.away} @ ${game.home} - teams not found`);
        continue;
      }

      const existing = await DB.prepare(
        'SELECT id FROM games WHERE season_id = ? AND home_team_id = ? AND away_team_id = ? AND week = ?'
      ).bind(seasonId, homeTeamId, awayTeamId, game.week).first();

      if (existing) continue;

      await DB.prepare(
        'INSERT INTO games (season_id, week, home_team_id, away_team_id, game_time, status) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(
        seasonId,
        game.week,
        homeTeamId,
        awayTeamId,
        game.date,
        'scheduled'
      ).run();
      imported++;
    }

    return c.json({ ok: true, imported, total: schedule.length });
  } catch (e) {
    return c.json({ error: `Failed to import: ${(e as Error).message}` }, 500);
  }
});

export { router as espnRouter };
