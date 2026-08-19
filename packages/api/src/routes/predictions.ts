import { Hono } from 'hono';
import { AppEnv } from '../env';

type Env = { Bindings: AppEnv['Bindings'] };

const router = new Hono<Env>();

router.get('/division/:seasonId', async (c) => {
  const { DB } = c.env;
  const seasonId = c.req.param('seasonId');
  const preds = await DB.prepare(`
    SELECT pd.*, t.name as team_name, t.abbreviation as team_abbr, t.logo_url as team_logo, t.conference, t.division
    FROM predictions_division pd
    JOIN teams t ON pd.team_id = t.id
    WHERE pd.season_id = ?
    ORDER BY t.conference, t.division, pd.predicted_position
  `).bind(seasonId).all();
  return c.json(preds.results);
});

router.post('/division', async (c) => {
  const { DB } = c.env;
  const { season_id, predictions } = await c.req.json();
  for (const p of predictions) {
    await DB.prepare(
      `INSERT INTO predictions_division (season_id, team_id, predicted_position) 
       VALUES (?, ?, ?) 
       ON CONFLICT(season_id, team_id) DO UPDATE SET predicted_position = ?, updated_at = datetime('now')`
    ).bind(season_id, p.team_id, p.position, p.position).run();
  }
  return c.json({ ok: true });
});

router.get('/weekly/:seasonId', async (c) => {
  const { DB } = c.env;
  const seasonId = c.req.param('seasonId');
  const week = c.req.query('week');

  let query = `
    SELECT pw.*, g.week, g.game_time, g.status as game_status, g.home_score, g.away_score,
           ht.abbreviation as home_team_abbr, ht.name as home_team_name, ht.logo_url as home_team_logo,
           at.abbreviation as away_team_abbr, at.name as away_team_name, at.logo_url as away_team_logo,
           wt.abbreviation as winner_team_abbr, wt.name as winner_team_name
    FROM predictions_weekly pw
    JOIN games g ON pw.game_id = g.id
    JOIN teams ht ON g.home_team_id = ht.id
    JOIN teams at ON g.away_team_id = at.id
    LEFT JOIN teams wt ON pw.predicted_winner_team_id = wt.id
    WHERE pw.season_id = ?
  `;
  const params: unknown[] = [seasonId];
  if (week) { query += ' AND g.week = ?'; params.push(week); }
  query += ' ORDER BY g.week, g.game_time';

  const preds = await DB.prepare(query).bind(...params).all();
  return c.json(preds.results);
});

router.post('/weekly', async (c) => {
  const { DB } = c.env;
  const { season_id, game_id, predicted_winner_team_id, predicted_home_score, predicted_away_score } = await c.req.json();
  await DB.prepare(
    `INSERT INTO predictions_weekly (season_id, game_id, predicted_winner_team_id, predicted_home_score, predicted_away_score)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(season_id, game_id) DO UPDATE SET 
       predicted_winner_team_id = ?, predicted_home_score = ?, predicted_away_score = ?, updated_at = datetime('now')`
  ).bind(season_id, game_id, predicted_winner_team_id || null, predicted_home_score ?? null, predicted_away_score ?? null,
    predicted_winner_team_id || null, predicted_home_score ?? null, predicted_away_score ?? null
  ).run();
  return c.json({ ok: true });
});

router.get('/records/:seasonId', async (c) => {
  const { DB } = c.env;
  const seasonId = c.req.param('seasonId');
  const preds = await DB.prepare(`
    SELECT pr.*, t.name as team_name, t.abbreviation as team_abbr, t.logo_url as team_logo, t.conference, t.division
    FROM predictions_record pr
    JOIN teams t ON pr.team_id = t.id
    WHERE pr.season_id = ?
    ORDER BY t.conference, t.division, t.name
  `).bind(seasonId).all();
  return c.json(preds.results);
});

router.post('/records', async (c) => {
  const { DB } = c.env;
  const { season_id, predictions } = await c.req.json();
  for (const p of predictions) {
    await DB.prepare(
      `INSERT INTO predictions_record (season_id, team_id, predicted_wins, predicted_losses)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(season_id, team_id) DO UPDATE SET predicted_wins = ?, predicted_losses = ?, updated_at = datetime('now')`
    ).bind(season_id, p.team_id, p.wins, p.losses, p.wins, p.losses).run();
  }
  return c.json({ ok: true });
});

router.get('/playoff/:seasonId', async (c) => {
  const { DB } = c.env;
  const seasonId = c.req.param('seasonId');
  const preds = await DB.prepare(`
    SELECT pp.*, t.name as team_name, t.abbreviation as team_abbr, t.logo_url as team_logo,
           wt.name as winner_team_name, wt.abbreviation as winner_team_abbr
    FROM predictions_playoff pp
    LEFT JOIN teams t ON pp.team_id = t.id
    LEFT JOIN teams wt ON pp.predicted_winner_team_id = wt.id
    WHERE pp.season_id = ?
    ORDER BY pp.round, pp.slot
  `).bind(seasonId).all();
  return c.json(preds.results);
});

router.post('/playoff', async (c) => {
  const { DB } = c.env;
  const { season_id, round, slot, team_id, predicted_winner_team_id } = await c.req.json();
  await DB.prepare(
    'INSERT INTO predictions_playoff (season_id, round, slot, team_id, predicted_winner_team_id) VALUES (?, ?, ?, ?, ?)'
  ).bind(season_id, round, slot, team_id || null, predicted_winner_team_id || null).run();
  return c.json({ ok: true });
});

router.get('/score/:seasonId', async (c) => {
  const { DB } = c.env;
  const seasonId = c.req.param('seasonId');
  const weeklyScore = await DB.prepare(
    'SELECT COALESCE(SUM(points_earned), 0) as total FROM predictions_weekly WHERE season_id = ?'
  ).bind(seasonId).first();
  const playoffScore = await DB.prepare(
    'SELECT COALESCE(SUM(points_earned), 0) as total FROM predictions_playoff WHERE season_id = ?'
  ).bind(seasonId).first();
  return c.json({
    weekly: (weeklyScore as any)?.total ?? 0,
    playoff: (playoffScore as any)?.total ?? 0,
    total: ((weeklyScore as any)?.total ?? 0) + ((playoffScore as any)?.total ?? 0),
  });
});

export { router as predictionsRouter };
