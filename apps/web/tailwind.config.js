/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Gridiron Collage Dark Mode Palette
        gridiron: {
          bg: '#0a0a0f',
          surface: '#161620',
          'surface-hover': '#20202e',
          border: '#2a2a3a',
        },
        nfl: {
          red: '#e04a2a',
          blue: '#2e7fa4',
          green: '#10b981',
          yellow: '#f59e0b',
        },
        text: {
          primary: '#f2e8d5',
          secondary: '#a4a4b8',
          muted: '#6c6c80',
        },
        // Keep legacy colors for compatibility
        dark: {
          900: '#0a0a0f',
          800: '#161620',
          700: '#20202e',
          600: '#2a2a3a',
          500: '#3a3a4a',
        },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"DM Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        // Alias legacy font-oswald to display so no stale utility breaks
        oswald: ['"Bricolage Grotesque"', 'Inter', 'sans-serif'],
      },
      fontSize: {
        '4xl': ['2.5rem', { lineHeight: '1.12' }],
        '5xl': ['3rem', { lineHeight: '1.08' }],
        '6xl': ['3.75rem', { lineHeight: '1.04' }],
      },
      boxShadow: {
        neumorphic: '0 4px 12px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
        glow: '0 0 18px rgba(46, 127, 164, 0.28)',
        'glow-green': '0 0 18px rgba(16, 185, 129, 0.24)',
        'glow-red': '0 0 18px rgba(224, 74, 42, 0.28)',
      },
      borderRadius: {
        none: '0',
        sm: '0',
        DEFAULT: '0',
        md: '0',
        lg: '0',
        xl: '0',
      },
    },
  },
  plugins: [],
};
