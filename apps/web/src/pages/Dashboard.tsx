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
        <h2 className="text-xl font-bold">Welcome to Redzone NFL</h2>
        <p className="text-gray-400">Go to Settings to create your 2026 season</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold">
        {currentSeason.year} Season Dashboard
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Trophy className="text-yellow-500" />}
          label="Total Points"
          value={score.total}
        />
        <StatCard
          icon={<Target className="text-green-500" />}
          label="Weekly Points"
          value={score.weekly}
        />
        <StatCard
          icon={<TrendingUp className="text-blue-500" />}
          label="Playoff Points"
          value={score.playoff}
        />
        <StatCard
          icon={<Award className="text-purple-500" />}
          label="Season Status"
          value={currentSeason.status}
        />
      </div>

      <div className="bg-dark-800 rounded-xl p-6 border border-dark-600">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
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
    <div className="bg-dark-800 rounded-xl p-4 border border-dark-600">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className="text-sm text-gray-400">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}

function QuickLink({ to, label }: { to: string; label: string }) {
  return (
    <a
      href={to}
      className="bg-dark-700 hover:bg-dark-600 rounded-lg p-3 text-center text-sm font-medium transition-colors"
    >
      {label}
    </a>
  );
}
