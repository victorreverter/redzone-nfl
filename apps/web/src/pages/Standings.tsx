import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Check } from 'lucide-react';

interface DivisionPred {
  id: number;
  team_id: number;
  predicted_position: number;
  team_name: string;
  team_abbr: string;
  team_logo: string | null;
  conference: string;
  division: string;
}

interface Team {
  id: number;
  name: string;
  city: string;
  abbreviation: string;
  logo_url: string | null;
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
          api.get<Team[]>('/teams'),
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
    await api.post('/predictions/division', {
      season_id: seasonId,
      predictions: [{ team_id: teamId, position }],
    });
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
                  <div key={div} className={`bg-dark-800 rounded-xl p-4 border-2 transition-all ${
                    divTeams.some(t => predictions.some(p => p.team_id === t.id)) ? 'border-green-500' : 'border-dark-600'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-sm text-gray-400">{conf} {div}</h3>
                      {divTeams.some(t => predictions.some(p => p.team_id === t.id)) && (
                        <div className="bg-green-500 rounded-full p-1">
                          <Check size={12} className="text-white" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      {[1, 2, 3, 4].map((pos) => {
                        const pred = predictions.find(p => p.predicted_position === pos && divTeams.some(t => t.id === p.team_id));
                        const selectedTeam = pred ? divTeams.find(t => t.id === pred.team_id) : null;
                        return (
                          <div key={pos} className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 w-4">{pos}</span>
                            <div className="flex-1 flex items-center gap-2">
                              {selectedTeam?.logo_url && (
                                <img src={selectedTeam.logo_url} alt={selectedTeam.abbreviation} className="w-6 h-6 object-contain" />
                              )}
                              <select
                                value={selectedTeam?.id ?? ''}
                                onChange={(e) => savePosition(Number(e.target.value), pos)}
                                className="flex-1 bg-dark-700 border border-dark-500 rounded px-2 py-1.5 text-sm"
                              >
                                <option value="">Select team</option>
                                {divTeams.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.city} {t.name}
                                  </option>
                                ))}
                              </select>
                            </div>
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
