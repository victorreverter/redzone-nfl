import { ReactNode, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Menu, X, Trophy, Calendar, BarChart3, Grid3X3, Award, Target, Settings } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: Trophy },
  { to: '/schedule', label: 'Schedule', icon: Calendar },
  { to: '/standings', label: 'Standings', icon: BarChart3 },
  { to: '/playoffs', label: 'Playoffs', icon: Grid3X3 },
  { to: '/awards', label: 'Awards', icon: Award },
  { to: '/records', label: 'Records', icon: Target },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-dvh">
      <header className="bg-gridiron-surface border-b-2 border-gridiron-border sticky top-0 z-50 neumorphic">
        <div className="flex items-center justify-between px-4 h-16">
          <NavLink to="/" className="flex items-center gap-3">
            <span className="text-4xl">🏈</span>
            <span className="font-serif font-bold text-2xl text-text-primary uppercase tracking-wider">Redzone NFL</span>
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
            fixed inset-y-0 left-0 z-40 w-64 bg-gridiron-surface border-r-2 border-gridiron-border 
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

        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
