import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface Game {
  id: number;
  week: number;
  home_team_id: number;
  home_team_abbr: string;
  home_team_name: string;
  away_team_id: number;
  away_team_abbr: string;
  away_team_name: string;
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

  async function savePrediction(gameId: number, winnerTeamId: number, homeScore?: number, awayScore?: number) {
    if (!seasonId) return;
    await api.post('/predictions/weekly', {
      season_id: seasonId,
      game_id: gameId,
      predicted_winner_team_id: winnerTeamId,
      predicted_home_score: homeScore ?? null,
      predicted_away_score: awayScore ?? null,
    });
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
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GameCard({ game, onSave }: { game: Game; onSave: (gameId: number, winnerId: number, hs?: number, as?: number) => void }) {
  const [homeScore, setHomeScore] = useState(game.predicted_home_score?.toString() ?? '');
  const [awayScore, setAwayScore] = useState(game.predicted_away_score?.toString() ?? '');
  const [selected, setSelected] = useState<number | null>(game.predicted_winner_team_id);

  return (
    <div className="bg-dark-800 rounded-xl p-4 border border-dark-600">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-500">
          {game.game_time ? new Date(game.game_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'TBD'}
        </span>
        {game.points_earned > 0 && (
          <span className="text-xs bg-green-900 text-green-400 px-2 py-1 rounded-full">
            +{game.points_earned} pts
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 items-center">
        <button
          onClick={() => { setSelected(game.home_team_id); }}
          className={`text-center p-2 rounded-lg transition-colors ${
            selected === game.home_team_id ? 'bg-nfl-blue' : 'bg-dark-700 hover:bg-dark-600'
          }`}
        >
          <span className="text-sm font-bold">{game.home_team_abbr}</span>
          {game.home_score !== null && <span className="block text-lg font-bold mt-1">{game.home_score}</span>}
        </button>

        <div className="text-center text-gray-500 text-sm">@</div>

        <button
          onClick={() => { setSelected(game.away_team_id); }}
          className={`text-center p-2 rounded-lg transition-colors ${
            selected === game.away_team_id ? 'bg-nfl-blue' : 'bg-dark-700 hover:bg-dark-600'
          }`}
        >
          <span className="text-sm font-bold">{game.away_team_abbr}</span>
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
          onClick={() => {
            if (selected) {
              onSave(game.id, selected, homeScore ? Number(homeScore) : undefined, awayScore ? Number(awayScore) : undefined);
            }
          }}
          className="ml-auto bg-nfl-blue hover:bg-blue-800 text-white text-sm px-4 py-1.5 rounded-lg transition-colors"
        >
          Save
        </button>
      </div>
    </div>
  );
}
