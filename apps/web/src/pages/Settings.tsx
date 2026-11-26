import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface Season {
  id: number;
  year: number;
  status: string;
}

export function Settings() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [teamCount, setTeamCount] = useState<number>(0);
  const [gameCount, setGameCount] = useState<number>(0);
  const [year, setYear] = useState(2026);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [seasonsData, teamsData] = await Promise.all([
        api.get<Season[]>('/seasons'),
        api.get<Array<{ id: number }>>('/teams'),
      ]);
      setSeasons(seasonsData);
      setTeamCount(teamsData.length);
      if (seasonsData.length > 0) {
        const gamesData = await api.get<Array<{ id: number }>>(`/games?season_id=${seasonsData[0].id}`);
        setGameCount(gamesData.length);
      }
    } catch {
      // API not ready
    } finally {
      setLoading(false);
    }
  }

  async function createSeason() {
    try {
      await api.post('/seasons', { year });
      setMessage(`Season ${year} created.`);
      await loadData();
    } catch (e: unknown) {
      setMessage(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  async function seedTeams() {
    setSeeding(true);
    try {
      const res = await api.post<{ count: number }>('/teams/seed', {});
      setMessage(`Seeded ${res.count} NFL teams.`);
      await loadData();
    } catch (e: unknown) {
      setMessage(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setSeeding(false);
    }
  }

  async function importSchedule() {
    if (seasons.length === 0) {
      setMessage('Create a season first.');
      return;
    }
    setImporting(true);
    try {
      const result = await api.post<{ ok: boolean; imported: number; total: number; error?: string }>(
        `/espn/import-schedule/${seasons[0].id}`,
        {}
      );
      if (result.error) {
        setMessage(result.error);
      } else {
        setMessage(`Imported ${result.imported} of ${result.total} games from the bundled schedule.`);
        await loadData();
      }
    } catch (e: unknown) {
      setMessage(`Error importing: ${e instanceof Error ? e.message : 'Unknown error'}. Use manual entry.`);
    } finally {
      setImporting(false);
    }
  }

  async function updateStatus(seasonId: number, status: string) {
    await api.patch(`/seasons/${seasonId}`, { status });
    await loadData();
    setMessage(`Season status updated to ${status}.`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nfl-blue" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-nfl-blue mb-1">
          Configuration & Data
        </p>
        <h1 className="text-3xl md:text-5xl font-display font-extrabold text-text-primary tracking-tight">
          Settings
        </h1>
      </div>

      {message && (
        <div className="bg-gridiron-surface border-l-4 border-nfl-blue px-4 py-3 text-sm text-text-primary font-medium neumorphic">
          {message}
        </div>
      )}

      {/* Season Setup */}
      <section className="bg-gridiron-surface p-5 md:p-6 border-2 border-gridiron-border neumorphic space-y-5">
        <h2 className="text-xl font-display font-bold text-text-primary tracking-tight">Season Setup</h2>

        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-mono text-text-secondary mb-1.5 uppercase tracking-wider">
              Season Year
            </label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="bg-gridiron-bg border border-gridiron-border px-3.5 py-2.5 w-36 text-lg text-text-primary font-mono tabular-nums"
            />
          </div>
          <button
            type="button"
            onClick={createSeason}
            className="bg-gradient-to-r from-nfl-red to-nfl-blue hover:opacity-95 text-white px-5 py-2.5 text-sm font-semibold uppercase tracking-wider transition-all"
          >
            Create Season
          </button>
        </div>

        {seasons.length > 0 && (
          <div className="space-y-2.5 pt-2 border-t border-gridiron-border/70">
            <h3 className="text-xs font-mono text-text-muted uppercase tracking-wider">Existing Seasons</h3>
            {seasons.map((s) => (
              <div
                key={s.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gridiron-surface-hover p-3.5 border-l-2 border-nfl-blue"
              >
                <span className="text-base font-display font-bold text-text-primary tabular-nums">
                  {s.year} Season
                </span>
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-mono bg-gridiron-bg border border-gridiron-border px-2.5 py-1 text-text-secondary uppercase">
                    {s.status}
                  </span>
                  <select
                    value={s.status}
                    onChange={(e) => updateStatus(s.id, e.target.value)}
                    className="bg-gridiron-bg border border-gridiron-border px-3 py-1.5 text-xs text-text-primary font-semibold uppercase"
                  >
                    <option value="preparing">Preparing</option>
                    <option value="active">Active</option>
                    <option value="playoffs">Playoffs</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Data Management */}
      <section className="bg-gridiron-surface p-5 md:p-6 border-2 border-gridiron-border neumorphic space-y-5">
        <h2 className="text-xl font-display font-bold text-text-primary tracking-tight">Data Management</h2>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gridiron-border/70">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-base font-semibold text-text-primary">Seed NFL Teams</p>
                <span className="text-xs font-mono text-nfl-green bg-nfl-green/15 px-2 py-0.5 tabular-nums">
                  {teamCount}/32 loaded
                </span>
              </div>
              <p className="text-sm text-text-secondary mt-0.5">
                Populate all 32 NFL franchises with conferences, divisions, and ESPN logos.
              </p>
            </div>
            <button
              type="button"
              onClick={seedTeams}
              disabled={seeding}
              className="bg-nfl-green hover:bg-emerald-600 disabled:opacity-50 text-white px-5 py-2.5 text-xs sm:text-sm font-semibold uppercase tracking-wider transition-colors self-start sm:self-auto flex-shrink-0"
            >
              {seeding ? 'Seeding...' : 'Seed Teams'}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-base font-semibold text-text-primary">Import Schedule</p>
                <span className="text-xs font-mono text-nfl-blue bg-nfl-blue/15 px-2 py-0.5 tabular-nums">
                  {gameCount} games loaded
                </span>
              </div>
              <p className="text-sm text-text-secondary mt-0.5">
                Load the bundled full 18-week regular season schedule into the active season.
              </p>
            </div>
            <button
              type="button"
              onClick={importSchedule}
              disabled={importing}
              className="bg-nfl-blue hover:opacity-90 disabled:opacity-50 text-white px-5 py-2.5 text-xs sm:text-sm font-semibold uppercase tracking-wider transition-opacity self-start sm:self-auto flex-shrink-0"
            >
              {importing ? 'Importing...' : 'Import Schedule'}
            </button>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="bg-gridiron-surface p-5 md:p-6 border-2 border-gridiron-border neumorphic space-y-2.5">
        <h2 className="text-xl font-display font-bold text-text-primary tracking-tight">About Redzone NFL</h2>
        <p className="text-sm text-text-secondary leading-relaxed">
          Track your NFL season predictions including weekly winners, exact scores, division standings,
          playoff brackets, and season awards. Weeks roll over automatically Tuesday morning (Europe time)
          after the final game of the previous week finishes.
        </p>
        <p className="text-xs font-mono text-text-muted pt-1">
          Scoring: Exact score = 5 pts • Correct winner = 1 pt
        </p>
      </section>
    </div>
  );
}
