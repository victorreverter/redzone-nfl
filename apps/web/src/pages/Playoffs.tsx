import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { Check, Trophy, Sparkles, ArrowRight } from 'lucide-react';

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

interface Seed {
  seed: number;
  team_id: number | null;
}

interface StandingsResponse {
  seeds: Record<string, Seed[]>;
}

interface BracketRound {
  key: string;
  label: string;
  slots: number;
  hint: string;
}

const BRACKET_ROUNDS: BracketRound[] = [
  { key: 'wild_card', label: 'Wild Card', slots: 12, hint: '6 opening matchups' },
  { key: 'divisional', label: 'Divisional', slots: 8, hint: '#1 seeds enter' },
  { key: 'conference', label: 'Conference', slots: 4, hint: 'AFC & NFC titles' },
  { key: 'super_bowl', label: 'Super Bowl', slots: 2, hint: 'Championship matchup' },
  { key: 'champion', label: 'Champion', slots: 1, hint: 'Lombardi winner' },
];

// Map each round/slot to the next round slot when clicking "Advance"
function getAdvanceTarget(roundKey: string, slot: number): { round: string; slot: number; label: string } | null {
  if (roundKey === 'wild_card') {
    const matchupIdx = Math.floor((slot - 1) / 2); // 0..2 = AFC, 3..5 = NFC
    // AFC #1 sits in Divisional slot 1; AFC WC winners fill Divisional slots 2, 3, 4
    // NFC #1 sits in Divisional slot 5; NFC WC winners fill Divisional slots 6, 7, 8
    const targetSlot = matchupIdx < 3 ? matchupIdx + 2 : matchupIdx + 3;
    return { round: 'divisional', slot: targetSlot, label: 'Divisional' };
  }
  if (roundKey === 'divisional') {
    const matchupIdx = Math.floor((slot - 1) / 2); // 0..3
    return { round: 'conference', slot: matchupIdx + 1, label: 'Conference' };
  }
  if (roundKey === 'conference') {
    const matchupIdx = Math.floor((slot - 1) / 2); // 0..1
    return { round: 'super_bowl', slot: matchupIdx + 1, label: 'Super Bowl' };
  }
  if (roundKey === 'super_bowl') {
    return { round: 'champion', slot: 1, label: 'Champion' };
  }
  return null;
}

