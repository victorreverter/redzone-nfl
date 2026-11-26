import { useEffect, useState, useRef } from 'react';
import { api } from '../lib/api';
import { teamDisplayName } from '../lib/utils';
import { GripVertical, Trophy, Save, Check } from 'lucide-react';

interface TeamRecord {
  team_id: number;
  team_name: string;
  team_abbr: string;
  logo_url: string | null;
  wins: number;
  losses: number;
  position: number;
}

interface Seed {
  seed: number;
  team_id: number | null;
  team_name: string | null;
  team_abbr: string | null;
  record: string | null;
  is_div_winner: boolean;
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

interface StandingsData {
  divisions: Record<string, TeamRecord[]>;
  seeds: Record<string, Seed[]>;
  wildcard_candidates: Array<{ team_id: number; team_name: string; record: string; conference: string }>;
}

const MAX_GAMES = 17;
const DIVISIONS = ['East', 'North', 'South', 'West'];
const CONFERENCES = ['AFC', 'NFC'] as const;

export function Standings() {
  const [data, setData] = useState<StandingsData | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const dragItem = useRef<{ divKey: string; index: number } | null>(null);
  const dragOverItem = useRef<{ divKey: string; index: number } | null>(null);

  const [divisionOrders, setDivisionOrders] = useState<Record<string, number[]>>({});

  useEffect(() => {
    async function load() {
      try {
        const seasons = await api.get<{ id: number }[]>('/seasons');
        if (seasons.length === 0) { setLoading(false); return; }
        setSeasonId(seasons[0].id);

        const [standingsData, teamsData] = await Promise.all([
          api.get<StandingsData>(`/predictions/standings/${seasons[0].id}`),
          api.get<Team[]>('/teams'),
        ]);
        setData(standingsData);
        setTeams(teamsData);

        const orders: Record<string, number[]> = {};
        for (const [key, divTeams] of Object.entries(standingsData.divisions)) {
          orders[key] = divTeams.map((t) => t.team_id);
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

    const [removed] = list.splice(dragItemIndex, 1);
    list.splice(dragOverItemIndex, 0, removed);

    setDivisionOrders({ ...divisionOrders, [divKey]: list });
    dragItem.current = null;
    dragOverItem.current = null;
  }

  const touchStartY = useRef<number>(0);
  const touchCurrentItem = useRef<{ divKey: string; index: number } | null>(null);

  function handleTouchStart(divKey: string, index: number, e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY;
    touchCurrentItem.current = { divKey, index };
  }

  function handleTouchMove(divKey: string, index: number, e: React.TouchEvent) {
    if (!touchCurrentItem.current || touchCurrentItem.current.divKey !== divKey) return;
    const deltaY = Math.abs(e.touches[0].clientY - touchStartY.current);
    if (deltaY > 30) {
      const fromIndex = touchCurrentItem.current.index;
      const toIndex = index;
      if (fromIndex !== toIndex) {
        const list = [...(divisionOrders[divKey] || [])];
        const [removed] = list.splice(fromIndex, 1);
        list.splice(toIndex, 0, removed);
        setDivisionOrders({ ...divisionOrders, [divKey]: list });
        touchCurrentItem.current = { divKey, index: toIndex };
        touchStartY.current = e.touches[0].clientY;
      }
    }
  }

  function handleTouchEnd() {
    touchCurrentItem.current = null;
  }

  async function handleSaveAll() {
    if (!seasonId || !data) return;
    setSaving(true);
    setErrorMessage(null);

    try {
      const records: { team_id: number; wins: number; losses: number }[] = [];
      for (const [, divTeams] of Object.entries(data.divisions)) {
        for (const t of divTeams) {
          if (t.wins > 0 || t.losses > 0) {
            records.push({ team_id: t.team_id, wins: t.wins, losses: t.losses });
          }
        }
      }

      const divOrders: Record<string, number[]> = {};
      for (const [key, teamIds] of Object.entries(divisionOrders)) {
        const divTeams = data.divisions[key] || [];
        const zeroTeams = divTeams.filter((t) => t.wins === 0 && t.losses === 0);
        if (zeroTeams.length > 0) {
          const zeroIds = teamIds.filter((id) => zeroTeams.some((t) => t.team_id === id));
          divOrders[key] = zeroIds;
        }
      }

      await api.post('/predictions/standings', {
        season_id: seasonId,
        records,
        divisions: divOrders,
        seeds: data.seeds,
      });

      const standingsData = await api.get<StandingsData>(`/predictions/standings/${seasonId}`);
      setData(standingsData);

      const orders: Record<string, number[]> = {};
      for (const [key, divTeams] of Object.entries(standingsData.divisions)) {
        orders[key] = divTeams.map((t) => t.team_id);
      }
      setDivisionOrders(orders);

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Failed to save standings');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nfl-blue" />
      </div>
    );
  }

  if (!data || teams.length === 0) {
    return (
      <div className="bg-gridiron-surface p-8 border-2 border-gridiron-border text-center text-text-secondary neumorphic">
        Seed teams first in Settings.
      </div>
    );
  }

  const teamById = new Map(teams.map((t) => [t.id, t]));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-nfl-blue mb-1">
            Divisions • Records • Playoff Seeding
          </p>
          <h1 className="text-3xl md:text-5xl font-display font-extrabold text-text-primary tracking-tight">
            Standings & Records
          </h1>
        </div>
        <button
          type="button"
          onClick={handleSaveAll}
          disabled={saving}
          className={`inline-flex items-center justify-center gap-2 text-white px-5 py-2.5 text-sm font-semibold uppercase tracking-wider transition-all self-start sm:self-auto ${
            saving
              ? 'bg-text-muted'
              : saved
                ? 'bg-nfl-green'
                : 'bg-nfl-green hover:bg-emerald-600'
          }`}
        >
          {saved ? <Check size={16} /> : <Save size={16} />}
          {saving ? 'Saving...' : saved ? 'Saved' : 'Save All'}
        </button>
      </div>

      {errorMessage && (
        <div className="px-4 py-3 border-l-4 border-nfl-red bg-gridiron-surface text-sm text-nfl-red font-medium">
          {errorMessage}
        </div>
      )}

      {/* Conferences */}
      {CONFERENCES.map((conf) => (
        <section key={conf} className="space-y-4">
          <div className="flex items-baseline justify-between pb-2 border-b-2 border-gridiron-border">
            <h2 className="text-2xl md:text-3xl font-display font-extrabold text-text-primary tracking-tight flex items-center gap-2.5">
              <span className={`w-2 h-6 ${conf === 'AFC' ? 'bg-nfl-red' : 'bg-nfl-blue'}`} />
              {conf} Conference
            </h2>
            <span className="text-xs font-mono uppercase tracking-wider text-text-muted">
              17-Game Regular Season
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {DIVISIONS.map((div) => {
              const key = `${conf}-${div}`;
              const teamIds = divisionOrders[key] || [];
              const divTeams = data.divisions[key] || [];

              return (
                <div key={div} className="bg-gridiron-surface p-4 border-2 border-gridiron-border neumorphic">
                  <h3 className="font-mono text-xs font-medium text-text-secondary uppercase tracking-widest mb-3 pb-2 border-b border-gridiron-border/70">
                    {conf} {div}
                  </h3>
                  <div className="space-y-2">
                    {teamIds.map((teamId, index) => {
                      const teamData = divTeams.find((t) => t.team_id === teamId);
                      const team = teamById.get(teamId);
                      if (!teamData || !team) return null;

                      const hasRecord = teamData.wins > 0 || teamData.losses > 0;
                      const isDraggable = !hasRecord;

                      return (
                        <div
                          key={teamId}
                          draggable={isDraggable}
                          onDragStart={() => isDraggable && handleDragStart(key, index)}
                          onDragEnter={() => isDraggable && handleDragEnter(key, index)}
                          onDragEnd={() => isDraggable && handleDragEnd(key)}
                          onDragOver={(e) => e.preventDefault()}
                          onTouchStart={(e) => isDraggable && handleTouchStart(key, index, e)}
                          onTouchMove={(e) => isDraggable && handleTouchMove(key, index, e)}
                          onTouchEnd={isDraggable ? handleTouchEnd : undefined}
                          className={`flex items-center gap-2 p-2 transition-colors ${
                            isDraggable
                              ? 'bg-gridiron-surface-hover/80 cursor-grab active:cursor-grabbing touch-none border-l-2 border-transparent hover:border-nfl-blue'
                              : teamData.position === 1
                                ? 'bg-gridiron-surface-hover border-l-2 border-nfl-yellow'
                                : 'bg-gridiron-surface-hover/70 border-l-2 border-transparent'
                          }`}
                        >
                          {isDraggable ? (
                            <GripVertical size={14} className="text-text-muted flex-shrink-0" />
                          ) : (
                            <span
                              className={`w-4 text-center text-xs font-mono tabular-nums ${
                                teamData.position === 1 ? 'text-nfl-yellow font-medium' : 'text-text-muted'
                              }`}
                            >
                              {teamData.position}
                            </span>
                          )}

                          {team.logo_url ? (
                            <img src={team.logo_url} alt={teamData.team_abbr} className="w-6 h-6 flex-shrink-0 object-contain" />
                          ) : (
                            <div className="w-6 h-6 flex-shrink-0 bg-gridiron-border flex items-center justify-center text-[10px] font-mono text-text-muted">
                              {teamData.team_abbr}
                            </div>
                          )}

                          <span className="flex-1 min-w-0 text-sm font-semibold text-text-primary truncate">
                            {teamDisplayName(team.city, team.name)}
                          </span>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            {teamData.position === 1 && hasRecord && (
                              <Trophy size={12} className="text-nfl-yellow mr-0.5" />
                            )}
                            <input
                              type="number"
                              min="0"
                              max={MAX_GAMES}
                              placeholder="W"
                              aria-label={`${team.name} predicted wins`}
                              value={teamData.wins || ''}
                              onChange={(e) => {
                                const val =
                                  e.target.value === ''
                                    ? ''
                                    : Math.min(MAX_GAMES, Math.max(0, parseInt(e.target.value, 10) || 0));
                                const newDivTeams = [...divTeams];
                                const idx = newDivTeams.findIndex((t) => t.team_id === teamId);
                                if (idx !== -1) {
                                  const maxLosses = MAX_GAMES - (val === '' ? 0 : Number(val));
                                  const currentLosses = newDivTeams[idx].losses;
                                  newDivTeams[idx] = {
                                    ...newDivTeams[idx],
                                    wins: val === '' ? 0 : Number(val),
                                    losses: currentLosses > maxLosses ? maxLosses : currentLosses,
                                  };
                                  setData({ ...data, divisions: { ...data.divisions, [key]: newDivTeams } });
                                }
                              }}
                              className="w-9 bg-gridiron-bg border border-gridiron-border px-1 py-1 text-xs text-center text-text-primary font-mono tabular-nums"
                            />
                            <span className="text-text-muted text-xs font-mono">-</span>
                            <input
                              type="number"
                              min="0"
                              max={MAX_GAMES}
                              placeholder="L"
                              aria-label={`${team.name} predicted losses`}
                              value={teamData.losses || ''}
                              onChange={(e) => {
                                const val =
                                  e.target.value === ''
                                    ? ''
                                    : Math.min(MAX_GAMES, Math.max(0, parseInt(e.target.value, 10) || 0));
                                const newDivTeams = [...divTeams];
                                const idx = newDivTeams.findIndex((t) => t.team_id === teamId);
                                if (idx !== -1) {
                                  const maxWins = MAX_GAMES - (val === '' ? 0 : Number(val));
                                  const currentWins = newDivTeams[idx].wins;
                                  newDivTeams[idx] = {
                                    ...newDivTeams[idx],
                                    losses: val === '' ? 0 : Number(val),
                                    wins: currentWins > maxWins ? maxWins : currentWins,
                                  };
                                  setData({ ...data, divisions: { ...data.divisions, [key]: newDivTeams } });
                                }
                              }}
                              className="w-9 bg-gridiron-bg border border-gridiron-border px-1 py-1 text-xs text-center text-text-primary font-mono tabular-nums"
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
        </section>
      ))}

      {/* Post Season Seeding */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between pb-2 border-b-2 border-gridiron-border">
          <h2 className="text-2xl md:text-3xl font-display font-extrabold text-text-primary tracking-tight">
            Playoff Seeding Picture
          </h2>
          <span className="text-xs font-mono uppercase tracking-wider text-text-muted">
            Top 7 per Conference
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {CONFERENCES.map((conf) => {
            const confSeeds = data.seeds[conf] || [];
            return (
              <div key={conf} className="bg-gridiron-surface p-4 md:p-5 border-2 border-gridiron-border neumorphic">
                <h3 className="font-display font-bold text-lg text-text-primary tracking-tight mb-3 flex items-center gap-2">
                  <span className={`w-2 h-4 ${conf === 'AFC' ? 'bg-nfl-red' : 'bg-nfl-blue'}`} />
                  {conf} Seeds
                </h3>
                <div className="space-y-2">
                  {confSeeds.map((seed) => {
                    const team = seed.team_id ? teamById.get(seed.team_id) : undefined;
                    return (
                      <SeedRow
                        key={seed.seed}
                        seed={seed}
                        logoUrl={team?.logo_url ?? null}
                        wildcardCandidates={data.wildcard_candidates.filter((c) => c.conference === conf)}
                        usedTeamIds={confSeeds
                          .filter((s) => s.seed !== seed.seed && s.team_id !== null)
                          .map((s) => s.team_id as number)}
                        onSelect={(teamId, record) => {
                          const picked = teamById.get(teamId);
                          setData({
                            ...data,
                            seeds: {
                              ...data.seeds,
                              [conf]: data.seeds[conf].map((s) =>
                                s.seed === seed.seed
                                  ? {
                                      ...s,
                                      team_id: teamId,
                                      team_name: picked?.name || null,
                                      team_abbr: picked?.abbreviation || null,
                                      record,
                                    }
                                  : s
                              ),
                            },
                          });
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function SeedRow({
  seed,
  logoUrl,
  wildcardCandidates,
  usedTeamIds,
  onSelect,
}: {
  seed: Seed;
  logoUrl: string | null;
  wildcardCandidates: Array<{ team_id: number; team_name: string; record: string; conference: string }>;
  usedTeamIds: number[];
  onSelect: (teamId: number, record: string) => void;
}) {
  const tierLabel = seed.seed === 1 ? 'BYE' : seed.is_div_winner ? 'DIV' : 'WC';
  const tierClass =
    seed.seed === 1
      ? 'bg-nfl-yellow/20 text-nfl-yellow border-nfl-yellow/40'
      : seed.is_div_winner
        ? 'bg-nfl-blue/15 text-nfl-blue border-nfl-blue/30'
        : 'bg-gridiron-bg text-text-muted border-gridiron-border';

  return (
    <div
      className={`flex items-center gap-3 p-2.5 border transition-colors ${
        seed.seed === 1
          ? 'bg-nfl-yellow/5 border-nfl-yellow/35'
          : seed.is_div_winner
            ? 'bg-gridiron-surface-hover/80 border-gridiron-border'
            : 'bg-gridiron-surface-hover/50 border-transparent'
      }`}
    >
      <span className="w-7 text-center text-xs font-mono font-medium text-text-primary tabular-nums">
        #{seed.seed}
      </span>

      <span className={`px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider border ${tierClass}`}>
        {tierLabel}
      </span>

      {logoUrl ? (
        <img src={logoUrl} alt={seed.team_abbr ?? ''} className="w-6 h-6 object-contain flex-shrink-0" />
      ) : (
        <div className="w-6 h-6 border border-dashed border-gridiron-border flex-shrink-0" />
      )}

      <span className="flex-1 text-sm font-semibold text-text-primary truncate">
        {seed.team_name || 'Select wildcard'}
      </span>

      {seed.record && (
        <span className="text-xs font-mono text-text-secondary tabular-nums">{seed.record}</span>
      )}

      {!seed.is_div_winner && (
        <select
          value={seed.team_id ?? ''}
          onChange={(e) => {
            const teamId = Number(e.target.value);
            const candidate = wildcardCandidates.find((c) => c.team_id === teamId);
            if (candidate) onSelect(candidate.team_id, candidate.record);
          }}
          className="bg-gridiron-bg border border-gridiron-border px-2 py-1 text-xs text-text-primary font-medium max-w-[150px]"
        >
          <option value="">Select</option>
          {wildcardCandidates
            .filter((c) => !usedTeamIds.includes(c.team_id) || c.team_id === seed.team_id)
            .map((c) => (
              <option key={c.team_id} value={c.team_id}>
                {c.team_name} ({c.record})
              </option>
            ))}
        </select>
      )}
    </div>
  );
}
