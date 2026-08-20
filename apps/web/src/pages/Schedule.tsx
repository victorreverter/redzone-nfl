import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Check, RefreshCw } from 'lucide-react';

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

interface Prediction {
  game_id: number;
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
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const seasons = await api.get<{ id: number }[]>('/seasons');
        if (seasons.length === 0) { setLoading(false); return; }
        setSeasonId(seasons[0].id);

        const [gamesData, predictionsData] = await Promise.all([
          api.get<Game[]>(`/games?season_id=${seasons[0].id}&week=${selectedWeek}`),
          api.get<Prediction[]>(`/predictions/weekly/${seasons[0].id}?week=${selectedWeek}`),
        ]);

        // Merge predictions into games
        const mergedGames = gamesData.map(game => {
          const pred = predictionsData.find(p => p.game_id === game.id);
          return pred ? {
            ...game,
            predicted_winner_team_id: pred.predicted_winner_team_id,
            predicted_home_score: pred.predicted_home_score,
            predicted_away_score: pred.predicted_away_score,
            points_earned: pred.points_earned,
          } : game;
        });

        setGames(mergedGames);
        // Track which games have saved predictions
        setSavedGames(new Set(predictionsData.map(p => p.game_id)));
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

    // Update local state immediately
    setGames(prev => prev.map(g =>
      g.id === gameId
        ? { ...g, predicted_winner_team_id: winnerTeamId, predicted_home_score: homeScore ?? null, predicted_away_score: awayScore ?? null }
        : g
    ));
    
