/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#05070D',
          900: '#090D16',
          850: '#0E1422',
          800: '#141C2E',
          700: '#1E2942',
          600: '#2A3859',
        },
        cyan: {
          400: '#22D3EE',
          500: '#06B6D4',
          accent: '#00F2FE',
        },
        emerald: {
          400: '#34D399',
          500: '#10B981',
          accent: '#00E676',
        },
        verdict: {
          ac: '#10B981',
          wa: '#EF4444',
          tle: '#F59E0B',
          re: '#EC4899',
          ce: '#8B5CF6',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'glow-pulse': 'glow 3s ease-in-out infinite',
        'subtle-pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        glow: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
      },
    },
  },
  plugins: [],
};
