import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Check } from 'lucide-react';

interface RecordPred {
  team_id: number;
  predicted_wins: number;
  predicted_losses: number;
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

const MAX_GAMES = 17;

export function Records() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<Record<number, { wins: string; losses: string }>>({});
  const [saving, setSaving] = useState(false);
  const [savedDivisions, setSavedDivisions] = useState<Set<string>>(new Set());
  const [savedTeams, setSavedTeams] = useState<Set<number>>(new Set());

  useEffect(() => {
    async function load() {
      try {
        const seasons = await api.get<{ id: number }[]>('/seasons');
        if (seasons.length === 0) { setLoading(false); return; }
        setSeasonId(seasons[0].id);
        const [teamsData, predsData] = await Promise.all([
          api.get<Team[]>('/teams'),
          api.get<RecordPred[]>(`/predictions/records/${seasons[0].id}`),
        ]);
        setTeams(teamsData);
        const r: Record<number, { wins: string; losses: string }> = {};
        for (const t of teamsData) {
          const pred = predsData.find((p) => p.team_id === t.id);
          r[t.id] = { wins: pred?.predicted_wins?.toString() ?? '', losses: pred?.predicted_losses?.toString() ?? '' };
        }
        setRecords(r);
        
        // Track which divisions have saved predictions
        const saved = new Set<string>();
        const conferences = ['AFC', 'NFC'];
        const divisions = ['East', 'North', 'South', 'West'];
        for (const conf of conferences) {
          for (const div of divisions) {
            const key = `${conf}-${div}`;
            const divTeams = teamsData.filter(t => t.conference === conf && t.division === div);
            const hasPreds = divTeams.some(t => predsData.some(p => p.team_id === t.id && (p.predicted_wins > 0 || p.predicted_losses > 0)));
            if (hasPreds) {
              saved.add(key);
            }
          }
        }
        setSavedDivisions(saved);
        
        // Track which teams have saved predictions
        const savedTeamsSet = new Set<number>();
        for (const pred of predsData) {
          if (pred.predicted_wins > 0 || pred.predicted_losses > 0) {
            savedTeamsSet.add(pred.team_id);
          }
        }
        setSavedTeams(savedTeamsSet);
      } catch {
        // not ready
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function updateRecord(teamId: number, field: 'wins' | 'losses', value: string) {
    const current = records[teamId] ?? { wins: '', losses: '' };
    const numValue = value === '' ? '' : Math.min(MAX_GAMES, Math.max(0, parseInt(value) || 0));
    
    if (field === 'wins') {
      const winsNum = numValue === '' ? 0 : Number(numValue);
      const lossesNum = current.losses === '' ? 0 : parseInt(current.losses) || 0;
      const maxLosses = MAX_GAMES - winsNum;
      const newLosses = lossesNum > maxLosses ? maxLosses.toString() : current.losses;
      setRecords({ ...records, [teamId]: { wins: numValue.toString(), losses: newLosses } });
    } else {
      const lossesNum = numValue === '' ? 0 : Number(numValue);
      const winsNum = current.wins === '' ? 0 : parseInt(current.wins) || 0;
      const maxWins = MAX_GAMES - lossesNum;
      const newWins = winsNum > maxWins ? maxWins.toString() : current.wins;
      setRecords({ ...records, [teamId]: { wins: newWins, losses: numValue.toString() } });
    }
  }

  async function handleSaveAll() {
    if (!seasonId) return;
    setSaving(true);
    const preds = Object.entries(records).map(([teamId, r]) => ({
      team_id: Number(teamId),
      wins: Number(r.wins) || 0,
      losses: Number(r.losses) || 0,
    })).filter(p => p.wins > 0 || p.losses > 0);
    await api.post('/predictions/records', { season_id: seasonId, predictions: preds });
    setSaving(false);
    
    // Mark all divisions as saved
    const allSaved = new Set<string>();
    const conferences = ['AFC', 'NFC'];
    const divisions = ['East', 'North', 'South', 'West'];
    for (const conf of conferences) {
      for (const div of divisions) {
        allSaved.add(`${conf}-${div}`);
      }
    }
    setSavedDivisions(allSaved);
    
    // Mark all teams with predictions as saved
    const allTeamsSaved = new Set<number>();
    for (const pred of preds) {
      if (pred.wins > 0 || pred.losses > 0) {
        allTeamsSaved.add(pred.team_id);
      }
    }
    setSavedTeams(allTeamsSaved);
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
          onClick={handleSaveAll}
          disabled={saving}
          className={`text-white px-4 py-2 rounded-lg text-sm transition-all ${
            saving ? 'bg-gray-600' : 'bg-nfl-blue hover:bg-blue-800'
          }`}
        >
          {saving ? 'Saving...' : 'Save All'}
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
                const key = `${conf}-${div}`;
                const divTeams = teams.filter((t) => t.conference === conf && t.division === div);
                const isSaved = savedDivisions.has(key);
                return (
                  <div key={div} className={`bg-dark-800 rounded-xl p-4 border-2 transition-all ${
                    isSaved ? 'border-green-500' : 'border-dark-600'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-sm text-gray-400">{conf} {div}</h3>
                      {isSaved && (
                        <div className="bg-green-500 rounded-full p-1">
                          <Check size={12} className="text-white" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      {divTeams.map((team) => {
                        const rec = records[team.id] ?? { wins: '', losses: '' };
                        const winsNum = rec.wins === '' ? 0 : parseInt(rec.wins) || 0;
                        const lossesNum = rec.losses === '' ? 0 : parseInt(rec.losses) || 0;
                        const maxLosses = MAX_GAMES - winsNum;
                        const maxWins = MAX_GAMES - lossesNum;
                        const isTeamSaved = savedTeams.has(team.id);
                        
                        return (
                          <div key={team.id} className={`relative p-2 rounded-lg transition-all ${
                            isTeamSaved ? 'bg-dark-700 border border-green-500/30' : 'bg-dark-700'
                          }`}>
                            <div className="flex items-center gap-2 mb-1">
                              {team.logo_url && (
                                <img src={team.logo_url} alt={team.abbreviation} className="w-5 h-5 object-contain" />
                              )}
                              <span className="text-sm font-medium">{team.city} {team.name}</span>
                            </div>
                            <div className="flex gap-2 items-center">
                              <input
                                type="number"
                                min="0"
                                max={maxWins}
                                placeholder="W"
                                value={rec.wins}
                                onChange={(e) => updateRecord(team.id, 'wins', e.target.value)}
                                className="w-16 bg-dark-800 border border-dark-500 rounded px-2 py-1 text-sm text-center"
                              />
                              <span className="text-gray-500">-</span>
                              <input
                                type="number"
                                min="0"
                                max={maxLosses}
                                placeholder="L"
                                value={rec.losses}
                                onChange={(e) => updateRecord(team.id, 'losses', e.target.value)}
                                className="w-16 bg-dark-800 border border-dark-500 rounded px-2 py-1 text-sm text-center"
                              />
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
