/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        nfl: {
          blue: '#013369',
          red: '#D50A0A',
          white: '#ffffff',
        },
        dark: {
          900: '#0f0f23',
          800: '#1a1a2e',
          700: '#252542',
          600: '#2f2f52',
          500: '#3a3a62',
        },
      },
    },
  },
  plugins: [],
};
