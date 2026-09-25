import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Trophy, TrendingUp, Target, CalendarDays, BarChart3 } from 'lucide-react';
import { MilestoneSlider } from '../components/MilestoneSlider';

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

interface Accuracy {
  overall: { correct: number; total: number; percentage: number; points: number };
  regular: { correct: number; total: number; percentage: number };
  postseason: { correct: number; total: number; percentage: number };
}

export function Dashboard() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [score, setScore] = useState<Score>({ weekly: 0, playoff: 0, total: 0 });
  const [accuracy, setAccuracy] = useState<Accuracy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.get<Season[]>('/seasons');
        setSeasons(data);
        if (data.length > 0) {
          const [s, a] = await Promise.all([
            api.get<Score>(`/predictions/score/${data[0].id}`),
            api.get<Accuracy>(`/predictions/accuracy/${data[0].id}`),
          ]);
          setScore(s);
          setAccuracy(a);
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
  const accuracyValue = accuracy && accuracy.overall.total > 0 ? `${accuracy.overall.percentage}%` : 'Pending';
  const accuracySubtitle = accuracy && accuracy.overall.total > 0 ? `${accuracy.overall.correct}/${accuracy.overall.total}` : 'Completed games only';
  const regularValue = accuracy && accuracy.regular.total > 0 ? `${accuracy.regular.percentage}%` : 'Pending';
  const regularSubtitle = accuracy && accuracy.regular.total > 0 ? `${accuracy.regular.correct}/${accuracy.regular.total}` : 'Completed games only';
  const postseasonValue = accuracy && accuracy.postseason.total > 0 ? `${accuracy.postseason.percentage}%` : 'Pending';
  const postseasonSubtitle = accuracy && accuracy.postseason.total > 0 ? `${accuracy.postseason.correct}/${accuracy.postseason.total}` : 'Completed games only';

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
      <motion.section
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="field-hero relative overflow-hidden border-2 border-gridiron-border p-6 md:p-8 lg:p-10 neumorphic"
      >
        <div className="relative max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 bg-gridiron-bg/75 border-2 border-gridiron-border px-3 py-2 text-sm text-text-secondary font-bold uppercase tracking-wide">
            <CalendarDays size={16} className="text-nfl-blue" />
            {currentSeason.status} season
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-text-primary uppercase tracking-tight">
            {currentSeason.year} Season Dashboard
          </h1>
          <p className="mt-4 max-w-2xl text-base md:text-lg text-text-secondary font-bold uppercase tracking-wide">
            Track weekly picks, division calls, awards, records, and playoff outcomes from one board.
          </p>
        </div>
      </motion.section>

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
            subtitle={`${score.weekly} weekly / ${score.playoff} playoff`}
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <StatCard
            icon={<BarChart3 className="text-nfl-green" size={32} />}
            label="Accuracy"
            value={accuracyValue}
            subtitle={accuracySubtitle}
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <StatCard
            icon={<Target className="text-nfl-blue" size={32} />}
            label="Regular Season"
            value={regularValue}
            subtitle={regularSubtitle}
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <StatCard
            icon={<TrendingUp className="text-nfl-red" size={32} />}
            label="Postseason"
            value={postseasonValue}
            subtitle={postseasonSubtitle}
          />
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-gridiron-surface p-6 border-2 border-gridiron-border neumorphic"
      >
        <h2 className="text-2xl font-oswald font-bold mb-5 text-text-primary uppercase tracking-wide">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <QuickLink to="/schedule" label="Make Predictions" />
          <QuickLink to="/standings" label="Standings & Records" />
          <QuickLink to="/awards" label="Predict Awards" />
        </div>
      </motion.div>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-gridiron-surface border-2 border-gridiron-border neumorphic"
      >
        <div className="p-4 md:p-6 border-b-2 border-gridiron-border">
          <h2 className="text-2xl font-oswald font-bold text-text-primary uppercase tracking-wide">NFL History</h2>
          <p className="text-sm text-text-secondary font-bold uppercase tracking-wide mt-1">Moments that defined the game</p>
        </div>
        <MilestoneSlider />
      </motion.section>
    </div>
  );
}

function StatCard({ icon, label, value, subtitle }: { icon: React.ReactNode; label: string; value: string | number; subtitle?: string }) {
  return (
    <div className="bg-gridiron-surface p-4 md:p-5 border-2 border-gridiron-border neumorphic flex flex-col justify-between min-h-[100px]">
      <div className="flex items-center gap-3 md:gap-4">
        {icon}
        <div>
          <p className="text-xs md:text-base text-text-secondary uppercase tracking-wide font-bold">{label}</p>
          <p className="text-2xl md:text-4xl font-bold font-mono text-text-primary">{value}</p>
        </div>
      </div>
      {subtitle && (
        <p className="text-xs md:text-sm text-text-muted font-mono mt-1">{subtitle}</p>
      )}
    </div>
  );
}

function QuickLink({ to, label }: { to: string; label: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Link
        to={to}
        className="block bg-gridiron-surface-hover hover:bg-gridiron-border p-4 text-center text-base font-bold text-text-primary uppercase tracking-wide transition-all border-l-4 border-transparent hover:border-nfl-blue"
      >
        {label}
      </Link>
    </motion.div>
  );
}