export function Playoffs() {
  const [predictions, setPredictions] = useState<PlayoffPred[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingSlot, setSavingSlot] = useState<string | null>(null);
  const [filling, setFilling] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

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
    if (!seasonId) return;
    const key = `${round}:${slot}`;
    setSavingSlot(key);
    try {
      await api.post('/predictions/playoff', {
        season_id: seasonId,
        round,
        slot,
        team_id: teamId || null,
      });
      const updated = await api.get<PlayoffPred[]>(`/predictions/playoff/${seasonId}`);
      setPredictions(updated);
    } finally {
      setSavingSlot(null);
    }
  }

  async function fillFromStandings() {
    if (!seasonId) return;
    setFilling(true);
    setStatusMessage(null);
    try {
      const standings = await api.get<StandingsResponse>(`/predictions/standings/${seasonId}`);
      const afc = new Map((standings.seeds.AFC || []).map((s) => [s.seed, s.team_id]));
      const nfc = new Map((standings.seeds.NFC || []).map((s) => [s.seed, s.team_id]));

      const entries: Array<{ round: string; slot: number; team_id: number | null }> = [
        // AFC Wild Card: #2 vs #7, #3 vs #6, #4 vs #5
        { round: 'wild_card', slot: 1, team_id: afc.get(2) ?? null },
        { round: 'wild_card', slot: 2, team_id: afc.get(7) ?? null },
        { round: 'wild_card', slot: 3, team_id: afc.get(3) ?? null },
        { round: 'wild_card', slot: 4, team_id: afc.get(6) ?? null },
        { round: 'wild_card', slot: 5, team_id: afc.get(4) ?? null },
        { round: 'wild_card', slot: 6, team_id: afc.get(5) ?? null },
        // NFC Wild Card: #2 vs #7, #3 vs #6, #4 vs #5
        { round: 'wild_card', slot: 7, team_id: nfc.get(2) ?? null },
        { round: 'wild_card', slot: 8, team_id: nfc.get(7) ?? null },
        { round: 'wild_card', slot: 9, team_id: nfc.get(3) ?? null },
        { round: 'wild_card', slot: 10, team_id: nfc.get(6) ?? null },
        { round: 'wild_card', slot: 11, team_id: nfc.get(4) ?? null },
        { round: 'wild_card', slot: 12, team_id: nfc.get(5) ?? null },
        // #1 Seeds (First-Round Bye) enter Divisional Round
        { round: 'divisional', slot: 1, team_id: afc.get(1) ?? null },
        { round: 'divisional', slot: 5, team_id: nfc.get(1) ?? null },
      ].filter((e) => e.team_id !== null);

      if (entries.length === 0) {
        setStatusMessage('No seeds found in Standings yet. Set team records/seeds in Standings first.');
        return;
      }

      await api.post('/predictions/playoff/batch', { season_id: seasonId, entries });
      const updated = await api.get<PlayoffPred[]>(`/predictions/playoff/${seasonId}`);
      setPredictions(updated);
      setStatusMessage(`Loaded ${entries.length} playoff seeds (Wild Card + #1 Byes) from Standings.`);
    } catch (e) {
      setStatusMessage(`Failed to load seeds: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setFilling(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nfl-blue" />
      </div>
    );
  }

  const filledSlots = predictions.filter((p) => p.team_id).length;
  const totalSlots = BRACKET_ROUNDS.reduce((sum, round) => sum + round.slots, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-nfl-yellow mb-1">
            Postseason Tournament Bracket
          </p>
          <h1 className="text-3xl md:text-5xl font-display font-extrabold text-text-primary tracking-tight">
            Playoff Simulator
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={fillFromStandings}
            disabled={filling || teams.length === 0}
            className="inline-flex items-center gap-2 bg-nfl-blue hover:opacity-90 disabled:opacity-50 text-white px-4 py-2.5 text-xs sm:text-sm font-semibold uppercase tracking-wider transition-opacity"
          >
            <Sparkles size={15} />
            {filling ? 'Loading Seeds...' : 'Fill from Standings'}
          </button>
          <div className="inline-flex items-center gap-2 bg-gridiron-surface border-2 border-gridiron-border px-4 py-2 text-sm font-mono text-text-secondary tabular-nums neumorphic">
            <Trophy size={16} className="text-nfl-yellow" />
            <span>
              <strong className="text-text-primary">{filledSlots}</strong>/{totalSlots}
            </span>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`px-4 py-3 border-l-4 bg-gridiron-surface text-sm font-medium ${
            statusMessage.startsWith('Loaded')
              ? 'border-nfl-green text-nfl-green'
              : 'border-nfl-yellow text-nfl-yellow'
          }`}
        >
          {statusMessage}
        </div>
      )}

      {teams.length === 0 && (
        <div className="bg-gridiron-surface p-4 border-2 border-gridiron-border text-sm text-text-secondary neumorphic">
          Bracket preview is available now. Seed teams in Settings when you are ready to fill slots.
        </div>
      )}

      <div className="bg-gridiron-surface border-2 border-gridiron-border neumorphic">
        {/* Mobile stacked view */}
        <div className="p-4 lg:hidden space-y-6">
          {BRACKET_ROUNDS.map((round) => (
            <BracketRoundSection
              key={round.key}
              round={round}
              predictionMap={predictionMap}
              teams={teams}
              savingSlot={savingSlot}
              onSave={savePrediction}
            />
          ))}
        </div>

        {/* Desktop tournament funnel */}
        <div className="hidden lg:block overflow-x-auto">
          <div className="min-w-[1220px] p-5">
            <div className="grid grid-cols-5 gap-5 items-stretch">
              {BRACKET_ROUNDS.map((round) => (
                <BracketRoundSection
                  key={round.key}
                  round={round}
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
  predictionMap,
  teams,
  savingSlot,
  onSave,
  desktop = false,
}: {
  round: BracketRound;
  predictionMap: Map<string, PlayoffPred>;
  teams: Team[];
  savingSlot: string | null;
  onSave: (round: string, slot: number, teamId: number) => void;
  desktop?: boolean;
}) {
  const matchupCount = round.slots / 2;

  return (
    <section className={`flex flex-col ${desktop ? 'h-full' : ''}`}>
      <div className="border-b-2 border-gridiron-border pb-2.5 mb-4">
        <h2 className="font-display font-bold text-lg text-text-primary tracking-tight">
          {round.label}
        </h2>
        <p className="text-xs font-mono text-text-muted uppercase tracking-wider">{round.hint}</p>
      </div>

      <div className={`flex flex-col gap-3.5 ${desktop ? 'flex-1 justify-around' : ''}`}>
        {round.key === 'champion' ? (
          <div className="border-2 border-nfl-yellow/50 bg-nfl-yellow/5 p-3">
            <div className="flex items-center gap-2 mb-2.5 text-xs font-mono uppercase tracking-wider text-nfl-yellow">
              <Trophy size={14} />
              Super Bowl Champion
            </div>
            <BracketSlot
              roundKey={round.key}
              slot={1}
              prediction={predictionMap.get(`${round.key}:1`)}
              teams={teams}
              saving={savingSlot === `${round.key}:1`}
              onSave={onSave}
              champion
            />
          </div>
        ) : (
          Array.from({ length: matchupCount }, (_, matchupIndex) => {
            const firstSlot = matchupIndex * 2 + 1;
            const secondSlot = firstSlot + 1;
            const isAfcHalf = round.key !== 'super_bowl' && matchupIndex < matchupCount / 2;
            const conferenceTag =
              round.key === 'super_bowl' ? 'SUPER BOWL' : isAfcHalf ? 'AFC' : 'NFC';

            return (
              <BracketMatchup
                key={`${round.key}-${matchupIndex}`}
                roundKey={round.key}
                matchup={matchupIndex + 1}
                conferenceTag={conferenceTag}
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
    </section>
  );
}

function BracketMatchup({
  roundKey,
  matchup,
  conferenceTag,
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
  conferenceTag: string;
  firstSlot: number;
  secondSlot: number;
  firstPrediction?: PlayoffPred;
  secondPrediction?: PlayoffPred;
  teams: Team[];
  savingSlot: string | null;
  onSave: (round: string, slot: number, teamId: number) => void;
}) {
  const accentBorder =
    conferenceTag === 'AFC'
      ? 'border-t-nfl-red'
      : conferenceTag === 'NFC'
        ? 'border-t-nfl-blue'
        : 'border-t-nfl-yellow';

  return (
    <div className={`relative bg-gridiron-bg/85 border border-gridiron-border border-t-2 ${accentBorder} p-2.5`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] text-text-muted font-mono uppercase tracking-wider">
          {conferenceTag} • Game {matchup}
        </span>
        {firstPrediction?.team_id && secondPrediction?.team_id && (
          <span className="bg-nfl-green/20 text-nfl-green p-0.5">
            <Check size={12} />
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
  const advanceTarget = !champion ? getAdvanceTarget(roundKey, slot) : null;

  return (
    <div
      className={`bg-gridiron-surface-hover/80 border-l-2 p-2.5 transition-colors ${
        isFilled ? 'border-nfl-green' : 'border-gridiron-border'
      }`}
    >
      <div className="mb-2 flex items-center gap-2 min-h-9">
        {selectedTeam?.logo_url ? (
          <img
            src={selectedTeam.logo_url}
            alt={selectedTeam.abbreviation}
            className="h-7 w-7 flex-shrink-0 object-contain"
          />
        ) : (
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center border border-dashed border-gridiron-border text-[10px] text-text-muted font-mono">
            TBD
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className={`truncate text-sm font-semibold ${isFilled ? 'text-text-primary' : 'text-text-muted'}`}>
            {selectedTeam ? `${selectedTeam.abbreviation} • ${selectedTeam.name}` : champion ? 'Champion TBD' : `Slot ${slot}`}
          </p>
          {saving && <p className="text-[11px] font-mono text-nfl-blue">Saving...</p>}
        </div>
        {selectedTeam && advanceTarget && (
          <button
            type="button"
            onClick={() => onSave(advanceTarget.round, advanceTarget.slot, selectedTeam.id)}
            title={`Advance ${selectedTeam.name} to ${advanceTarget.label}`}
            className="inline-flex items-center gap-0.5 bg-gridiron-bg hover:bg-nfl-blue border border-gridiron-border hover:border-nfl-blue px-1.5 py-1 text-[10px] font-mono text-text-secondary hover:text-white uppercase transition-colors flex-shrink-0"
          >
            <span>Next</span>
            <ArrowRight size={11} />
          </button>
        )}
      </div>
      <select
        value={prediction?.team_id ?? ''}
        onChange={(e) => onSave(roundKey, slot, Number(e.target.value))}
        disabled={teams.length === 0}
        className="w-full bg-gridiron-bg border border-gridiron-border px-2.5 py-1.5 text-xs text-text-primary font-medium"
      >
        <option value="">{teams.length === 0 ? 'Teams not seeded' : 'Select team...'}</option>
        {teams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.abbreviation} — {team.name}
          </option>
        ))}
      </select>
    </div>
  );
}
