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

// Combined standings: records + division positions + playoff seeds
router.get('/standings/:seasonId', async (c) => {
  const { DB } = c.env;
  const seasonId = c.req.param('seasonId');

  // Get all teams with records
  const teamsWithRecords = await DB.prepare(`
    SELECT t.id, t.name, t.abbreviation, t.logo_url, t.conference, t.division,
           COALESCE(pr.predicted_wins, 0) as wins,
           COALESCE(pr.predicted_losses, 0) as losses
    FROM teams t
    LEFT JOIN predictions_record pr ON t.id = pr.team_id AND pr.season_id = ?
    ORDER BY t.conference, t.division, pr.predicted_wins DESC, pr.predicted_losses ASC
  `).bind(seasonId).all() as any[];

  // Get division predictions for drag order of 0-0 teams
  const divPreds = await DB.prepare(`
    SELECT pd.team_id, pd.predicted_position
    FROM predictions_division pd
    WHERE pd.season_id = ?
  `).bind(seasonId).all() as any[];
  const divPredMap = new Map<number, number>();
  for (const p of divPreds) divPredMap.set(p.team_id, p.predicted_position);

  // Build divisions
  const conferences = ['AFC', 'NFC'];
  const divNames = ['East', 'North', 'South', 'West'];
  const divData: Record<string, any[]> = {};

  for (const conf of conferences) {
    for (const div of divNames) {
      const key = `${conf}-${div}`;
      const divTeams = teamsWithRecords.filter(t => t.conference === conf && t.division === div);
      
      // Sort: teams with records first (by wins desc, losses asc), then 0-0 teams by drag order
      divTeams.sort((a, b) => {
        const aHasRecord = a.wins > 0 || a.losses > 0;
        const bHasRecord = b.wins > 0 || b.losses > 0;
        
        if (aHasRecord && bHasRecord) {
          if (a.wins !== b.wins) return b.wins - a.wins;
          return a.losses - b.losses;
        }
        if (aHasRecord && !bHasRecord) return -1;
        if (!aHasRecord && bHasRecord) return 1;
        
        // Both 0-0: use drag order
        const aPos = divPredMap.get(a.id) ?? 99;
        const bPos = divPredMap.get(b.id) ?? 99;
        return aPos - bPos;
      });

      divData[key] = divTeams.map((t, i) => ({
        team_id: t.id,
        team_name: t.name,
        team_abbr: t.abbreviation,
        logo_url: t.logo_url,
        wins: t.wins,
        losses: t.losses,
        position: i + 1,
      }));
    }
  }

  // Calculate seeds per conference
  const seeds: Record<string, any[]> = {};
  const wildcardCandidates: any[] = [];

  for (const conf of conferences) {
    const divWinners: any[] = [];
    const nonWinners: any[] = [];

    for (const div of divNames) {
      const key = `${conf}-${div}`;
      const divTeams = divData[key] || [];
      if (divTeams.length > 0) {
        divWinners.push({ ...divTeams[0], is_div_winner: true });
        nonWinners.push(...divTeams.slice(1));
      }
    }

    // Sort div winners by record
    divWinners.sort((a, b) => {
      if (a.wins !== b.wins) return b.wins - a.wins;
      return a.losses - b.losses;
    });

    // Sort non-winners by record
    nonWinners.sort((a, b) => {
      if (a.wins !== b.wins) return b.wins - a.wins;
      return a.losses - b.losses;
    });

    seeds[conf] = [
      ...divWinners.map((t, i) => ({ seed: i + 1, team_id: t.team_id, team_name: t.team_name, team_abbr: t.team_abbr, record: `${t.wins}-${t.losses}`, is_div_winner: true })),
      ...Array.from({ length: 3 }, (_, i) => {
        const t = nonWinners[i];
        return t ? { seed: i + 5, team_id: t.team_id, team_name: t.team_name, team_abbr: t.team_abbr, record: `${t.wins}-${t.losses}`, is_div_winner: false } : { seed: i + 5, team_id: null, team_name: null, team_abbr: null, record: null, is_div_winner: false };
      }),
    ];

    // Collect wildcard candidates (all non-winners with records)
    nonWinners.forEach(t => {
      if (t.wins > 0 || t.losses > 0) {
        wildcardCandidates.push({ team_id: t.team_id, team_name: t.team_name, record: `${t.wins}-${t.losses}`, conference: conf });
      }
    });
  }

  return c.json({ divisions: divData, seeds, wildcard_candidates: wildcardCandidates });
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

// Combined save: records + division positions
router.post('/standings', async (c) => {
  const { DB } = c.env;
  const { season_id, records, divisions } = await c.req.json();

  // Save records
  if (records && Array.isArray(records)) {
    for (const r of records) {
      await DB.prepare(
        `INSERT INTO predictions_record (season_id, team_id, predicted_wins, predicted_losses)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(season_id, team_id) DO UPDATE SET predicted_wins = ?, predicted_losses = ?, updated_at = datetime('now')`
      ).bind(season_id, r.team_id, r.wins, r.losses, r.wins, r.losses).run();
    }
  }

  // Save division positions (for 0-0 teams drag order)
  if (divisions && typeof divisions === 'object') {
    for (const [, teamIds] of Object.entries(divisions) as [string, number[]][]) {
      teamIds.forEach(async (teamId, index) => {
        await DB.prepare(
          `INSERT INTO predictions_division (season_id, team_id, predicted_position) 
           VALUES (?, ?, ?) 
           ON CONFLICT(season_id, team_id) DO UPDATE SET predicted_position = ?, updated_at = datetime('now')`
        ).bind(season_id, teamId, index + 1, index + 1).run();
      });
    }
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

router.get('/accuracy/:seasonId', async (c) => {
  const { DB } = c.env;
  const seasonId = c.req.param('seasonId');

  // Overall accuracy (all weeks)
  const overall = await DB.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN points_earned > 0 THEN 1 ELSE 0 END) as correct,
      SUM(COALESCE(points_earned, 0)) as points
    FROM predictions_weekly 
    WHERE season_id = ?
  `).bind(seasonId).first() as any;

  // Regular season (weeks 1-18)
  const regular = await DB.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN pw.points_earned > 0 THEN 1 ELSE 0 END) as correct
    FROM predictions_weekly pw
    JOIN games g ON pw.game_id = g.id
    WHERE pw.season_id = ? AND g.week <= 18
  `).bind(seasonId).first() as any;

  // Postseason (weeks 19+)
  const postseason = await DB.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN pw.points_earned > 0 THEN 1 ELSE 0 END) as correct
    FROM predictions_weekly pw
    JOIN games g ON pw.game_id = g.id
    WHERE pw.season_id = ? AND g.week > 18
  `).bind(seasonId).first() as any;

  const oTotal = overall?.total ?? 0;
  const oCorrect = overall?.correct ?? 0;
  const rTotal = regular?.total ?? 0;
  const rCorrect = regular?.correct ?? 0;
  const pTotal = postseason?.total ?? 0;
  const pCorrect = postseason?.correct ?? 0;

  return c.json({
    overall: {
      correct: oCorrect,
      total: oTotal,
      percentage: oTotal > 0 ? Math.round((oCorrect / oTotal) * 1000) / 10 : 0,
      points: overall?.points ?? 0,
    },
    regular: {
      correct: rCorrect,
      total: rTotal,
      percentage: rTotal > 0 ? Math.round((rCorrect / rTotal) * 1000) / 10 : 0,
    },
    postseason: {
      correct: pCorrect,
      total: pTotal,
      percentage: pTotal > 0 ? Math.round((pCorrect / pTotal) * 1000) / 10 : 0,
    },
  });
});

router.get('/accuracy/:seasonId/week/:week', async (c) => {
  const { DB } = c.env;
  const seasonId = c.req.param('seasonId');
  const week = parseInt(c.req.param('week'));

  const result = await DB.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN points_earned > 0 THEN 1 ELSE 0 END) as correct,
      SUM(COALESCE(points_earned, 0)) as points
    FROM predictions_weekly pw
    JOIN games g ON pw.game_id = g.id
    WHERE pw.season_id = ? AND g.week = ?
  `).bind(seasonId, week).first() as any;

  const total = result?.total ?? 0;
  const correct = result?.correct ?? 0;

  return c.json({
    week,
    correct,
    total,
    percentage: total > 0 ? Math.round((correct / total) * 1000) / 10 : 0,
    points: result?.points ?? 0,
  });
});

export { router as predictionsRouter };
