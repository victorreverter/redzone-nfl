import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { shortenCity } from '../lib/utils';
import { Check, GripVertical } from 'lucide-react';

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
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [divisionOrders, setDivisionOrders] = useState<Record<string, number[]>>({});
  const [saving, setSaving] = useState(false);
  const [savedDivisions, setSavedDivisions] = useState<Set<string>>(new Set());
  const dragItem = useRef<{ divKey: string; index: number } | null>(null);
  const dragOverItem = useRef<{ divKey: string; index: number } | null>(null);

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

        // Build initial division orders from predictions or default
        const orders: Record<string, number[]> = {};
        const conferences = ['AFC', 'NFC'];
        const divisions = ['East', 'North', 'South', 'West'];
        
        for (const conf of conferences) {
          for (const div of divisions) {
            const key = `${conf}-${div}`;
            const divTeams = teamsData.filter(t => t.conference === conf && t.division === div);
            const divPreds = predsData.filter(p => divTeams.some(t => t.id === p.team_id));
            
            if (divPreds.length === 4) {
              // Use saved order
              const sorted = [...divPreds].sort((a, b) => a.predicted_position - b.predicted_position);
              orders[key] = sorted.map(p => p.team_id);
            } else {
              // Default order
              orders[key] = divTeams.map(t => t.id);
            }
          }
        }
        setDivisionOrders(orders);
        
        // Track which divisions have saved predictions
        const saved = new Set<string>();
        for (const conf of conferences) {
          for (const div of divisions) {
            const key = `${conf}-${div}`;
            const divTeams = teamsData.filter(t => t.conference === conf && t.division === div);
            const divPreds = predsData.filter(p => divTeams.some(t => t.id === p.team_id));
            if (divPreds.length === 4) {
              saved.add(key);
            }
          }
        }
        setSavedDivisions(saved);
      } catch {
        // not ready
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function handleDragStart(divKey: string, index: number) {
    dragItem.current = { divKey, index };
  }

  function handleDragEnter(divKey: string, index: number) {
    dragOverItem.current = { divKey, index };
  }

  function handleDragEnd(divKey: string) {
    if (!dragItem.current || !dragOverItem.current) return;
    if (dragItem.current.divKey !== divKey) return;

    const list = [...(divisionOrders[divKey] || [])];
    const dragItemIndex = dragItem.current.index;
    const dragOverItemIndex = dragOverItem.current.index;

    // Remove dragged item
    const [removed] = list.splice(dragItemIndex, 1);
    // Insert at new position
    list.splice(dragOverItemIndex, 0, removed);

    setDivisionOrders({ ...divisionOrders, [divKey]: list });
    dragItem.current = null;
    dragOverItem.current = null;
  }

  async function handleSaveAll() {
    if (!seasonId) return;
    setSaving(true);

    const allPredictions: { team_id: number; position: number }[] = [];
    
    for (const [, teamIds] of Object.entries(divisionOrders)) {
      teamIds.forEach((teamId, index) => {
        allPredictions.push({ team_id: teamId, position: index + 1 });
      });
    }

    await api.post('/predictions/division', {
      season_id: seasonId,
      predictions: allPredictions,
    });

    setSaving(false);
    
    // Mark all divisions as saved
    const allSaved = new Set<string>();
    for (const key of Object.keys(divisionOrders)) {
      allSaved.add(key);
    }
    setSavedDivisions(allSaved);
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
          Division Predictions
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
                const teamIds = divisionOrders[key] || [];
                const divTeams = teams.filter(t => t.conference === conf && t.division === div);
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
                    <div className="space-y-2">
                      {teamIds.map((teamId, index) => {
                        const team = divTeams.find(t => t.id === teamId);
                        if (!team) return null;
                        return (
                          <motion.div
                            key={teamId}
                            draggable
                            onDragStart={() => handleDragStart(key, index)}
                            onDragEnter={() => handleDragEnter(key, index)}
                            onDragEnd={() => handleDragEnd(key)}
                            onDragOver={(e) => e.preventDefault()}
                            whileHover={{ scale: 1.02, x: 5 }}
                            className="flex items-center gap-3 bg-gridiron-surface-hover p-3 cursor-grab active:cursor-grabbing hover:bg-gridiron-border transition-all border-l-4 border-transparent hover:border-nfl-blue"
                          >
                            <GripVertical size={18} className="text-text-muted" />
                            <span className="text-base text-text-muted w-6 font-mono font-bold">{index + 1}</span>
                            {team.logo_url && (
                              <img src={team.logo_url} alt={team.abbreviation} className="w-8 h-8 object-contain" />
                            )}
                            <span className="flex-1 text-base text-text-primary font-bold uppercase tracking-wide">{shortenCity(team.city)} {team.name}</span>
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
