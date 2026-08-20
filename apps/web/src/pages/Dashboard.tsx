import { useEffect, useState } from 'react';
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
        <Trophy size={48} className="text-nfl-blue" />
        <h2 className="text-xl font-serif font-bold text-text-primary">Welcome to Redzone NFL</h2>
        <p className="text-text-secondary">Go to Settings to create your 2026 season</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl md:text-4xl font-serif font-bold gradient-text">
        {currentSeason.year} Season Dashboard
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Trophy className="text-nfl-yellow" />}
          label="Total Points"
          value={score.total}
        />
        <StatCard
          icon={<Target className="text-nfl-green" />}
          label="Weekly Points"
          value={score.weekly}
        />
        <StatCard
          icon={<TrendingUp className="text-nfl-blue" />}
          label="Playoff Points"
          value={score.playoff}
        />
        <StatCard
          icon={<Award className="text-nfl-red" />}
          label="Season Status"
          value={currentSeason.status}
        />
      </div>

      <div className="bg-gridiron-surface rounded-xl p-6 border border-gridiron-border neumorphic">
        <h2 className="text-lg font-serif font-semibold mb-4 text-text-primary">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickLink to="/schedule" label="Make Predictions" />
          <QuickLink to="/standings" label="View Standings" />
          <QuickLink to="/awards" label="Predict Awards" />
          <QuickLink to="/records" label="Team Records" />
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="bg-gridiron-surface rounded-xl p-4 border border-gridiron-border neumorphic">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className="text-sm text-text-secondary">{label}</p>
          <p className="text-2xl font-bold font-mono text-text-primary">{value}</p>
        </div>
      </div>
    </div>
  );
}

function QuickLink({ to, label }: { to: string; label: string }) {
  return (
    <a
      href={to}
      className="bg-gridiron-surface-hover hover:bg-gridiron-border rounded-lg p-3 text-center text-sm font-medium text-text-primary transition-all"
    >
      {label}
    </a>
  );
}
