import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Check } from 'lucide-react';

interface Game {
  id: number;
  week: number;
  home_team_id: number;
  home_team_abbr: string;
  home_team_name: string;
  home_team_city: string;
  home_team_logo: string | null;
  away_team_id: number;
  away_team_abbr: string;
  away_team_name: string;
  away_team_city: string;
  away_team_logo: string | null;
  home_score: number | null;
  away_score: number | null;
  status: string;
  game_time: string;
  predicted_winner_team_id: number | null;
  predicted_home_score: number | null;
  predicted_away_score: number | null;
  points_earned: number;
}

export function Schedule() {
  const [games, setGames] = useState<Game[]>([]);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedGames, setSavedGames] = useState<Set<number>>(new Set());

  useEffect(() => {
    async function load() {
      try {
        const seasons = await api.get<{ id: number }[]>('/seasons');
        if (seasons.length === 0) { setLoading(false); return; }
        setSeasonId(seasons[0].id);

        const gamesData = await api.get<Game[]>(`/games?season_id=${seasons[0].id}&week=${selectedWeek}`);
        setGames(gamesData);
      } catch {
        // API not ready
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedWeek]);

  async function savePrediction(gameId: number, winnerTeamId: number | null, homeScore?: number, awayScore?: number) {
    if (!seasonId) return;
    await api.post('/predictions/weekly', {
      season_id: seasonId,
      game_id: gameId,
      predicted_winner_team_id: winnerTeamId,
      predicted_home_score: homeScore ?? null,
      predicted_away_score: awayScore ?? null,
    });
    setSavedGames(prev => new Set(prev).add(gameId));
    setTimeout(() => {
      setSavedGames(prev => {
        const next = new Set(prev);
        next.delete(gameId);
        return next;
      });
    }, 2000);
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nfl-blue" /></div>;
  }

  if (!seasonId) {
    return <div className="text-center text-gray-400 mt-12">Create a season first in Settings</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold">Weekly Schedule</h1>
        <select
          value={selectedWeek}
          onChange={(e) => setSelectedWeek(Number(e.target.value))}
          className="bg-dark-700 border border-dark-500 rounded-lg px-3 py-2 text-sm"
        >
          {Array.from({ length: 22 }, (_, i) => i + 1).map((w) => (
            <option key={w} value={w}>Week {w}</option>
          ))}
        </select>
      </div>

      {games.length === 0 ? (
        <div className="bg-dark-800 rounded-xl p-8 border border-dark-600 text-center text-gray-400">
          No games for this week yet. Import schedule from Settings.
        </div>
      ) : (
        <div className="space-y-3">
          {games.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              onSave={savePrediction}
              saved={savedGames.has(game.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GameCard({ game, onSave, saved }: { game: Game; onSave: (gameId: number, winnerId: number | null, hs?: number, as?: number) => void; saved: boolean }) {
  const [homeScore, setHomeScore] = useState(game.predicted_home_score?.toString() ?? '');
  const [awayScore, setAwayScore] = useState(game.predicted_away_score?.toString() ?? '');
  const [selected, setSelected] = useState<number | null>(game.predicted_winner_team_id);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave(game.id, selected, homeScore ? Number(homeScore) : undefined, awayScore ? Number(awayScore) : undefined);
    setSaving(false);
  }

  return (
    <div className="bg-dark-800 rounded-xl p-4 border border-dark-600">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-500">
          {game.game_time ? new Date(game.game_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'TBD'}
        </span>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-xs bg-green-900 text-green-400 px-2 py-1 rounded-full flex items-center gap-1">
              <Check size={12} /> Saved
            </span>
          )}
          {game.points_earned > 0 && (
            <span className="text-xs bg-green-900 text-green-400 px-2 py-1 rounded-full">
              +{game.points_earned} pts
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 items-center">
        <button
          onClick={() => setSelected(game.home_team_id)}
          className={`text-center p-3 rounded-lg transition-all ${
            selected === game.home_team_id ? 'bg-nfl-blue ring-2 ring-nfl-blue' : 'bg-dark-700 hover:bg-dark-600'
          }`}
        >
          {game.home_team_logo && (
            <img src={game.home_team_logo} alt={game.home_team_abbr} className="w-10 h-10 mx-auto mb-1 object-contain" />
          )}
          <span className="text-sm font-bold hidden md:block">{game.home_team_city} {game.home_team_name}</span>
          <span className="text-sm font-bold md:hidden">{game.home_team_abbr}</span>
          {game.home_score !== null && <span className="block text-lg font-bold mt-1">{game.home_score}</span>}
        </button>

        <div className="text-center">
          <div className="text-gray-500 text-sm mb-2">@</div>
          <button
            onClick={() => setSelected(null)}
            className={`text-xs px-2 py-1 rounded transition-all ${
              selected === null ? 'bg-gray-600 text-white' : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
            }`}
          >
            Tie
          </button>
        </div>

        <button
          onClick={() => setSelected(game.away_team_id)}
          className={`text-center p-3 rounded-lg transition-all ${
            selected === game.away_team_id ? 'bg-nfl-blue ring-2 ring-nfl-blue' : 'bg-dark-700 hover:bg-dark-600'
          }`}
        >
          {game.away_team_logo && (
            <img src={game.away_team_logo} alt={game.away_team_abbr} className="w-10 h-10 mx-auto mb-1 object-contain" />
          )}
          <span className="text-sm font-bold hidden md:block">{game.away_team_city} {game.away_team_name}</span>
          <span className="text-sm font-bold md:hidden">{game.away_team_abbr}</span>
          {game.away_score !== null && <span className="block text-lg font-bold mt-1">{game.away_score}</span>}
        </button>
      </div>

      <div className="mt-3 flex gap-2 items-center">
        <input
          type="number"
          placeholder="Home"
          value={homeScore}
          onChange={(e) => setHomeScore(e.target.value)}
          className="w-20 bg-dark-700 border border-dark-500 rounded px-2 py-1 text-sm text-center"
        />
        <span className="text-gray-500 text-sm">-</span>
        <input
          type="number"
          placeholder="Away"
          value={awayScore}
          onChange={(e) => setAwayScore(e.target.value)}
          className="w-20 bg-dark-700 border border-dark-500 rounded px-2 py-1 text-sm text-center"
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className={`ml-auto text-white text-sm px-4 py-1.5 rounded-lg transition-all ${
            saved ? 'bg-green-600' : saving ? 'bg-gray-600' : 'bg-nfl-blue hover:bg-blue-800'
          }`}
        >
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save'}
        </button>
      </div>
    </div>
  );
}
