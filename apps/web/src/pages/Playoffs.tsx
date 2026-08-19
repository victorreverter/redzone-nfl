import { useEffect, useState } from 'react';
import { api } from '../lib/api';

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
  abbreviation: string;
}

const ROUNDS = ['wild_card', 'divisional', 'conference', 'super_bowl'];
const ROUND_LABELS: Record<string, string> = {
  wild_card: 'Wild Card',
  divisional: 'Divisional',
  conference: 'Conference',
  super_bowl: 'Super Bowl',
};

export function Playoffs() {
  const [predictions, setPredictions] = useState<PlayoffPred[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

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

  async function savePrediction(round: string, slot: number, teamId: number) {
    if (!seasonId) return;
    await api.post('/predictions/playoff', {
      season_id: seasonId,
      round,
      slot,
      team_id: teamId,
    });
    const updated = await api.get<PlayoffPred[]>(`/predictions/playoff/${seasonId}`);
    setPredictions(updated);
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nfl-blue" /></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold">Playoff Bracket</h1>

      {teams.length === 0 ? (
        <div className="bg-dark-800 rounded-xl p-8 border border-dark-600 text-center text-gray-400">
          Seed teams first in Settings
        </div>
      ) : (
        <div className="space-y-6">
          {ROUNDS.map((round) => {
            const roundPreds = predictions.filter((p) => p.round === round);
            const slotCount = round === 'super_bowl' ? 1 : round === 'conference' ? 2 : round === 'divisional' ? 4 : 8;
            return (
              <div key={round} className="bg-dark-800 rounded-xl p-4 border border-dark-600">
                <h2 className="font-semibold text-lg mb-4">{ROUND_LABELS[round]}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {Array.from({ length: slotCount }, (_, i) => {
                    const pred = roundPreds.find((p) => p.slot === i + 1);
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-6">#{i + 1}</span>
                        <select
                          value={pred?.team_id ?? ''}
                          onChange={(e) => savePrediction(round, i + 1, Number(e.target.value))}
                          className="flex-1 bg-dark-700 border border-dark-500 rounded px-2 py-1.5 text-sm"
                        >
                          <option value="">Select team</option>
                          {teams.map((t) => (
                            <option key={t.id} value={t.id}>{t.abbreviation} - {t.name}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
