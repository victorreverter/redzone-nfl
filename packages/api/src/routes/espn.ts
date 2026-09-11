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
    // Alias: schedule uses WSH but DB uses WAS
    const wasId = teamMap.get('was');
    if (wasId) teamMap.set('wsh', wasId);

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

// ESPN API integration for live scores
router.post('/sync/:seasonId', async (c) => {
  const { DB } = c.env;
  const seasonId = c.req.param('seasonId');
  const season = await DB.prepare('SELECT year FROM seasons WHERE id = ?').bind(seasonId).first() as any;
  if (!season) return c.json({ error: 'Season not found' }, 404);

  try {
    // Get team mapping
    const teams = await DB.prepare('SELECT id, abbreviation FROM teams').all();
    const teamMap = new Map<string, number>();
    for (const t of teams.results as any[]) {
      teamMap.set(t.abbreviation.toLowerCase(), t.id);
    }

    let updated = 0;
    let totalGames = 0;

    const fetchHeaders = {
      'User-Agent': 'curl/8.7.1',
      'Accept': '*/*',
    };

    // Fetch all weeks (1-18) from ESPN
    for (let week = 1; week <= 18; week++) {
      const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2&year=${season.year}&week=${week}`;

      const res = await fetch(url, { headers: fetchHeaders });
      if (!res.ok) {
        console.error(`ESPN week ${week} fetch failed: ${res.status} ${res.statusText}`);
        continue;
      }

      const data = await res.json() as any;
      const events = data.events || [];
      totalGames += events.length;

      for (const event of events) {
        const competition = event.competitions?.[0];
        if (!competition) continue;

        const homeTeam = competition.competitors?.find((c: any) => c.homeAway === 'home');
        const awayTeam = competition.competitors?.find((c: any) => c.homeAway === 'away');

        if (!homeTeam || !awayTeam) continue;

        const homeAbbr = homeTeam.team?.abbreviation?.toLowerCase();
        const awayAbbr = awayTeam.team?.abbreviation?.toLowerCase();

        const homeTeamId = teamMap.get(homeAbbr);
        const awayTeamId = teamMap.get(awayAbbr);

        if (!homeTeamId || !awayTeamId) continue;

        const status = competition.status?.type?.name || 'STATUS_SCHEDULED';
        const homeScore = parseInt(homeTeam.score) || 0;
        const awayScore = parseInt(awayTeam.score) || 0;
        const gameStatus = status === 'STATUS_FINAL' ? 'final' : status === 'STATUS_IN_PROGRESS' ? 'in_progress' : 'scheduled';

        // Update game in database
        const game = await DB.prepare(
          'SELECT id FROM games WHERE season_id = ? AND home_team_id = ? AND away_team_id = ? AND week = ?'
        ).bind(seasonId, homeTeamId, awayTeamId, week).first() as any;

        if (game) {
          await DB.prepare(
            'UPDATE games SET home_score = ?, away_score = ?, status = ?, updated_at = datetime(\'now\') WHERE id = ?'
          ).bind(homeScore, awayScore, gameStatus, game.id).run();

          // Calculate points if game is final
          if (gameStatus === 'final') {
            await calculatePointsForGame(DB, game.id, homeScore, awayScore);
          }

          updated++;
        }
      }
    }

    return c.json({ ok: true, updated, totalGames, seasonYear: season.year });
  } catch (e) {
    console.error('ESPN sync error:', e);
    return c.json({ error: `Failed to sync: ${(e as Error).message}` }, 500);
  }
});

// Calculate points for a specific game
async function calculatePointsForGame(DB: D1Database, gameId: number, actualHomeScore: number, actualAwayScore: number) {
  // Get prediction for this game
  const prediction = await DB.prepare(
    'SELECT * FROM predictions_weekly WHERE game_id = ?'
  ).bind(gameId).first() as any;

  if (!prediction) return;

  let points = 0;

  // Determine actual winner
  const game = await DB.prepare('SELECT home_team_id, away_team_id FROM games WHERE id = ?').bind(gameId).first() as any;
  if (!game) return;

  const actualWinner = actualHomeScore > actualAwayScore ? game.home_team_id 
                   : actualAwayScore > actualHomeScore ? game.away_team_id 
                   : null; // tie

  // Check if prediction matches actual result
  if (prediction.predicted_home_score !== null && prediction.predicted_away_score !== null) {
    // Exact score match = 5 points
    if (prediction.predicted_home_score === actualHomeScore && 
        prediction.predicted_away_score === actualAwayScore) {
      points = 5;
    }
    // Correct winner = 1 point
    else if (prediction.predicted_winner_team_id === actualWinner) {
      points = 1;
    }
  }

  // Update points in database
  await DB.prepare(
    'UPDATE predictions_weekly SET points_earned = ?, updated_at = datetime(\'now\') WHERE id = ?'
  ).bind(points, prediction.id).run();
}

export { router as espnRouter };
