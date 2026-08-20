/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Gridiron Collage Dark Mode Palette
        gridiron: {
          bg: '#0a0a0f',
          surface: '#1a1a24',
          'surface-hover': '#252532',
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
          secondary: '#a0a0b0',
          muted: '#606070',
        },
        // Keep legacy colors for compatibility
        dark: {
          900: '#0a0a0f',
          800: '#1a1a24',
          700: '#252532',
          600: '#2a2a3a',
          500: '#3a3a4a',
        },
      },
      fontFamily: {
        serif: ['Georgia', 'serif'],
        sans: ['system-ui', '-apple-system', 'sans-serif'],
        oswald: ['Oswald', 'sans-serif'],
        mono: ['Courier New', 'monospace'],
      },
      fontSize: {
        '4xl': ['2.5rem', { lineHeight: '1.2' }],
        '5xl': ['3rem', { lineHeight: '1.2' }],
        '6xl': ['4rem', { lineHeight: '1.1' }],
      },
      boxShadow: {
        neumorphic: '0 4px 6px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        glow: '0 0 20px rgba(46, 127, 164, 0.3)',
        'glow-green': '0 0 20px rgba(16, 185, 129, 0.3)',
        'glow-red': '0 0 20px rgba(224, 74, 42, 0.3)',
      },
      borderRadius: {
        'none': '0',
        'sm': '0',
        'DEFAULT': '0',
        'md': '0',
        'lg': '0',
        'xl': '0',
      },
    },
  },
  plugins: [],
};
