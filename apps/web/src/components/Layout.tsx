import { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { Trophy, Calendar, BarChart3, Grid3X3, Award, Settings, Shield } from 'lucide-react';

const primaryNav = [
  { to: '/', label: 'Dashboard', shortLabel: 'Home', icon: Trophy },
  { to: '/schedule', label: 'Schedule', shortLabel: 'Schedule', icon: Calendar },
  { to: '/standings', label: 'Standings', shortLabel: 'Standings', icon: BarChart3 },
  { to: '/playoffs', label: 'Playoffs', shortLabel: 'Playoffs', icon: Grid3X3 },
  { to: '/awards', label: 'Awards', shortLabel: 'Awards', icon: Award },
];

const utilityNav = [
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/admin', label: 'Admin', icon: Shield },
];

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex flex-col min-h-dvh overflow-x-clip">
      <div className="app-backdrop" />

      {/* Top Header */}
      <header className="bg-gridiron-surface/90 backdrop-blur-xl border-b-2 border-gridiron-border sticky top-0 z-50 neumorphic">
        <div className="flex items-center justify-between px-4 lg:px-6 h-16">
          <NavLink to="/" className="flex items-center gap-3 group">
            <img
              src="/logo-mark.svg"
              alt="Redzone NFL"
              className="w-9 h-9 md:w-10 md:h-10 transition-transform group-hover:scale-105"
            />
            <span className="leading-none flex items-baseline gap-1.5">
              <span className="font-display font-extrabold text-xl md:text-2xl text-nfl-red uppercase tracking-tight">
                Redzone
              </span>
              <span className="font-display font-bold text-xl md:text-2xl text-text-primary uppercase tracking-tight">
                NFL
              </span>
            </span>
          </NavLink>

          {/* Mobile utility links (Settings & Admin) */}
          <div className="flex items-center gap-1 lg:hidden">
            {utilityNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                aria-label={item.label}
                className={({ isActive }) =>
                  `p-2.5 transition-colors border ${
                    isActive
                      ? 'bg-gridiron-surface-hover border-nfl-blue text-text-primary'
                      : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-gridiron-surface-hover'
                  }`
                }
              >
                <item.icon size={19} />
              </NavLink>
            ))}
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:flex-shrink-0 bg-gridiron-surface/95 backdrop-blur-xl border-r-2 border-gridiron-border sticky top-16 h-[calc(100dvh-4rem)]">
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto" aria-label="Main navigation">
            <p className="px-3 pt-2 pb-1.5 text-[11px] font-mono uppercase tracking-widest text-text-muted">
              Season
            </p>
            {primaryNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold tracking-wide transition-all border-l-4 ${
                    isActive
                      ? 'bg-gradient-to-r from-nfl-red/90 to-nfl-blue/80 text-white shadow-glow border-nfl-red'
                      : 'text-text-secondary hover:text-text-primary hover:bg-gridiron-surface-hover border-transparent'
                  }`
                }
              >
                <item.icon size={18} />
                {item.label}
              </NavLink>
            ))}

            <div className="pt-4 mt-4 border-t border-gridiron-border/80">
              <p className="px-3 pt-1 pb-1.5 text-[11px] font-mono uppercase tracking-widest text-text-muted">
                Manage
              </p>
              {utilityNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold tracking-wide transition-all border-l-4 ${
                      isActive
                        ? 'bg-gridiron-surface-hover text-text-primary border-nfl-blue'
                        : 'text-text-secondary hover:text-text-primary hover:bg-gridiron-surface-hover border-transparent'
                    }`
                  }
                >
                  <item.icon size={18} />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="relative flex-1 min-w-0 px-4 py-5 md:px-6 md:py-7 lg:px-8 lg:py-8 pb-24 lg:pb-10">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>

      {/* Mobile Bottom Tab Bar (PWA-friendly) */}
      <nav
        aria-label="Mobile navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-gridiron-surface/95 backdrop-blur-xl border-t-2 border-gridiron-border pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid grid-cols-5">
          {primaryNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 py-2.5 px-1 text-[11px] font-semibold tracking-wide transition-colors border-t-2 -mt-[2px] ${
                  isActive
                    ? 'border-nfl-red text-text-primary bg-gridiron-surface-hover/70'
                    : 'border-transparent text-text-muted hover:text-text-secondary'
                }`
              }
            >
              <item.icon size={18} />
              <span className="truncate">{item.shortLabel}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
