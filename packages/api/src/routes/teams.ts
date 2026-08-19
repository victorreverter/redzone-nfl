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

router.post('/update-logos', async (c) => {
  const { DB } = c.env;
  const teams = getNflTeams();
  let updated = 0;
  for (const t of teams) {
    const result = await DB.prepare(
      'UPDATE teams SET logo_url = ? WHERE abbreviation = ?'
    ).bind(t.logo, t.abbreviation).run();
    if (result.meta.changes > 0) updated++;
  }
  return c.json({ ok: true, updated });
});

router.post('/seed', async (c) => {
  const { DB } = c.env;
  const teams = getNflTeams();
  for (const t of teams) {
    await DB.prepare(
      'INSERT OR IGNORE INTO teams (name, abbreviation, city, conference, division, logo_url) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(t.name, t.abbreviation, t.city, t.conference, t.division, t.logo).run();
  }
  return c.json({ ok: true, count: teams.length });
});

function getNflTeams() {
  return [
    { name: 'Cardinals', abbreviation: 'ARI', city: 'Arizona', conference: 'NFC', division: 'West', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/ari.png' },
    { name: 'Falcons', abbreviation: 'ATL', city: 'Atlanta', conference: 'NFC', division: 'South', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/atl.png' },
    { name: 'Ravens', abbreviation: 'BAL', city: 'Baltimore', conference: 'AFC', division: 'North', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/bal.png' },
    { name: 'Bills', abbreviation: 'BUF', city: 'Buffalo', conference: 'AFC', division: 'East', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/buf.png' },
    { name: 'Panthers', abbreviation: 'CAR', city: 'Carolina', conference: 'NFC', division: 'South', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/car.png' },
    { name: 'Bears', abbreviation: 'CHI', city: 'Chicago', conference: 'NFC', division: 'North', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/chi.png' },
    { name: 'Bengals', abbreviation: 'CIN', city: 'Cincinnati', conference: 'AFC', division: 'North', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/cin.png' },
    { name: 'Browns', abbreviation: 'CLE', city: 'Cleveland', conference: 'AFC', division: 'North', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/cle.png' },
    { name: 'Cowboys', abbreviation: 'DAL', city: 'Dallas', conference: 'NFC', division: 'East', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/dal.png' },
    { name: 'Broncos', abbreviation: 'DEN', city: 'Denver', conference: 'AFC', division: 'West', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/den.png' },
    { name: 'Lions', abbreviation: 'DET', city: 'Detroit', conference: 'NFC', division: 'North', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/det.png' },
    { name: 'Packers', abbreviation: 'GB', city: 'Green Bay', conference: 'NFC', division: 'North', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/gb.png' },
    { name: 'Texans', abbreviation: 'HOU', city: 'Houston', conference: 'AFC', division: 'South', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/hou.png' },
    { name: 'Colts', abbreviation: 'IND', city: 'Indianapolis', conference: 'AFC', division: 'South', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/ind.png' },
    { name: 'Jaguars', abbreviation: 'JAX', city: 'Jacksonville', conference: 'AFC', division: 'South', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/jac.png' },
    { name: 'Chiefs', abbreviation: 'KC', city: 'Kansas City', conference: 'AFC', division: 'West', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/kc.png' },
    { name: 'Chargers', abbreviation: 'LAC', city: 'Los Angeles', conference: 'AFC', division: 'West', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/lac.png' },
    { name: 'Rams', abbreviation: 'LAR', city: 'Los Angeles', conference: 'NFC', division: 'West', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/lar.png' },
    { name: 'Dolphins', abbreviation: 'MIA', city: 'Miami', conference: 'AFC', division: 'East', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/mia.png' },
    { name: 'Vikings', abbreviation: 'MIN', city: 'Minnesota', conference: 'NFC', division: 'North', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/min.png' },
    { name: 'Patriots', abbreviation: 'NE', city: 'New England', conference: 'AFC', division: 'East', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/ne.png' },
    { name: 'Saints', abbreviation: 'NO', city: 'New Orleans', conference: 'NFC', division: 'South', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/no.png' },
    { name: 'Giants', abbreviation: 'NYG', city: 'New York', conference: 'NFC', division: 'East', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/nyg.png' },
    { name: 'Jets', abbreviation: 'NYJ', city: 'New York', conference: 'AFC', division: 'East', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/nyj.png' },
    { name: 'Eagles', abbreviation: 'PHI', city: 'Philadelphia', conference: 'NFC', division: 'East', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/phi.png' },
    { name: 'Steelers', abbreviation: 'PIT', city: 'Pittsburgh', conference: 'AFC', division: 'North', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/pit.png' },
    { name: '49ers', abbreviation: 'SF', city: 'San Francisco', conference: 'NFC', division: 'West', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/sf.png' },
    { name: 'Seahawks', abbreviation: 'SEA', city: 'Seattle', conference: 'NFC', division: 'West', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/sea.png' },
    { name: 'Buccaneers', abbreviation: 'TB', city: 'Tampa Bay', conference: 'NFC', division: 'South', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/tb.png' },
    { name: 'Titans', abbreviation: 'TEN', city: 'Tennessee', conference: 'AFC', division: 'South', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/ten.png' },
    { name: 'Commanders', abbreviation: 'WAS', city: 'Washington', conference: 'NFC', division: 'East', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/wsh.png' },
    { name: 'Raiders', abbreviation: 'LV', city: 'Las Vegas', conference: 'AFC', division: 'West', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/lv.png' },
  ];
}

export { router as teamsRouter };
