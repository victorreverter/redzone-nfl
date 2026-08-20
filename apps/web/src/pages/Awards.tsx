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
      <h1 className="text-3xl md:text-4xl font-serif font-bold gradient-text">Award Predictions</h1>
      <p className="text-text-secondary text-sm">Lock date: Week before NFL announcement</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {AWARD_ORDER.map((type) => {
          const pred = predictions.find((p) => p.award_type === type);
          const form = forms[type] ?? { player_name: '', team_id: '' };
          const isSaved = savedAwards.has(type);
          return (
            <div key={type} className={`relative bg-gridiron-surface rounded-xl p-4 border-2 transition-all neumorphic ${
              isSaved ? 'border-nfl-green shadow-glow-green' : 'border-gridiron-border'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-serif font-semibold text-text-primary">{AWARD_LABELS[type]}</h2>
                <div className="flex items-center gap-2">
                  {isSaved && (
                    <div className="bg-nfl-green rounded-full p-1 animate-check">
                      <Check size={12} className="text-white" />
                    </div>
                  )}
                  {pred?.locked ? (
                    <span className="text-xs bg-nfl-red/20 text-nfl-red px-2 py-1 rounded-full font-mono">Locked</span>
                  ) : (
                    <span className="text-xs bg-nfl-green/20 text-nfl-green px-2 py-1 rounded-full font-mono">Open</span>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Player name"
                  value={form.player_name}
                  onChange={(e) => setForms({ ...forms, [type]: { ...form, player_name: e.target.value } })}
                  className="w-full bg-gridiron-bg border border-gridiron-border rounded-lg px-3 py-2 text-sm text-text-primary"
                  disabled={!!pred?.locked}
                />
                <select
                  value={form.team_id}
                  onChange={(e) => setForms({ ...forms, [type]: { ...form, team_id: e.target.value ? Number(e.target.value) : '' } })}
                  className="w-full bg-gridiron-bg border border-gridiron-border rounded-lg px-3 py-2 text-sm text-text-primary"
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
                  className="w-full bg-gradient-to-r from-nfl-red to-nfl-blue hover:shadow-glow disabled:opacity-50 text-white text-sm py-2 rounded-lg transition-all"
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
