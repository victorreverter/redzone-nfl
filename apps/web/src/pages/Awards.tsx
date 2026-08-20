import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Check } from 'lucide-react';

interface AwardPred {
  id: number;
  award_type: string;
  player_name: string;
  team_id: number | null;
  team_name: string | null;
  team_abbr: string | null;
  locked: number;
}

interface Team {
  id: number;
  name: string;
  city: string;
  abbreviation: string;
  logo_url: string | null;
}

const AWARD_LABELS: Record<string, string> = {
  mvp: 'MVP',
  opoy: 'Offensive Player of the Year',
  dpoy: 'Defensive Player of the Year',
  offensive_roty: 'Offensive Rookie of the Year',
  defensive_roty: 'Defensive Rookie of the Year',
  coach_of_year: 'Coach of the Year',
  comeback_player: 'Comeback Player of the Year',
  super_bowl_mvp: 'Super Bowl MVP',
};

const AWARD_ORDER = ['mvp', 'opoy', 'dpoy', 'offensive_roty', 'defensive_roty', 'coach_of_year', 'comeback_player', 'super_bowl_mvp'];

export function Awards() {
  const [predictions, setPredictions] = useState<AwardPred[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState<Record<string, { player_name: string; team_id: number | '' }>>({});
  const [savedAwards, setSavedAwards] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      try {
        const seasons = await api.get<{ id: number }[]>('/seasons');
        if (seasons.length === 0) { setLoading(false); return; }
        setSeasonId(seasons[0].id);
        const [predsData, teamsData] = await Promise.all([
          api.get<AwardPred[]>(`/awards/${seasons[0].id}`),
          api.get<Team[]>('/teams'),
        ]);
        setPredictions(predsData);
        setTeams(teamsData);
        const f: Record<string, { player_name: string; team_id: number | '' }> = {};
        for (const type of AWARD_ORDER) {
          const pred = predsData.find((p) => p.award_type === type);
          f[type] = { player_name: pred?.player_name ?? '', team_id: pred?.team_id ?? '' };
        }
        setForms(f);
        
        // Track which awards have saved predictions
        const saved = new Set<string>();
        for (const pred of predsData) {
          if (pred.player_name && pred.player_name.trim() !== '') {
            saved.add(pred.award_type);
          }
        }
        setSavedAwards(saved);
      } catch {
        // not ready
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function saveAward(awardType: string) {
    if (!seasonId || !forms[awardType]) return;
    await api.post('/awards', {
      season_id: seasonId,
      award_type: awardType,
      player_name: forms[awardType].player_name,
      team_id: forms[awardType].team_id || null,
    });
    const updated = await api.get<AwardPred[]>(`/awards/${seasonId}`);
    setPredictions(updated);
    setSavedAwards(prev => new Set(prev).add(awardType));
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nfl-blue" /></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold">Award Predictions</h1>
      <p className="text-gray-400 text-sm">Lock date: Week before NFL announcement</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {AWARD_ORDER.map((type) => {
          const pred = predictions.find((p) => p.award_type === type);
          const form = forms[type] ?? { player_name: '', team_id: '' };
          const isSaved = savedAwards.has(type);
          return (
            <div key={type} className={`relative bg-dark-800 rounded-xl p-4 border-2 transition-all ${
              isSaved ? 'border-green-500' : 'border-dark-600'
            }`}>
              {isSaved && (
                <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1.5 shadow-lg">
                  <Check size={14} className="text-white" />
                </div>
              )}
              <div className="flex items-center justify-between mb-3 pr-6">
                <h2 className="font-semibold">{AWARD_LABELS[type]}</h2>
                {pred?.locked ? (
                  <span className="text-xs bg-red-900 text-red-400 px-2 py-1 rounded-full">Locked</span>
                ) : (
                  <span className="text-xs bg-green-900 text-green-400 px-2 py-1 rounded-full">Open</span>
                )}
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Player name"
                  value={form.player_name}
                  onChange={(e) => setForms({ ...forms, [type]: { ...form, player_name: e.target.value } })}
                  className="w-full bg-dark-700 border border-dark-500 rounded-lg px-3 py-2 text-sm"
                  disabled={!!pred?.locked}
                />
                <select
                  value={form.team_id}
                  onChange={(e) => setForms({ ...forms, [type]: { ...form, team_id: e.target.value ? Number(e.target.value) : '' } })}
                  className="w-full bg-dark-700 border border-dark-500 rounded-lg px-3 py-2 text-sm"
                  disabled={!!pred?.locked}
                >
                  <option value="">Select team (optional)</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.city} {t.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => saveAward(type)}
                  disabled={!!pred?.locked}
                  className="w-full bg-nfl-blue hover:bg-blue-800 disabled:opacity-50 text-white text-sm py-2 rounded-lg transition-colors"
                >
                  {isSaved ? 'Update' : 'Save'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
