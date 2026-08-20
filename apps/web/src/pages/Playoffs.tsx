import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { Check, Trophy } from 'lucide-react';

interface PlayoffPred {
  id: number;
  round: string;
  slot: number;
  team_id: number | null;
  predicted_winner_team_id: number | null;
  team_name: string | null;
  team_abbr: string | null;
  points_earned: number;
}

interface Team {
  id: number;
  name: string;
  city?: string;
  abbreviation: string;
  logo_url?: string | null;
}

interface BracketRound {
  key: string;
  label: string;
  slots: number;
  hint: string;
}

const BRACKET_ROUNDS: BracketRound[] = [
  { key: 'wild_card', label: 'Wild Card', slots: 12, hint: 'Six opening matchups' },
  { key: 'divisional', label: 'Divisional', slots: 8, hint: 'Top seeds enter' },
  { key: 'conference', label: 'Conference', slots: 4, hint: 'AFC and NFC titles' },
  { key: 'super_bowl', label: 'Super Bowl', slots: 2, hint: 'Final matchup' },
  { key: 'champion', label: 'Champion', slots: 1, hint: 'Season winner' },
];

export function Playoffs() {
  const [predictions, setPredictions] = useState<PlayoffPred[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingSlot, setSavingSlot] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const seasons = await api.get<{ id: number }[]>('/seasons');
        if (seasons.length === 0) { setLoading(false); return; }
        setSeasonId(seasons[0].id);
        const [predsData, teamsData] = await Promise.all([
          api.get<PlayoffPred[]>(`/predictions/playoff/${seasons[0].id}`),
          api.get<Team[]>('/teams/'),
        ]);
        setPredictions(predsData);
        setTeams(teamsData);
      } catch {
        // not ready
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const predictionMap = useMemo(() => {
    const map = new Map<string, PlayoffPred>();
    for (const pred of predictions) {
      map.set(`${pred.round}:${pred.slot}`, pred);
    }
    return map;
  }, [predictions]);

  async function savePrediction(round: string, slot: number, teamId: number) {
    if (!seasonId || !teamId) return;
    const key = `${round}:${slot}`;
    setSavingSlot(key);
    try {
      await api.post('/predictions/playoff', {
        season_id: seasonId,
        round,
        slot,
        team_id: teamId,
      });
      const updated = await api.get<PlayoffPred[]>(`/predictions/playoff/${seasonId}`);
      setPredictions(updated);
    } finally {
      setSavingSlot(null);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nfl-blue" /></div>;
  }

  const filledSlots = predictions.filter((p) => p.team_id).length;
  const totalSlots = BRACKET_ROUNDS.reduce((sum, round) => sum + round.slots, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <motion.h1
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold gradient-text uppercase tracking-tight"
        >
          Playoff Simulator
        </motion.h1>
        <div className="flex items-center gap-2 bg-gridiron-surface border-2 border-gridiron-border px-4 py-3 text-text-secondary font-bold uppercase tracking-wide neumorphic">
          <Trophy size={18} className="text-nfl-yellow" />
          {filledSlots}/{totalSlots} filled
        </div>
      </div>

      {teams.length === 0 && (
        <div className="bg-gridiron-surface p-4 border-2 border-gridiron-border text-text-secondary font-bold uppercase tracking-wide neumorphic">
          Bracket preview is available now. Seed teams in Settings when you are ready to fill slots.
        </div>
      )}

      <div className="bg-gridiron-surface border-2 border-gridiron-border neumorphic">
        <div className="p-3 sm:p-4 lg:hidden space-y-5">
          {BRACKET_ROUNDS.map((round, roundIndex) => (
            <BracketRoundSection
              key={round.key}
              round={round}
              roundIndex={roundIndex}
              predictionMap={predictionMap}
              teams={teams}
              savingSlot={savingSlot}
              onSave={savePrediction}
            />
          ))}
        </div>

        <div className="hidden lg:block overflow-x-auto">
          <div className="min-w-[1180px] p-5">
            <div className="grid grid-cols-5 gap-4">
              {BRACKET_ROUNDS.map((round, roundIndex) => (
                <BracketRoundSection
                  key={round.key}
                  round={round}
                  roundIndex={roundIndex}
                  predictionMap={predictionMap}
                  teams={teams}
                  savingSlot={savingSlot}
                  onSave={savePrediction}
                  desktop
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BracketRoundSection({
  round,
  roundIndex,
  predictionMap,
  teams,
  savingSlot,
  onSave,
  desktop = false,
}: {
  round: BracketRound;
  roundIndex: number;
  predictionMap: Map<string, PlayoffPred>;
  teams: Team[];
  savingSlot: string | null;
  onSave: (round: string, slot: number, teamId: number) => void;
  desktop?: boolean;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: roundIndex * 0.06 }}
      className="space-y-4"
    >
      <div className="border-b-4 border-nfl-blue pb-3">
        <h2 className="font-serif font-bold text-xl sm:text-2xl text-text-primary uppercase tracking-wide">{round.label}</h2>
        <p className="text-sm text-text-muted font-bold uppercase tracking-wide">{round.hint}</p>
      </div>

      <div className={`grid gap-4 ${desktop && round.key === 'champion' ? 'pt-12' : ''}`}>
        {round.key === 'champion' ? (
          <BracketSlot
            roundKey={round.key}
            slot={1}
            prediction={predictionMap.get(`${round.key}:1`)}
            teams={teams}
            saving={savingSlot === `${round.key}:1`}
            onSave={onSave}
            champion
          />
        ) : (
          Array.from({ length: round.slots / 2 }, (_, matchupIndex) => {
            const firstSlot = matchupIndex * 2 + 1;
            const secondSlot = firstSlot + 1;
            return (
              <BracketMatchup
                key={`${round.key}-${matchupIndex}`}
                roundKey={round.key}
                matchup={matchupIndex + 1}
                firstSlot={firstSlot}
                secondSlot={secondSlot}
                firstPrediction={predictionMap.get(`${round.key}:${firstSlot}`)}
                secondPrediction={predictionMap.get(`${round.key}:${secondSlot}`)}
                teams={teams}
                savingSlot={savingSlot}
                onSave={onSave}
              />
            );
          })
        )}
      </div>
    </motion.section>
  );
}

function BracketMatchup({
  roundKey,
  matchup,
  firstSlot,
  secondSlot,
  firstPrediction,
  secondPrediction,
  teams,
  savingSlot,
  onSave,
}: {
  roundKey: string;
  matchup: number;
  firstSlot: number;
  secondSlot: number;
  firstPrediction?: PlayoffPred;
  secondPrediction?: PlayoffPred;
  teams: Team[];
  savingSlot: string | null;
  onSave: (round: string, slot: number, teamId: number) => void;
}) {
  return (
    <div className="relative bg-gridiron-bg/80 border-2 border-gridiron-border p-3">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm text-text-muted font-mono font-bold uppercase">Matchup {matchup}</span>
        {(firstPrediction?.team_id || secondPrediction?.team_id) && (
          <span className="bg-nfl-green p-1">
            <Check size={13} className="text-white" />
          </span>
        )}
      </div>
      <div className="space-y-2">
        <BracketSlot
          roundKey={roundKey}
          slot={firstSlot}
          prediction={firstPrediction}
          teams={teams}
          saving={savingSlot === `${roundKey}:${firstSlot}`}
          onSave={onSave}
        />
        <BracketSlot
          roundKey={roundKey}
          slot={secondSlot}
          prediction={secondPrediction}
          teams={teams}
          saving={savingSlot === `${roundKey}:${secondSlot}`}
          onSave={onSave}
        />
      </div>
    </div>
  );
}

function BracketSlot({
  roundKey,
  slot,
  prediction,
  teams,
  saving,
  onSave,
  champion = false,
}: {
  roundKey: string;
  slot: number;
  prediction?: PlayoffPred;
  teams: Team[];
  saving: boolean;
  onSave: (round: string, slot: number, teamId: number) => void;
  champion?: boolean;
}) {
  const selectedTeam = teams.find((team) => team.id === prediction?.team_id);
  const isFilled = Boolean(selectedTeam);

  return (
    <div className={`bg-gridiron-surface-hover border-l-4 p-3 transition-all ${isFilled ? 'border-nfl-green' : 'border-gridiron-border'}`}>
      <div className="mb-3 flex min-h-12 items-center gap-3">
        {selectedTeam?.logo_url ? (
          <img src={selectedTeam.logo_url} alt={selectedTeam.abbreviation} className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 object-contain" />
        ) : (
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center border-2 border-dashed border-gridiron-border text-[10px] sm:text-xs text-text-muted font-mono font-bold">
            TBD
          </div>
        )}
        <div className="min-w-0">
          <p className={`truncate text-sm sm:text-base font-bold uppercase tracking-wide ${isFilled ? 'text-text-primary' : 'text-text-muted'}`}>
            {selectedTeam ? `${selectedTeam.abbreviation} - ${selectedTeam.name}` : champion ? 'Champion TBD' : `Slot ${slot} TBD`}
          </p>
          <p className="text-xs text-text-muted font-bold uppercase tracking-wide">
            {saving ? 'Saving...' : isFilled ? 'Prediction saved' : 'Empty until filled'}
          </p>
        </div>
      </div>
      <select
        value={prediction?.team_id ?? ''}
        onChange={(e) => onSave(roundKey, slot, Number(e.target.value))}
        disabled={teams.length === 0}
        className="w-full bg-gridiron-bg border-2 border-gridiron-border px-3 py-2 text-sm text-text-primary font-bold"
      >
        <option value="">{teams.length === 0 ? 'Teams not seeded' : 'Leave empty'}</option>
        {teams.map((team) => (
          <option key={team.id} value={team.id}>{team.abbreviation} - {team.name}</option>
        ))}
      </select>
    </div>
  );
}
