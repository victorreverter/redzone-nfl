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

const BATCH_SIZE = 100;

async function runBatched(DB: D1Database, statements: D1PreparedStatement[]) {
  for (let i = 0; i < statements.length; i += BATCH_SIZE) {
    await DB.batch(statements.slice(i, i + BATCH_SIZE));
  }
}

router.post('/import-schedule/:seasonId', async (c) => {
  const { DB } = c.env;
  const seasonId = c.req.param('seasonId');
  const season = await DB.prepare('SELECT year FROM seasons WHERE id = ?').bind(seasonId).first() as { year: number } | null;
  if (!season) return c.json({ error: 'Season not found' }, 404);

  try {
    const [teamsRes, existingRes] = await DB.batch([
      DB.prepare('SELECT id, name, abbreviation, city FROM teams'),
      DB.prepare('SELECT week, home_team_id, away_team_id FROM games WHERE season_id = ?').bind(seasonId),
    ]);

    const teamMap = new Map<string, number>();
    for (const t of teamsRes.results as Array<{ id: number; name: string; abbreviation: string; city: string }>) {
      teamMap.set(t.abbreviation.toLowerCase(), t.id);
      teamMap.set(t.name.toLowerCase(), t.id);
      teamMap.set(`${t.city} ${t.name}`.toLowerCase(), t.id);
    }
    // Alias: schedule uses WSH but DB uses WAS
    const wasId = teamMap.get('was');
    if (wasId) teamMap.set('wsh', wasId);

    const existingKeys = new Set<string>();
    for (const g of existingRes.results as Array<{ week: number; home_team_id: number; away_team_id: number }>) {
      existingKeys.add(`${g.week}:${g.home_team_id}:${g.away_team_id}`);
    }

    const insertStmt = DB.prepare(
      'INSERT INTO games (season_id, week, home_team_id, away_team_id, game_time, status) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const statements: D1PreparedStatement[] = [];

    for (const game of schedule) {
      const homeTeamId = teamMap.get(game.home.toLowerCase());
      const awayTeamId = teamMap.get(game.away.toLowerCase());

      if (!homeTeamId || !awayTeamId) {
        console.log(`Skipping: ${game.away} @ ${game.home} - teams not found`);
        continue;
      }

      const key = `${game.week}:${homeTeamId}:${awayTeamId}`;
      if (existingKeys.has(key)) continue;
      existingKeys.add(key);

      statements.push(insertStmt.bind(seasonId, game.week, homeTeamId, awayTeamId, game.date, 'scheduled'));
    }

    await runBatched(DB, statements);

    return c.json({ ok: true, imported: statements.length, total: schedule.length });
  } catch (e) {
    return c.json({ error: `Failed to import: ${(e as Error).message}` }, 500);
  }
});

interface GameRow {
  id: number;
  week: number;
  home_team_id: number;
  away_team_id: number;
  home_score: number | null;
  away_score: number | null;
  status: string;
}

interface PredictionRow {
  id: number;
  game_id: number;
  predicted_winner_team_id: number | null;
  predicted_home_score: number | null;
  predicted_away_score: number | null;
  points_earned: number;
}

function computePredictionPoints(
  prediction: PredictionRow,
  homeTeamId: number,
  awayTeamId: number,
  actualHomeScore: number,
  actualAwayScore: number
): number {
  let points = 0;
  const actualWinner =
    actualHomeScore > actualAwayScore
      ? homeTeamId
      : actualAwayScore > actualHomeScore
        ? awayTeamId
        : null;

  if (prediction.predicted_home_score !== null && prediction.predicted_away_score !== null) {
    if (
      prediction.predicted_home_score === actualHomeScore &&
      prediction.predicted_away_score === actualAwayScore
    ) {
      points = 5;
    } else if (prediction.predicted_winner_team_id === actualWinner) {
      points = 1;
    }
  }

  return points;
}

export interface EspnSyncResult {
  ok: true;
  updated: number;
  totalGames: number;
  seasonYear: number;
}

export async function syncSeasonFromEspn(
  DB: D1Database,
  seasonId: number | string,
  parsedWeek: number | null = null
): Promise<EspnSyncResult | null> {
  const season = await DB.prepare('SELECT year FROM seasons WHERE id = ?').bind(seasonId).first() as { year: number } | null;
  if (!season) return null;

  const weeks = parsedWeek ? [parsedWeek] : Array.from({ length: 18 }, (_, i) => i + 1);

  // Load teams, games, and weekly predictions in a single D1 batch (1 subrequest)
  const gamesQuery = parsedWeek
    ? DB.prepare('SELECT id, week, home_team_id, away_team_id, home_score, away_score, status FROM games WHERE season_id = ? AND week = ?').bind(seasonId, parsedWeek)
    : DB.prepare('SELECT id, week, home_team_id, away_team_id, home_score, away_score, status FROM games WHERE season_id = ?').bind(seasonId);

  const [teamsRes, gamesRes, predictionsRes] = await DB.batch([
    DB.prepare('SELECT id, abbreviation FROM teams'),
    gamesQuery,
    DB.prepare('SELECT id, game_id, predicted_winner_team_id, predicted_home_score, predicted_away_score, points_earned FROM predictions_weekly WHERE season_id = ?').bind(seasonId),
  ]);

  const teamMap = new Map<string, number>();
  for (const t of teamsRes.results as Array<{ id: number; abbreviation: string }>) {
    teamMap.set(t.abbreviation.toLowerCase(), t.id);
  }
  // Alias: ESPN uses WSH but DB uses WAS
  const wasId = teamMap.get('was');
  if (wasId) teamMap.set('wsh', wasId);

  const gameMap = new Map<string, GameRow>();
  for (const g of gamesRes.results as GameRow[]) {
    gameMap.set(`${g.week}:${g.home_team_id}:${g.away_team_id}`, g);
  }

  const predictionByGameId = new Map<number, PredictionRow>();
  for (const p of predictionsRes.results as PredictionRow[]) {
    predictionByGameId.set(p.game_id, p);
  }

  const fetchHeaders = {
    'User-Agent': 'curl/8.7.1',
    'Accept': '*/*',
  };

  // Fetch ESPN scoreboards in chunks of 6 to stay within Cloudflare's concurrent connection limit
  const weekResults: Array<{ week: number; events: any[] }> = [];
  for (let i = 0; i < weeks.length; i += 6) {
    const chunk = weeks.slice(i, i + 6);
    const chunkData = await Promise.all(
      chunk.map(async (week) => {
        const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2&year=${season.year}&week=${week}`;
        const res = await fetch(url, { headers: fetchHeaders });
        if (!res.ok) {
          console.error(`ESPN week ${week} fetch failed: ${res.status} ${res.statusText}`);
          return { week, events: [] };
        }
        const data = await res.json() as { events?: any[] };
        return { week, events: data.events || [] };
      })
    );
    weekResults.push(...chunkData);
  }

  const updateGameStmt = DB.prepare(
    'UPDATE games SET home_score = ?, away_score = ?, status = ?, updated_at = datetime(\'now\') WHERE id = ?'
  );
  const updatePredictionStmt = DB.prepare(
    'UPDATE predictions_weekly SET points_earned = ?, updated_at = datetime(\'now\') WHERE id = ?'
  );

  const writeStatements: D1PreparedStatement[] = [];
  let updated = 0;
  let totalGames = 0;

  for (const { week, events } of weekResults) {
    totalGames += events.length;

    for (const event of events) {
      const competition = event.competitions?.[0];
      if (!competition) continue;

      const homeTeam = competition.competitors?.find((comp: any) => comp.homeAway === 'home');
      const awayTeam = competition.competitors?.find((comp: any) => comp.homeAway === 'away');
      if (!homeTeam || !awayTeam) continue;

      const homeAbbr = homeTeam.team?.abbreviation?.toLowerCase();
      const awayAbbr = awayTeam.team?.abbreviation?.toLowerCase();

      const homeTeamId = homeAbbr ? teamMap.get(homeAbbr) : undefined;
      const awayTeamId = awayAbbr ? teamMap.get(awayAbbr) : undefined;

      if (!homeTeamId || !awayTeamId) {
        console.log(`Skipping ESPN event ${event.name}: unknown abbreviation ${homeAbbr}/${awayAbbr}`);
        continue;
      }

      const game = gameMap.get(`${week}:${homeTeamId}:${awayTeamId}`);
      if (!game) continue;

      const status = competition.status?.type?.name || 'STATUS_SCHEDULED';
      const homeScore = parseInt(homeTeam.score, 10) || 0;
      const awayScore = parseInt(awayTeam.score, 10) || 0;
      const gameStatus =
        status === 'STATUS_FINAL'
          ? 'final'
          : status === 'STATUS_IN_PROGRESS'
            ? 'in_progress'
            : 'scheduled';

      const gameChanged =
        game.home_score !== homeScore ||
        game.away_score !== awayScore ||
        game.status !== gameStatus;

      if (gameChanged) {
        writeStatements.push(updateGameStmt.bind(homeScore, awayScore, gameStatus, game.id));
        updated++;
      }

      if (gameStatus === 'final') {
        const prediction = predictionByGameId.get(game.id);
        if (prediction) {
          const points = computePredictionPoints(
            prediction,
            game.home_team_id,
            game.away_team_id,
            homeScore,
            awayScore
          );
          if (prediction.points_earned !== points) {
            writeStatements.push(updatePredictionStmt.bind(points, prediction.id));
          }
        }
      }
    }
  }

  await runBatched(DB, writeStatements);

  return { ok: true, updated, totalGames, seasonYear: season.year };
}

// ESPN API integration for live scores
router.post('/sync/:seasonId', async (c) => {
  const { DB } = c.env;
  const seasonId = c.req.param('seasonId');
  const weekParam = c.req.query('week');
  const parsedWeek = weekParam ? Number(weekParam) : null;

  if (weekParam && (!Number.isInteger(parsedWeek) || parsedWeek! < 1 || parsedWeek! > 18)) {
    return c.json({ error: 'Invalid week parameter (expected 1-18)' }, 400);
  }

  try {
    const result = await syncSeasonFromEspn(DB, seasonId, parsedWeek);
    if (!result) return c.json({ error: 'Season not found' }, 404);
    return c.json(result);
  } catch (e) {
    console.error('ESPN sync error:', e);
    return c.json({ error: `Failed to sync: ${(e as Error).message}` }, 500);
  }
});

export { router as espnRouter };