    // Mark as saved
    setSavedGames(prev => new Set(prev).add(gameId));
  }

  async function syncResults() {
    if (!seasonId) return;
    setSyncing(true);
    try {
      await api.post(`/espn/sync/${seasonId}`, {});
      // Reload games to show updated scores
      const [gamesData, predictionsData] = await Promise.all([
        api.get<Game[]>(`/games?season_id=${seasonId}&week=${selectedWeek}`),
        api.get<Prediction[]>(`/predictions/weekly/${seasonId}?week=${selectedWeek}`),
      ]);

      const mergedGames = gamesData.map(game => {
        const pred = predictionsData.find(p => p.game_id === game.id);
        return pred ? {
          ...game,
          predicted_winner_team_id: pred.predicted_winner_team_id,
          predicted_home_score: pred.predicted_home_score,
          predicted_away_score: pred.predicted_away_score,
          points_earned: pred.points_earned,
        } : game;
      });

      setGames(mergedGames);
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncing(false);
    }
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
        <h1 className="text-3xl md:text-4xl font-serif font-bold gradient-text">Weekly Schedule</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={syncResults}
            disabled={syncing}
            className={`flex items-center gap-2 text-white text-sm px-4 py-2 rounded-lg transition-all ${
              syncing ? 'bg-text-muted' : 'bg-nfl-red hover:bg-red-700 shadow-glow-red'
            }`}
          >
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing...' : 'Sync Results'}
          </button>
          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(Number(e.target.value))}
            className="bg-gridiron-surface border border-gridiron-border rounded-lg px-3 py-2 text-sm text-text-primary"
          >
            {Array.from({ length: 22 }, (_, i) => i + 1).map((w) => (
              <option key={w} value={w}>Week {w}</option>
            ))}
          </select>
        </div>
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
              isSaved={savedGames.has(game.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GameCard({ game, onSave, isSaved }: { game: Game; onSave: (gameId: number, winnerId: number | null, hs?: number, as?: number) => void; isSaved: boolean }) {
  const [homeScore, setHomeScore] = useState(game.predicted_home_score?.toString() ?? '');
  const [awayScore, setAwayScore] = useState(game.predicted_away_score?.toString() ?? '');
  const [selected, setSelected] = useState<number | null>(game.predicted_winner_team_id);
  const [saving, setSaving] = useState(false);

  const isFinal = game.status === 'final';
  const actualHomeScore = game.home_score;
  const actualAwayScore = game.away_score;
  const actualWinner = actualHomeScore !== null && actualAwayScore !== null
    ? actualHomeScore > actualAwayScore ? game.home_team_id
    : actualAwayScore > actualHomeScore ? game.away_team_id
    : null
    : null;

  // Determine prediction accuracy
  const predictionCorrect = isFinal && isSaved && selected === actualWinner;
  const exactScore = isFinal && isSaved && 
    game.predicted_home_score === actualHomeScore && 
    game.predicted_away_score === actualAwayScore;

  async function handleSave() {
    setSaving(true);
    await onSave(game.id, selected, homeScore ? Number(homeScore) : undefined, awayScore ? Number(awayScore) : undefined);
    setSaving(false);
  }

  return (
    <div className={`relative bg-gridiron-surface rounded-xl p-4 border-2 transition-all neumorphic ${
      isSaved ? 'border-nfl-green shadow-glow-green' : 'border-gridiron-border'
    }`}>
      {isSaved && (
        <div className="absolute top-2 right-2 bg-nfl-green rounded-full p-1 animate-check">
          <Check size={14} className="text-white" />
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-text-muted font-mono">
          {game.game_time ? new Date(game.game_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'TBD'}
        </span>
        {game.points_earned > 0 && (
          <span className="text-xs bg-nfl-green/20 text-nfl-green px-2 py-1 rounded-full font-mono font-bold">
            +{game.points_earned} pts
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 items-center">
        <button
          onClick={() => setSelected(game.home_team_id)}
          className={`text-center p-4 rounded-lg transition-all ${
            selected === game.home_team_id 
              ? 'bg-nfl-blue/20 ring-2 ring-nfl-blue shadow-glow' 
              : 'bg-gridiron-surface-hover hover:bg-gridiron-border'
          } ${isFinal && actualWinner === game.home_team_id ? 'ring-2 ring-nfl-green shadow-glow-green' : ''}`}
        >
          {game.home_team_logo && (
            <img src={game.home_team_logo} alt={game.home_team_abbr} className="w-12 h-12 mx-auto mb-2 object-contain" />
          )}
          <span className="text-sm font-bold hidden md:block text-text-primary">{game.home_team_city} {game.home_team_name}</span>
          <span className="text-sm font-bold md:hidden text-text-primary">{game.home_team_abbr}</span>
        </button>

        <div className="text-center">
          <div className="text-text-muted text-sm mb-2 font-mono">@</div>
          <button
            onClick={() => setSelected(null)}
            className={`text-xs px-3 py-1.5 rounded transition-all ${
              selected === null ? 'bg-text-muted text-text-primary' : 'bg-gridiron-surface-hover text-text-secondary hover:bg-gridiron-border'
            }`}
          >
            Tie
          </button>
        </div>

        <button
          onClick={() => setSelected(game.away_team_id)}
          className={`text-center p-4 rounded-lg transition-all ${
            selected === game.away_team_id 
              ? 'bg-nfl-blue/20 ring-2 ring-nfl-blue shadow-glow' 
              : 'bg-gridiron-surface-hover hover:bg-gridiron-border'
          } ${isFinal && actualWinner === game.away_team_id ? 'ring-2 ring-nfl-green shadow-glow-green' : ''}`}
        >
          {game.away_team_logo && (
            <img src={game.away_team_logo} alt={game.away_team_abbr} className="w-12 h-12 mx-auto mb-2 object-contain" />
          )}
          <span className="text-sm font-bold hidden md:block text-text-primary">{game.away_team_city} {game.away_team_name}</span>
          <span className="text-sm font-bold md:hidden text-text-primary">{game.away_team_abbr}</span>
        </button>
      </div>

      {/* Prediction inputs with official score */}
      <div className="mt-4 flex gap-3 items-center flex-wrap">
        <div className="flex items-center gap-2">
          <div className="text-xs text-text-secondary">Your prediction:</div>
          <input
            type="number"
            placeholder="Home"
            value={homeScore}
            onChange={(e) => setHomeScore(e.target.value)}
            className="w-16 bg-gridiron-bg border border-gridiron-border rounded px-2 py-1 text-sm text-center text-text-primary font-mono"
          />
          <span className="text-text-muted text-sm font-mono">-</span>
          <input
            type="number"
            placeholder="Away"
            value={awayScore}
            onChange={(e) => setAwayScore(e.target.value)}
            className="w-16 bg-gridiron-bg border border-gridiron-border rounded px-2 py-1 text-sm text-center text-text-primary font-mono"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <div className="text-xs text-text-secondary">Official:</div>
          {isFinal && actualHomeScore !== null && actualAwayScore !== null ? (
            <div className="flex items-center gap-1 bg-gridiron-bg border-2 border-nfl-blue rounded px-3 py-1 glow-blue">
              <span className="text-sm font-bold text-text-primary font-mono">{actualHomeScore}</span>
              <span className="text-text-muted font-mono">-</span>
              <span className="text-sm font-bold text-text-primary font-mono">{actualAwayScore}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-gridiron-bg border-2 border-dashed border-gridiron-border rounded px-3 py-1">
              <span className="text-xs text-text-muted italic">TBD</span>
            </div>
          )}
        </div>
        
        <button
          onClick={handleSave}
          disabled={saving}
          className={`ml-auto text-white text-sm px-4 py-1.5 rounded-lg transition-all ${
            saving ? 'bg-text-muted' : 'bg-gradient-to-r from-nfl-red to-nfl-blue hover:shadow-glow'
          }`}
        >
          {saving ? 'Saving...' : isSaved ? 'Update' : 'Save'}
        </button>
      </div>

      {/* Result badge */}
      {isFinal && isSaved && (
        <div className="mt-3 flex justify-end">
          {exactScore ? (
            <span className="text-xs bg-nfl-green/20 text-nfl-green px-2 py-1 rounded-full font-mono font-bold">
              Exact Score! +5 pts
            </span>
          ) : predictionCorrect ? (
            <span className="text-xs bg-nfl-blue/20 text-nfl-blue px-2 py-1 rounded-full font-mono font-bold">
              Correct Winner +1 pt
            </span>
          ) : (
            <span className="text-xs bg-nfl-red/20 text-nfl-red px-2 py-1 rounded-full font-mono font-bold">
              Wrong Prediction
            </span>
          )}
        </div>
      )}
    </div>
  );
}
