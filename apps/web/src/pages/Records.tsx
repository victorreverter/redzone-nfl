import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface RecordPred {
  team_id: number;
  predicted_wins: number;
  predicted_losses: number;
  team_name: string;
  team_abbr: string;
  conference: string;
  division: string;
}

interface Team {
  id: number;
  name: string;
  abbreviation: string;
  conference: string;
  division: string;
}

export function Records() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [predictions, setPredictions] = useState<RecordPred[]>([]);
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<Record<number, { wins: string; losses: string }>>({});

  useEffect(() => {
    async function load() {
      try {
        const seasons = await api.get<{ id: number }[]>('/seasons');
        if (seasons.length === 0) { setLoading(false); return; }
        setSeasonId(seasons[0].id);
        const [teamsData, predsData] = await Promise.all([
          api.get<Team[]>('/teams/'),
          api.get<RecordPred[]>(`/predictions/records/${seasons[0].id}`),
        ]);
        setTeams(teamsData);
        setPredictions(predsData);
        const r: Record<number, { wins: string; losses: string }> = {};
        for (const t of teamsData) {
          const pred = predsData.find((p) => p.team_id === t.id);
          r[t.id] = { wins: pred?.predicted_wins?.toString() ?? '', losses: pred?.predicted_losses?.toString() ?? '' };
        }
        setRecords(r);
      } catch {
        // not ready
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function saveAll() {
    if (!seasonId) return;
    const preds = Object.entries(records).map(([teamId, r]) => ({
      team_id: Number(teamId),
      wins: Number(r.wins) || 0,
      losses: Number(r.losses) || 0,
    }));
    await api.post('/predictions/records', { season_id: seasonId, predictions: preds });
    const updated = await api.get<RecordPred[]>(`/predictions/records/${seasonId}`);
    setPredictions(updated);
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nfl-blue" /></div>;
  }

  const conferences = ['AFC', 'NFC'];
  const divisions = ['East', 'North', 'South', 'West'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold">Team Record Predictions</h1>
        <button
          onClick={saveAll}
          className="bg-nfl-blue hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm transition-colors"
        >
          Save All
        </button>
      </div>

      {teams.length === 0 ? (
        <div className="bg-dark-800 rounded-xl p-8 border border-dark-600 text-center text-gray-400">
          Seed teams first in Settings
        </div>
      ) : (
        conferences.map((conf) => (
          <div key={conf}>
            <h2 className="text-xl font-bold text-nfl-blue mb-3">{conf}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {divisions.map((div) => {
                const divTeams = teams.filter((t) => t.conference === conf && t.division === div);
                return (
                  <div key={div} className="bg-dark-800 rounded-xl p-4 border border-dark-600">
                    <h3 className="font-semibold text-sm text-gray-400 mb-3">{conf} {div}</h3>
                    <div className="space-y-3">
                      {divTeams.map((team) => {
                        const rec = records[team.id] ?? { wins: '', losses: '' };
                        const pred = predictions.find((p) => p.team_id === team.id);
                        return (
                          <div key={team.id} className="space-y-1">
                            <span className="text-sm font-medium">{team.abbreviation}</span>
                            <div className="flex gap-2 items-center">
                              <input
                                type="number"
                                min="0"
                                max="17"
                                placeholder="W"
                                value={rec.wins}
                                onChange={(e) => setRecords({ ...records, [team.id]: { ...rec, wins: e.target.value } })}
                                className="w-16 bg-dark-700 border border-dark-500 rounded px-2 py-1 text-sm text-center"
                              />
                              <span className="text-gray-500">-</span>
                              <input
                                type="number"
                                min="0"
                                max="17"
                                placeholder="L"
                                value={rec.losses}
                                onChange={(e) => setRecords({ ...records, [team.id]: { ...rec, losses: e.target.value } })}
                                className="w-16 bg-dark-700 border border-dark-500 rounded px-2 py-1 text-sm text-center"
                              />
                            </div>
                            {pred && (
                              <span className="text-xs text-green-400">Saved: {pred.predicted_wins}-{pred.predicted_losses}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
