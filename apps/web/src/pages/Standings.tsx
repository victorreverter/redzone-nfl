import { useEffect, useState, useRef } from 'react';
import { api } from '../lib/api';
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
  const [predictions, setPredictions] = useState<DivisionPred[]>([]);
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [divisionOrders, setDivisionOrders] = useState<Record<string, number[]>>({});
  const [saving, setSaving] = useState(false);
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
        setPredictions(predsData);

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

    // Reload predictions to show saved state
    const updated = await api.get<DivisionPred[]>(`/predictions/division/${seasonId}`);
    setPredictions(updated);
    setSaving(false);
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nfl-blue" /></div>;
  }

  const conferences = ['AFC', 'NFC'];
  const divisions = ['East', 'North', 'South', 'West'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold">Division Predictions</h1>
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
                const teamIds = divisionOrders[key] || [];
                const divTeams = teams.filter(t => t.conference === conf && t.division === div);
                const hasPredictions = predictions.some(p => divTeams.some(t => t.id === p.team_id));

                return (
                  <div key={div} className={`bg-dark-800 rounded-xl p-4 border-2 transition-all ${
                    hasPredictions ? 'border-green-500' : 'border-dark-600'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-sm text-gray-400">{conf} {div}</h3>
                      {hasPredictions && (
                        <div className="bg-green-500 rounded-full p-1">
                          <Check size={12} className="text-white" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      {teamIds.map((teamId, index) => {
                        const team = divTeams.find(t => t.id === teamId);
                        if (!team) return null;
                        return (
                          <div
                            key={teamId}
                            draggable
                            onDragStart={() => handleDragStart(key, index)}
                            onDragEnter={() => handleDragEnter(key, index)}
                            onDragEnd={() => handleDragEnd(key)}
                            onDragOver={(e) => e.preventDefault()}
                            className="flex items-center gap-2 bg-dark-700 rounded-lg p-2 cursor-grab active:cursor-grabbing hover:bg-dark-600 transition-colors"
                          >
                            <GripVertical size={16} className="text-gray-500" />
                            <span className="text-xs text-gray-500 w-4">{index + 1}</span>
                            {team.logo_url && (
                              <img src={team.logo_url} alt={team.abbreviation} className="w-6 h-6 object-contain" />
                            )}
                            <span className="flex-1 text-sm">{team.city} {team.name}</span>
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
