import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { ArrowLeft, RefreshCw } from 'lucide-react';

interface Game {
  id: number;
  week: number;
  home_team_id: number;
  home_team_abbr: string;
  away_team_id: number;
  away_team_abbr: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
}

interface Award {
  id: number;
  award_type: string;
  player_name: string;
  team_id: number | null;
  team_name: string | null;
  locked: number;
}

const AWARD_ORDER = [
  'mvp',
  'opoy',
  'dpoy',
  'offensive_roty',
  'defensive_roty',
  'coach_of_year',
  'comeback_player',
  'super_bowl_mvp',
];

const AWARD_LABELS: Record<string, string> = {
  mvp: 'MVP',
  opoy: 'Off. Player of Year',
  dpoy: 'Def. Player of Year',
  offensive_roty: 'Off. Rookie of Year',
  defensive_roty: 'Def. Rookie of Year',
  coach_of_year: 'Coach of Year',
  comeback_player: 'Comeback Player',
  super_bowl_mvp: 'Super Bowl MVP',
};

type Tab = 'games' | 'awards';

export function Admin() {
  const [tab, setTab] = useState<Tab>('games');
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [initialWeek, setInitialWeek] = useState<number>(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const seasons = await api.get<{ id: number }[]>('/seasons');
        if (seasons.length > 0) {
          setSeasonId(seasons[0].id);
          const currentWeek = await api.get<{ week: number }>(`/games/current-week/${seasons[0].id}`);
          setInitialWeek(currentWeek.week);
        }
      } catch {
        setSeasonId(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nfl-blue" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/settings"
          aria-label="Back to Settings"
          className="p-2 bg-gridiron-surface border border-gridiron-border text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-nfl-red">Manual Overrides</p>
          <h1 className="text-3xl md:text-5xl font-display font-extrabold text-text-primary tracking-tight">
            Admin Panel
          </h1>
        </div>
      </div>

      <div className="flex gap-2">
        {(['games', 'awards'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold uppercase tracking-wider transition-all border ${
              tab === t
                ? 'bg-nfl-red text-white border-nfl-red'
                : 'bg-gridiron-surface text-text-secondary hover:text-text-primary border-gridiron-border'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'games' && seasonId && <GamesAdmin seasonId={seasonId} initialWeek={initialWeek} />}
      {tab === 'awards' && seasonId && <AwardsAdmin seasonId={seasonId} />}
    </div>
  );
}

function GamesAdmin({ seasonId, initialWeek }: { seasonId: number; initialWeek: number }) {
  const [week, setWeek] = useState(initialWeek);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await api.get<Game[]>(`/games?season_id=${seasonId}&week=${week}`);
        setGames(
          data.map((g) => ({
            ...g,
            home_score: g.home_score ?? null,
            away_score: g.away_score ?? null,
          }))
        );
      } catch {
        setGames([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [seasonId, week]);

  async function updateGame(gameId: number, homeScore: number, awayScore: number, status: string) {
    setSaving(gameId);
    setMessage('');
    try {
      await api.patch(`/games/${gameId}`, { home_score: homeScore, away_score: awayScore, status });
      setMessage(`Game #${gameId} updated.`);
    } catch (e: unknown) {
      setMessage(`Error: ${e instanceof Error ? e.message : 'Unknown'}`);
    } finally {
      setSaving(null);
    }
  }

  async function syncResults() {
    setSyncing(true);
    setSyncMessage('');
    try {
      const result = await api.post<{ ok: boolean; updated: number; totalGames: number; error?: string }>(
        `/espn/sync/${seasonId}`,
        {}
      );
      setSyncMessage(
        result.updated > 0
          ? `Synced ${result.updated} updated game${result.updated === 1 ? '' : 's'} from ESPN.`
          : 'All scores are already up to date.'
      );
      const data = await api.get<Game[]>(`/games?season_id=${seasonId}&week=${week}`);
      setGames(
        data.map((g) => ({ ...g, home_score: g.home_score ?? null, away_score: g.away_score ?? null }))
      );
    } catch (e: unknown) {
      setSyncMessage(`Sync failed: ${e instanceof Error ? e.message : 'Unknown'}`);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={week}
          onChange={(e) => setWeek(Number(e.target.value))}
          className="bg-gridiron-surface border-2 border-gridiron-border px-3.5 py-2 text-sm font-mono text-text-primary uppercase"
        >
          {Array.from({ length: 22 }, (_, i) => i + 1).map((w) => (
            <option key={w} value={w}>
              Week {w}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={syncResults}
          disabled={syncing}
          className={`flex items-center justify-center gap-2 text-white text-xs sm:text-sm px-4 py-2.5 font-semibold uppercase tracking-wider transition-all ${
            syncing ? 'bg-text-muted' : 'bg-nfl-red hover:bg-red-700'
          }`}
        >
          <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Syncing...' : 'Fetch ESPN Results'}
        </button>
      </div>

      {(message || syncMessage) && (
        <div className="flex flex-wrap items-center gap-3 text-sm font-medium">
          {message && <span className="text-nfl-green">{message}</span>}
          {syncMessage && (
            <span className={syncMessage.startsWith('Sync failed') ? 'text-nfl-red' : 'text-nfl-green'}>
              {syncMessage}
            </span>
          )}
        </div>
      )}

      {loading ? (
        <div className="text-text-secondary text-sm">Loading games...</div>
      ) : (
        <div className="space-y-2.5">
          {games.map((game) => (
            <GameRow key={game.id} game={game} onSave={updateGame} saving={saving === game.id} />
          ))}
          {games.length === 0 && (
            <div className="text-text-secondary text-sm p-5 bg-gridiron-surface border-2 border-gridiron-border">
              No games for Week {week}.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GameRow({
  game,
  onSave,
  saving,
}: {
  game: Game;
  onSave: (id: number, hs: number, as: number, status: string) => void;
  saving: boolean;
}) {
  const [awayScore, setAwayScore] = useState(game.away_score?.toString() ?? '');
  const [homeScore, setHomeScore] = useState(game.home_score?.toString() ?? '');
  const [status, setStatus] = useState(game.status);

  return (
    <div className="bg-gridiron-surface p-3.5 border border-gridiron-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div className="font-mono text-sm font-medium text-text-primary">
        {game.away_team_abbr} <span className="text-text-muted">@</span> {game.home_team_abbr}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="number"
          placeholder={game.away_team_abbr}
          aria-label={`${game.away_team_abbr} score`}
          value={awayScore}
          onChange={(e) => setAwayScore(e.target.value)}
          className="w-14 bg-gridiron-bg border border-gridiron-border px-2 py-1 text-sm text-center text-text-primary font-mono tabular-nums"
        />
        <span className="text-text-muted font-mono">-</span>
        <input
          type="number"
          placeholder={game.home_team_abbr}
          aria-label={`${game.home_team_abbr} score`}
          value={homeScore}
          onChange={(e) => setHomeScore(e.target.value)}
          className="w-14 bg-gridiron-bg border border-gridiron-border px-2 py-1 text-sm text-center text-text-primary font-mono tabular-nums"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-gridiron-bg border border-gridiron-border px-2.5 py-1 text-xs text-text-primary font-semibold uppercase"
        >
          <option value="scheduled">Scheduled</option>
          <option value="in_progress">In Progress</option>
          <option value="final">Final</option>
        </select>
        <button
          type="button"
          onClick={() => onSave(game.id, Number(homeScore) || 0, Number(awayScore) || 0, status)}
          disabled={saving}
          className="bg-nfl-green hover:bg-emerald-600 text-white px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50"
        >
          {saving ? '...' : 'Save'}
        </button>
      </div>
    </div>
  );
}

function AwardsAdmin({ seasonId }: { seasonId: number }) {
  const [awards, setAwards] = useState<Award[]>([]);
  const [forms, setForms] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await api.get<Award[]>(`/awards/${seasonId}`);
        const f: Record<string, string> = {};
        for (const type of AWARD_ORDER) {
          const pred = data.find((p) => p.award_type === type);
          f[type] = pred?.player_name ?? '';
        }
        setForms(f);
        setAwards(data);
      } catch {
        setForms({});
        setAwards([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [seasonId]);

  async function saveAward(type: string) {
    setSaving(type);
    setMessage('');
    try {
      await api.post('/awards', { season_id: seasonId, award_type: type, player_name: forms[type] || '' });
      setMessage(`${AWARD_LABELS[type]} updated.`);
      const data = await api.get<Award[]>(`/awards/${seasonId}`);
      setAwards(data);
    } catch (e: unknown) {
      setMessage(`Error: ${e instanceof Error ? e.message : 'Unknown'}`);
    } finally {
      setSaving(null);
    }
  }

  if (loading) return <div className="text-text-secondary text-sm">Loading awards...</div>;

  return (
    <div className="space-y-3">
      {message && <p className="text-sm text-nfl-green font-medium">{message}</p>}
      {AWARD_ORDER.map((type) => {
        const pred = awards.find((a) => a.award_type === type);
        return (
          <div
            key={type}
            className="bg-gridiron-surface p-3.5 border border-gridiron-border flex flex-col sm:flex-row items-start sm:items-center gap-3"
          >
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <span className="text-sm font-semibold text-text-primary">{AWARD_LABELS[type]}</span>
              {pred?.locked ? (
                <span className="text-[11px] bg-nfl-red/15 text-nfl-red px-2 py-0.5 font-mono uppercase">
                  Locked
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Player name"
                value={forms[type] ?? ''}
                onChange={(e) => setForms({ ...forms, [type]: e.target.value })}
                className="flex-1 sm:w-56 bg-gridiron-bg border border-gridiron-border px-3 py-1.5 text-sm text-text-primary"
              />
              <button
                type="button"
                onClick={() => saveAward(type)}
                disabled={saving === type}
                className="bg-nfl-green hover:bg-emerald-600 text-white px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                {saving === type ? '...' : 'Save'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
