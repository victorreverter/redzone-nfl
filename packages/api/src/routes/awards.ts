import { Hono } from 'hono';
import { AppEnv } from '../env';

type Env = { Bindings: AppEnv['Bindings'] };

const router = new Hono<Env>();

const AWARD_TYPES = [
  'mvp', 'opoy', 'dpoy', 'offensive_roty', 'defensive_roty',
  'coach_of_year', 'comeback_player', 'super_bowl_mvp',
];

router.get('/:seasonId', async (c) => {
  const { DB } = c.env;
  const seasonId = c.req.param('seasonId');
  const preds = await DB.prepare(`
    SELECT pa.*, t.name as team_name, t.abbreviation as team_abbr
    FROM predictions_awards pa
    LEFT JOIN teams t ON pa.team_id = t.id
    WHERE pa.season_id = ?
    ORDER BY pa.award_type
  `).bind(seasonId).all();
  return c.json(preds.results);
});

router.post('/', async (c) => {
  const { DB } = c.env;
  const { season_id, award_type, player_name, team_id } = await c.req.json();
  if (!AWARD_TYPES.includes(award_type)) {
    return c.json({ error: `Invalid award type. Must be one of: ${AWARD_TYPES.join(', ')}` }, 400);
  }
  await DB.prepare(
    `INSERT INTO predictions_awards (season_id, award_type, player_name, team_id)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(season_id, award_type) DO UPDATE SET player_name = ?, team_id = ?, updated_at = datetime('now')`
  ).bind(season_id, award_type, player_name, team_id || null, player_name, team_id || null).run();
  return c.json({ ok: true });
});

router.patch('/:id/lock', async (c) => {
  const { DB } = c.env;
  const id = c.req.param('id');
  await DB.prepare("UPDATE predictions_awards SET locked = 1, updated_at = datetime('now') WHERE id = ?").bind(id).run();
  return c.json({ ok: true });
});

export { router as awardsRouter };
