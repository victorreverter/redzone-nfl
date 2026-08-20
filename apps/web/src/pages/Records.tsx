import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { shortenCity } from '../lib/utils';
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
        <motion.h1 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold gradient-text uppercase tracking-tight"
        >
          Team Record Predictions
        </motion.h1>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSaveAll}
          disabled={saving}
          className={`text-white px-6 py-3 text-sm font-bold uppercase tracking-wide transition-all ${
            saving ? 'bg-text-muted' : 'bg-gradient-to-r from-nfl-red to-nfl-blue hover:shadow-glow'
          }`}
        >
          {saving ? 'Saving...' : 'Save All'}
        </motion.button>
      </div>

      {teams.length === 0 ? (
        <div className="bg-gridiron-surface p-8 border-2 border-gridiron-border text-center text-text-secondary neumorphic">
          Seed teams first in Settings
        </div>
      ) : (
        conferences.map((conf) => (
          <motion.div 
            key={conf}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-text-primary mb-5 pb-3 border-b-4 border-nfl-blue uppercase tracking-tight">{conf}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {divisions.map((div) => {
                const key = `${conf}-${div}`;
                const divTeams = teams
                  .filter((t) => t.conference === conf && t.division === div)
                  .sort((a, b) => {
                    const recA = records[a.id] ?? { wins: '', losses: '' };
                    const recB = records[b.id] ?? { wins: '', losses: '' };
                    const winsA = recA.wins === '' ? -1 : parseInt(recA.wins) || 0;
                    const winsB = recB.wins === '' ? -1 : parseInt(recB.wins) || 0;
                    const lossesA = recA.losses === '' ? 999 : parseInt(recA.losses) || 0;
                    const lossesB = recB.losses === '' ? 999 : parseInt(recB.losses) || 0;
                    
                    // Sort by wins descending, then losses ascending
                    if (winsB !== winsA) return winsB - winsA;
                    return lossesA - lossesB;
                  });
                const isSaved = savedDivisions.has(key);
                return (
                  <div key={div} className={`bg-gridiron-surface p-5 border-2 transition-all neumorphic ${
                    isSaved ? 'border-nfl-green shadow-glow-green' : 'border-gridiron-border'
                  }`}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-base text-text-secondary uppercase tracking-wide">{conf} {div}</h3>
                      {isSaved && (
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="bg-nfl-green p-1.5"
                        >
                          <Check size={14} className="text-white" />
                        </motion.div>
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
                          <motion.div 
                            key={team.id}
                            whileHover={{ scale: 1.02 }}
                            className={`p-4 transition-all ${
                              isTeamSaved ? 'bg-gridiron-surface-hover border-l-4 border-nfl-green/50' : 'bg-gridiron-surface-hover border-l-4 border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-3 mb-3">
                              {team.logo_url && (
                                <img src={team.logo_url} alt={team.abbreviation} className="w-8 h-8 object-contain" />
                              )}
                              <span className="text-base font-bold text-text-primary uppercase tracking-wide">{shortenCity(team.city)} {team.name}</span>
                            </div>
                            <div className="flex gap-3 items-center">
                              <input
                                type="number"
                                min="0"
                                max={maxWins}
                                placeholder="W"
                                value={rec.wins}
                                onChange={(e) => updateRecord(team.id, 'wins', e.target.value)}
                                className="w-20 bg-gridiron-bg border-2 border-gridiron-border px-3 py-2 text-base text-center text-text-primary font-mono font-bold"
                              />
                              <span className="text-text-muted text-lg font-mono font-bold">-</span>
                              <input
                                type="number"
                                min="0"
                                max={maxLosses}
                                placeholder="L"
                                value={rec.losses}
                                onChange={(e) => updateRecord(team.id, 'losses', e.target.value)}
                                className="w-20 bg-gridiron-bg border-2 border-gridiron-border px-3 py-2 text-base text-center text-text-primary font-mono font-bold"
                              />
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ))
      )}
    </div>
  );
}
