import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { teamDisplayName } from '../lib/utils';
import { Check, Lock } from 'lucide-react';

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

const AWARD_ORDER = [
  'mvp',
  'opoy',
  'dpoy',
  'offensive_roty',
  'defensive_roty',
  'coach_of_year',
  'comeback_player',
  'super_bowl_mvp',
];

export function Awards() {
  const [predictions, setPredictions] = useState<AwardPred[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState<Record<string, { player_name: string; team_id: number | '' }>>({});
  const [savedAwards, setSavedAwards] = useState<Set<string>>(new Set());
  const [savingType, setSavingType] = useState<string | null>(null);
  const [justSavedType, setJustSavedType] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
    setSavingType(awardType);
    setErrorMsg(null);
    try {
      await api.post('/awards', {
        season_id: seasonId,
        award_type: awardType,
        player_name: forms[awardType].player_name,
        team_id: forms[awardType].team_id || null,
      });
      const updated = await api.get<AwardPred[]>(`/awards/${seasonId}`);
      setPredictions(updated);
      setSavedAwards((prev) => new Set(prev).add(awardType));
      setJustSavedType(awardType);
      setTimeout(() => {
        setJustSavedType((curr) => (curr === awardType ? null : curr));
      }, 2000);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Failed to save award');
    } finally {
      setSavingType(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nfl-blue" />
      </div>
    );
  }

  const teamById = new Map(teams.map((t) => [t.id, t]));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-nfl-yellow mb-1">
          Lock Date • Week Before NFL Honors
        </p>
        <h1 className="text-3xl md:text-5xl font-display font-extrabold text-text-primary tracking-tight">
          Award Predictions
        </h1>
        <p className="text-sm md:text-base text-text-secondary mt-1.5">
          Pick your season award winners and optionally tag their team.
        </p>
      </div>

      {errorMsg && (
        <div className="px-4 py-3 border-l-4 border-nfl-red bg-gridiron-surface text-sm text-nfl-red font-medium">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {AWARD_ORDER.map((type) => {
          const pred = predictions.find((p) => p.award_type === type);
          const form = forms[type] ?? { player_name: '', team_id: '' };
          const isSaved = savedAwards.has(type);
          const isSaving = savingType === type;
          const isJustSaved = justSavedType === type;
          const media = AWARD_MEDIA[type];
          const title = AWARD_TITLES[type];
          const selectedTeam = form.team_id ? teamById.get(Number(form.team_id)) : undefined;

          return (
            <div
              key={type}
              className={`relative bg-gridiron-surface p-4 md:p-5 border-2 transition-colors neumorphic flex flex-col ${
                isSaved ? 'border-nfl-green/60' : 'border-gridiron-border'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-3.5">
                <div className="min-w-0">
                  <h2 className="font-display font-bold text-xl text-text-primary tracking-tight leading-tight">
                    {title.short}
                  </h2>
                  <p className="text-xs text-text-secondary truncate mt-0.5">{title.detail}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {pred?.locked ? (
                    <span className="inline-flex items-center gap-1 text-[11px] bg-nfl-red/15 text-nfl-red px-2 py-0.5 font-mono uppercase tracking-wider">
                      <Lock size={11} />
                      Locked
                    </span>
                  ) : isSaved ? (
                    <span className="inline-flex items-center gap-1 text-[11px] bg-nfl-green/15 text-nfl-green px-2 py-0.5 font-mono uppercase tracking-wider">
                      <Check size={11} />
                      Saved
                    </span>
                  ) : (
                    <span className="text-[11px] bg-gridiron-surface-hover text-text-muted px-2 py-0.5 font-mono uppercase tracking-wider">
                      Open
                    </span>
                  )}
                </div>
              </div>

              <div className={`relative mb-4 overflow-hidden border border-gridiron-border bg-gridiron-bg ${media.aspectClass}`}>
                <img
                  src={media.src}
                  alt=""
                  className="h-full w-full object-cover"
                  style={{ objectPosition: media.position }}
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gridiron-bg/85 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-2.5 left-2.5 flex items-center gap-2 bg-gridiron-bg/90 border border-gridiron-border px-2.5 py-1">
                  {selectedTeam?.logo_url && (
                    <img src={selectedTeam.logo_url} alt={selectedTeam.abbreviation} className="w-4 h-4 object-contain" />
                  )}
                  <span className="text-[11px] text-text-primary font-mono uppercase tracking-wider">
                    {selectedTeam ? selectedTeam.abbreviation : title.short}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5 mt-auto">
                <input
                  type="text"
                  placeholder="Player or coach name"
                  value={form.player_name}
                  onChange={(e) => setForms({ ...forms, [type]: { ...form, player_name: e.target.value } })}
                  className="w-full bg-gridiron-bg border border-gridiron-border px-3.5 py-2.5 text-sm text-text-primary font-medium placeholder:text-text-muted"
                  disabled={!!pred?.locked}
                />
                <select
                  value={form.team_id}
                  onChange={(e) =>
                    setForms({
                      ...forms,
                      [type]: { ...form, team_id: e.target.value ? Number(e.target.value) : '' },
                    })
                  }
                  className="w-full bg-gridiron-bg border border-gridiron-border px-3.5 py-2.5 text-sm text-text-primary font-medium"
                  disabled={!!pred?.locked}
                >
                  <option value="">Select team (optional)</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {teamDisplayName(t.city, t.name)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => saveAward(type)}
                  disabled={!!pred?.locked || isSaving}
                  className={`w-full text-white text-xs font-semibold uppercase tracking-wider py-2.5 transition-all disabled:opacity-50 ${
                    isJustSaved
                      ? 'bg-nfl-green'
                      : 'bg-gradient-to-r from-nfl-red to-nfl-blue hover:opacity-95'
                  }`}
                >
                  {isSaving ? 'Saving...' : isJustSaved ? 'Saved!' : isSaved ? 'Update Pick' : 'Save Pick'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
