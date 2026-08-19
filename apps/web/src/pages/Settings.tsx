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
      <h1 className="text-2xl md:text-3xl font-bold">Settings</h1>

      {message && (
        <div className="bg-dark-700 border border-dark-500 rounded-lg p-3 text-sm">
          {message}
        </div>
      )}

      <div className="bg-dark-800 rounded-xl p-6 border border-dark-600 space-y-4">
        <h2 className="text-lg font-semibold">Season Setup</h2>

        <div className="flex gap-3 items-end">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Season Year</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="bg-dark-700 border border-dark-500 rounded-lg px-3 py-2 w-32"
            />
          </div>
          <button
            onClick={createSeason}
            className="bg-nfl-blue hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Create Season
          </button>
        </div>

        {seasons.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-400">Existing Seasons</h3>
            {seasons.map((s) => (
              <div key={s.id} className="flex items-center justify-between bg-dark-700 rounded-lg p-3">
                <span>{s.year} Season</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-dark-600 px-2 py-1 rounded">{s.status}</span>
                  <select
                    value={s.status}
                    onChange={(e) => updateStatus(s.id, e.target.value)}
                    className="bg-dark-600 border border-dark-500 rounded px-2 py-1 text-xs"
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

      <div className="bg-dark-800 rounded-xl p-6 border border-dark-600 space-y-4">
        <h2 className="text-lg font-semibold">Data Management</h2>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Seed NFL Teams</p>
              <p className="text-sm text-gray-400">Add all 32 NFL teams to the database</p>
            </div>
            <button
              onClick={seedTeams}
              disabled={seeding}
              className="bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm transition-colors"
            >
              {seeding ? 'Seeding...' : 'Seed Teams'}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Import Schedule from ESPN</p>
              <p className="text-sm text-gray-400">Fetch full regular season schedule (all 18 weeks)</p>
            </div>
            <button
              onClick={importSchedule}
              disabled={importing}
              className="bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm transition-colors"
            >
              {importing ? 'Importing...' : 'Import Schedule'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-dark-800 rounded-xl p-6 border border-dark-600 space-y-3">
        <h2 className="text-lg font-semibold">About</h2>
        <p className="text-sm text-gray-400">
          Redzone NFL Predictions - Track your NFL season predictions including division winners,
          weekly game winners, playoff brackets, awards, and team records.
        </p>
        <p className="text-sm text-gray-400">
          Scoring: Exact score = 5pts, Correct winner only = 1pt
        </p>
      </div>
    </div>
  );
}
