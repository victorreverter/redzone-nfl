import { Hono } from 'hono';
import { AppEnv } from '../env';

type Env = { Bindings: AppEnv['Bindings'] };

const router = new Hono<Env>();

router.get('/', async (c) => {
  const { DB } = c.env;
  const seasonId = c.req.query('season_id');
  if (seasonId) {
    const teams = await DB.prepare('SELECT * FROM teams ORDER BY conference, division, name').all();
    return c.json(teams.results);
  }
  const teams = await DB.prepare('SELECT * FROM teams ORDER BY conference, division, name').all();
  return c.json(teams.results);
});

router.get('/:id', async (c) => {
  const { DB } = c.env;
  const id = c.req.param('id');
  const team = await DB.prepare('SELECT * FROM teams WHERE id = ?').bind(id).first();
  if (!team) return c.json({ error: 'Not found' }, 404);
  return c.json(team);
});

router.post('/', async (c) => {
  const { DB } = c.env;
  const { name, abbreviation, city, conference, division, logo_url, thesportsdb_id } = await c.req.json();
  const result = await DB.prepare(
    'INSERT INTO teams (name, abbreviation, city, conference, division, logo_url, thesportsdb_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(name, abbreviation, city, conference, division, logo_url || null, thesportsdb_id || null).run();
  return c.json({ id: result.meta.last_row_id }, 201);
});

router.post('/seed', async (c) => {
  const { DB } = c.env;
  const teams = getNflTeams();
  for (const t of teams) {
    await DB.prepare(
      'INSERT OR IGNORE INTO teams (name, abbreviation, city, conference, division) VALUES (?, ?, ?, ?, ?)'
    ).bind(t.name, t.abbreviation, t.city, t.conference, t.division).run();
  }
  return c.json({ ok: true, count: teams.length });
});

function getNflTeams() {
  return [
    { name: 'Cardinals', abbreviation: 'ARI', city: 'Arizona', conference: 'NFC', division: 'West' },
    { name: 'Falcons', abbreviation: 'ATL', city: 'Atlanta', conference: 'NFC', division: 'South' },
    { name: 'Ravens', abbreviation: 'BAL', city: 'Baltimore', conference: 'AFC', division: 'North' },
    { name: 'Bills', abbreviation: 'BUF', city: 'Buffalo', conference: 'AFC', division: 'East' },
    { name: 'Panthers', abbreviation: 'CAR', city: 'Carolina', conference: 'NFC', division: 'South' },
    { name: 'Bears', abbreviation: 'CHI', city: 'Chicago', conference: 'NFC', division: 'North' },
    { name: 'Bengals', abbreviation: 'CIN', city: 'Cincinnati', conference: 'AFC', division: 'North' },
    { name: 'Browns', abbreviation: 'CLE', city: 'Cleveland', conference: 'AFC', division: 'North' },
    { name: 'Cowboys', abbreviation: 'DAL', city: 'Dallas', conference: 'NFC', division: 'East' },
    { name: 'Broncos', abbreviation: 'DEN', city: 'Denver', conference: 'AFC', division: 'West' },
    { name: 'Lions', abbreviation: 'DET', city: 'Detroit', conference: 'NFC', division: 'North' },
    { name: 'Packers', abbreviation: 'GB', city: 'Green Bay', conference: 'NFC', division: 'North' },
    { name: 'Texans', abbreviation: 'HOU', city: 'Houston', conference: 'AFC', division: 'South' },
    { name: 'Colts', abbreviation: 'IND', city: 'Indianapolis', conference: 'AFC', division: 'South' },
    { name: 'Jaguars', abbreviation: 'JAX', city: 'Jacksonville', conference: 'AFC', division: 'South' },
    { name: 'Chiefs', abbreviation: 'KC', city: 'Kansas City', conference: 'AFC', division: 'West' },
    { name: 'Chargers', abbreviation: 'LAC', city: 'Los Angeles', conference: 'AFC', division: 'West' },
    { name: 'Rams', abbreviation: 'LAR', city: 'Los Angeles', conference: 'NFC', division: 'West' },
    { name: 'Dolphins', abbreviation: 'MIA', city: 'Miami', conference: 'AFC', division: 'East' },
    { name: 'Vikings', abbreviation: 'MIN', city: 'Minnesota', conference: 'NFC', division: 'North' },
    { name: 'Patriots', abbreviation: 'NE', city: 'New England', conference: 'AFC', division: 'East' },
    { name: 'Saints', abbreviation: 'NO', city: 'New Orleans', conference: 'NFC', division: 'South' },
    { name: 'Giants', abbreviation: 'NYG', city: 'New York', conference: 'NFC', division: 'East' },
    { name: 'Jets', abbreviation: 'NYJ', city: 'New York', conference: 'AFC', division: 'East' },
    { name: 'Eagles', abbreviation: 'PHI', city: 'Philadelphia', conference: 'NFC', division: 'East' },
    { name: 'Steelers', abbreviation: 'PIT', city: 'Pittsburgh', conference: 'AFC', division: 'North' },
    { name: '49ers', abbreviation: 'SF', city: 'San Francisco', conference: 'NFC', division: 'West' },
    { name: 'Seahawks', abbreviation: 'SEA', city: 'Seattle', conference: 'NFC', division: 'West' },
    { name: 'Buccaneers', abbreviation: 'TB', city: 'Tampa Bay', conference: 'NFC', division: 'South' },
    { name: 'Titans', abbreviation: 'TEN', city: 'Tennessee', conference: 'AFC', division: 'South' },
    { name: 'Commanders', abbreviation: 'WAS', city: 'Washington', conference: 'NFC', division: 'East' },
    { name: 'Raiders', abbreviation: 'LV', city: 'Las Vegas', conference: 'AFC', division: 'West' },
  ];
}

export { router as teamsRouter };
