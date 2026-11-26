import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { teamDisplayName, formatNetherlandsGameTime, formatRecord, type TeamRecord } from '../lib/utils';
import { Check, RefreshCw, BarChart3, Save, ChevronLeft, ChevronRight, Radio } from 'lucide-react';

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

interface PredictionDraft {
  winnerTeamId: number | null;
  homeScore: string;
  awayScore: string;
}

function isDraftEqual(a?: PredictionDraft, b?: PredictionDraft): boolean {
  if (!a || !b) return false;
  return (
    a.winnerTeamId === b.winnerTeamId &&
    a.homeScore === b.homeScore &&
    a.awayScore === b.awayScore
  );
}

export function Schedule() {
  const [games, setGames] = useState<Game[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedGames, setSavedGames] = useState<Set<number>>(new Set());
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [weekAccuracy, setWeekAccuracy] = useState<{ correct: number; total: number; percentage: number } | null>(null);
  const [teamRecords, setTeamRecords] = useState<Map<number, TeamRecord>>(new Map());
  const [draftPredictions, setDraftPredictions] = useState<Record<number, PredictionDraft>>({});
  const [initialDrafts, setInitialDrafts] = useState<Record<number, PredictionDraft>>({});

  useEffect(() => {
    async function initialize() {
      try {
        const seasons = await api.get<{ id: number }[]>('/seasons');
        if (seasons.length === 0) { setLoading(false); return; }
        setSeasonId(seasons[0].id);

        const currentWeek = await api.get<{ week: number }>(`/games/current-week/${seasons[0].id}`);
        setSelectedWeek(currentWeek.week);
      } catch {
        setLoading(false);
      }
    }
    initialize();
  }, []);

  useEffect(() => {
    async function load() {
      if (!seasonId || selectedWeek === null) return;
      try {
        const [gamesData, predictionsData, accuracyData, recordsData] = await Promise.all([
          api.get<Game[]>(`/games?season_id=${seasonId}&week=${selectedWeek}`),
          api.get<Prediction[]>(`/predictions/weekly/${seasonId}?week=${selectedWeek}`),
          api.get<{ correct: number; total: number; percentage: number }>(`/predictions/accuracy/${seasonId}/week/${selectedWeek}`),
          api.get<{ team_id: number; wins: number; losses: number; ties: number }[]>(`/games/team-records/${seasonId}`),
        ]);

        const recordsMap = new Map<number, TeamRecord>();
        for (const r of recordsData) {
          recordsMap.set(r.team_id, { wins: r.wins, losses: r.losses, ties: r.ties });
        }
        setTeamRecords(recordsMap);

        const mergedGames = gamesData.map((game) => {
          const pred = predictionsData.find((p) => p.game_id === game.id);
          return pred
            ? {
                ...game,
                predicted_winner_team_id: pred.predicted_winner_team_id,
                predicted_home_score: pred.predicted_home_score,
                predicted_away_score: pred.predicted_away_score,
                points_earned: pred.points_earned,
              }
            : game;
        });

        const nextDrafts: Record<number, PredictionDraft> = {};
        for (const game of gamesData) {
          const pred = predictionsData.find((p) => p.game_id === game.id);
          nextDrafts[game.id] = {
            winnerTeamId: pred?.predicted_winner_team_id ?? null,
            homeScore: pred?.predicted_home_score?.toString() ?? '',
            awayScore: pred?.predicted_away_score?.toString() ?? '',
          };
        }

        setGames(mergedGames);
        setDraftPredictions(nextDrafts);
        setInitialDrafts(nextDrafts);
        setSavedGames(new Set(predictionsData.map((p) => p.game_id)));
        setWeekAccuracy(accuracyData);
        setSaveMessage(null);
      } catch {
        // API not ready
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedWeek, seasonId]);

  const dirtyGameIds = useMemo(() => {
    const dirty = new Set<number>();
    for (const game of games) {
      if (!isDraftEqual(draftPredictions[game.id], initialDrafts[game.id])) {
        dirty.add(game.id);
      }
    }
    return dirty;
  }, [games, draftPredictions, initialDrafts]);

  function updateDraft(gameId: number, nextDraft: PredictionDraft) {
    setDraftPredictions((prev) => ({ ...prev, [gameId]: nextDraft }));
  }

  async function saveWeekPredictions() {
    if (!seasonId) return;
    const gamesToSave = games.filter((game) => {
      const draft = draftPredictions[game.id];
      if (!draft) return false;
      return (
        dirtyGameIds.has(game.id) ||
        savedGames.has(game.id) ||
        draft.winnerTeamId !== null ||
        draft.homeScore !== '' ||
        draft.awayScore !== ''
      );
    });

    if (gamesToSave.length === 0) {
      setSaveMessage('Nothing to save yet.');
      return;
    }

    setSavingAll(true);
    setSaveMessage(null);
    setSyncMessage(null);
    try {
      await Promise.all(
        gamesToSave.map((game) => {
          const draft = draftPredictions[game.id];
          const homeScore = draft.homeScore === '' ? null : Number(draft.homeScore);
          const awayScore = draft.awayScore === '' ? null : Number(draft.awayScore);
          return api.post('/predictions/weekly', {
            season_id: seasonId,
            game_id: game.id,
            predicted_winner_team_id: draft.winnerTeamId,
            predicted_home_score: Number.isNaN(homeScore) ? null : homeScore,
            predicted_away_score: Number.isNaN(awayScore) ? null : awayScore,
          });
        })
      );

      setGames((prev) =>
        prev.map((game) => {
          const draft = draftPredictions[game.id];
          if (!draft) return game;
          const homeScore = draft.homeScore === '' ? null : Number(draft.homeScore);
          const awayScore = draft.awayScore === '' ? null : Number(draft.awayScore);
          return {
            ...game,
            predicted_winner_team_id: draft.winnerTeamId,
            predicted_home_score: Number.isNaN(homeScore) ? null : homeScore,
            predicted_away_score: Number.isNaN(awayScore) ? null : awayScore,
          };
        })
      );
      setInitialDrafts({ ...draftPredictions });
      setSavedGames((prev) => new Set([...prev, ...gamesToSave.map((game) => game.id)]));
      setSaveMessage(`Saved ${gamesToSave.length} game${gamesToSave.length === 1 ? '' : 's'}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Save failed';
      setSaveMessage(message);
    } finally {
      setSavingAll(false);
    }
  }

  async function syncResults() {
    if (!seasonId || selectedWeek === null) return;
    setSyncing(true);
    setSyncMessage(null);
    setSaveMessage(null);
    try {
      const result = await api.post<{ ok: boolean; updated: number; totalGames: number; seasonYear?: number; error?: string }>(
        `/espn/sync/${seasonId}`,
        {}
      );
      const [gamesData, predictionsData, accuracyData, recordsData] = await Promise.all([
        api.get<Game[]>(`/games?season_id=${seasonId}&week=${selectedWeek}`),
        api.get<Prediction[]>(`/predictions/weekly/${seasonId}?week=${selectedWeek}`),
        api.get<{ correct: number; total: number; percentage: number }>(`/predictions/accuracy/${seasonId}/week/${selectedWeek}`),
        api.get<{ team_id: number; wins: number; losses: number; ties: number }[]>(`/games/team-records/${seasonId}`),
      ]);

      const recordsMap = new Map<number, TeamRecord>();
      for (const r of recordsData) {
        recordsMap.set(r.team_id, { wins: r.wins, losses: r.losses, ties: r.ties });
      }
      setTeamRecords(recordsMap);
      setWeekAccuracy(accuracyData);

      const mergedGames = gamesData.map((game) => {
        const pred = predictionsData.find((p) => p.game_id === game.id);
        return pred
          ? {
              ...game,
              predicted_winner_team_id: pred.predicted_winner_team_id,
              predicted_home_score: pred.predicted_home_score,
              predicted_away_score: pred.predicted_away_score,
              points_earned: pred.points_earned,
            }
          : game;
      });

      setGames(mergedGames);
      setSyncMessage(
        result.updated > 0
          ? `Synced ${result.updated} updated game${result.updated === 1 ? '' : 's'} from ESPN`
          : 'All scores are already up to date'
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sync failed';
      setSyncMessage(message);
      console.error('Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  }

  const week = selectedWeek ?? 1;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nfl-blue" />
      </div>
    );
  }

  if (!seasonId) {
    return (
      <div className="bg-gridiron-surface border-2 border-gridiron-border p-8 text-center text-text-secondary">
        Create a season first in Settings.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-nfl-red mb-1">
            Away @ Home • Europe/Amsterdam Time
          </p>
          <h1 className="text-3xl md:text-5xl font-display font-extrabold text-text-primary tracking-tight">
            Weekly Schedule
          </h1>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Week Stepper */}
          <div className="flex items-center bg-gridiron-surface border-2 border-gridiron-border">
            <button
              type="button"
              onClick={() => setSelectedWeek(Math.max(1, week - 1))}
              disabled={week <= 1}
              aria-label="Previous week"
              className="p-2.5 text-text-secondary hover:text-text-primary hover:bg-gridiron-surface-hover disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <select
              value={week}
              onChange={(e) => setSelectedWeek(Number(e.target.value))}
              aria-label="Select NFL week"
              className="bg-transparent px-3 py-2 text-sm font-mono font-medium text-text-primary uppercase"
            >
              {Array.from({ length: 22 }, (_, i) => i + 1).map((w) => (
                <option key={w} value={w} className="bg-gridiron-surface">
                  Week {w}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setSelectedWeek(Math.min(22, week + 1))}
              disabled={week >= 22}
              aria-label="Next week"
              className="p-2.5 text-text-secondary hover:text-text-primary hover:bg-gridiron-surface-hover disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <button
            type="button"
            onClick={syncResults}
            disabled={syncing}
            className={`flex items-center justify-center gap-2 text-white text-xs sm:text-sm px-4 py-2.5 font-semibold uppercase tracking-wider transition-all ${
              syncing ? 'bg-text-muted' : 'bg-nfl-red hover:bg-red-700'
            }`}
          >
            <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing...' : 'Sync ESPN'}
          </button>

          <button
            type="button"
            onClick={saveWeekPredictions}
            disabled={savingAll || games.length === 0}
            className={`flex items-center justify-center gap-2 text-white text-xs sm:text-sm px-4 py-2.5 font-semibold uppercase tracking-wider transition-all ${
              savingAll || games.length === 0 ? 'bg-text-muted' : 'bg-nfl-green hover:bg-emerald-600'
            }`}
          >
            <Save size={15} />
            {savingAll ? 'Saving...' : 'Save Week'}
          </button>
        </div>
      </div>

      {/* Status banner */}
      {(syncMessage || saveMessage) && (
        <div
          className={`px-4 py-3 border-l-4 bg-gridiron-surface text-sm font-medium ${
            (syncMessage ?? saveMessage ?? '').startsWith('Synced') ||
            (syncMessage ?? '').startsWith('All scores') ||
            (saveMessage ?? '').startsWith('Saved')
              ? 'border-nfl-green text-nfl-green'
              : 'border-nfl-red text-nfl-red'
          }`}
        >
          {syncMessage ?? saveMessage}
        </div>
      )}

      {/* Week Accuracy Bar */}
      {weekAccuracy && weekAccuracy.total > 0 && (
        <div className="bg-gridiron-surface px-4 py-3 border-2 border-gridiron-border neumorphic flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BarChart3 size={18} className="text-nfl-green" />
            <span className="text-xs sm:text-sm text-text-secondary font-semibold uppercase tracking-wider">
              Week {week} Accuracy
            </span>
          </div>
          <div className="flex items-center gap-3 font-mono tabular-nums">
            <span className="text-sm text-text-secondary">
              {weekAccuracy.correct}/{weekAccuracy.total}
            </span>
            <span
              className={`text-lg font-medium ${
                weekAccuracy.percentage >= 70
                  ? 'text-nfl-green'
                  : weekAccuracy.percentage >= 40
                    ? 'text-nfl-yellow'
                    : 'text-nfl-red'
              }`}
            >
              {weekAccuracy.percentage}%
            </span>
          </div>
        </div>
      )}

      {/* Games Grid */}
      {games.length === 0 ? (
        <div className="bg-gridiron-surface p-8 border-2 border-gridiron-border text-center text-text-secondary">
          No games for Week {week} yet. Import the schedule in Settings.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {games.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              draft={draftPredictions[game.id] ?? { winnerTeamId: null, homeScore: '', awayScore: '' }}
              onDraftChange={(nextDraft) => updateDraft(game.id, nextDraft)}
              isSaved={savedGames.has(game.id)}
              isDirty={dirtyGameIds.has(game.id)}
              records={teamRecords}
            />
          ))}
        </div>
      )}

      {/* Sticky Save Bar when there are unsaved edits */}
      {dirtyGameIds.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky bottom-20 lg:bottom-4 z-40 bg-gridiron-surface/95 backdrop-blur-xl border-2 border-nfl-blue p-3.5 md:px-5 shadow-glow flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 bg-nfl-blue animate-pulse" />
            <span className="text-sm font-medium text-text-primary">
              <span className="font-mono tabular-nums font-semibold">{dirtyGameIds.size}</span> unsaved{' '}
              {dirtyGameIds.size === 1 ? 'change' : 'changes'} in Week {week}
            </span>
          </div>
          <button
            type="button"
            onClick={saveWeekPredictions}
            disabled={savingAll}
            className="flex items-center gap-2 bg-nfl-green hover:bg-emerald-600 disabled:bg-text-muted text-white px-4 py-2 text-xs sm:text-sm font-semibold uppercase tracking-wider transition-colors"
          >
            <Save size={15} />
            {savingAll ? 'Saving...' : 'Save Week'}
          </button>
        </motion.div>
      )}
    </div>
  );
}

function GameCard({
  game,
  draft,
  onDraftChange,
  isSaved,
  isDirty,
  records,
}: {
  game: Game;
  draft: PredictionDraft;
  onDraftChange: (draft: PredictionDraft) => void;
  isSaved: boolean;
  isDirty: boolean;
  records: Map<number, TeamRecord>;
}) {
  const isFinal = game.status === 'final';
  const isLive = game.status === 'in_progress';
  const actualHomeScore = game.home_score;
  const actualAwayScore = game.away_score;
  const actualWinner =
    actualHomeScore !== null && actualAwayScore !== null
      ? actualHomeScore > actualAwayScore
        ? game.home_team_id
        : actualAwayScore > actualHomeScore
          ? game.away_team_id
          : null
      : null;

  const predictionCorrect = isFinal && isSaved && draft.winnerTeamId === actualWinner;
  const exactScore =
    isFinal &&
    isSaved &&
    game.predicted_home_score === actualHomeScore &&
    game.predicted_away_score === actualAwayScore;

  function updateScore(value: string, isHome: boolean) {
    const nextHome = isHome ? value : draft.homeScore;
    const nextAway = isHome ? draft.awayScore : value;

    const h = Number(nextHome);
    const a = Number(nextAway);
    let winnerTeamId = draft.winnerTeamId;

    if (nextHome !== '' && nextAway !== '' && !Number.isNaN(h) && !Number.isNaN(a)) {
      if (h > a) winnerTeamId = game.home_team_id;
      else if (a > h) winnerTeamId = game.away_team_id;
      else winnerTeamId = null;
    }

    onDraftChange({ winnerTeamId, homeScore: nextHome, awayScore: nextAway });
  }

  const { date: nlDate, time: nlTime } = formatNetherlandsGameTime(game.game_time);

  // Calm border hierarchy: graded finals get green/red; live gets red; dirty gets blue; default is neutral
  const cardBorderClass = isFinal && isSaved
    ? exactScore || predictionCorrect
      ? 'border-nfl-green/70'
      : 'border-nfl-red/60'
    : isLive
      ? 'border-nfl-red'
      : isDirty
        ? 'border-nfl-blue'
        : 'border-gridiron-border';

  return (
    <div className={`relative bg-gridiron-surface p-4 md:p-5 border-2 transition-colors neumorphic ${cardBorderClass}`}>
      {/* Top Meta Row */}
      <div className="flex items-center justify-between gap-2 mb-3.5">
        <span className="text-xs text-text-muted font-mono uppercase tracking-wider tabular-nums">
          {nlTime ? `${nlDate} • ${nlTime}` : nlDate}
        </span>

        <div className="flex items-center gap-2">
          {isLive && (
            <span className="inline-flex items-center gap-1.5 bg-nfl-red/20 border border-nfl-red/50 text-nfl-red px-2 py-0.5 text-[11px] font-mono uppercase tracking-wider">
              <Radio size={12} className="animate-pulse" />
              Live
            </span>
          )}
          {isFinal && (
            <span className="bg-gridiron-surface-hover border border-gridiron-border text-text-secondary px-2 py-0.5 text-[11px] font-mono uppercase tracking-wider">
              Final
            </span>
          )}
          {isDirty ? (
            <span className="bg-nfl-blue/20 text-nfl-blue px-2 py-0.5 text-[11px] font-mono uppercase tracking-wider">
              Unsaved
            </span>
          ) : isSaved ? (
            <span className="inline-flex items-center gap-1 bg-nfl-green/15 text-nfl-green px-2 py-0.5 text-[11px] font-mono uppercase tracking-wider">
              <Check size={12} />
              Saved
            </span>
          ) : null}
        </div>
      </div>

      {/* Matchup Grid: AWAY @ HOME (NFL standard) */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2.5 md:gap-3 items-center">
        {/* AWAY TEAM (Left) */}
        <button
          type="button"
          onClick={() => onDraftChange({ ...draft, winnerTeamId: game.away_team_id })}
          className={`text-center p-3 md:p-4 transition-all border ${
            draft.winnerTeamId === game.away_team_id
              ? 'bg-nfl-blue/15 border-nfl-blue shadow-glow'
              : 'bg-gridiron-surface-hover/80 border-transparent hover:border-gridiron-border hover:bg-gridiron-surface-hover'
          } ${isFinal && actualWinner === game.away_team_id ? 'ring-2 ring-nfl-green' : ''}`}
        >
          <span className="block text-[10px] font-mono uppercase tracking-widest text-text-muted mb-1.5">
            Away
          </span>
          {game.away_team_logo && (
            <img
              src={game.away_team_logo}
              alt={game.away_team_abbr}
              className="w-11 h-11 md:w-14 md:h-14 mx-auto mb-1.5 object-contain"
            />
          )}
          <span className="block text-sm md:text-base font-display font-bold text-text-primary tracking-tight truncate">
            <span className="hidden sm:inline">{teamDisplayName(game.away_team_city, game.away_team_name)}</span>
            <span className="sm:hidden">{game.away_team_abbr}</span>
          </span>
          <span className="block text-[11px] text-text-muted font-mono tabular-nums mt-0.5">
            {formatRecord(records.get(game.away_team_id))}
          </span>
        </button>

        {/* Center @ / Tie */}
        <div className="flex flex-col items-center gap-1.5 px-1">
          <span className="text-text-muted text-sm font-mono font-medium">@</span>
          <button
            type="button"
            onClick={() => onDraftChange({ ...draft, winnerTeamId: null })}
            className={`text-[11px] px-2.5 py-1 font-mono uppercase tracking-wider transition-colors border ${
              draft.winnerTeamId === null
                ? 'bg-gridiron-border text-text-primary border-text-muted'
                : 'bg-gridiron-bg text-text-muted border-gridiron-border hover:text-text-primary'
            }`}
          >
            Tie
          </button>
        </div>

        {/* HOME TEAM (Right) */}
        <button
          type="button"
          onClick={() => onDraftChange({ ...draft, winnerTeamId: game.home_team_id })}
          className={`text-center p-3 md:p-4 transition-all border ${
            draft.winnerTeamId === game.home_team_id
              ? 'bg-nfl-blue/15 border-nfl-blue shadow-glow'
              : 'bg-gridiron-surface-hover/80 border-transparent hover:border-gridiron-border hover:bg-gridiron-surface-hover'
          } ${isFinal && actualWinner === game.home_team_id ? 'ring-2 ring-nfl-green' : ''}`}
        >
          <span className="block text-[10px] font-mono uppercase tracking-widest text-text-muted mb-1.5">
            Home
          </span>
          {game.home_team_logo && (
            <img
              src={game.home_team_logo}
              alt={game.home_team_abbr}
              className="w-11 h-11 md:w-14 md:h-14 mx-auto mb-1.5 object-contain"
            />
          )}
          <span className="block text-sm md:text-base font-display font-bold text-text-primary tracking-tight truncate">
            <span className="hidden sm:inline">{teamDisplayName(game.home_team_city, game.home_team_name)}</span>
            <span className="sm:hidden">{game.home_team_abbr}</span>
          </span>
          <span className="block text-[11px] text-text-muted font-mono tabular-nums mt-0.5">
            {formatRecord(records.get(game.home_team_id))}
          </span>
        </button>
      </div>

      {/* Prediction & Official/Live Score Row (matches Away - Home left-to-right) */}
      <div className="mt-4 pt-3.5 border-t border-gridiron-border/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-text-secondary uppercase tracking-wider">Pick</span>
          <input
            type="number"
            min="0"
            placeholder={game.away_team_abbr}
            aria-label={`${game.away_team_abbr} predicted score`}
            value={draft.awayScore}
            onChange={(e) => updateScore(e.target.value, false)}
            className="w-14 bg-gridiron-bg border border-gridiron-border px-2 py-1.5 text-sm text-center text-text-primary font-mono tabular-nums"
          />
          <span className="text-text-muted font-mono">-</span>
          <input
            type="number"
            min="0"
            placeholder={game.home_team_abbr}
            aria-label={`${game.home_team_abbr} predicted score`}
            value={draft.homeScore}
            onChange={(e) => updateScore(e.target.value, true)}
            className="w-14 bg-gridiron-bg border border-gridiron-border px-2 py-1.5 text-sm text-center text-text-primary font-mono tabular-nums"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-text-secondary uppercase tracking-wider">
            {isLive ? 'Live' : 'Official'}
          </span>
          {(isFinal || isLive) && actualAwayScore !== null && actualHomeScore !== null ? (
            <div
              className={`flex items-center gap-1.5 bg-gridiron-bg border px-3 py-1.5 font-mono tabular-nums text-sm font-medium ${
                isLive ? 'border-nfl-red text-nfl-red' : 'border-gridiron-border text-text-primary'
              }`}
            >
              <span>{actualAwayScore}</span>
              <span className="text-text-muted">-</span>
              <span>{actualHomeScore}</span>
            </div>
          ) : (
            <div className="bg-gridiron-bg border border-dashed border-gridiron-border px-3 py-1.5 text-xs font-mono text-text-muted uppercase">
              TBD
            </div>
          )}
        </div>
      </div>

      {/* Graded Result Badge */}
      {isFinal && isSaved && (
        <div className="mt-3 flex justify-end">
          {exactScore ? (
            <span className="text-xs bg-nfl-green/20 text-nfl-green px-2.5 py-1 font-mono uppercase tracking-wider">
              Exact Score • +5 pts
            </span>
          ) : predictionCorrect ? (
            <span className="text-xs bg-nfl-blue/20 text-nfl-blue px-2.5 py-1 font-mono uppercase tracking-wider">
              Correct Winner • +1 pt
            </span>
          ) : (
            <span className="text-xs bg-nfl-red/15 text-nfl-red px-2.5 py-1 font-mono uppercase tracking-wider">
              Missed Pick
            </span>
          )}
        </div>
      )}
    </div>
  );
}
