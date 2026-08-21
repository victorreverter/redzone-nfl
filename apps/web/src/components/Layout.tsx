import { ReactNode, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Menu, X, Trophy, Calendar, BarChart3, Grid3X3, Award, Settings, Shield } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: Trophy },
  { to: '/schedule', label: 'Schedule', icon: Calendar },
  { to: '/standings', label: 'Standings', icon: BarChart3 },
  { to: '/playoffs', label: 'Playoffs', icon: Grid3X3 },
  { to: '/awards', label: 'Awards', icon: Award },
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/admin', label: 'Admin', icon: Shield },
];

export function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex flex-col min-h-dvh overflow-hidden">
      <div className="app-backdrop" />
      <header className="bg-gridiron-surface/90 backdrop-blur-xl border-b-2 border-gridiron-border sticky top-0 z-50 neumorphic">
        <div className="flex items-center justify-between px-4 h-16">
          <NavLink to="/" className="flex items-center gap-3">
            <img src="/nfl-logo-official.png" alt="NFL" className="w-10 h-10 md:w-12 md:h-12" />
            <span className="leading-none">
              <span className="font-oswald text-xl md:text-2xl text-nfl-red uppercase tracking-wider">Redzone</span>
              <span className="font-sans text-xl md:text-2xl text-text-primary uppercase tracking-wider ml-1">NFL</span>
            </span>
          </NavLink>
          <button
            onClick={() => setOpen(!open)}
            className="p-2 text-text-secondary hover:text-text-primary lg:hidden transition-colors"
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        <nav
          className={`
            fixed inset-y-0 left-0 z-40 w-64 bg-gridiron-surface/95 backdrop-blur-xl border-r-2 border-gridiron-border 
            transform transition-transform duration-200 ease-in-out
            lg:translate-x-0 lg:static lg:w-64 lg:flex-shrink-0
            ${open ? 'translate-x-0' : '-translate-x-full'}
            pt-16 lg:pt-0
          `}
        >
          <div className="p-4 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 text-base font-bold uppercase tracking-wide transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-nfl-red to-nfl-blue text-white shadow-glow border-l-4 border-nfl-red'
                      : 'text-text-secondary hover:text-text-primary hover:bg-gridiron-surface-hover border-l-4 border-transparent'
                  }`
                }
                end={item.to === '/'}
              >
                <item.icon size={20} />
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>

        {open && (
          <div
            className="fixed inset-0 bg-black/70 z-30 lg:hidden"
            onClick={() => setOpen(false)}
          />
        )}

        <main className="relative flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
