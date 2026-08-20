import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface Season {
  id: number;
  year: number;
  status: string;
}

export function Settings() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [year, setYear] = useState(2026);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadSeasons();
  }, []);

  async function loadSeasons() {
    try {
      const data = await api.get<Season[]>('/seasons');
      setSeasons(data);
    } catch {
      // API not ready
    } finally {
      setLoading(false);
    }
  }

  async function createSeason() {
    try {
      await api.post('/seasons', { year });
      setMessage(`Season ${year} created!`);
      await loadSeasons();
    } catch (e: any) {
      setMessage(`Error: ${e.message}`);
    }
  }

  async function seedTeams() {
    setSeeding(true);
    try {
      const res = await api.post<{ count: number }>('/teams/seed', {});
      setMessage(`Seeded ${res.count} NFL teams!`);
    } catch (e: any) {
      setMessage(`Error: ${e.message}`);
    } finally {
      setSeeding(false);
    }
  }

  async function importSchedule() {
    if (seasons.length === 0) {
      setMessage('Create a season first');
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
        setMessage(`Imported ${result.imported} of ${result.total} games from ESPN.`);
      }
    } catch (e: any) {
      setMessage(`Error importing: ${e.message}. Use manual entry.`);
    } finally {
      setImporting(false);
    }
  }

  async function updateStatus(seasonId: number, status: string) {
    await api.patch(`/seasons/${seasonId}`, { status });
    await loadSeasons();
    setMessage(`Season status updated to: ${status}`);
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nfl-blue" /></div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-3xl md:text-4xl font-serif font-bold gradient-text">Settings</h1>

      {message && (
        <div className="bg-gridiron-surface border border-nfl-blue rounded-lg p-3 text-sm text-text-primary neumorphic">
          {message}
        </div>
      )}

      <div className="bg-gridiron-surface rounded-xl p-6 border border-gridiron-border neumorphic space-y-4">
        <h2 className="text-lg font-serif font-semibold text-text-primary">Season Setup</h2>

        <div className="flex gap-3 items-end">
          <div>
            <label className="block text-sm text-text-secondary mb-1">Season Year</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="bg-gridiron-bg border border-gridiron-border rounded-lg px-3 py-2 w-32 text-text-primary"
            />
          </div>
          <button
            onClick={createSeason}
            className="bg-gradient-to-r from-nfl-red to-nfl-blue hover:shadow-glow text-white px-4 py-2 rounded-lg text-sm transition-all"
          >
            Create Season
          </button>
        </div>

        {seasons.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-text-secondary">Existing Seasons</h3>
            {seasons.map((s) => (
              <div key={s.id} className="flex items-center justify-between bg-gridiron-surface-hover rounded-lg p-3">
                <span className="text-text-primary">{s.year} Season</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-gridiron-border px-2 py-1 rounded text-text-primary">{s.status}</span>
                  <select
                    value={s.status}
                    onChange={(e) => updateStatus(s.id, e.target.value)}
                    className="bg-gridiron-bg border border-gridiron-border rounded px-2 py-1 text-xs text-text-primary"
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
      </div>

      <div className="bg-gridiron-surface rounded-xl p-6 border border-gridiron-border neumorphic space-y-4">
        <h2 className="text-lg font-serif font-semibold text-text-primary">Data Management</h2>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-text-primary">Seed NFL Teams</p>
              <p className="text-sm text-text-secondary">Add all 32 NFL teams to the database</p>
            </div>
            <button
              onClick={seedTeams}
              disabled={seeding}
              className="bg-nfl-green hover:shadow-glow-green disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm transition-all"
            >
              {seeding ? 'Seeding...' : 'Seed Teams'}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-text-primary">Import Schedule from ESPN</p>
              <p className="text-sm text-text-secondary">Fetch full regular season schedule (all 18 weeks)</p>
            </div>
            <button
              onClick={importSchedule}
              disabled={importing}
              className="bg-nfl-blue hover:shadow-glow disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm transition-all"
            >
              {importing ? 'Importing...' : 'Import Schedule'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-gridiron-surface rounded-xl p-6 border border-gridiron-border neumorphic space-y-3">
        <h2 className="text-lg font-serif font-semibold text-text-primary">About</h2>
        <p className="text-sm text-text-secondary">
          Redzone NFL Predictions - Track your NFL season predictions including division winners,
          weekly game winners, playoff brackets, awards, and team records.
        </p>
        <p className="text-sm text-text-secondary">
          Scoring: Exact score = 5pts, Correct winner only = 1pt
        </p>
      </div>
    </div>
  );
}
