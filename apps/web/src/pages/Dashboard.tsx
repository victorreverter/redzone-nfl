import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import {
  Trophy,
  TrendingUp,
  Target,
  CalendarDays,
  BarChart3,
  ArrowRight,
  Calendar,
  Grid3X3,
  Award,
  Flame,
  Sparkles,
} from 'lucide-react';
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

interface WeeklyTrend {
  week: number;
  total: number;
  correct: number;
  exact: number;
  points: number;
  percentage: number;
}

interface Trends {
  weekly: WeeklyTrend[];
  exactScores: number;
  bestWeek: WeeklyTrend | null;
  currentStreak: number;
  bestStreak: number;
}

interface WeekProgress {
  week: number;
  totalGames: number;
  pickedGames: number;
  finalGames: number;
}

export function Dashboard() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [score, setScore] = useState<Score>({ weekly: 0, playoff: 0, total: 0 });
  const [accuracy, setAccuracy] = useState<Accuracy | null>(null);
  const [trends, setTrends] = useState<Trends | null>(null);
  const [hoveredWeek, setHoveredWeek] = useState<WeeklyTrend | null>(null);
  const [weekProgress, setWeekProgress] = useState<WeekProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.get<Season[]>('/seasons');
        setSeasons(data);
        if (data.length > 0) {
          const seasonId = data[0].id;
          const [s, a, t, currentWeekRes] = await Promise.all([
            api.get<Score>(`/predictions/score/${seasonId}`),
            api.get<Accuracy>(`/predictions/accuracy/${seasonId}`),
            api.get<Trends>(`/predictions/trends/${seasonId}`).catch(() => null),
            api.get<{ week: number }>(`/games/current-week/${seasonId}`),
          ]);
          setScore(s);
          setAccuracy(a);
          setTrends(t);

          const [weekGames, weekPreds] = await Promise.all([
            api.get<Array<{ id: number; status: string }>>(`/games?season_id=${seasonId}&week=${currentWeekRes.week}`),
            api.get<Array<{ game_id: number }>>(`/predictions/weekly/${seasonId}?week=${currentWeekRes.week}`),
          ]);

          setWeekProgress({
            week: currentWeekRes.week,
            totalGames: weekGames.length,
            pickedGames: weekPreds.length,
            finalGames: weekGames.filter((g) => g.status === 'final').length,
          });
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
  const accuracyValue = accuracy && accuracy.overall.total > 0 ? `${accuracy.overall.percentage}%` : '—';
  const accuracySubtitle = accuracy && accuracy.overall.total > 0 ? `${accuracy.overall.correct}/${accuracy.overall.total} correct` : 'No final games yet';
  const regularValue = accuracy && accuracy.regular.total > 0 ? `${accuracy.regular.percentage}%` : '—';
  const regularSubtitle = accuracy && accuracy.regular.total > 0 ? `${accuracy.regular.correct}/${accuracy.regular.total} correct` : 'Regular season';
  const postseasonValue = accuracy && accuracy.postseason.total > 0 ? `${accuracy.postseason.percentage}%` : '—';
  const postseasonSubtitle = accuracy && accuracy.postseason.total > 0 ? `${accuracy.postseason.correct}/${accuracy.postseason.total} correct` : 'Playoff rounds';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nfl-blue" />
      </div>
    );
  }

  if (!currentSeason) {
    return (
      <div className="flex flex-col items-center justify-center h-72 gap-4 bg-gridiron-surface border-2 border-gridiron-border p-8 text-center neumorphic">
        <Trophy size={48} className="text-nfl-red" />
        <h2 className="text-3xl font-display font-extrabold text-text-primary tracking-tight">
          Welcome to Redzone NFL
        </h2>
        <p className="text-text-secondary text-base max-w-md">
          Create your season and seed the 32 NFL teams in Settings to start tracking weekly picks, standings, playoffs, and awards.
        </p>
        <Link
          to="/settings"
          className="mt-2 inline-flex items-center gap-2 bg-nfl-red hover:bg-red-700 text-white px-5 py-2.5 text-sm font-semibold uppercase tracking-wider transition-colors"
        >
          Open Settings
          <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  const remainingPicks = weekProgress ? Math.max(0, weekProgress.totalGames - weekProgress.pickedGames) : 0;
  const trendByWeek = new Map((trends?.weekly ?? []).map((w) => [w.week, w]));
  const activeTrend = hoveredWeek ?? trends?.bestWeek ?? null;

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="field-hero relative overflow-hidden border-2 border-gridiron-border p-6 md:p-8 lg:p-10 neumorphic"
      >
        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 bg-gridiron-bg/85 border border-gridiron-border px-3 py-1.5 text-xs font-mono text-text-secondary uppercase tracking-wider">
              <CalendarDays size={14} className="text-nfl-blue" />
              <span>{currentSeason.status} season</span>
              {weekProgress && (
                <>
                  <span className="text-gridiron-border">•</span>
                  <span className="text-nfl-red font-medium">Week {weekProgress.week}</span>
                </>
              )}
            </div>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-display font-extrabold text-text-primary tracking-tight">
              {currentSeason.year} Season Dashboard
            </h1>
            <p className="mt-3 text-sm md:text-base text-text-secondary leading-relaxed max-w-xl">
              Track weekly picks, division standings, playoff brackets, and season awards from one command board.
            </p>
          </div>

          {weekProgress && weekProgress.totalGames > 0 && (
            <Link
              to="/schedule"
              className="group flex items-center justify-between gap-4 bg-gridiron-bg/90 hover:bg-gridiron-surface-hover border-2 border-gridiron-border hover:border-nfl-red p-4 transition-all lg:min-w-[270px]"
            >
              <div>
                <p className="text-[11px] font-mono uppercase tracking-widest text-nfl-red">
                  Up Next • Week {weekProgress.week}
                </p>
                <p className="text-lg font-display font-bold text-text-primary mt-0.5 tabular-nums">
                  {weekProgress.pickedGames}/{weekProgress.totalGames} picks saved
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  {remainingPicks === 0
                    ? 'All games picked for this week'
                    : `${remainingPicks} game${remainingPicks === 1 ? '' : 's'} still open`}
                </p>
              </div>
              <ArrowRight size={20} className="text-text-secondary group-hover:text-nfl-red group-hover:translate-x-1 transition-all flex-shrink-0" />
            </Link>
          )}
        </div>
      </motion.section>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          icon={<Trophy className="text-nfl-yellow" size={22} />}
          label="Total Points"
          value={score.total}
          subtitle={`${score.weekly} weekly / ${score.playoff} playoff`}
          delay={0.05}
        />
        <StatCard
          icon={<BarChart3 className="text-nfl-green" size={22} />}
          label="Overall Accuracy"
          value={accuracyValue}
          subtitle={accuracySubtitle}
          delay={0.1}
        />
        <StatCard
          icon={<Target className="text-nfl-blue" size={22} />}
          label="Regular Season"
          value={regularValue}
          subtitle={regularSubtitle}
          delay={0.15}
        />
        <StatCard
          icon={<TrendingUp className="text-nfl-red" size={22} />}
          label="Postseason"
          value={postseasonValue}
          subtitle={postseasonSubtitle}
          delay={0.2}
        />
      </div>

      {/* Season Performance: Week-by-Week Accuracy Chart & Streaks */}
      {trends && (
        <section className="bg-gridiron-surface p-5 md:p-6 border-2 border-gridiron-border neumorphic space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
            <div>
              <h2 className="text-xl md:text-2xl font-display font-bold text-text-primary tracking-tight">
                Season Performance
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Weekly pick accuracy across the 18-week regular season
              </p>
            </div>
            {activeTrend ? (
              <div className="inline-flex items-center gap-2 bg-gridiron-bg border border-gridiron-border px-3 py-1.5 text-xs font-mono tabular-nums">
                <span className="text-text-muted uppercase">
                  {hoveredWeek ? `Week ${activeTrend.week}` : `Best • W${activeTrend.week}`}
                </span>
                <span className="text-text-primary font-medium">{activeTrend.percentage}%</span>
                <span className="text-text-muted">
                  ({activeTrend.correct}/{activeTrend.total} • +{activeTrend.points} pts)
                </span>
              </div>
            ) : (
              <span className="text-xs font-mono text-text-muted uppercase tracking-wider">
                Awaiting final games
              </span>
            )}
          </div>

          {/* 18-Week Bar Chart */}
          <div className="grid grid-cols-9 sm:grid-cols-[repeat(18,minmax(0,1fr))] gap-1.5 md:gap-2 items-end h-32 pt-4 pb-1 border-b border-gridiron-border/70">
            {Array.from({ length: 18 }, (_, i) => i + 1).map((w) => {
              const item = trendByWeek.get(w);
              const barColor = !item
                ? 'bg-gridiron-bg border border-dashed border-gridiron-border/70'
                : item.percentage >= 70
                  ? 'bg-nfl-green'
                  : item.percentage >= 40
                    ? 'bg-nfl-yellow'
                    : 'bg-nfl-red';
              const heightPct = item ? Math.max(10, item.percentage) : 14;

              return (
                <button
                  key={w}
                  type="button"
                  onMouseEnter={() => item && setHoveredWeek(item)}
                  onMouseLeave={() => setHoveredWeek(null)}
                  onFocus={() => item && setHoveredWeek(item)}
                  onBlur={() => setHoveredWeek(null)}
                  aria-label={
                    item
                      ? `Week ${w}: ${item.correct} of ${item.total} (${item.percentage}%)`
                      : `Week ${w}: no graded picks`
                  }
                  className="group flex flex-col items-center justify-end h-full gap-1.5 focus-visible:ring-1"
                >
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className={`w-full transition-all ${barColor} ${
                        item ? 'opacity-85 group-hover:opacity-100' : 'opacity-60'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span
                    className={`text-[10px] font-mono tabular-nums ${
                      weekProgress?.week === w
                        ? 'text-nfl-red font-medium'
                        : item
                          ? 'text-text-secondary'
                          : 'text-text-muted/60'
                    }`}
                  >
                    {w}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Highlights Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-gridiron-bg/80 border border-gridiron-border p-3">
              <p className="text-[11px] font-mono uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                <Sparkles size={12} className="text-nfl-yellow" />
                Exact Scores
              </p>
              <p className="text-xl font-mono font-medium text-text-primary tabular-nums mt-1">
                {trends.exactScores}
              </p>
            </div>
            <div className="bg-gridiron-bg/80 border border-gridiron-border p-3">
              <p className="text-[11px] font-mono uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                <Trophy size={12} className="text-nfl-green" />
                Best Week
              </p>
              <p className="text-xl font-mono font-medium text-text-primary tabular-nums mt-1">
                {trends.bestWeek ? `W${trends.bestWeek.week} • ${trends.bestWeek.percentage}%` : '—'}
              </p>
            </div>
            <div className="bg-gridiron-bg/80 border border-gridiron-border p-3">
              <p className="text-[11px] font-mono uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                <Flame size={12} className="text-nfl-red" />
                Current Streak
              </p>
              <p className="text-xl font-mono font-medium text-text-primary tabular-nums mt-1">
                {trends.currentStreak}
              </p>
            </div>
            <div className="bg-gridiron-bg/80 border border-gridiron-border p-3">
              <p className="text-[11px] font-mono uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                <TrendingUp size={12} className="text-nfl-blue" />
                Best Streak
              </p>
              <p className="text-xl font-mono font-medium text-text-primary tabular-nums mt-1">
                {trends.bestStreak}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Quick Actions */}
      <div className="bg-gridiron-surface p-5 md:p-6 border-2 border-gridiron-border neumorphic">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl md:text-2xl font-display font-bold text-text-primary tracking-tight">
            Quick Actions
          </h2>
          <span className="text-xs font-mono uppercase tracking-wider text-text-muted">
            Jump to board
          </span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <QuickLink to="/schedule" label="Weekly Picks" hint="Scores & winners" icon={<Calendar size={18} className="text-nfl-red" />} />
          <QuickLink to="/standings" label="Standings" hint="Divisions & seeds" icon={<BarChart3 size={18} className="text-nfl-blue" />} />
          <QuickLink to="/playoffs" label="Playoff Bracket" hint="Road to Super Bowl" icon={<Grid3X3 size={18} className="text-nfl-green" />} />
          <QuickLink to="/awards" label="Season Awards" hint="MVP, OPOY & more" icon={<Award size={18} className="text-nfl-yellow" />} />
        </div>
      </div>

      {/* NFL History */}
      <section className="bg-gridiron-surface border-2 border-gridiron-border neumorphic">
        <div className="px-5 py-4 md:px-6 md:py-5 border-b-2 border-gridiron-border flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
          <h2 className="text-xl md:text-2xl font-display font-bold text-text-primary tracking-tight">
            NFL History
          </h2>
          <p className="font-serif italic text-base text-text-secondary">
            Moments that defined the game
          </p>
        </div>
        <MilestoneSlider />
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  subtitle,
  delay = 0,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-gridiron-surface p-4 md:p-5 border-2 border-gridiron-border neumorphic flex flex-col justify-between gap-2"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">{label}</p>
        {icon}
      </div>
      <p className="text-3xl md:text-4xl font-mono font-medium text-text-primary tabular-nums leading-none">
        {value}
      </p>
      {subtitle && <p className="text-xs text-text-muted font-mono">{subtitle}</p>}
    </motion.div>
  );
}

function QuickLink({
  to,
  label,
  hint,
  icon,
}: {
  to: string;
  label: string;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="group bg-gridiron-surface-hover hover:bg-gridiron-border/70 p-4 transition-all border border-gridiron-border hover:border-nfl-blue flex flex-col gap-2"
    >
      <div className="flex items-center justify-between">
        {icon}
        <ArrowRight size={15} className="text-text-muted group-hover:text-text-primary group-hover:translate-x-0.5 transition-all" />
      </div>
      <div>
        <p className="text-sm md:text-base font-display font-bold text-text-primary tracking-tight">
          {label}
        </p>
        <p className="text-xs text-text-muted mt-0.5">{hint}</p>
      </div>
    </Link>
  );
}
