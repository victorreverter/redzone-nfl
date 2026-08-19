import { Hono } from 'hono';
import { AppEnv } from '../env';

type Env = { Bindings: AppEnv['Bindings'] };

const router = new Hono<Env>();

router.get('/', async (c) => {
  const { DB } = c.env;
  const seasonId = c.req.query('season_id');
  const week = c.req.query('week');

  let query = `
    SELECT g.*, 
           ht.abbreviation as home_team_abbr, ht.name as home_team_name, ht.city as home_team_city, ht.logo_url as home_team_logo,
           at.abbreviation as away_team_abbr, at.name as away_team_name, at.city as away_team_city, at.logo_url as away_team_logo
    FROM games g
    JOIN teams ht ON g.home_team_id = ht.id
    JOIN teams at ON g.away_team_id = at.id
    WHERE 1=1
  `;
  const params: unknown[] = [];

  if (seasonId) { query += ' AND g.season_id = ?'; params.push(seasonId); }
  if (week) { query += ' AND g.week = ?'; params.push(week); }

  query += ' ORDER BY g.week, g.game_time';
  const games = await DB.prepare(query).bind(...params).all();
  return c.json(games.results);
});

router.get('/:id', async (c) => {
  const { DB } = c.env;
  const id = c.req.param('id');
  const game = await DB.prepare(`
    SELECT g.*, 
           ht.abbreviation as home_team_abbr, ht.name as home_team_name,
           at.abbreviation as away_team_abbr, at.name as away_team_name
    FROM games g
    JOIN teams ht ON g.home_team_id = ht.id
    JOIN teams at ON g.away_team_id = at.id
    WHERE g.id = ?
  `).bind(id).first();
  if (!game) return c.json({ error: 'Not found' }, 404);
  return c.json(game);
});

router.post('/', async (c) => {
  const { DB } = c.env;
  const { season_id, week, home_team_id, away_team_id, game_time } = await c.req.json();
  const result = await DB.prepare(
    'INSERT INTO games (season_id, week, home_team_id, away_team_id, game_time) VALUES (?, ?, ?, ?, ?)'
  ).bind(season_id, week, home_team_id, away_team_id, game_time || null).run();
  return c.json({ id: result.meta.last_row_id }, 201);
});

router.patch('/:id', async (c) => {
  const { DB } = c.env;
  const id = c.req.param('id');
  const body = await c.req.json();
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (body.home_score !== undefined) { sets.push('home_score = ?'); vals.push(body.home_score); }
  if (body.away_score !== undefined) { sets.push('away_score = ?'); vals.push(body.away_score); }
  if (body.status) { sets.push('status = ?'); vals.push(body.status); }
  if (body.game_time) { sets.push('game_time = ?'); vals.push(body.game_time); }
  if (sets.length === 0) return c.json({ error: 'Nothing to update' }, 400);
  vals.push(id);
  await DB.prepare(`UPDATE games SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = ?`).bind(...vals).run();
  return c.json({ ok: true });
});

router.post('/:id/result', async (c) => {
  const { DB } = c.env;
  const id = c.req.param('id');
  const { home_score, away_score } = await c.req.json();
  const status = 'final';
  await DB.prepare(
    "UPDATE games SET home_score = ?, away_score = ?, status = ?, updated_at = datetime('now') WHERE id = ?"
  ).bind(home_score, away_score, status, id).run();

  const game = await DB.prepare('SELECT * FROM games WHERE id = ?').bind(id).first() as any;
  const winnerTeamId = home_score > away_score ? game.home_team_id : away_score > home_score ? game.away_team_id : null;

  const pred = await DB.prepare(
    'SELECT * FROM predictions_weekly WHERE game_id = ?'
  ).bind(id).first() as any;

  if (pred) {
    let points = 0;
    if (pred.predicted_winner_team_id === winnerTeamId) {
      points = 1;
      if (pred.predicted_home_score === home_score && pred.predicted_away_score === away_score) {
        points = 5;
      }
    }
    await DB.prepare(
      "UPDATE predictions_weekly SET points_earned = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(points, pred.id).run();
  }

  return c.json({ ok: true, points_earned: pred?.points_earned ?? 0 });
});

export { router as gamesRouter };
