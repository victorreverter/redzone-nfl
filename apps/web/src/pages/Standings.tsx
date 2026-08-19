import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface DivisionPred {
  id: number;
  team_id: number;
  predicted_position: number;
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

export function Standings() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [predictions, setPredictions] = useState<DivisionPred[]>([]);
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const seasons = await api.get<{ id: number }[]>('/seasons');
        if (seasons.length === 0) { setLoading(false); return; }
        setSeasonId(seasons[0].id);
        const [teamsData, predsData] = await Promise.all([
          api.get<Team[]>('/teams/'),
          api.get<DivisionPred[]>(`/predictions/division/${seasons[0].id}`),
        ]);
        setTeams(teamsData);
        setPredictions(predsData);
      } catch {
        // not ready
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function savePosition(teamId: number, position: number) {
    if (!seasonId) return;
    const predictions_to_save = teams.map((t) => {
      const pred = predictions.find((p) => p.team_id === t.id);
      if (t.id === teamId) return { team_id: t.id, position };
      if (pred && pred.predicted_position === position) return { team_id: t.id, position: pred.predicted_position };
      return pred ? { team_id: t.id, position: pred.predicted_position } : null;
    }).filter(Boolean) as { team_id: number; position: number }[];
    await api.post('/predictions/division', { season_id: seasonId, predictions: predictions_to_save });
    const updated = await api.get<DivisionPred[]>(`/predictions/division/${seasonId}`);
    setPredictions(updated);
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nfl-blue" /></div>;
  }

  const conferences = ['AFC', 'NFC'];
  const divisions = ['East', 'North', 'South', 'West'];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold">Division Predictions</h1>

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
                    <div className="space-y-2">
                      {[1, 2, 3, 4].map((pos) => {
                        const team = divTeams.find((t) => predictions.find((p) => p.team_id === t.id && p.predicted_position === pos));
                        return (
                          <div key={pos} className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 w-4">{pos}</span>
                            <select
                              value={team?.id ?? ''}
                              onChange={(e) => savePosition(Number(e.target.value), pos)}
                              className="flex-1 bg-dark-700 border border-dark-500 rounded px-2 py-1.5 text-sm"
                            >
                              <option value="">Select team</option>
                              {divTeams.map((t) => (
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
          </div>
        ))
      )}
    </div>
  );
}
