import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
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
    } catch (e: unknown) {
      setMessage(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  async function seedTeams() {
    setSeeding(true);
    try {
      const res = await api.post<{ count: number }>('/teams/seed', {});
      setMessage(`Seeded ${res.count} NFL teams!`);
    } catch (e: unknown) {
      setMessage(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`);
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
    } catch (e: unknown) {
      setMessage(`Error importing: ${e instanceof Error ? e.message : 'Unknown error'}. Use manual entry.`);
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
    <div className="space-y-6 max-w-3xl">
      <motion.h1 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold gradient-text uppercase tracking-tight"
      >
        Settings
      </motion.h1>

      {message && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gridiron-surface border-2 border-nfl-blue p-4 text-base text-text-primary neumorphic uppercase tracking-wide font-bold"
        >
          {message}
        </motion.div>
      )}

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gridiron-surface p-6 border-2 border-gridiron-border neumorphic space-y-5"
      >
        <h2 className="text-2xl font-serif font-bold text-text-primary uppercase tracking-wide">Season Setup</h2>

        <div className="flex gap-4 items-end">
          <div>
            <label className="block text-base text-text-secondary mb-2 font-bold uppercase tracking-wide">Season Year</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="bg-gridiron-bg border-2 border-gridiron-border px-4 py-3 w-40 text-xl text-text-primary font-mono font-bold"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={createSeason}
            className="bg-gradient-to-r from-nfl-red to-nfl-blue hover:shadow-glow text-white px-6 py-3 text-base font-bold uppercase tracking-wide transition-all"
          >
            Create Season
          </motion.button>
        </div>

        {seasons.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-base font-bold text-text-secondary uppercase tracking-wide">Existing Seasons</h3>
            {seasons.map((s) => (
              <div key={s.id} className="flex items-center justify-between bg-gridiron-surface-hover p-4 border-l-4 border-nfl-blue">
                <span className="text-lg text-text-primary font-bold uppercase tracking-wide">{s.year} Season</span>
                <div className="flex items-center gap-3">
                  <span className="text-base bg-gridiron-border px-3 py-1.5 text-text-primary font-bold uppercase">{s.status}</span>
                  <select
                    value={s.status}
                    onChange={(e) => updateStatus(s.id, e.target.value)}
                    className="bg-gridiron-bg border-2 border-gridiron-border px-3 py-1.5 text-base text-text-primary font-bold uppercase"
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
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gridiron-surface p-6 border-2 border-gridiron-border neumorphic space-y-5"
      >
        <h2 className="text-2xl font-serif font-bold text-text-primary uppercase tracking-wide">Data Management</h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-text-primary uppercase tracking-wide">Seed NFL Teams</p>
              <p className="text-base text-text-secondary uppercase tracking-wide font-bold">Add all 32 NFL teams to the database</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={seedTeams}
              disabled={seeding}
              className="bg-nfl-green hover:shadow-glow-green disabled:opacity-50 text-white px-6 py-3 text-base font-bold uppercase tracking-wide transition-all"
            >
              {seeding ? 'Seeding...' : 'Seed Teams'}
            </motion.button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-text-primary uppercase tracking-wide">Import Schedule from ESPN</p>
              <p className="text-base text-text-secondary uppercase tracking-wide font-bold">Fetch full regular season schedule (all 18 weeks)</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={importSchedule}
              disabled={importing}
              className="bg-nfl-blue hover:shadow-glow disabled:opacity-50 text-white px-6 py-3 text-base font-bold uppercase tracking-wide transition-all"
            >
              {importing ? 'Importing...' : 'Import Schedule'}
            </motion.button>
          </div>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-gridiron-surface p-6 border-2 border-gridiron-border neumorphic space-y-3"
      >
        <h2 className="text-2xl font-serif font-bold text-text-primary uppercase tracking-wide">About</h2>
        <p className="text-base text-text-secondary uppercase tracking-wide font-bold">
          Redzone NFL Predictions - Track your NFL season predictions including division winners,
          weekly game winners, playoff brackets, awards, and team records.
        </p>
        <p className="text-base text-text-secondary uppercase tracking-wide font-bold">
          Scoring: Exact score = 5pts, Correct winner only = 1pt
        </p>
      </motion.div>
    </div>
  );
}
