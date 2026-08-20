import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { shortenCity } from '../lib/utils';
import { Check, RefreshCw, BarChart3 } from 'lucide-react';

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
  const [weekAccuracy, setWeekAccuracy] = useState<{ correct: number; total: number; percentage: number } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const seasons = await api.get<{ id: number }[]>('/seasons');
        if (seasons.length === 0) { setLoading(false); return; }
        setSeasonId(seasons[0].id);

        const [gamesData, predictionsData, accuracyData] = await Promise.all([
          api.get<Game[]>(`/games?season_id=${seasons[0].id}&week=${selectedWeek}`),
          api.get<Prediction[]>(`/predictions/weekly/${seasons[0].id}?week=${selectedWeek}`),
          api.get<{ correct: number; total: number; percentage: number }>(`/predictions/accuracy/${seasons[0].id}/week/${selectedWeek}`),
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
        setSavedGames(new Set(predictionsData.map(p => p.game_id)));
        setWeekAccuracy(accuracyData);
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
    return <div className="text-center text-text-secondary mt-12 uppercase tracking-wide">Create a season first in Settings</div>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <motion.h1 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-3xl md:text-5xl lg:text-6xl font-serif font-bold gradient-text uppercase tracking-tight"
      >
        Weekly Schedule
      </motion.h1>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <select
          value={selectedWeek}
          onChange={(e) => setSelectedWeek(Number(e.target.value))}
          className="bg-gridiron-surface border-2 border-gridiron-border px-4 py-2.5 text-base font-bold text-text-primary uppercase flex-1 sm:flex-none"
        >
          {Array.from({ length: 22 }, (_, i) => i + 1).map((w) => (
            <option key={w} value={w}>Week {w}</option>
          ))}
        </select>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={syncResults}
          disabled={syncing}
          className={`flex items-center justify-center gap-2 text-white text-sm px-5 py-2.5 font-bold uppercase tracking-wide transition-all ${
            syncing ? 'bg-text-muted' : 'bg-nfl-red hover:bg-red-800 shadow-glow-red'
          }`}
        >
          <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Syncing...' : 'Sync Results'}
        </motion.button>
      </div>

      {weekAccuracy && weekAccuracy.total > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gridiron-surface p-3 md:p-4 border-2 border-gridiron-border neumorphic flex items-center justify-between"
        >
          <div className="flex items-center gap-2 md:gap-3">
            <BarChart3 size={18} className="text-nfl-green" />
            <span className="text-sm md:text-base text-text-secondary font-bold uppercase tracking-wide">
              Week {selectedWeek} Accuracy
            </span>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <span className="text-sm md:text-base font-mono font-bold text-text-primary">
              {weekAccuracy.correct}/{weekAccuracy.total}
            </span>
            <span className={`text-lg md:text-xl font-bold font-mono ${
              weekAccuracy.percentage >= 70 ? 'text-nfl-green' : 
              weekAccuracy.percentage >= 40 ? 'text-nfl-yellow' : 'text-nfl-red'
            }`}>
              {weekAccuracy.percentage}%
            </span>
          </div>
        </motion.div>
      )}

      {games.length === 0 ? (
        <div className="bg-gridiron-surface p-8 border-2 border-gridiron-border text-center text-text-secondary">
          No games for this week yet. Import schedule from Settings.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`relative bg-gridiron-surface p-3 md:p-5 border-2 transition-all neumorphic ${
        isSaved ? 'border-nfl-green shadow-glow-green' : 'border-gridiron-border'
      }`}
    >
      {isSaved && (
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-3 right-3 bg-nfl-green p-1.5"
        >
          <Check size={16} className="text-white" />
        </motion.div>
      )}

      <div className="flex items-center justify-between mb-3 md:mb-4">
        <span className="text-xs md:text-sm text-text-muted font-mono uppercase tracking-wide">
          {game.game_time ? new Date(game.game_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'TBD'}
        </span>
        {game.points_earned > 0 && (
          <span className="text-xs md:text-sm bg-nfl-green/20 text-nfl-green px-2 md:px-3 py-1 font-mono font-bold uppercase">
            +{game.points_earned} pts
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 md:gap-4 items-center">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setSelected(game.home_team_id)}
          className={`text-center p-2 md:p-5 transition-all ${
            selected === game.home_team_id 
              ? 'bg-nfl-blue/20 ring-2 ring-nfl-blue shadow-glow' 
              : 'bg-gridiron-surface-hover hover:bg-gridiron-border'
          } ${isFinal && actualWinner === game.home_team_id ? 'ring-2 ring-nfl-green shadow-glow-green' : ''}`}
        >
          {game.home_team_logo && (
            <img src={game.home_team_logo} alt={game.home_team_abbr} className="w-10 h-10 md:w-16 md:h-16 mx-auto mb-1 md:mb-2 object-contain" />
          )}
          <span className="text-sm md:text-base font-bold hidden md:block text-text-primary uppercase tracking-wide">{shortenCity(game.home_team_city)} {game.home_team_name}</span>
          <span className="text-xs md:text-sm font-bold md:hidden text-text-primary uppercase">{game.home_team_abbr}</span>
        </motion.button>

        <div className="text-center">
          <div className="text-text-muted text-base md:text-lg mb-1 md:mb-2 font-mono font-bold">@</div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelected(null)}
            className={`text-xs md:text-sm px-3 md:px-4 py-1.5 md:py-2 font-bold uppercase tracking-wide transition-all ${
              selected === null ? 'bg-text-muted text-text-primary' : 'bg-gridiron-surface-hover text-text-secondary hover:bg-gridiron-border'
            }`}
          >
            Tie
          </motion.button>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setSelected(game.away_team_id)}
          className={`text-center p-2 md:p-5 transition-all ${
            selected === game.away_team_id 
              ? 'bg-nfl-blue/20 ring-2 ring-nfl-blue shadow-glow' 
              : 'bg-gridiron-surface-hover hover:bg-gridiron-border'
          } ${isFinal && actualWinner === game.away_team_id ? 'ring-2 ring-nfl-green shadow-glow-green' : ''}`}
        >
          {game.away_team_logo && (
            <img src={game.away_team_logo} alt={game.away_team_abbr} className="w-10 h-10 md:w-16 md:h-16 mx-auto mb-1 md:mb-2 object-contain" />
          )}
          <span className="text-sm md:text-base font-bold hidden md:block text-text-primary uppercase tracking-wide">{shortenCity(game.away_team_city)} {game.away_team_name}</span>
          <span className="text-xs md:text-sm font-bold md:hidden text-text-primary uppercase">{game.away_team_abbr}</span>
        </motion.button>
      </div>

      {/* Prediction inputs with official score */}
      <div className="mt-4 md:mt-5 space-y-3 md:space-y-0 md:flex md:gap-3 md:items-center md:flex-wrap">
        <div className="flex items-center gap-2">
          <div className="text-xs md:text-sm text-text-secondary font-bold uppercase tracking-wide">Prediction:</div>
          <input
            type="number"
            placeholder="Home"
            value={homeScore}
            onChange={(e) => setHomeScore(e.target.value)}
            className="w-16 md:w-20 bg-gridiron-bg border-2 border-gridiron-border px-2 md:px-3 py-1.5 md:py-2 text-sm md:text-base text-center text-text-primary font-mono font-bold"
          />
          <span className="text-text-muted text-base md:text-lg font-mono font-bold">-</span>
          <input
            type="number"
            placeholder="Away"
            value={awayScore}
            onChange={(e) => setAwayScore(e.target.value)}
            className="w-16 md:w-20 bg-gridiron-bg border-2 border-gridiron-border px-2 md:px-3 py-1.5 md:py-2 text-sm md:text-base text-center text-text-primary font-mono font-bold"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <div className="text-xs md:text-sm text-text-secondary font-bold uppercase tracking-wide">Official:</div>
          {isFinal && actualHomeScore !== null && actualAwayScore !== null ? (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-1 md:gap-2 bg-gridiron-bg border-2 border-nfl-blue px-2 md:px-4 py-1.5 md:py-2 glow-blue"
            >
              <span className="text-base md:text-lg font-bold text-text-primary font-mono">{actualHomeScore}</span>
              <span className="text-text-muted font-mono font-bold">-</span>
              <span className="text-base md:text-lg font-bold text-text-primary font-mono">{actualAwayScore}</span>
            </motion.div>
          ) : (
            <div className="flex items-center gap-1 md:gap-2 bg-gridiron-bg border-2 border-dashed border-gridiron-border px-2 md:px-4 py-1.5 md:py-2">
              <span className="text-xs md:text-sm text-text-muted italic uppercase">TBD</span>
            </div>
          )}
        </div>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSave}
          disabled={saving}
          className={`md:ml-auto w-full md:w-auto text-white text-sm px-4 md:px-6 py-2 md:py-2.5 font-bold uppercase tracking-wide transition-all ${
            saving ? 'bg-text-muted' : 'bg-gradient-to-r from-nfl-red to-nfl-blue hover:shadow-glow'
          }`}
        >
          {saving ? 'Saving...' : isSaved ? 'Update' : 'Save'}
        </motion.button>
      </div>

      {/* Result badge */}
      {isFinal && isSaved && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex justify-end"
        >
          {exactScore ? (
            <span className="text-sm bg-nfl-green/20 text-nfl-green px-3 py-1.5 font-mono font-bold uppercase">
              Exact Score! +5 pts
            </span>
          ) : predictionCorrect ? (
            <span className="text-sm bg-nfl-blue/20 text-nfl-blue px-3 py-1.5 font-mono font-bold uppercase">
              Correct Winner +1 pt
            </span>
          ) : (
            <span className="text-sm bg-nfl-red/20 text-nfl-red px-3 py-1.5 font-mono font-bold uppercase">
              Wrong Prediction
            </span>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
