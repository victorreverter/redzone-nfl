import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { shortenCity } from '../lib/utils';
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

interface AwardMedia {
  src: string;
  aspectClass: string;
  position: string;
}

interface AwardTitle {
  short: string;
  detail: string;
}

const AWARD_TITLES: Record<string, AwardTitle> = {
  mvp: { short: 'MVP', detail: 'Most Valuable Player' },
  opoy: { short: 'OPOY', detail: 'Offensive Player of the Year' },
  dpoy: { short: 'DPOY', detail: 'Defensive Player of the Year' },
  offensive_roty: { short: 'OROY', detail: 'Offensive Rookie of the Year' },
  defensive_roty: { short: 'DROY', detail: 'Defensive Rookie of the Year' },
  coach_of_year: { short: 'COY', detail: 'Coach of the Year' },
  comeback_player: { short: 'CPOY', detail: 'Comeback Player of the Year' },
  super_bowl_mvp: { short: 'SB MVP', detail: 'Super Bowl MVP' },
};

const AWARD_MEDIA: Record<string, AwardMedia> = {
  mvp: { src: '/award-mvp.png', aspectClass: 'aspect-[3/2]', position: 'center center' },
  opoy: { src: '/award-opoy-3x2.png', aspectClass: 'aspect-[3/2]', position: 'center center' },
  dpoy: { src: '/award-dpoy.png', aspectClass: 'aspect-[3/2]', position: 'center center' },
  offensive_roty: { src: '/award-offensive-roty.png', aspectClass: 'aspect-[3/2]', position: 'center center' },
  defensive_roty: { src: '/award-defensive-roty.png', aspectClass: 'aspect-[3/2]', position: 'center center' },
  coach_of_year: { src: '/award-coach.png', aspectClass: 'aspect-[3/2]', position: 'center center' },
  comeback_player: { src: '/award-comeback-3x2.png', aspectClass: 'aspect-[3/2]', position: 'center center' },
  super_bowl_mvp: { src: '/award-super-bowl-mvp.png', aspectClass: 'aspect-[3/2]', position: 'center center' },
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
      <motion.h1 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold gradient-text uppercase tracking-tight"
      >
        Award Predictions
      </motion.h1>
      <p className="text-text-secondary text-base uppercase tracking-wide font-bold">Lock date: Week before NFL announcement</p>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {AWARD_ORDER.map((type, index) => {
          const pred = predictions.find((p) => p.award_type === type);
          const form = forms[type] ?? { player_name: '', team_id: '' };
          const isSaved = savedAwards.has(type);
          const media = AWARD_MEDIA[type];
          const title = AWARD_TITLES[type];
          return (
            <motion.div 
              key={type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className={`relative bg-gridiron-surface p-5 border-2 transition-all neumorphic ${
                isSaved ? 'border-nfl-green shadow-glow-green' : 'border-gridiron-border'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <h2 className="min-w-0 font-serif font-bold text-xl text-text-primary uppercase tracking-wide leading-none">
                  <span>{title.short}</span>
                  <span className="ml-2 align-middle font-sans text-[10px] sm:text-xs text-text-secondary uppercase tracking-wide leading-none">
                    ({title.detail})
                  </span>
                </h2>
                <div className="flex items-center gap-3">
                  {isSaved && (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="bg-nfl-green p-1.5"
                    >
                      <Check size={14} className="text-white" />
                    </motion.div>
                  )}
                  {pred?.locked ? (
                    <span className="text-sm bg-nfl-red/20 text-nfl-red px-3 py-1 font-mono font-bold uppercase">Locked</span>
                  ) : (
                    <span className="text-sm bg-nfl-green/20 text-nfl-green px-3 py-1 font-mono font-bold uppercase">Open</span>
                  )}
                </div>
              </div>
              <div className={`relative mb-4 overflow-hidden border-2 border-gridiron-border bg-gridiron-bg ${media.aspectClass}`}>
                <img
                  src={media.src}
                  alt=""
                  className="h-full w-full object-cover"
                  style={{ objectPosition: media.position }}
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-gridiron-bg/85 via-gridiron-bg/10 to-transparent pointer-events-none" />
                <div className="absolute bottom-3 left-3 bg-gridiron-bg/80 border-2 border-gridiron-border px-3 py-1 text-xs text-text-secondary font-mono font-bold uppercase tracking-wide">
                  Season Award Pick
                </div>
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Player name"
                  value={form.player_name}
                  onChange={(e) => setForms({ ...forms, [type]: { ...form, player_name: e.target.value } })}
                  className="w-full bg-gridiron-bg border-2 border-gridiron-border px-4 py-3 text-base text-text-primary font-bold"
                  disabled={!!pred?.locked}
                />
                <select
                  value={form.team_id}
                  onChange={(e) => setForms({ ...forms, [type]: { ...form, team_id: e.target.value ? Number(e.target.value) : '' } })}
                  className="w-full bg-gridiron-bg border-2 border-gridiron-border px-4 py-3 text-base text-text-primary font-bold"
                  disabled={!!pred?.locked}
                >
                  <option value="">Select team (optional)</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{shortenCity(t.city)} {t.name}</option>
                  ))}
                </select>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => saveAward(type)}
                  disabled={!!pred?.locked}
                  className="w-full bg-gradient-to-r from-nfl-red to-nfl-blue hover:shadow-glow disabled:opacity-50 text-white text-base font-bold uppercase tracking-wide py-3 transition-all"
                >
                  {isSaved ? 'Update' : 'Save'}
                </motion.button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
