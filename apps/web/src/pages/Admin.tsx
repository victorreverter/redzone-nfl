import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { ArrowLeft } from 'lucide-react';

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

const AWARD_LABELS: Record<string, string> = {
  mvp: 'MVP', opoy: 'Off. Player of Year', dpoy: 'Def. Player of Year',
  offensive_roty: 'Off. Rookie of Year', defensive_roty: 'Def. Rookie of Year',
  coach_of_year: 'Coach of Year', comeback_player: 'Comeback Player', super_bowl_mvp: 'Super Bowl MVP',
};

type Tab = 'games' | 'awards';

export function Admin() {
  const [tab, setTab] = useState<Tab>('games');
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const seasons = await api.get<{ id: number }[]>('/seasons');
        if (seasons.length > 0) setSeasonId(seasons[0].id);
      } catch {} finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nfl-blue" /></div>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/settings" className="text-text-secondary hover:text-text-primary transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <motion.h1 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-3xl md:text-5xl font-oswald font-bold text-nfl-red uppercase tracking-tight"
        >
          Admin Panel
        </motion.h1>
      </div>

      <div className="flex gap-2">
        {(['games', 'awards'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-bold uppercase tracking-wide transition-all ${
              tab === t ? 'bg-nfl-red text-white' : 'bg-gridiron-surface text-text-secondary hover:bg-gridiron-surface-hover border-2 border-gridiron-border'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'games' && seasonId && <GamesAdmin seasonId={seasonId} />}
      {tab === 'awards' && seasonId && <AwardsAdmin seasonId={seasonId} />}
    </div>
  );
}

function GamesAdmin({ seasonId }: { seasonId: number }) {
  const [week, setWeek] = useState(1);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await api.get<Game[]>(`/games?season_id=${seasonId}&week=${week}`);
        setGames(data.map(g => ({
          ...g,
          home_score: g.home_score ?? null,
          away_score: g.away_score ?? null,
        })));
      } catch {} finally { setLoading(false); }
    }
    load();
  }, [seasonId, week]);

  async function updateGame(gameId: number, homeScore: number, awayScore: number, status: string) {
    setSaving(gameId);
    setMessage('');
    try {
      await api.patch(`/games/${gameId}`, { home_score: homeScore, away_score: awayScore, status });
      setMessage(`Game ${gameId} updated`);
    } catch (e: unknown) {
      setMessage(`Error: ${e instanceof Error ? e.message : 'Unknown'}`);
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select
          value={week}
          onChange={(e) => setWeek(Number(e.target.value))}
          className="bg-gridiron-surface border-2 border-gridiron-border px-4 py-2 text-base font-bold text-text-primary uppercase"
        >
          {Array.from({ length: 22 }, (_, i) => i + 1).map((w) => (
            <option key={w} value={w}>Week {w}</option>
          ))}
        </select>
        {message && <span className="text-sm text-nfl-green font-bold">{message}</span>}
      </div>

      {loading ? (
        <div className="text-text-secondary">Loading...</div>
      ) : (
        <div className="space-y-3">
          {games.map((game) => (
            <GameRow key={game.id} game={game} onSave={updateGame} saving={saving === game.id} />
          ))}
          {games.length === 0 && (
            <div className="text-text-secondary p-4 bg-gridiron-surface border-2 border-gridiron-border">
              No games for this week
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GameRow({ game, onSave, saving }: { game: Game; onSave: (id: number, hs: number, as: number, status: string) => void; saving: boolean }) {
  const [homeScore, setHomeScore] = useState(game.home_score?.toString() ?? '');
  const [awayScore, setAwayScore] = useState(game.away_score?.toString() ?? '');
  const [status, setStatus] = useState(game.status);

  return (
    <div className="bg-gridiron-surface p-3 md:p-4 border-2 border-gridiron-border flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <span className="text-sm md:text-base font-bold text-text-primary">
          {game.away_team_abbr} @ {game.home_team_abbr}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          placeholder="Home"
          value={homeScore}
          onChange={(e) => setHomeScore(e.target.value)}
          className="w-14 md:w-16 bg-gridiron-bg border-2 border-gridiron-border px-2 py-1 text-sm text-center text-text-primary font-mono"
        />
        <span className="text-text-muted">-</span>
        <input
          type="number"
          placeholder="Away"
          value={awayScore}
          onChange={(e) => setAwayScore(e.target.value)}
          className="w-14 md:w-16 bg-gridiron-bg border-2 border-gridiron-border px-2 py-1 text-sm text-center text-text-primary font-mono"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-gridiron-bg border-2 border-gridiron-border px-2 py-1 text-xs text-text-primary font-bold uppercase"
        >
          <option value="scheduled">Scheduled</option>
          <option value="in_progress">In Progress</option>
          <option value="final">Final</option>
        </select>
        <button
          onClick={() => onSave(game.id, Number(homeScore) || 0, Number(awayScore) || 0, status)}
          disabled={saving}
          className="bg-nfl-green hover:bg-green-700 text-white px-3 py-1 text-sm font-bold uppercase transition-all disabled:opacity-50"
        >
          {saving ? '...' : 'Save'}
        </button>
      </div>
    </div>
  );
}

function AwardsAdmin({ seasonId }: { seasonId: number }) {
  const [awards, setAwards] = useState<Award[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await api.get<Award[]>(`/awards/${seasonId}`);
        const f: Record<string, string> = {};
        for (const type of AWARD_ORDER) {
          const pred = data.find(p => p.award_type === type);
          f[type] = pred?.player_name ?? '';
        }
        setForms(f);
        setAwards(data);
      } catch {} finally { setLoading(false); }
    }
    load();
  }, [seasonId]);

  const [forms, setForms] = useState<Record<string, string>>({});

  async function saveAward(type: string) {
    setSaving(type);
    setMessage('');
    try {
      await api.post('/awards', { season_id: seasonId, award_type: type, player_name: forms[type] || '' });
      setMessage(`${AWARD_LABELS[type]} updated`);
      const data = await api.get<Award[]>(`/awards/${seasonId}`);
      setAwards(data);
    } catch (e: unknown) {
      setMessage(`Error: ${e instanceof Error ? e.message : 'Unknown'}`);
    } finally { setSaving(null); }
  }

  if (loading) return <div className="text-text-secondary">Loading...</div>;

  return (
    <div className="space-y-3">
      {message && <span className="text-sm text-nfl-green font-bold">{message}</span>}
      {AWARD_ORDER.map((type) => {
        const pred = awards.find(a => a.award_type === type);
        return (
          <div key={type} className="bg-gridiron-surface p-3 md:p-4 border-2 border-gridiron-border flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <span className="text-sm md:text-base font-bold text-text-primary">{AWARD_LABELS[type]}</span>
              {pred?.locked ? <span className="ml-2 text-xs bg-nfl-red/20 text-nfl-red px-2 py-0.5 font-mono">LOCKED</span> : null}
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Player name"
                value={forms[type] ?? ''}
                onChange={(e) => setForms({ ...forms, [type]: e.target.value })}
                className="flex-1 sm:w-48 bg-gridiron-bg border-2 border-gridiron-border px-3 py-1 text-sm text-text-primary"
              />
              <button
                onClick={() => saveAward(type)}
                disabled={saving === type}
                className="bg-nfl-green hover:bg-green-700 text-white px-3 py-1 text-sm font-bold uppercase transition-all disabled:opacity-50"
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

const AWARD_ORDER = ['mvp', 'opoy', 'dpoy', 'offensive_roty', 'defensive_roty', 'coach_of_year', 'comeback_player', 'super_bowl_mvp'];
