import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { teamDisplayName } from '../lib/utils';
import { GripVertical, Trophy } from 'lucide-react';

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

  // Drag state
  const dragItem = useRef<{ divKey: string; index: number } | null>(null);
  const dragOverItem = useRef<{ divKey: string; index: number } | null>(null);

  // Local division orders for 0-0 teams (drag order)
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

        // Initialize division orders from loaded data
        const orders: Record<string, number[]> = {};
        for (const [key, divTeams] of Object.entries(standingsData.divisions)) {
          orders[key] = divTeams.map(t => t.team_id);
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

  // Touch drag support
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

    // Collect records from current division data
    const records: { team_id: number; wins: number; losses: number }[] = [];
    for (const [, divTeams] of Object.entries(data.divisions)) {
      for (const t of divTeams) {
        if (t.wins > 0 || t.losses > 0) {
          records.push({ team_id: t.team_id, wins: t.wins, losses: t.losses });
        }
      }
    }

    // Collect division orders for 0-0 teams
    const divOrders: Record<string, number[]> = {};
    for (const [key, teamIds] of Object.entries(divisionOrders)) {
      const divTeams = data.divisions[key] || [];
      const zeroTeams = divTeams.filter(t => t.wins === 0 && t.losses === 0);
      if (zeroTeams.length > 0) {
        // Use drag order for 0-0 teams
        const zeroIds = teamIds.filter(id => zeroTeams.some(t => t.team_id === id));
        divOrders[key] = zeroIds;
      }
    }

    await api.post('/predictions/standings', {
      season_id: seasonId,
      records,
      divisions: divOrders,
    });

    // Reload data
    const standingsData = await api.get<StandingsData>(`/predictions/standings/${seasonId}`);
    setData(standingsData);

    const orders: Record<string, number[]> = {};
    for (const [key, divTeams] of Object.entries(standingsData.divisions)) {
      orders[key] = divTeams.map(t => t.team_id);
    }
    setDivisionOrders(orders);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nfl-blue" /></div>;
  }

  if (!data || teams.length === 0) {
    return (
      <div className="bg-gridiron-surface p-8 border-2 border-gridiron-border text-center text-text-secondary neumorphic">
        Seed teams first in Settings
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <motion.h1
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-3xl md:text-5xl lg:text-6xl font-oswald font-bold text-nfl-red uppercase tracking-tight"
        >
          Standings & Records
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
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save All'}
        </motion.button>
      </div>

      {/* Conferences */}
      {CONFERENCES.map((conf) => (
        <motion.div
          key={conf}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h2 className="text-3xl md:text-4xl font-oswald font-bold text-text-primary mb-4 pb-2 border-b-4 border-nfl-blue uppercase tracking-wide">{conf}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {DIVISIONS.map((div) => {
              const key = `${conf}-${div}`;
              const teamIds = divisionOrders[key] || [];
              const divTeams = data.divisions[key] || [];

              return (
                <div key={div} className="bg-gridiron-surface p-4 border-2 border-gridiron-border neumorphic">
                  <h3 className="font-oswald font-bold text-sm text-text-secondary uppercase tracking-wide mb-3">{conf} {div}</h3>
                  <div className="space-y-2">
                    {teamIds.map((teamId, index) => {
                      const teamData = divTeams.find(t => t.team_id === teamId);
                      const team = teams.find(t => t.id === teamId);
                      if (!teamData || !team) return null;

                      const hasRecord = teamData.wins > 0 || teamData.losses > 0;
                      const isDraggable = !hasRecord;

                      return (
                        <motion.div
                          key={teamId}
                          draggable={isDraggable}
                          onDragStart={() => isDraggable && handleDragStart(key, index)}
                          onDragEnter={() => isDraggable && handleDragEnter(key, index)}
                          onDragEnd={() => isDraggable && handleDragEnd(key)}
                          onDragOver={(e) => e.preventDefault()}
                          onTouchStart={(e) => isDraggable && handleTouchStart(key, index, e)}
                          onTouchMove={(e) => isDraggable && handleTouchMove(key, index, e)}
                          onTouchEnd={isDraggable ? handleTouchEnd : undefined}
                          whileHover={isDraggable ? { scale: 1.02, x: 3 } : undefined}
                          className={`flex items-center gap-2 p-2.5 transition-all ${
                            isDraggable
                              ? 'bg-gridiron-surface-hover cursor-grab active:cursor-grabbing touch-none border-l-4 border-transparent hover:border-nfl-blue'
                              : teamData.position === 1
                                ? 'bg-gridiron-surface-hover border-l-4 border-nfl-yellow'
                                : 'bg-gridiron-surface-hover border-l-4 border-transparent'
                          }`}
                        >
                          {isDraggable ? (
                            <GripVertical size={16} className="text-text-muted flex-shrink-0" />
                          ) : (
                            <span className={`w-4 text-center text-xs font-mono font-bold ${
                              teamData.position === 1 ? 'text-nfl-yellow' : 'text-text-muted'
                            }`}>{teamData.position}</span>
                          )}

                          {team.logo_url ? (
                            <img src={team.logo_url} alt={teamData.team_abbr} className="w-7 h-7 flex-shrink-0 object-contain" />
                          ) : (
                            <div className="w-7 h-7 flex-shrink-0 bg-gridiron-border flex items-center justify-center text-[10px] font-mono text-text-muted">
                              {teamData.team_abbr}
                            </div>
                          )}

                          <span className="flex-1 text-sm md:text-base font-bold text-text-primary uppercase tracking-wide truncate">
                            {teamDisplayName(team.city, team.name)}
                          </span>

                          <div className="flex items-center gap-1">
                            {teamData.position === 1 && <Trophy size={12} className="text-nfl-yellow" />}
                            <input
                              type="number"
                              min="0"
                              max={MAX_GAMES}
                              placeholder="W"
                              value={teamData.wins || ''}
                              onChange={(e) => {
                                const val = e.target.value === '' ? '' : Math.min(MAX_GAMES, Math.max(0, parseInt(e.target.value) || 0));
                                const newDivTeams = [...divTeams];
                                const idx = newDivTeams.findIndex(t => t.team_id === teamId);
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
                              className="w-10 bg-gridiron-bg border-2 border-gridiron-border rounded px-1 py-0.5 text-xs text-center text-text-primary font-mono"
                            />
                            <span className="text-text-muted text-xs">-</span>
                            <input
                              type="number"
                              min="0"
                              max={MAX_GAMES}
                              placeholder="L"
                              value={teamData.losses || ''}
                              onChange={(e) => {
                                  const val = e.target.value === '' ? '' : Math.min(MAX_GAMES, Math.max(0, parseInt(e.target.value) || 0));
                                  const newDivTeams = [...divTeams];
                                  const idx = newDivTeams.findIndex(t => t.team_id === teamId);
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
                                className="w-10 bg-gridiron-bg border-2 border-gridiron-border rounded px-1 py-0.5 text-xs text-center text-text-primary font-mono"
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
      ))}

      {/* Post Season Mockup */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <h2 className="text-3xl md:text-4xl font-oswald font-bold text-text-primary mb-4 pb-2 border-b-4 border-nfl-red uppercase tracking-wide">Post Season Mockup</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CONFERENCES.map((conf) => {
            const confSeeds = data.seeds[conf] || [];
            return (
              <div key={conf} className="bg-gridiron-surface p-4 border-2 border-gridiron-border neumorphic">
                <h3 className="font-oswald font-bold text-lg text-text-primary uppercase tracking-wide mb-3">{conf} Seeds</h3>
                <div className="space-y-2">
                  {confSeeds.map((seed) => (
                    <SeedRow
                      key={seed.seed}
                      seed={seed}
                      wildcardCandidates={data.wildcard_candidates.filter(c => c.conference === conf)}
                      usedTeamIds={confSeeds.filter(s => s.seed !== seed.seed && s.team_id !== null).map(s => s.team_id as number)}
                      onSelect={(teamId) => {
                        setData({
                          ...data,
                          seeds: {
                            ...data.seeds,
                            [conf]: data.seeds[conf].map(s =>
                              s.seed === seed.seed
                                ? { ...s, team_id: teamId, team_name: teams.find(t => t.id === teamId)?.name || null, team_abbr: teams.find(t => t.id === teamId)?.abbreviation || null, record: '0-0' }
                                : s
                            ),
                          },
                        });
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

function SeedRow({ seed, wildcardCandidates, usedTeamIds, onSelect }: {
  seed: Seed;
  wildcardCandidates: Array<{ team_id: number; team_name: string; record: string; conference: string }>;
  usedTeamIds: number[];
  onSelect: (teamId: number) => void;
}) {

  return (
    <div className={`flex items-center gap-3 p-2.5 rounded transition-all ${
      seed.is_div_winner ? 'bg-nfl-yellow/10 border border-nfl-yellow/30' : 'bg-gridiron-surface-hover border border-transparent'
    }`}>
      <span className={`w-6 text-center text-sm font-mono font-bold ${
        seed.is_div_winner ? 'text-nfl-yellow' : 'text-text-muted'
      }`}>
        {seed.seed <= 3 ? ['🥇', '🥈', '🥉'][seed.seed - 1] : seed.seed}.
      </span>
      <span className="flex-1 text-sm font-bold text-text-primary uppercase tracking-wide truncate">
        {seed.team_name || 'Select team'}
      </span>
      {seed.record && (
        <span className="text-xs font-mono font-bold text-text-secondary">
          {seed.record}
        </span>
      )}
      {!seed.is_div_winner && !seed.team_id && (
        <select
          onChange={(e) => {
            if (e.target.value) onSelect(Number(e.target.value));
          }}
          className="bg-gridiron-bg border-2 border-gridiron-border px-2 py-1 text-xs text-text-primary font-bold"
        >
          <option value="">Select</option>
          {wildcardCandidates
            .filter(c => !usedTeamIds.includes(c.team_id))
            .map(c => (
              <option key={c.team_id} value={c.team_id}>
                {c.team_name} ({c.record})
              </option>
            ))}
        </select>
      )}
    </div>
  );
}
