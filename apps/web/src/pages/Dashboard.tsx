import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { Trophy, TrendingUp, Target, Award } from 'lucide-react';

interface Season {
  id: number;
  year: number;
  status: string;
}

interface Score {
  weekly: number;
  playoff: number;
  total: number;
}

export function Dashboard() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [score, setScore] = useState<Score>({ weekly: 0, playoff: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.get<Season[]>('/seasons');
        setSeasons(data);
        if (data.length > 0) {
          const s = await api.get<Score>(`/predictions/score/${data[0].id}`);
          setScore(s);
        }
      } catch {
        // API not ready yet
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const currentSeason = seasons[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nfl-blue" />
      </div>
    );
  }

  if (!currentSeason) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Trophy size={64} className="text-nfl-blue" />
        <h2 className="text-3xl font-serif font-bold text-text-primary uppercase tracking-wide">Welcome to Redzone NFL</h2>
        <p className="text-text-secondary text-lg uppercase tracking-wide font-bold">Go to Settings to create your 2026 season</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.h1 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold gradient-text uppercase tracking-tight"
      >
        {currentSeason.year} Season Dashboard
      </motion.h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <StatCard
            icon={<Trophy className="text-nfl-yellow" size={32} />}
            label="Total Points"
            value={score.total}
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <StatCard
            icon={<Target className="text-nfl-green" size={32} />}
            label="Weekly Points"
            value={score.weekly}
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <StatCard
            icon={<TrendingUp className="text-nfl-blue" size={32} />}
            label="Playoff Points"
            value={score.playoff}
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <StatCard
            icon={<Award className="text-nfl-red" size={32} />}
            label="Season Status"
            value={currentSeason.status}
          />
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-gridiron-surface p-6 border-2 border-gridiron-border neumorphic"
      >
        <h2 className="text-2xl font-serif font-bold mb-5 text-text-primary uppercase tracking-wide">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickLink to="/schedule" label="Make Predictions" />
          <QuickLink to="/standings" label="View Standings" />
          <QuickLink to="/awards" label="Predict Awards" />
          <QuickLink to="/records" label="Team Records" />
        </div>
      </motion.div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="bg-gridiron-surface p-5 border-2 border-gridiron-border neumorphic">
      <div className="flex items-center gap-4">
        {icon}
        <div>
          <p className="text-base text-text-secondary uppercase tracking-wide font-bold">{label}</p>
          <p className="text-4xl font-bold font-mono text-text-primary">{value}</p>
        </div>
      </div>
    </div>
  );
}

function QuickLink({ to, label }: { to: string; label: string }) {
  return (
    <motion.a
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      href={to}
      className="bg-gridiron-surface-hover hover:bg-gridiron-border p-4 text-center text-base font-bold text-text-primary uppercase tracking-wide transition-all border-l-4 border-transparent hover:border-nfl-blue"
    >
      {label}
    </motion.a>
  );
}
